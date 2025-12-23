import { NextRequest, NextResponse } from 'next/server';
import { analyzeRepository } from '@/lib/ai/analyzer';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    
    if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { files, project_description, answers, language = 'en' } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'files array is required' },
        { status: 400 }
      );
    }

    if (!project_description) {
      return NextResponse.json(
        { success: false, error: 'project_description is required' },
        { status: 400 }
      );
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { success: false, error: 'answers object is required' },
        { status: 400 }
      );
    }

    console.log(`📡 REST API: Re-analyzing with ${Object.keys(answers).length} answers`);

    const answersText = Object.entries(answers)
      .map(([id, answer]) => `${id}: ${answer}`)
      .join('\n');

    const fullDescription = language === 'ru'
      ? `Ответь на русском языке. ${project_description}\n\nДополнительная информация:\n${answersText}`
      : `${project_description}\n\nAdditional context:\n${answersText}`;

    const repoStructure = files.map((f: any) => f.path).join('\n');

    const analysisResult = await analyzeRepository({
      files,
      repoStructure,
      projectDescription: fullDescription,
    });

    if (!analysisResult.success || !analysisResult.analysis) {
      throw new Error('Analysis failed');
    }

    console.log(`✅ Re-analysis complete`);

    return NextResponse.json({
      success: true,
      analysis: analysisResult.analysis,
      metadata: analysisResult.metadata,
    });

  } catch (error: any) {
    console.error('❌ REST API error:', error);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
