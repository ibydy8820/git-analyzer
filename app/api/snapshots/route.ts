import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();

    const { searchParams } = new URL(req.url);
    const analysisId = searchParams.get('analysisId');

    if (!analysisId) {
      return NextResponse.json({ success: false, error: 'analysisId required' }, { status: 400 });
    }

    const snapshots = await prisma.snapshot.findMany({
      where: { analysisId },
      orderBy: { weekNumber: 'asc' },
    });

    return NextResponse.json({ success: true, snapshots });

  } catch (error: any) {
    console.error('❌ Snapshots error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
