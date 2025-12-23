import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { analyzeRepository } from '@/lib/ai/analyzer';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { repoUrl, projectDescription, answers, tempFilesId } = await req.json();

    console.log(`🔄 Re-analyzing with answers, loading files from DB...`);

    // Получаем файлы из временного хранилища
    const tempFiles = await prisma.tempAnalysisFiles.findUnique({
      where: { id: tempFilesId },
    });

    if (!tempFiles) {
      return NextResponse.json({ 
        success: false, 
        error: 'Temporary files not found or expired. Please start a new analysis.' 
      }, { status: 404 });
    }

    // Проверяем что файлы принадлежат текущему пользователю
    if (tempFiles.userId !== session.user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access to temporary files' 
      }, { status: 403 });
    }

    console.log(`✅ Loaded ${(tempFiles.filesData as any).files.length} files from temp storage`);

    // Формируем расширенное описание с ответами
    const answersText = Object.entries(answers)
      .map(([id, answer]) => `${id}: ${answer}`)
      .join('\n');

    const fullDescription = `${projectDescription}\n\nДополнительная информация:\n${answersText}`;

    // Используем те же файлы что и в первом анализе
    const aiResult = await analyzeRepository({
      files: (tempFiles.filesData as any).files,
      repoStructure: (tempFiles.filesData as any).tree,
      projectDescription: fullDescription,
    });

    if (!aiResult.success || !aiResult.analysis) {
      throw new Error('Analysis failed');
    }

    // Сохраняем анализ
    const analysis = await prisma.analysis.create({
      data: {
        userId: session.user.id,
        repoUrl,
        projectDescription: fullDescription,
        filesAnalyzed: aiResult.metadata.filesAnalyzed,
        detectedStage: aiResult.analysis.detectedStage,
        result: {
          analysis: aiResult.analysis,
          metadata: aiResult.metadata,
        },
      },
    });

    // Удаляем временные файлы после успешного анализа
    await prisma.tempAnalysisFiles.delete({
      where: { id: tempFilesId },
    });

    console.log(`✅ Analysis completed with clarifications, temp files cleaned up`);

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      analysis: aiResult.analysis,
      metadata: aiResult.metadata,
    });

  } catch (error: any) {
    console.error('❌ Re-analysis error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
