-- Добавляем поля для анонимных пользователей
ALTER TABLE "User" 
  ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "anonymousId" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Создаём индексы
CREATE INDEX IF NOT EXISTS "User_anonymousId_idx" ON "User"("anonymousId");
CREATE INDEX IF NOT EXISTS "User_expiresAt_idx" ON "User"("expiresAt");

-- Функция автоочистки устаревших анонимных юзеров
CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_users()
RETURNS void AS $$
BEGIN
    DELETE FROM "User" 
    WHERE "isAnonymous" = true 
      AND "expiresAt" < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN "User"."isAnonymous" IS 'Анонимный пользователь (зашёл через ZIP без GitHub)';
COMMENT ON COLUMN "User"."anonymousId" IS 'UUID для анонимной сессии (сохраняется в cookie)';
COMMENT ON COLUMN "User"."expiresAt" IS 'Дата истечения анонимной сессии (30 дней)';
