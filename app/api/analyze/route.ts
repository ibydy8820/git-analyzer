import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchRepoStructure, getUserGithubToken } from '@/lib/github/client';
import { analyzeRepository } from '@/lib/ai/analyzer';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';

const AnalyzeRequestSchema = z.object({
  repoUrl: z.string().url().optional(),
  projectDescription: z.string().min(1, 'Project description is required'),
  userContext: z.object({
    currentWeek: z.number().optional(),
    previousTasksCompleted: z.array(z.string()).optional(),
    userGoal: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    const body = await req.json();
    const validatedData = AnalyzeRequestSchema.parse(body);
    const { repoUrl, projectDescription, userContext } = validatedData;

    if (!repoUrl) {
      return NextResponse.json({ success: false, error: 'GitHub URL is required' }, { status: 400 });
    }

    console.log(`🚀 Starting analysis for: ${repoUrl}`);

    const githubToken = await getUserGithubToken(userId);
    
    const repoData = await fetchRepoStructure(repoUrl, githubToken || undefined);
    const { files: repoFiles, tree: repoStructure } = repoData;

    console.log(`✅ Loaded ${repoFiles.length} files from repository`);

    // УБРАЛИ ФИЛЬТРАЦИЮ - пускаем ВСЕ файлы в AI, пусть сам решает
    console.log(`🤖 Sending to AI for analysis...`);
    
    const analysisResult = await analyzeRepository({
      files: repoFiles.map(f => ({ path: f.path, content: f.content })),
      repoStructure,
      projectDescription,
      userContext,
    });

    // Если AI попросил уточнений - сохраняем файлы временно в БД
    if (analysisResult.needsClarification && analysisResult.questions) {
      console.log(`🔍 AI needs clarification, saving files temporarily...`);
      
      // Сохраняем файлы в TempAnalysisFiles (живут 24 часа)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tempFiles = await prisma.tempAnalysisFiles.create({
        data: {
          userId,
          filesData: {
            files: repoFiles.map(f => ({ path: f.path, content: f.content })),
            tree: repoStructure,
          },
          expiresAt,
        },
      });
      
      console.log(`💾 Temporary files saved with ID: ${tempFiles.id}`);
      
      return NextResponse.json({
        success: true,
        needsClarification: true,
        questions: analysisResult.questions,
        partialAnalysis: analysisResult.partialAnalysis || {
          projectSummary: 'Analyzing repository structure...',
          detectedStage: 'unknown',
          techStack: [],
        },
        tempFilesId: tempFiles.id,
      });
    }

    // Полный анализ - сохраняем в БД
    const analysis = await prisma.analysis.create({
      data: {
        userId,
        repoUrl: repoUrl || null,
        projectDescription,
        filesAnalyzed: repoFiles.length,
        result: analysisResult as any,
        detectedStage: analysisResult.analysis?.detectedStage || null,
      },
    });

    console.log(`💾 Analysis saved with ID: ${analysis.id}`);

    return NextResponse.json({
      ...analysisResult,
      analysisId: analysis.id,
    });

  } catch (error: any) {
    console.error('❌ Analysis error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
