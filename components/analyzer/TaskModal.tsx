'use client';

import { useState, useEffect, useRef } from 'react';
import InstructionsRenderer from './InstructionsRenderer';
import MessageRenderer from './MessageRenderer';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  analysisId: string;
  taskIndex: number;
  language: 'ru' | 'en';
}

export default function TaskModal({ isOpen, onClose, task, analysisId, taskIndex, language }: TaskModalProps) {
  const [instructions, setInstructions] = useState<string>('');
  const [loadingInstructions, setLoadingInstructions] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [userMessage, setUserMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const greeting = language === 'ru'
        ? 'Привет! Я AI-помощник. Помогу выполнить эту задачу - я в курсе всего контекста по вашему проекту. Приступим?'
        : 'Hi! I\'m your AI assistant. I\'ll help you complete this task - I know the full context of your project. Let\'s begin?';
      
      setChatMessages([{ role: 'assistant', content: greeting }]);
      loadInstructions();
    }
  }, [isOpen, taskIndex, language]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadInstructions = async () => {
    const cacheKey = `instructions_${analysisId}_${taskIndex}_${language}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      setInstructions(cached);
      return;
    }

    setLoadingInstructions(true);
    try {
      const response = await fetch('/api/task-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, taskIndex, language }),
      });

      const data = await response.json();
      if (data.success) {
        setInstructions(data.instructions);
        localStorage.setItem(cacheKey, data.instructions);
        
        const keys = Object.keys(localStorage).filter(k => k.startsWith('instructions_'));
        if (keys.length > 4) {
          keys.sort();
          localStorage.removeItem(keys[0]);
          localStorage.removeItem(keys[1]);
        }
      }
    } catch (err) {
      console.error('Failed to load instructions:', err);
    } finally {
      setLoadingInstructions(false);
    }
  };

  const sendMessage = async () => {
    if (!userMessage.trim() || loadingInstructions) return;

    const newMessage = { role: 'user', content: userMessage };
    setChatMessages(prev => [...prev, newMessage]);
    setUserMessage('');
    setSendingMessage(true);

    try {
      const response = await fetch('/api/task-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId, taskIndex, message: userMessage,
          chatHistory: chatMessages.slice(1), instructions,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  if (!isOpen) return null;

  const t = language === 'ru' ? {
    close: 'Закрыть', instructions: 'Инструкция по выполнению', assistant: 'AI Помощник',
    loadingInstructions: 'Генерирую инструкции', askQuestion: 'Задайте вопрос...',
    send: 'Отправить', sending: 'Отправка', min: 'мин',
    waitingInstructions: 'Дождитесь загрузки инструкций...',
  } : {
    close: 'Close', instructions: 'Step-by-Step Instructions', assistant: 'AI Assistant',
    loadingInstructions: 'Generating instructions', askQuestion: 'Ask a question...',
    send: 'Send', sending: 'Sending', min: 'min',
    waitingInstructions: 'Wait for instructions to load...',
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-700 flex justify-between items-start bg-gray-800">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
            <p className="text-gray-400 text-sm mb-3 leading-relaxed">{task.description}</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs border border-green-500/30 font-medium">
                ⏱️ {task.estimatedMinutes} {t.min}
              </span>
              <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                📂 {task.category}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="ml-4 text-gray-400 hover:text-white transition text-3xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          {/* LEFT: Instructions */}
          <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="text-lg font-semibold text-green-400">📖 {t.instructions}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingInstructions ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-gray-400 text-sm">{t.loadingInstructions}</p>
                </div>
              ) : (
                <InstructionsRenderer instructions={instructions} language={language} />
              )}
            </div>
          </div>

          {/* RIGHT: Chat Assistant */}
          <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="text-lg font-semibold text-green-400">💬 {t.assistant}</h3>
              {loadingInstructions && (
                <p className="text-xs text-yellow-400 mt-1">{t.waitingInstructions}</p>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-green-500 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                      <MessageRenderer content={msg.content} />
                    </div>
                  </div>
                ))}
                {sendingMessage && (
                  <div className="text-left">
                    <div className="inline-block bg-gray-700 text-gray-400 p-3 rounded-lg text-sm">
                      <div className="flex gap-1">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce" style={{animationDelay: '0.1s'}}>.</span>
                        <span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !loadingInstructions && sendMessage()}
                  placeholder={loadingInstructions ? t.waitingInstructions : t.askQuestion}
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm disabled:opacity-50"
                  disabled={sendingMessage || loadingInstructions}
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !userMessage.trim() || loadingInstructions}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                >
                  {sendingMessage ? t.sending : t.send}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
