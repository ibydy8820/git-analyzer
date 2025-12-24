import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserId } from '@/lib/auth/getUserId';
import OpenAI from 'openai';
import { INSTRUCTIONS_SYSTEM_PROMPT } from '@/lib/ai/prompts';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();

    const { analysisId, taskIndex, language } = await req.json();

    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: userId },
    });

    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 });
    }

    const result = analysis.result as any;
    const task = result.analysis?.tasks?.[taskIndex];

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const userPrompt = language === 'ru' ? 
`Сгенерируй детальную пошаговую инструкцию для выполнения этой задачи НА РУССКОМ ЯЗЫКЕ.

## Контекст проекта:
${result.analysis.projectSummary}

**Стадия:** ${result.analysis.detectedStage}
**Технологии:** ${result.analysis.techStack.join(', ')}

## Задача:
**Название:** ${task.title}
**Описание:** ${task.description}
**Категория:** ${task.category}
**Время:** ${task.estimatedMinutes} минут

---

Используй эту структуру (ВСЁ НА РУССКОМ!):

## Обзор
[Что делаем и зачем - простым языком]

## Какую часть системы меняем
[Какой компонент/модуль/файл будем менять]

## Предварительные требования
[Что нужно подготовить заранее]

## Пошаговая инструкция

### Шаг 1: [Название]
[Детальное объяснение]
\`\`\`bash
# Команда
\`\`\`

### Шаг 2: [Название]
...

## Проверка результата
[Как проверить что всё работает]

## Частые ошибки
**Если видите:** ...
**Что делать:** ...

## Полезные ссылки
- [Ссылки на документацию]

ВАЖНО: Пиши так, чтобы понял новичок. Объясняй каждый шаг простым языком.

Ответь ТОЛЬКО текстом инструкции в формате markdown, без JSON, без обёрток.`
    : 
`Generate detailed step-by-step instructions for completing this task IN ENGLISH.

## Project Context:
${result.analysis.projectSummary}

**Stage:** ${result.analysis.detectedStage}
**Tech Stack:** ${result.analysis.techStack.join(', ')}

## Task:
**Title:** ${task.title}
**Description:** ${task.description}
**Category:** ${task.category}
**Time:** ${task.estimatedMinutes} minutes

---

Use this structure (ALL IN ENGLISH!):

## Overview
[What we're doing and why - simple language]

## What Part of System We're Changing
[Which component/module/file we'll modify]

## Prerequisites
[What needs to be ready first]

## Step-by-Step Guide

### Step 1: [Name]
[Detailed explanation]
\`\`\`bash
# Command
\`\`\`

### Step 2: [Name]
...

## Verification
[How to check it worked]

## Common Issues
**If you see:** ...
**Solution:** ...

## Useful Links
- [Documentation links]

IMPORTANT: Write for beginners. Explain each step in simple terms.

Respond with ONLY the instruction text in markdown format, no JSON, no wrapper.`;

    console.log(`🤖 Generating instructions with Claude Opus...`);

    const response = await client.chat.completions.create({
      model: 'anthropic/claude-opus-4.5:beta',
      messages: [
        { role: 'system', content: INSTRUCTIONS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    });

    const instructions = response.choices[0].message.content || '';

    console.log(`✅ Instructions generated successfully`);

    return NextResponse.json({ success: true, instructions, task });

  } catch (error: any) {
    console.error('❌ Instructions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
