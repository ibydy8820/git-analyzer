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
