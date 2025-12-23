'use client';

import { useState, useEffect, useRef } from 'react';
import MessageRenderer from './MessageRenderer';

interface FollowUpChatProps {
  analysisId: string;
  language: 'ru' | 'en';
}

export default function FollowUpChat({ analysisId, language }: FollowUpChatProps) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [userMessage, setUserMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const t = language === 'ru' ? {
    title: 'Задать вопрос по анализу',
    placeholder: 'С чего начать? Почему эта задача важна?',
    send: 'Отправить',
    sending: 'Отправка',
    greeting: 'Задайте любой вопрос по анализу вашего проекта. Я помогу разобраться с задачами и рекомендациями.',
  } : {
    title: 'Ask About Your Analysis',
    placeholder: 'Where should I start? Why is this task important?',
    send: 'Send',
    sending: 'Sending',
    greeting: 'Ask any question about your project analysis. I\'ll help you understand the tasks and recommendations.',
  };

  useEffect(() => {
    setMessages([{ role: 'assistant', content: t.greeting }]);
  }, [language]);
  // Автоскролл только при новых сообщениях (не при монтировании)
  useEffect(() => {
    if (messages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  const sendMessage = async () => {
    if (!userMessage.trim()) return;

    const newMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newMessage]);
    setUserMessage('');
    setSending(true);

    try {
      const response = await fetch('/api/follow-up-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          message: userMessage,
          chatHistory: messages.slice(1),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div ref={chatContainerRef} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col" style={{ height: '1000px' }}>
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <h3 className="text-lg font-semibold text-green-400">💬 {t.title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === 'user' 
                  ? 'bg-green-500 text-white rounded-br-none' 
                  : 'bg-gray-700 text-gray-200 rounded-bl-none'
              }`}>
                <MessageRenderer content={msg.content} />
              </div>
            </div>
          ))}
          {sending && (
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
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={t.placeholder}
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !userMessage.trim()}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-600 disabled:cursor-not-allowed transition shadow-lg shadow-green-500/20"
          >
            {sending ? t.sending : t.send}
          </button>
        </div>
      </div>
    </div>
  );
}
