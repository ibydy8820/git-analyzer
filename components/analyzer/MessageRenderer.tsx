'use client';

interface MessageRendererProps {
  content: string;
}

export default function MessageRenderer({ content }: MessageRendererProps) {
  let html = content;
  
  // Bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-900/50 px-1.5 py-0.5 rounded text-green-400 text-xs">$1</code>');
  
  // Headers (в чате редко, но бывают)
  html = html.replace(/^### (.*?)$/gm, '<div class="font-semibold text-sm mt-2 mb-1">$1</div>');
  
  // Lists
  html = html.replace(/^- (.*?)$/gm, '<div class="ml-2">• $1</div>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br/>');
  
  return (
    <div 
      className="leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
