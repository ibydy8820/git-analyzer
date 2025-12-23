import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { fetchRepoStructure, getUserGithubToken } from '@/lib/github/client';
import { filterFiles } from '@/lib/ai/filter';
import { analyzeRepository } from '@/lib/ai/analyzer';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { analysisId } = await req.json();

    // Получаем предыдущий анализ
    const prevAnalysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: session.user.id },
      include: { taskCompletions: true, snapshots: true },
    });

    if (!prevAnalysis) {
      return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 });
    }

    console.log(`🔄 Refreshing analysis for: ${prevAnalysis.repoUrl}`);

    // Получаем GitHub токен
    const githubToken = await getUserGithubToken(session.user.id);

    // Скачиваем свежую версию репо
    const repoData = await fetchRepoStructure(prevAnalysis.repoUrl!, githubToken || undefined);
    const filterResults = await filterFiles(repoData.files);
    const valuableFiles = repoData.files.filter(f => filterResults.get(f.path)?.isValuable);

    // Получаем список выполненных задач
    const completedTasks = prevAnalysis.taskCompletions
      .filter(tc => tc.completed)
      .map(tc => tc.taskTitle);

    // Новый анализ с контекстом
    const aiResult = await analyzeRepository({
      files: valuableFiles,
      repoStructure: repoData.tree,
      projectDescription: prevAnalysis.projectDescription,
      userContext: {
        currentWeek: (prevAnalysis.snapshots.length || 0) + 1,
        previousTasksCompleted: completedTasks,
      },
    });

    if (!aiResult.success || !aiResult.analysis) {
      throw new Error('Analysis failed');
    }

    // Создаём новый анализ
    const newAnalysis = await prisma.analysis.create({
      data: {
        userId: session.user.id,
        repoUrl: prevAnalysis.repoUrl,
        projectDescription: prevAnalysis.projectDescription,
        filesAnalyzed: aiResult.metadata.filesAnalyzed,
        detectedStage: aiResult.analysis.detectedStage,
        result: {
          analysis: aiResult.analysis,
          metadata: aiResult.metadata,
        },
      },
    });

    // Создаём snapshot
    const weekNumber = (prevAnalysis.snapshots.length || 0) + 1;
    
    const snapshot = await prisma.snapshot.create({
      data: {
        analysisId: newAnalysis.id,
        weekNumber,
        filesCount: aiResult.metadata.filesAnalyzed,
        linesOfCode: aiResult.metadata.totalLines,
        stage: aiResult.analysis.detectedStage,
        hasTests: valuableFiles.some(f => f.path.includes('test')),
        hasCI: valuableFiles.some(f => f.path.includes('.github/workflows')),
        hasDocs: valuableFiles.some(f => f.path.toLowerCase().includes('readme')),
        hasDeployment: valuableFiles.some(f => f.path.includes('docker') || f.path.includes('vercel')),
        tasks: aiResult.analysis.tasks,
        completedTasks: completedTasks,
        comparison: calculateComparison(prevAnalysis, newAnalysis),
        progressScore: calculateProgress(completedTasks.length, aiResult.analysis.tasks.length),
      },
    });

    console.log(`✅ Snapshot created: Week ${weekNumber}`);

    return NextResponse.json({
      success: true,
      analysisId: newAnalysis.id,
      analysis: aiResult.analysis,
      metadata: aiResult.metadata,
      snapshot,
    });

  } catch (error: any) {
    console.error('❌ Refresh error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function calculateComparison(oldAnalysis: any, newAnalysis: any) {
  const oldResult = oldAnalysis.result as any;
  const newResult = newAnalysis.result as any;
  
  return {
    filesDelta: newResult.metadata.filesAnalyzed - oldResult.metadata.filesAnalyzed,
    linesDelta: newResult.metadata.totalLines - oldResult.metadata.totalLines,
    stageChanged: oldResult.analysis.detectedStage !== newResult.analysis.detectedStage,
    oldStage: oldResult.analysis.detectedStage,
    newStage: newResult.analysis.detectedStage,
  };
}

function calculateProgress(completedTasks: number, totalTasks: number): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}
