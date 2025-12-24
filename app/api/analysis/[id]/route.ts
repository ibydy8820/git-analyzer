import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();

    const { id } = await params;

    const analysis = await prisma.analysis.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 });
    }

    if (analysis.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      analysis: (analysis.result as any).analysis,
      metadata: (analysis.result as any).metadata,
      messages: analysis.messages,
    });
  } catch (error: any) {
    console.error('Failed to load analysis:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
