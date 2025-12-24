import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    const { analysisId } = await req.json();

    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: userId },
    });

    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 });
    }

    const result = analysis.result as any;

    // Форматируем анализ для PDF
    const formattedContent = `
# Анализ проекта

**Репозиторий:** ${analysis.repoUrl || 'Загруженные файлы'}
**Дата:** ${new Date(analysis.createdAt).toLocaleDateString('ru-RU')}

## Краткое описание
${result.analysis.projectSummary}

**Стадия:** ${result.analysis.detectedStage}
**Технологии:** ${result.analysis.techStack.join(', ')}

## Задачи на неделю (${result.analysis.tasks.length})

${result.analysis.tasks.map((task: any, i: number) => `
### ${i + 1}. ${task.title}
**Приоритет:** ${task.priority} | **Сложность:** ~${task.estimatedMinutes} мин | **Категория:** ${task.category}

${task.description}
`).join('\n')}

## Проблемы (${result.analysis.issues?.length || 0})

${result.analysis.issues?.map((issue: any) => `
- **[${issue.severity}]** ${issue.area}
  ${issue.detail}
  ${issue.filePath ? `Файл: ${issue.filePath}` : ''}
`).join('\n') || 'Нет'}

## Сильные стороны (${result.analysis.strengths?.length || 0})

${result.analysis.strengths?.map((s: any) => `
- **${s.area}:** ${s.detail}
`).join('\n') || 'Нет'}

## Следующая цель
${result.analysis.nextMilestone}

---
**Статистика:**
- Файлов проанализировано: ${result.metadata.filesAnalyzed}
- Строк кода: ${result.metadata.totalLines}
- Модель: ${result.metadata.modelUsed}
`;

    // Возвращаем markdown (клиент сконвертирует в PDF)
    return NextResponse.json({
      success: true,
      markdown: formattedContent,
      filename: `analysis_${analysisId.slice(0, 8)}.md`,
    });

  } catch (error: any) {
    console.error('❌ PDF export error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
