-- Add Snapshot table
CREATE TABLE IF NOT EXISTS "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filesCount" INTEGER NOT NULL,
    "linesOfCode" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "hasTests" BOOLEAN NOT NULL DEFAULT false,
    "hasCI" BOOLEAN NOT NULL DEFAULT false,
    "hasDocs" BOOLEAN NOT NULL DEFAULT false,
    "hasDeployment" BOOLEAN NOT NULL DEFAULT false,
    "tasks" JSONB NOT NULL,
    "completedTasks" JSONB NOT NULL,
    "comparison" JSONB,
    "progressScore" DOUBLE PRECISION,
    CONSTRAINT "Snapshot_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add TaskCompletion table
CREATE TABLE IF NOT EXISTS "TaskCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "taskIndex" INTEGER NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskCompletion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskCompletion_analysisId_taskIndex_key" UNIQUE ("analysisId", "taskIndex")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Snapshot_analysisId_idx" ON "Snapshot"("analysisId");
CREATE INDEX IF NOT EXISTS "TaskCompletion_analysisId_idx" ON "TaskCompletion"("analysisId");
