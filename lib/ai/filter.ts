// Упрощённая версия - фильтруем по правилам, без AI

export interface FileFilterResult {
  isValuable: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  category: 'documentation' | 'code' | 'config' | 'generated' | 'other';
}

export async function filterFiles(
  files: Array<{ path: string; preview: string; size: number }>
): Promise<Map<string, FileFilterResult>> {
  console.log(`🔍 Smart filtering ${files.length} files (no AI needed)...`);
  
  const results = new Map<string, FileFilterResult>();
  
  // Все файлы уже отфильтрованы в GitHub client - берём все
  files.forEach(file => {
    results.set(file.path, {
      isValuable: true,
      confidence: 'high',
      reason: 'Important file for analysis',
      category: getCategory(file.path),
    });
  });

  console.log(`✅ All ${files.length} files marked as valuable (smart pre-filtering)!`);
  
  return results;
}

function getCategory(path: string): 'documentation' | 'code' | 'config' | 'generated' | 'other' {
  const lower = path.toLowerCase();
  
  if (lower.includes('readme') || lower.includes('docs/') || lower.endsWith('.md')) {
    return 'documentation';
  }
  
  if (lower.includes('config') || lower.includes('.json') || lower.includes('.yml') || lower.includes('.yaml')) {
    return 'config';
  }
  
  if (lower.includes('.ts') || lower.includes('.js') || lower.includes('.py') || lower.includes('.go')) {
    return 'code';
  }
  
  return 'other';
}
