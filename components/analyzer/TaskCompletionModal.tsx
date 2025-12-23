'use client';

interface TaskCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskTitle: string;
  language: 'ru' | 'en';
}

export default function TaskCompletionModal({ isOpen, onClose, onConfirm, taskTitle, language }: TaskCompletionModalProps) {
  if (!isOpen) return null;

  const t = language === 'ru' ? {
    title: 'Подтвердите выполнение',
    question: 'Вы уверены что выполнили эту задачу?',
    taskLabel: 'Задача:',
    confirm: 'Да, выполнено',
    cancel: 'Отмена',
  } : {
    title: 'Confirm Completion',
    question: 'Are you sure you completed this task?',
    taskLabel: 'Task:',
    confirm: 'Yes, completed',
    cancel: 'Cancel',
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">{t.title}</h3>
        <p className="text-gray-300 mb-4">{t.question}</p>
        
        <div className="bg-gray-700/50 border border-gray-600 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-400 mb-1">{t.taskLabel}</p>
          <p className="text-white font-medium">{taskTitle}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition border border-gray-600"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition shadow-lg shadow-green-500/20"
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
