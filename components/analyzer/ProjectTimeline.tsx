'use client';

interface ProjectTimelineProps {
  snapshots: any[];
  language: 'ru' | 'en';
}

export default function ProjectTimeline({ snapshots, language }: ProjectTimelineProps) {
  if (!snapshots || snapshots.length === 0) return null;

  const t = language === 'ru' ? {
    title: 'История развития проекта',
    week: 'Неделя',
    completed: 'выполнено',
    changes: 'Изменения',
    lines: 'строк',
    files: 'файлов',
    stage: 'Стадия',
  } : {
    title: 'Project Development History',
    week: 'Week',
    completed: 'completed',
    changes: 'Changes',
    lines: 'lines',
    files: 'files',
    stage: 'Stage',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-green-400 mb-6">📈 {t.title}</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700"></div>
        
        <div className="space-y-8">
          {snapshots.map((snapshot, i) => {
            const comparison = snapshot.comparison as any;
            const isLatest = i === snapshots.length - 1;
            
            return (
              <div key={snapshot.id} className="relative pl-20">
                {/* Timeline dot */}
                <div className={`absolute left-5 top-2 w-6 h-6 rounded-full border-4 ${
                  isLatest 
                    ? 'bg-green-500 border-green-400' 
                    : 'bg-gray-700 border-gray-600'
                }`}></div>
                
                {/* Card */}
                <div className={`border rounded-lg p-4 ${
                  isLatest 
                    ? 'bg-green-900/20 border-green-500/30' 
                    : 'bg-gray-700/30 border-gray-600'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-sm text-gray-400">{t.week} {snapshot.weekNumber}</span>
                      <h4 className="text-white font-semibold">
                        {snapshot.stage === 'mvp' ? 'MVP' : snapshot.stage === 'launched' ? (language === 'ru' ? 'Запущен' : 'Launched') : snapshot.stage}
                      </h4>
                    </div>
                    {isLatest && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                        {language === 'ru' ? 'Текущая' : 'Current'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">✅ {(snapshot.completedTasks as string[]).length}/{(snapshot.tasks as any[]).length} {t.completed}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">📊 {snapshot.linesOfCode} {t.lines}</span>
                    </div>
                  </div>

                  {comparison && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-xs text-gray-400 mb-2">{t.changes}:</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {comparison.linesDelta > 0 && (
                          <span className="text-green-400">+{comparison.linesDelta} {t.lines}</span>
                        )}
                        {comparison.filesDelta > 0 && (
                          <span className="text-green-400">+{comparison.filesDelta} {t.files}</span>
                        )}
                        {comparison.stageChanged && (
                          <span className="text-blue-400">{t.stage}: {comparison.oldStage} → {comparison.newStage}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
