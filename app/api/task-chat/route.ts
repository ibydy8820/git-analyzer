import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';
import OpenAI from 'openai';
import { TASK_CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    const { analysisId, taskIndex, message, chatHistory, instructions } = await req.json();

    // Получаем анализ
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: userId,
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      );
    }

    const result = analysis.result as any;
    const task = result.analysis?.tasks?.[taskIndex];

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Формируем контекст для чата
    const contextPrompt = `PROJECT CONTEXT:
${result.analysis.projectSummary}

**Project Stage:** ${result.analysis.detectedStage}
**Tech Stack:** ${result.analysis.techStack.join(', ')}

CURRENT TASK:
**Title:** ${task.title}
**Description:** ${task.description}
**Category:** ${task.category}

INSTRUCTIONS FOR THIS TASK:
${instructions}

---

The founder is working on this task and needs help. Answer their question clearly and practically.`;

    // Собираем историю чата
    const messages = [
      { role: 'system' as const, content: TASK_CHAT_SYSTEM_PROMPT },
      { role: 'user' as const, content: contextPrompt },
      ...(chatHistory || []),
      { role: 'user' as const, content: message },
    ];

    const response = await client.chat.completions.create({
      model: 'anthropic/claude-3.5-haiku',
      messages,
      temperature: 0.5,
      max_tokens: 1000,
    });

    const reply = response.choices[0].message.content || '';

    return NextResponse.json({
      success: true,
      reply,
    });

  } catch (error: any) {
    console.error('❌ Task chat error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
