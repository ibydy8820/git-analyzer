import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    const { analysisId } = await req.json();

    // Архивируем все выполненные задачи
    const result = await prisma.taskCompletion.updateMany({
      where: {
        analysisId,
        completed: true,
        archived: false,
      },
      data: {
        archived: true,
      },
    });

    console.log(`🗄️ Archived ${result.count} completed tasks`);

    return NextResponse.json({ success: true, archivedCount: result.count });

  } catch (error: any) {
    console.error('❌ Archive error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
