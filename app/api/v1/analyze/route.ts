import { NextRequest, NextResponse } from 'next/server';
import { analyzeRepository } from '@/lib/ai/analyzer';
import { fetchRepoStructure } from '@/lib/github/client';
import { prisma } from '@/lib/db/prisma';

/**
 * REST API для программной интеграции
 * 
 * POST /api/v1/analyze
 * 
 * Headers:
 *   Authorization: Bearer YOUR_API_KEY
 *   Content-Type: application/json
 * 
 * Body (вариант 1 - GitHub URL):
 * {
 *   "repo_url": "https://github.com/username/repo",
 *   "project_description": "Описание проекта",
 *   "language": "ru|en" (optional, default: "en")
 * }
 * 
 * Body (вариант 2 - массив файлов):
 * {
 *   "files": [
 *     { "path": "src/index.js", "content": "код файла" }
 *   ],
 *   "project_description": "Описание проекта",
 *   "language": "ru|en" (optional, default: "en")
 * }
 */

export async function POST(req: NextRequest) {
  try {
    // Проверка API ключа
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    
    if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized. Provide valid API key in Authorization header.' 
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { repo_url, files, project_description, language = 'en' } = body;

    // Валидация
    if (!project_description) {
      return NextResponse.json(
        { success: false, error: 'project_description is required' },
        { status: 400 }
      );
    }

    if (!repo_url && !files) {
      return NextResponse.json(
        { success: false, error: 'Either repo_url or files array is required' },
        { status: 400 }
      );
    }

    console.log(`📡 REST API request: ${repo_url ? 'GitHub URL' : `${files.length} files`}`);

    let analysisFiles: Array<{ path: string; content: string }>;
    let repoStructure = '';

    // Вариант 1: GitHub URL
    if (repo_url) {
      console.log(`📥 Fetching repository: ${repo_url}`);
      const repoData = await fetchRepoStructure(repo_url);
      analysisFiles = repoData.files.map(f => ({ path: f.path, content: f.content }));
      repoStructure = repoData.tree;
    } 
    // Вариант 2: массив файлов
    else {
      if (!Array.isArray(files) || files.length === 0) {
        return NextResponse.json(
          { success: false, error: 'files must be a non-empty array' },
          { status: 400 }
        );
      }

      analysisFiles = files;
      // Генерируем структуру дерева из путей файлов
      repoStructure = files.map(f => f.path).join('\n');
    }

    // Формируем описание с языком
    const descriptionWithLang = language === 'ru' 
      ? `Ответь на русском языке. ${project_description}`
      : project_description;

    console.log(`🤖 Analyzing ${analysisFiles.length} files...`);

    const analysisResult = await analyzeRepository({
      files: analysisFiles,
      repoStructure,
      projectDescription: descriptionWithLang,
    });

    // Если нужны уточнения
    if (analysisResult.needsClarification && analysisResult.questions) {
      console.log(`🔍 Clarification needed, returning questions`);
      
      return NextResponse.json({
        success: true,
        needsClarification: true,
        questions: analysisResult.questions,
        partialAnalysis: analysisResult.partialAnalysis || {
          projectSummary: 'Analysis in progress...',
          detectedStage: 'unknown',
          techStack: [],
        },
        metadata: analysisResult.metadata,
      });
    }

    // Полный анализ
    console.log(`✅ Analysis complete`);

    return NextResponse.json({
      success: true,
      needsClarification: false,
      analysis: analysisResult.analysis,
      metadata: analysisResult.metadata,
    });

  } catch (error: any) {
    console.error('❌ REST API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// OPTIONS для CORS (если нужно)
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
