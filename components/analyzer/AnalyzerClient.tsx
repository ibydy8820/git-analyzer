'use client';

import { useState, useEffect } from 'react';
import TaskModal from './TaskModal';
import FollowUpChat from './FollowUpChat';
import TasksList from './TasksList';
import ProjectTimeline from './ProjectTimeline';
import ClarificationModal from './ClarificationModal';
import ZipUploader from './ZipUploader';
import Header from '../layout/Header';

type Language = 'ru' | 'en';

const stageTranslations = {
  ru: { documentation: 'Документация', mvp: 'MVP', launched: 'Запущен', growing: 'Растёт', unknown: 'Неизвестно' },
  en: { documentation: 'Documentation', mvp: 'MVP', launched: 'Launched', growing: 'Growing', unknown: 'Unknown' },
};

const translations = {
  ru: {
    title: 'Анализатор Репозиториев', newAnalysis: 'Новый анализ', history: 'История',
    repoUrl: 'GitHub URL репозитория', repoUrlPlaceholder: 'https://github.com/username/repo-name',
    projectDescription: 'Описание проекта',
    projectDescriptionPlaceholder: 'Опишите ваш проект: какую проблему решает? Для кого предназначен?',
    analyze: 'Анализировать', analyzing: 'Анализирую проект', translating: 'Перевожу',
    downloadPDF: 'Скачать анализ в PDF', downloading: 'Подготовка PDF',
    refreshAnalysis: 'Обновить анализ', refreshing: 'Обновляю анализ',
    summary: 'Краткое описание', stage: 'Стадия', techStack: 'Технологии',
    strengths: 'Сильные стороны', issues: 'Проблемы', nextMilestone: 'Следующая цель',
    filesAnalyzed: 'Проанализировано файлов', linesOfCode: 'строк кода', model: 'Модель',
    priorityLabel: 'Приоритет',
    priority: { high: 'Высокий', medium: 'Средний', low: 'Низкий' },
    noHistory: 'История анализов пуста', loadingHistory: 'Загрузка истории',
    viewAnalysis: 'Посмотреть', tasksCount: 'задач',
  },
  en: {
    title: 'Repository Analyzer', newAnalysis: 'New Analysis', history: 'History',
    repoUrl: 'GitHub Repository URL', repoUrlPlaceholder: 'https://github.com/username/repo-name',
    projectDescription: 'Project Description',
    projectDescriptionPlaceholder: 'Describe your project: What problem does it solve? Who is it for?',
    analyze: 'Analyze', analyzing: 'Analyzing project', translating: 'Translating',
    downloadPDF: 'Download Analysis as PDF', downloading: 'Preparing PDF',
    refreshAnalysis: 'Refresh Analysis', refreshing: 'Refreshing analysis',
    summary: 'Summary', stage: 'Stage', techStack: 'Tech Stack',
    strengths: 'Strengths', issues: 'Issues', nextMilestone: 'Next Milestone',
    filesAnalyzed: 'Files analyzed', linesOfCode: 'lines of code', model: 'Model',
    priorityLabel: 'Priority',
    priority: { high: 'High', medium: 'Medium', low: 'Low' },
    noHistory: 'No analysis history', loadingHistory: 'Loading history',
    viewAnalysis: 'View', tasksCount: 'tasks',
  },
};

