import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { content, targetLanguage } = await req.json();

    const prompt = targetLanguage === 'ru' 
      ? `Переведи этот JSON на русский язык. Переводи ВСЕ текстовые поля (projectSummary, strengths, issues, tasks, nextMilestone). Сохраняй структуру JSON и названия полей на английском. Технические термины (названия технологий, файлов) не переводи.\n\n${JSON.stringify(content, null, 2)}`
      : `Translate this JSON to English. Translate ALL text fields (projectSummary, strengths, issues, tasks, nextMilestone). Keep JSON structure and field names in English. Don't translate technical terms (tech names, file names).\n\n${JSON.stringify(content, null, 2)}`;

    const response = await client.chat.completions.create({
      model: 'anthropic/claude-3.5-haiku',
      messages: [
        { role: 'system', content: 'You are a professional translator. Translate the JSON content preserving structure. Respond with ONLY the translated JSON, no explanations.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const translated = response.choices[0].message.content || '{}';
    
    try {
      const jsonMatch = translated.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(translated);
      
      return NextResponse.json({ success: true, translated: result });
    } catch (e) {
      console.error('Translation parse error:', e);
      return NextResponse.json({ success: true, translated: content });
    }

  } catch (error: any) {
    console.error('❌ Translation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
