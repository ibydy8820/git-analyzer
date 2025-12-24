import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const FOLLOWUP_SYSTEM_PROMPT = `You are a startup advisor and mentor helping a founder understand their project analysis.

CONTEXT: You have full context of:
- The project repository analysis
- All generated tasks
- Detected issues and strengths
- Project stage and tech stack

YOUR ROLE:
- Answer questions about the analysis
- Explain why certain tasks are recommended
- Help prioritize tasks
- Give strategic advice
- Clarify technical concepts in simple terms

PRINCIPLES:
- Be CONCISE but helpful (2-4 sentences)
- Use SIMPLE language (explain like to a beginner)
- Be PRACTICAL and actionable
- Reference specific tasks/issues when relevant
- Be ENCOURAGING and supportive

EXAMPLES:
User: "С чего мне начать?"
You: "Начните с задачи #1 (самый высокий приоритет). Она даст быстрый результат и критична для вашей стадии проекта. После неё переходите к #2."

User: "Why is this task important?"
You: "This task is critical because it directly impacts user acquisition - the main focus for MVP stage. Without it, users can't easily try your product."`;

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    const { analysisId, message, chatHistory } = await req.json();

    // Получаем анализ из базы
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: analysisId,
        userId: userId,
      },
    });

    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 });
    }

    const result = analysis.result as any;

    // Формируем контекст
    const contextPrompt = `PROJECT ANALYSIS CONTEXT:

**Summary:** ${result.analysis.projectSummary}
**Stage:** ${result.analysis.detectedStage}
**Tech Stack:** ${result.analysis.techStack.join(', ')}

**Tasks (${result.analysis.tasks.length}):**
${result.analysis.tasks.map((t: any, i: number) => `${i + 1}. [${t.priority.toUpperCase()}] ${t.title} - ${t.description}`).join('\n')}

**Issues (${result.analysis.issues?.length || 0}):**
${result.analysis.issues?.map((issue: any) => `- [${issue.severity}] ${issue.area}: ${issue.detail}`).join('\n') || 'None'}

**Strengths (${result.analysis.strengths?.length || 0}):**
${result.analysis.strengths?.map((s: any) => `- ${s.area}: ${s.detail}`).join('\n') || 'None'}

**Next Milestone:** ${result.analysis.nextMilestone}

---

The founder is asking about their project analysis. Answer their question clearly and helpfully.`;

    // Собираем историю
    const messages = [
      { role: 'system' as const, content: FOLLOWUP_SYSTEM_PROMPT },
      { role: 'user' as const, content: contextPrompt },
      ...(chatHistory || []),
      { role: 'user' as const, content: message },
    ];

    console.log(`💬 Follow-up chat question: "${message}"`);

    const response = await client.chat.completions.create({
      model: 'anthropic/claude-opus-4.5:beta',
      messages,
      temperature: 0.5,
      max_tokens: 800,
    });

    const reply = response.choices[0].message.content || '';

    console.log(`✅ Follow-up response generated`);

    // Сохраняем сообщения в базу
    await prisma.message.createMany({
      data: [
        {
          analysisId,
          role: 'user',
          content: message,
        },
        {
          analysisId,
          role: 'assistant',
          content: reply,
        },
      ],
    });

    return NextResponse.json({ success: true, reply });

  } catch (error: any) {
    console.error('❌ Follow-up chat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
