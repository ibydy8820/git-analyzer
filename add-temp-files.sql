-- Временное хранилище файлов для повторного анализа
CREATE TABLE IF NOT EXISTS "TempAnalysisFiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filesData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TempAnalysisFiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TempAnalysisFiles_userId_idx" ON "TempAnalysisFiles"("userId");
CREATE INDEX IF NOT EXISTS "TempAnalysisFiles_expiresAt_idx" ON "TempAnalysisFiles"("expiresAt");
