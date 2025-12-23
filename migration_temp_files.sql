-- Создание таблицы TempAnalysisFiles для временного хранения файлов
CREATE TABLE IF NOT EXISTS "TempAnalysisFiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filesData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "TempAnalysisFiles_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS "TempAnalysisFiles_userId_idx" ON "TempAnalysisFiles"("userId");
CREATE INDEX IF NOT EXISTS "TempAnalysisFiles_expiresAt_idx" ON "TempAnalysisFiles"("expiresAt");

-- Опционально: создаём функцию для автоматического удаления устаревших записей
CREATE OR REPLACE FUNCTION delete_expired_temp_files()
RETURNS void AS $$
BEGIN
    DELETE FROM "TempAnalysisFiles" WHERE "expiresAt" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Комментарий для понимания
COMMENT ON TABLE "TempAnalysisFiles" IS 'Временное хранилище файлов репозитория для повторного анализа после уточняющих вопросов. Записи автоматически истекают через 24 часа.';
