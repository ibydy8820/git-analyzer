'use client';

import { useState } from 'react';

interface ClarificationModalProps {
  isOpen: boolean;
  questions: Array<{ id: string; question: string; why: string }>;
  partialAnalysis: any;
  onSubmit: (answers: Record<string, string>) => void;
  language: 'ru' | 'en';
}

export default function ClarificationModal({ isOpen, questions, partialAnalysis, onSubmit, language }: ClarificationModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const t = language === 'ru' ? {
    title: 'Нужна дополнительная информация',
    subtitle: 'Ответьте на вопросы для более точного анализа',
    whatWeKnow: 'Что мы уже поняли:',
    techStack: 'Технологии',
    stage: 'Стадия',
    unknown: 'Неизвестно',
    whyAsking: 'Зачем:',
    submit: 'Получить рекомендации',
    fillAll: 'Пожалуйста, ответьте на все вопросы',
  } : {
    title: 'Additional Information Needed',
    subtitle: 'Answer the questions for more accurate analysis',
    whatWeKnow: 'What we already know:',
    techStack: 'Tech Stack',
    stage: 'Stage',
    unknown: 'Unknown',
    whyAsking: 'Why:',
    submit: 'Get Recommendations',
    fillAll: 'Please answer all questions',
  };

  if (!isOpen) return null;

  const handleSubmit = () => {
    const allAnswered = questions.every(q => answers[q.id]?.trim());
    if (!allAnswered) {
      alert(t.fillAll);
      return;
    }
    onSubmit(answers);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 p-6 border-b border-gray-700 bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-white mb-2">🔍 {t.title}</h2>
          <p className="text-gray-400 text-sm">{t.subtitle}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Partial Analysis */}
          {partialAnalysis && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-green-400 mb-2">{t.whatWeKnow}</h3>
              <div className="space-y-1 text-sm text-gray-300">
                {partialAnalysis.projectSummary && <p>{partialAnalysis.projectSummary}</p>}
                {partialAnalysis.techStack && partialAnalysis.techStack.length > 0 && (
                  <p className="text-gray-400">
                    <span className="font-medium">{t.techStack}:</span> {partialAnalysis.techStack.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <label className="block">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-green-400 font-bold">❓</span>
                    <div className="flex-1">
                      <p className="text-white font-medium mb-1">{q.question}</p>
                      <p className="text-xs text-gray-500">{t.whyAsking} {q.why}</p>
                    </div>
                  </div>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={language === 'ru' ? 'Ваш ответ...' : 'Your answer...'}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                  />
                </label>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-medium transition shadow-lg shadow-green-500/20"
          >
            {t.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
