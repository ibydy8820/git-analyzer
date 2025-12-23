import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';

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
