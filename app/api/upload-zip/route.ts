import { NextRequest, NextResponse } from 'next/server';
import { parseZipFile } from '@/lib/utils/zipParser';
import { analyzeRepository } from '@/lib/ai/analyzer';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    const formData = await req.formData();
    const zipFile = formData.get('zipFile') as File;
    const projectDescription = formData.get('projectDescription') as string;

    if (!zipFile) {
      return NextResponse.json({ success: false, error: 'ZIP file is required' }, { status: 400 });
    }

    if (!projectDescription) {
      return NextResponse.json({ success: false, error: 'Project description is required' }, { status: 400 });
    }

    console.log(`📦 Processing ZIP file: ${zipFile.name} (${(zipFile.size / 1024 / 1024).toFixed(2)} MB)`);

    // Конвертируем File в Buffer
    const arrayBuffer = await zipFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Парсим ZIP
    console.log(`📂 Extracting files from ZIP...`);
    const { files, tree } = await parseZipFile(buffer);

    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid files found in ZIP archive. Make sure it contains source code files.',
      }, { status: 400 });
    }

    console.log(`✅ Extracted ${files.length} files, analyzing...`);

    // Анализируем проект
    const analysisResult = await analyzeRepository({
      files,
      repoStructure: tree,
      projectDescription,
    });

    // Если нужны уточнения - сохраняем файлы временно
    if (analysisResult.needsClarification && analysisResult.questions) {
      console.log(`🔍 AI needs clarification, saving files temporarily...`);
      
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tempFiles = await prisma.tempAnalysisFiles.create({
        data: {
          userId: userId,
          filesData: { files, tree } as any,
          expiresAt,
        },
      });
      
      return NextResponse.json({
        success: true,
        needsClarification: true,
        questions: analysisResult.questions,
        partialAnalysis: analysisResult.partialAnalysis || {
          projectSummary: 'Analyzing uploaded files...',
          detectedStage: 'unknown',
          techStack: [],
        },
        tempFilesId: tempFiles.id,
      });
    }

    // Полный анализ - сохраняем
    const analysis = await prisma.analysis.create({
      data: {
        userId: userId,
        repoUrl: null, // ZIP файл - нет URL
        projectDescription,
        filesAnalyzed: files.length,
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
    console.error('❌ ZIP upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Увеличиваем лимит для загрузки файлов (50MB)
