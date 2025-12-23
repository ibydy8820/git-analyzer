import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { analysisId, taskIndex, taskTitle, completed } = await req.json();

    // Проверяем что анализ принадлежит пользователю
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: session.user.id },
    });

    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 });
    }

    // Создаём или обновляем TaskCompletion
    const taskCompletion = await prisma.taskCompletion.upsert({
      where: {
        analysisId_taskIndex: { analysisId, taskIndex },
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        analysisId,
        taskIndex,
        taskTitle,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    console.log(`✅ Task ${taskIndex} marked as ${completed ? 'completed' : 'incomplete'}`);

    return NextResponse.json({ success: true, taskCompletion });

  } catch (error: any) {
    console.error('❌ Task completion error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET - получить статус всех задач
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const analysisId = searchParams.get('analysisId');

    if (!analysisId) {
      return NextResponse.json({ success: false, error: 'analysisId required' }, { status: 400 });
    }

    const completions = await prisma.taskCompletion.findMany({
      where: {
        analysisId,
        archived: false,
      },
    });

    return NextResponse.json({ success: true, completions });

  } catch (error: any) {
    console.error('❌ Get completions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
