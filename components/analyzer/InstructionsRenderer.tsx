'use client';

import { useState } from 'react';

interface InstructionsRendererProps {
  instructions: string;
  language: 'ru' | 'en';
}

export default function InstructionsRenderer({ instructions, language }: InstructionsRendererProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = language === 'ru' ? { copy: 'Копировать', copied: 'Скопировано!' } : { copy: 'Copy', copied: 'Copied!' };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Парсим markdown
  const parts = instructions.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose prose-invert prose-green max-w-none text-gray-300 leading-relaxed">
      {parts.map((part, index) => {
        // Code block
        if (part.startsWith('```')) {
          const code = part.replace(/```/g, '').trim();
          const id = `code-${index}`;
          
          return (
            <div key={index} className="relative group my-4">
              <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto border border-gray-700 text-sm">
                <code className="text-green-400">{code}</code>
              </pre>
              <button
                onClick={() => handleCopy(code, id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-medium shadow-lg"
              >
                {copiedId === id ? copyText.copied : copyText.copy}
              </button>
            </div>
          );
        }
        
        // Regular text
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{
              __html: part
                .replace(/`([^`]+)`/g, '<code class="bg-gray-900 px-2 py-0.5 rounded text-green-400 text-sm">$1</code>')
                .replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold text-white mt-8 mb-4 first:mt-0">$1</h2>')
                .replace(/^### (.*?)$/gm, '<h3 class="text-lg font-semibold text-green-400 mt-6 mb-3">$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                .replace(/\n/g, '<br/>'),
            }}
          />
        );
      })}
    </div>
  );
}
