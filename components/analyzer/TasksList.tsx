'use client';

import { useState, useEffect } from 'react';
import TaskCompletionModal from './TaskCompletionModal';

interface TasksListProps {
  tasks: any[];
  analysisId: string;
  language: 'ru' | 'en';
  onTaskClick: (task: any, index: number) => void;
}

export default function TasksList({ tasks, analysisId, language, onTaskClick }: TasksListProps) {
  const [completions, setCompletions] = useState<Map<number, boolean>>(new Map());
  const [confirmingTask, setConfirmingTask] = useState<{ index: number; title: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const t = language === 'ru' ? {
    tasks: 'Задачи на неделю',
    progress: 'Прогресс',
    complexityLabel: 'Сложность',
    priorityLabel: 'Приоритет',
    priority: { high: 'Высокий', medium: 'Средний', low: 'Низкий' },
    complexity: { high: 'Высокая', medium: 'Средняя', low: 'Низкая' },
    category: { documentation: 'Документация', technical: 'Технические', product: 'Продукт', marketing: 'Маркетинг', business: 'Бизнес' },
    estimatedTime: 'мин',
    clickToViewInstructions: 'Кликните для инструкций',
  } : {
    tasks: 'Tasks for the Week',
    progress: 'Progress',
    complexityLabel: 'Complexity',
    priorityLabel: 'Priority',
    priority: { high: 'High', medium: 'Medium', low: 'Low' },
    complexity: { high: 'High', medium: 'Medium', low: 'Low' },
    category: { documentation: 'Documentation', technical: 'Technical', product: 'Product', marketing: 'Marketing', business: 'Business' },
    estimatedTime: 'min',
    clickToViewInstructions: 'Click for instructions',
  };

  useEffect(() => {
    loadCompletions();
  }, [analysisId]);

  const loadCompletions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/task-complete?analysisId=${analysisId}`);
      const data = await response.json();
      if (data.success) {
        const map = new Map<number, boolean>();
        data.completions.forEach((c: any) => {
          map.set(c.taskIndex, c.completed);
        });
        setCompletions(map);
      }
    } catch (err) {
      console.error('Failed to load completions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, index: number, title: string) => {
    e.stopPropagation();
    
    const isCompleted = completions.get(index) || false;
    
    if (!isCompleted) {
      setConfirmingTask({ index, title });
    } else {
      setCompletions(prev => new Map(prev).set(index, false));
      toggleTask(index, title, false);
    }
  };

  const toggleTask = async (index: number, title: string, completed: boolean) => {
    try {
      await fetch('/api/task-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, taskIndex: index, taskTitle: title, completed }),
      });
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setCompletions(prev => new Map(prev).set(index, !completed));
    }
  };

  const handleConfirmComplete = () => {
    if (confirmingTask) {
      setCompletions(prev => new Map(prev).set(confirmingTask.index, true));
      toggleTask(confirmingTask.index, confirmingTask.title, true);
      setConfirmingTask(null);
    }
  };

  const completedCount = Array.from(completions.values()).filter(Boolean).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getComplexity = (estimatedMinutes: number): 'low' | 'medium' | 'high' => {
    if (estimatedMinutes <= 30) return 'low';
    if (estimatedMinutes <= 120) return 'medium';
    return 'high';
  };

  return (
    <>
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-400">📋 {t.tasks}</h3>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{t.progress}:</span>
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-sm text-green-400 font-medium">{completedCount}/{totalCount}</span>
          </div>
        </div>

        <ul className="space-y-4">
          {tasks.slice(0, 5).map((task: any, i: number) => {
            const complexity = getComplexity(task.estimatedMinutes);
            const isCompleted = completions.get(i) || false;
            
            return (
              <li 
                key={i}
                className={`border p-5 rounded-lg transition cursor-pointer group ${
                  isCompleted 
                    ? 'bg-gray-700/30 border-gray-600 opacity-60' 
                    : 'bg-gray-700/50 border-gray-600 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div 
                    onClick={(e) => handleCheckboxClick(e, i, task.title)}
                    className="flex-shrink-0 mt-1"
                  >
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-500 hover:border-green-500'
                    }`}>
                      {isCompleted && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex-1" onClick={() => onTaskClick(task, i)}>
                    <div className="flex items-start justify-between mb-3">
                      <h4 className={`font-semibold text-lg transition flex-1 ${
                        isCompleted 
                          ? 'text-gray-500 line-through' 
                          : 'text-white group-hover:text-green-400'
                      }`}>
                        {task.title}
                      </h4>
                      <div className="flex gap-2 ml-4">
                        <span className={`px-2 py-1 text-xs rounded font-medium whitespace-nowrap ${
                          complexity === 'high' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                          complexity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 
                          'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}>
                          {t.complexityLabel}: {t.complexity[complexity]}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded font-medium whitespace-nowrap ${
                          task.priority === 'high' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 
                          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 
                          'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {t.priorityLabel}: {t.priority[task.priority as keyof typeof t.priority]}
                        </span>
                      </div>
                    </div>
                    <p className={`mb-3 leading-relaxed ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {task.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="px-2 py-1 bg-gray-800 rounded border border-gray-600">
                          ⏱️ {task.estimatedMinutes} {t.estimatedTime}
                        </span>
                        <span className="px-2 py-1 bg-gray-800 rounded border border-gray-600">
                          📂 {t.category[task.category as keyof typeof t.category]}
                        </span>
                      </div>
                      {!isCompleted && (
                        <span className="text-xs text-green-400 opacity-0 group-hover:opacity-100 transition">
                          {t.clickToViewInstructions} →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {confirmingTask && (
        <TaskCompletionModal
          isOpen={!!confirmingTask}
          onClose={() => setConfirmingTask(null)}
          onConfirm={handleConfirmComplete}
          taskTitle={confirmingTask.title}
          language={language}
        />
      )}
    </>
  );
}