export default function AnalyzerClient() {
  const [lang, setLang] = useState<Language>('ru');
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [repoUrl, setRepoUrl] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{ task: any; index: number } | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [prevLang, setPrevLang] = useState<Language>('ru');

  const t = translations[lang];
  const st = stageTranslations[lang];

  const [clarificationNeeded, setClarificationNeeded] = useState<any>(null);
  const [filesCache, setFilesCache] = useState<any>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<"github" | "zip">("github");
  useEffect(() => {
    if (lang !== prevLang && result?.analysis) {
      setPrevLang(lang);
      translateResult();
    }
  }, [lang]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const translateResult = async () => {
    setTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result.analysis, targetLanguage: lang }),
      });
      const data = await response.json();
      if (data.success) {
        setResult({ ...result, analysis: data.translated });
      }
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setTranslating(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data.success) {
        setHistory(data.analyses);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAnalysis = async (id: string) => {
    try {
      const response = await fetch(`/api/analysis/${id}`);
      const data = await response.json();
      if (data.success) {
        setResult(data);
        setActiveTab('new');
        loadSnapshots(id);
      }
    } catch (err) {
      console.error('Failed to load analysis:', err);
    }
  };

  const loadSnapshots = async (id: string) => {
    try {
      const response = await fetch(`/api/snapshots?analysisId=${id}`);
      const data = await response.json();
      if (data.success) {
        setSnapshots(data.snapshots);
      }
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!repoUrl || !projectDescription) {
      setError('Please provide both GitHub URL and project description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setClarificationNeeded(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          projectDescription: lang === 'ru' ? `Ответь на русском языке. ${projectDescription}` : projectDescription,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Проверяем нужны ли уточнения
      if (data.needsClarification && data.questions) {
        console.log('🔍 Clarification needed, showing questions...');
        setClarificationNeeded({
          questions: data.questions,
          partialAnalysis: data.partialAnalysis,
          tempFilesId: data.tempFilesId, // Сохраняем для повторного анализа
        });
      } else {
        setResult(data);
        if (activeTab === 'history') {
          loadHistory();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };


  const handleZipUpload = async () => {
    if (!zipFile || !projectDescription) {
      setError(lang === 'ru' ? 'Пожалуйста, загрузите ZIP файл и добавьте описание' : 'Please provide both ZIP file and project description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setClarificationNeeded(null);

    try {
      const formData = new FormData();
      formData.append('zipFile', zipFile);
      formData.append('projectDescription', lang === 'ru' ? `Ответь на русском языке. ${projectDescription}` : projectDescription);

      const response = await fetch('/api/upload-zip', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (data.needsClarification && data.questions) {
        console.log('🔍 Clarification needed for ZIP');
        setClarificationNeeded({
          questions: data.questions,
          partialAnalysis: data.partialAnalysis,
          tempFilesId: data.tempFilesId,
        });
      } else {
        setResult(data);
        if (activeTab === 'history') {
          loadHistory();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitAnswers = async (answers: Record<string, string>) => {
    setIsAnalyzing(true);
    setClarificationNeeded(null);

    try {
      const response = await fetch('/api/analyze-with-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl || null,
          projectDescription,
          answers,
          tempFilesId: clarificationNeeded.tempFilesId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Analysis with answers failed');
      }
      
      if (data.success) {
        console.log('✅ Analysis with answers completed', data);
        setResult(data);
        setError(null);
        
        // Обновляем историю если нужно
        if (activeTab === 'history') {
          loadHistory();
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('❌ Submit answers error:', err);
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result?.analysisId) return;
    setDownloadingPDF(true);
    try {
      const { downloadAnalysis } = await import('@/lib/utils/pdfGenerator');
      await downloadAnalysis(result.analysisId, 'md');
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    if (!result?.analysisId) return;
    setRefreshing(true);
    try {
      const response = await fetch('/api/refresh-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: result.analysisId }),
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
        if (data.projectHistory) {
          loadSnapshots(data.analysisId);
        }
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm bg-gray-800/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-white">
              Git <span className="text-green-400">Analyzer</span>
            </h1>
          </div>
          <Header />
        </div>
      </header>

      <div className="flex justify-end p-4">
        <div className="inline-flex rounded-lg bg-gray-800 p-1">
          <button onClick={() => setLang('ru')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${lang === 'ru' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}>RU</button>
          <button onClick={() => setLang('en')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${lang === 'en' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}>EN</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('new')} className={`px-6 py-3 rounded-lg font-medium transition ${activeTab === 'new' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>{t.newAnalysis}</button>
          <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-lg font-medium transition ${activeTab === 'history' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>{t.history}</button>
        </div>

        {activeTab === 'new' && (
          <>
            <div className="bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-white">{t.title}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    {lang === 'ru' ? 'Выберите способ загрузки' : 'Choose upload method'}
                  </label>
                  
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {setUploadMethod('github'); setZipFile(null);}}
                      disabled={isAnalyzing}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                        uploadMethod === 'github'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        🐙 GitHub URL
                      </span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {setUploadMethod('zip'); setRepoUrl('');}}
                      disabled={isAnalyzing}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                        uploadMethod === 'zip'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        📦 ZIP архив
                      </span>
                    </button>
                  </div>

                  {uploadMethod === 'github' ? (
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder={t.repoUrlPlaceholder}
                      disabled={isAnalyzing}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:opacity-50"
                    />
                  ) : (
                    <ZipUploader
                      onUpload={(file) => setZipFile(file)}
                      disabled={isAnalyzing}
                      language={lang}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t.projectDescription}</label>
                  <textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder={t.projectDescriptionPlaceholder} rows={4} disabled={isAnalyzing} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:opacity-50" />
                </div>

                {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">{error}</div>}

                <button onClick={uploadMethod === 'github' ? handleAnalyze : handleZipUpload} disabled={isAnalyzing || translating || (uploadMethod === 'github' && !repoUrl) || (uploadMethod === 'zip' && !zipFile)} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium disabled:bg-gray-600 disabled:cursor-not-allowed transition shadow-lg shadow-green-500/20">
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t.analyzing}
                    </span>
                  ) : translating ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t.translating}
                    </span>
                  ) : t.analyze}
                </button>

                {result && result.analysisId && (
                  <>
                    <button onClick={handleDownloadPDF} disabled={downloadingPDF} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium disabled:bg-gray-600 disabled:cursor-not-allowed transition border border-gray-600 hover:border-green-500">
                      {downloadingPDF ? (
                        <span className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {t.downloading}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">📄 {t.downloadPDF}</span>
                      )}
                    </button>

                    <button onClick={handleRefreshAnalysis} disabled={refreshing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium disabled:bg-gray-600 disabled:cursor-not-allowed transition border border-blue-500">
                      {refreshing ? (
                        <span className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {t.refreshing}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">🔄 {t.refreshAnalysis}</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {result && result.analysis && (
              <div className="mt-8 space-y-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">{t.summary}</h3>
                  <p className="text-gray-300">{result.analysis.projectSummary}</p>
                </div>

                {result.analysis.tasks && result.analysis.tasks.length > 0 && (
                  <TasksList
                    tasks={result.analysis.tasks}
                    analysisId={result.analysisId}
                    language={lang}
                    onTaskClick={(task, index) => setSelectedTask({ task, index })}
                  />
                )}

                {result.analysis.issues && result.analysis.issues.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4">⚠️ {t.issues}</h3>
                    <ul className="space-y-3">
                      {result.analysis.issues.map((issue: any, i: number) => (
                        <li key={i} className={`border p-4 rounded-lg ${issue.severity === 'high' ? 'bg-red-900/20 border-red-500/30' : issue.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-gray-700/50 border-gray-600'}`}>
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-medium text-white">{issue.area}</span>
                            <span className={`px-2 py-1 text-xs rounded font-medium ${issue.severity === 'high' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                              {t.priorityLabel}: {t.priority[issue.severity as keyof typeof t.priority]}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">{issue.detail}</p>
                          {issue.filePath && <p className="text-gray-500 text-xs mt-2">📁 {issue.filePath}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.analysis.strengths && result.analysis.strengths.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-green-400 mb-4">✅ {t.strengths}</h3>
                    <ul className="space-y-3">
                      {result.analysis.strengths.map((s: any, i: number) => (
                        <li key={i} className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
                          <span className="font-medium text-green-300">{s.area}:</span> <span className="text-gray-300">{s.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">{t.stage}</h3>
                    <span className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                      {st[result.analysis.detectedStage as keyof typeof st]}
                    </span>
                  </div>

                  {result.analysis.techStack && result.analysis.techStack.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                      <h3 className="text-sm font-medium text-gray-400 mb-3">{t.techStack}</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.analysis.techStack.map((tech: string) => (
                          <span key={tech} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm border border-gray-600">{tech}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {result.analysis.nextMilestone && (
                  <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 border border-green-500/30 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">🎯 {t.nextMilestone}</h3>
                    <p className="text-gray-200 text-lg">{result.analysis.nextMilestone}</p>
                  </div>
                )}

                {snapshots.length > 0 && (
                  <ProjectTimeline snapshots={snapshots} language={lang} />
                )}

                <FollowUpChat analysisId={result.analysisId} language={lang} />

                {result.metadata && (
                  <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg text-sm text-gray-400">
                    <p>📊 {t.filesAnalyzed}: {result.metadata.filesAnalyzed} • {result.metadata.totalLines} {t.linesOfCode}</p>
                    <p>🤖 {t.model}: {result.metadata.modelUsed} • {(result.metadata.analysisDurationMs / 1000).toFixed(1)}s</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-white">{t.history}</h2>
            
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-gray-400">{t.loadingHistory}</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-400">{t.noHistory}</div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="bg-gray-700/50 border border-gray-600 p-5 rounded-lg hover:border-green-500/50 transition cursor-pointer" onClick={() => loadAnalysis(item.id)}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{item.repoUrl || 'Uploaded files'}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2">{item.summary}</p>
                      </div>
                      <button className="ml-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition">{t.viewAnalysis}</button>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span className="px-2 py-1 bg-gray-800 rounded border border-gray-600">📅 {formatDate(item.createdAt)}</span>
                      <span className="px-2 py-1 bg-gray-800 rounded border border-gray-600">📊 {item.filesAnalyzed} файлов</span>
                      <span className="px-2 py-1 bg-gray-800 rounded border border-gray-600">✅ {item.tasksCount} {t.tasksCount}</span>
                      {item.detectedStage && <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">{st[item.detectedStage as keyof typeof st]}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTask && result && (
        <TaskModal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} task={selectedTask.task} analysisId={result.analysisId} taskIndex={selectedTask.index} language={lang} />
      )}

      {clarificationNeeded && (
        <ClarificationModal
          isOpen={!!clarificationNeeded}
          questions={clarificationNeeded.questions}
          partialAnalysis={clarificationNeeded.partialAnalysis}
          onSubmit={handleSubmitAnswers}
          language={lang}
        />
      )}
    </div>
  );
}
