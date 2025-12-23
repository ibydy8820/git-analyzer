export async function generatePDF(analysisId: string): Promise<Blob> {
  const response = await fetch('/api/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysisId }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to generate PDF');
  }

  // Вместо PDF делаем красивый Markdown файл
  // (PDF с кириллицей требует дополнительные шрифты)
  const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' });
  
  return blob;
}

export async function downloadAnalysis(analysisId: string, format: 'md' | 'txt' = 'md') {
  const blob = await generatePDF(analysisId);
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis_${new Date().toISOString().split('T')[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
