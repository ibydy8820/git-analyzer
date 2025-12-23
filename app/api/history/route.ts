import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Получаем все анализы пользователя, сортируем по дате
    const analyses = await prisma.analysis.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        repoUrl: true,
        projectDescription: true,
        filesAnalyzed: true,
        detectedStage: true,
        createdAt: true,
        result: true,
      },
    });

    return NextResponse.json({
      success: true,
      analyses: analyses.map(a => ({
        id: a.id,
        repoUrl: a.repoUrl,
        projectDescription: a.projectDescription,
        filesAnalyzed: a.filesAnalyzed,
        detectedStage: a.detectedStage,
        createdAt: a.createdAt,
        summary: (a.result as any)?.analysis?.projectSummary || '',
        tasksCount: (a.result as any)?.analysis?.tasks?.length || 0,
      })),
    });
  } catch (error: any) {
    console.error('❌ History error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
