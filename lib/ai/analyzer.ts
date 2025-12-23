import OpenAI from 'openai';
import { ANALYSIS_SYSTEM_PROMPT } from './prompts';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface AnalysisResult {
  success: boolean;
  needsClarification?: boolean;
  questions?: Array<{ id: string; question: string; why: string; }>;
  partialAnalysis?: {
    projectSummary: string;
    detectedStage: string;
    techStack: string[];
  };
  analysis?: {
    projectSummary: string;
    detectedStage: 'documentation' | 'mvp' | 'launched' | 'growing' | 'unknown';
    techStack: string[];
    strengths: Array<{ area: string; detail: string; }>;
    issues: Array<{ severity: 'high' | 'medium' | 'low'; area: string; detail: string; filePath: string | null; }>;
    tasks: Array<{ title: string; description: string; priority: 'high' | 'medium' | 'low'; category: 'documentation' | 'technical' | 'product' | 'marketing' | 'business'; estimatedMinutes: number; dependsOn: string | null; }>;
    nextMilestone: string;
  };
  metadata: { filesAnalyzed: number; totalLines: number; modelUsed: string; tokensUsed?: number; analysisDurationMs: number; };
}

export async function analyzeRepository(params: {
  files: Array<{ path: string; content: string }>;
  repoStructure: string;
  projectDescription: string;
  userContext?: { currentWeek?: number; previousTasksCompleted?: string[]; userGoal?: string; };
}): Promise<AnalysisResult> {
  const startTime = Date.now();
  const { files, repoStructure, projectDescription, userContext } = params;

  console.log(`📊 Preparing ${files.length} files for AI analysis...`);
  
  const filesContent = files.map(f => `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
  
  console.log(`📝 Total lines of code: ${totalLines}`);
  console.log(`📤 Sending to Claude Opus with middle-out compression...`);

  const userPrompt = `Analyze this GitHub repository and provide recommendations.

## Repository Structure:
\`\`\`
${repoStructure}
\`\`\`

## Project Description:
${projectDescription}

${userContext?.userGoal ? `## Goal:\n${userContext.userGoal}\n` : ''}
${userContext?.currentWeek ? `## Week: ${userContext.currentWeek}\n` : ''}
${userContext?.previousTasksCompleted ? `## Completed:\n${userContext.previousTasksCompleted.map(t => `- ${t}`).join('\n')}\n` : ''}

## Files (${files.length} files, ${totalLines} lines):
${filesContent}

---

Respond with ONLY valid JSON. Generate EXACTLY 5 tasks (no more, no less):

{
  "analysis": {
    "projectSummary": "2-3 sentences",
    "detectedStage": "documentation|mvp|launched|growing",
    "techStack": ["tech1", "tech2"],
    "strengths": [{"area": "...", "detail": "..."}],
    "issues": [{"severity": "high|medium|low", "area": "...", "detail": "...", "filePath": "..."}],
    "tasks": [
      {
        "title": "Task title",
        "description": "SIMPLE description explaining: 1) What part of system changes 2) WHY it matters for users/business 3) Value it brings. Use plain language for beginners!",
        "priority": "high|medium|low",
        "category": "documentation|technical|product|marketing|business",
        "estimatedMinutes": 30,
        "dependsOn": null
      }
    ],
    "nextMilestone": "Next big goal"
  }
}`;

  try {
    const response = await client.chat.completions.create({
      model: 'anthropic/claude-opus-4.5:beta',
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      transforms: ['middle-out'],
    });

    const content = response.choices[0].message.content || '';
    
    console.log(`📦 Received response length: ${content.length} chars`);
    
    if (!content || content.length < 50) {
      console.error('❌ Empty or too short response from AI');
      console.error('Response:', content);
      throw new Error('AI returned empty response. Please try again.');
    }
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in response');
      console.error('Response preview:', content.substring(0, 500));
      throw new Error('AI response does not contain valid JSON. Please try again.');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError: any) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('JSON preview:', jsonMatch[0].substring(0, 500));
      throw new Error('AI returned invalid JSON. Please try again.');
    }
    
    const duration = Date.now() - startTime;

    console.log(`✅ Analysis complete in ${(duration / 1000).toFixed(1)}s`);
    console.log(`📊 Generated ${parsed.analysis?.tasks?.length || 0} tasks`);

    return {
      success: true,
      needsClarification: parsed.needsClarification || false,
      questions: parsed.questions,
      partialAnalysis: parsed.partialAnalysis,
      analysis: parsed.analysis,
      metadata: {
        filesAnalyzed: files.length,
        totalLines,
        modelUsed: 'anthropic/claude-opus-4.5:beta',
        tokensUsed: response.usage?.total_tokens,
        analysisDurationMs: duration,
      },
    };
  } catch (error: any) {
    console.error('❌ Analysis error:', error);
    
    // Более понятные сообщения об ошибках
    if (error.message.includes('terminated') || error.message.includes('socket')) {
      throw new Error('Connection to AI service was interrupted. Please try again.');
    }
    
    if (error.message.includes('JSON')) {
      throw new Error(error.message);
    }
    
    throw new Error(`Analysis failed: ${error.message}. Please try again.`);
  }
}
