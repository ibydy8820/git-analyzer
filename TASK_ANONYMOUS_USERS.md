# 🎯 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: Анонимные пользователи с ZIP архивами

## КОНТЕКСТ ПРОЕКТА

**Проект:** Git Analyzer - AI-powered анализатор GitHub репозиториев  
**URL:** https://git-analyzer-seven.vercel.app  
**Репозиторий:** https://github.com/ibydy8820/git-analyzer  
**Стек:** Next.js 16, Prisma, Supabase, NextAuth, Claude Opus 4.5 (OpenRouter)

**Текущее состояние:**
- ✅ Авторизация через GitHub OAuth работает
- ✅ Анализ GitHub репозиториев работает
- ✅ Анализ ZIP файлов работает
- ❌ ZIP без авторизации = одноразовый анализ БЕЗ истории
- ❌ Для анонимных юзеров нет кнопки "Подключить GitHub"

---

## ЗАДАЧА 1: Анонимные сессии с сохранением истории

### Проблема:
Когда пользователь заходит БЕЗ авторизации и загружает ZIP:
- Анализ работает ✅
- Но история НЕ сохраняется ❌
- Нет доступа к задачам, чату, timeline ❌
- При обновлении страницы всё теряется ❌

### Требования:

**1.1. Генерация анонимного ID**
- При первом заходе БЕЗ auth → генерировать `anonymousId` (UUID v4)
- Сохранять в secure cookie (httpOnly, sameSite: lax, maxAge: 30 days)
- Cookie name: `git_analyzer_anon_id`

**1.2. Схема БД (Prisma)**
```prisma
model User {
  id            String     @id @default(cuid())
  email         String?    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  githubId      String?    @unique
  githubToken   String?
  
  // ДЛЯ АНОНИМНЫХ:
  isAnonymous   Boolean    @default(false)  // NEW
  anonymousId   String?    @unique          // NEW
  expiresAt     DateTime?                   // NEW (для автоочистки)
  
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  
  accounts      Account[]
  tempFiles     TempAnalysisFiles[]
  sessions      Session[]
  analyses      Analysis[]
}
```

**1.3. Логика создания анонимного юзера**

Файл: `lib/auth/anonymous.ts` (создать новый)
```typescript
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function getOrCreateAnonymousUser(): Promise<string> {
  const cookieStore = await cookies();
  let anonymousId = cookieStore.get('git_analyzer_anon_id')?.value;
  
  if (!anonymousId) {
    // Генерируем новый ID
    anonymousId = uuidv4();
    
    // Создаём анонимного юзера в БД
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
    
    await prisma.user.create({
      data: {
        anonymousId,
        isAnonymous: true,
        expiresAt,
      },
    });
    
    // Сохраняем в cookie
    cookieStore.set('git_analyzer_anon_id', anonymousId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
    });
  }
  
  // Находим userId по anonymousId
  const user = await prisma.user.findUnique({
    where: { anonymousId },
  });
  
  if (!user) {
    throw new Error('Anonymous user not found');
  }
  
  return user.id;
}
```

**1.4. Обновить API endpoints**

Файлы для изменения:
- `app/api/upload-zip/route.ts`
- `app/api/analyze/route.ts` (если нужно)
- `app/api/analyze-with-answers/route.ts`
- `app/api/task-complete/route.ts`
- `app/api/history/route.ts`
- и все остальные где проверяется `session?.user?.id`

Пример изменения:
```typescript
// БЫЛО:
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const userId = session.user.id;

// СТАЛО:
const session = await getServerSession(authOptions);
let userId: string;

if (session?.user?.id) {
  // Авторизованный пользователь
  userId = session.user.id;
} else {
  // Анонимный пользователь
  userId = await getOrCreateAnonymousUser();
}
```

**1.5. Автоочистка устаревших анонимных юзеров**

SQL для Supabase Cron (опционально):
```sql
-- Удалять анонимных юзеров старше 30 дней
DELETE FROM "User" 
WHERE "isAnonymous" = true 
  AND "expiresAt" < NOW();
```

---

## ЗАДАЧА 2: Кнопка "Подключить GitHub" для анонимных

### Проблема:
Когда пользователь зашёл анонимно (через ZIP):
- Справа вверху НИЧЕГО нет ❌
- Нет возможности подключить GitHub потом ❌

Когда пользователь зашёл через GitHub:
- Справа вверху: аватар + имя + кнопка "Выйти" ✅

### Требования:

**2.1. UI для анонимных юзеров**

Файл: `app/dashboard/page.tsx` и `components/analyzer/AnalyzerClient.tsx`

Логика:
```typescript
// Если session есть:
[Аватар] [Имя] [Выйти]

// Если session нет (анонимный):
[🔗 Подключить GitHub]
```

**2.2. Поведение кнопки "Подключить GitHub"**

При клике:
1. Редирект на `/api/auth/signin?callbackUrl=/dashboard`
2. Пользователь авторизуется через GitHub OAuth
3. После успешной авторизации:
   - Мигрировать данные анонимного юзера → GitHub аккаунт
   - Удалить анонимного юзера
   - Перенести все анализы на новый userId

**2.3. Миграция данных**

Файл: `app/api/auth/callback/migrate/route.ts` (создать новый)

Логика:
```typescript
// После успешного GitHub signin:
1. Получить anonymousId из cookie
2. Найти анонимного юзера в БД
3. Обновить все Analysis записи:
   UPDATE Analysis SET userId = [new_github_user_id] 
   WHERE userId = [anonymous_user_id]
4. Удалить анонимного юзера
5. Удалить cookie
```

**2.4. UI компонент**

Создать: `components/layout/Header.tsx`

```typescript
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Header() {
  const { data: session } = useSession();
  
  return (
    <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
      {session ? (
        // Авторизованный
        <div className="flex items-center gap-3">
          {session.user?.image && (
            <img src={session.user.image} alt="Avatar" className="w-10 h-10 rounded-full" />
          )}
          <span className="text-white font-medium">{session.user?.name}</span>
        </div>
        <Link
          href="/api/auth/signout"
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
        >
          Выйти
        </Link>
      ) : (
        // Анонимный
        <>
          <div className="text-gray-400 text-sm">
            💡 Анонимный режим
          </div>
          <Link
            href="/api/auth/signin?callbackUrl=/dashboard"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2"
          >
            🔗 Подключить GitHub
          </Link>
        </>
      )}
    </div>
  );
}
```

---

## ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

### Создать новые:
- [ ] `lib/auth/anonymous.ts` - логика анонимных сессий
- [ ] `lib/auth/migrate.ts` - миграция данных при подключении GitHub
- [ ] `components/layout/Header.tsx` - header компонент
- [ ] `app/api/auth/migrate-anonymous/route.ts` - API для миграции

### Изменить существующие:
- [ ] `prisma/schema.prisma` - добавить поля isAnonymous, anonymousId, expiresAt
- [ ] `app/api/upload-zip/route.ts` - использовать getOrCreateAnonymousUser()
- [ ] `app/api/analyze-with-answers/route.ts` - поддержка анонимных
- [ ] `app/api/task-complete/route.ts` - поддержка анонимных
- [ ] `app/api/history/route.ts` - поддержка анонимных
- [ ] `app/api/follow-up-chat/route.ts` - поддержка анонимных
- [ ] `app/api/task-chat/route.ts` - поддержка анонимных
- [ ] `app/api/task-instructions/route.ts` - поддержка анонимных
- [ ] `app/api/refresh-analysis/route.ts` - поддержка анонимных
- [ ] `app/dashboard/page.tsx` - использовать Header компонент
- [ ] `components/analyzer/AnalyzerClient.tsx` - использовать Header компонент

### SQL миграция для Supabase:
```sql
ALTER TABLE "User" 
  ADD COLUMN "isAnonymous" BOOLEAN DEFAULT false,
  ADD COLUMN "anonymousId" TEXT UNIQUE,
  ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "User_anonymousId_idx" ON "User"("anonymousId");
CREATE INDEX "User_expiresAt_idx" ON "User"("expiresAt");
```

---

## ПЛАН РЕАЛИЗАЦИИ

### Этап 1: БД и базовая логика (5 мин)
1. Обновить `schema.prisma`
2. Выполнить SQL в Supabase
3. `npx prisma generate`
4. Создать `lib/auth/anonymous.ts`

### Этап 2: Обновить API endpoints (10 мин)
1. Обновить все API где используется userId
2. Добавить поддержку анонимных через getOrCreateAnonymousUser()

### Этап 3: UI компонент (5 мин)
1. Создать Header компонент
2. Добавить в dashboard и analyzer
3. Кнопка "Подключить GitHub" для анонимных

### Этап 4: Миграция данных (5 мин)
1. Создать `lib/auth/migrate.ts`
2. При signin проверять cookie anonymousId
3. Переносить все данные на GitHub аккаунт
4. Удалять анонимного юзера

### Этап 5: Тестирование (5 мин)
1. Зайти анонимно → загрузить ZIP
2. Проверить что история сохраняется
3. Нажать "Подключить GitHub"
4. Проверить что данные мигрировали

---

## ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Cookie настройки:
```typescript
{
  name: 'git_analyzer_anon_id',
  value: uuid(),
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60, // 30 дней
  path: '/'
}
```

### Проверка пользователя в API:
```typescript
async function getUserId(req: NextRequest): Promise<string> {
  // Сначала проверяем сессию
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return session.user.id;
  }
  
  // Если нет - ищем/создаём анонимного
  return await getOrCreateAnonymousUser();
}
```

### Миграция при подключении GitHub:
```typescript
// В NextAuth callbacks.signIn:
async signIn({ user, account }) {
  const cookieStore = await cookies();
  const anonymousId = cookieStore.get('git_analyzer_anon_id')?.value;
  
  if (anonymousId) {
    // Мигрируем данные
    await migrateAnonymousToGithub(anonymousId, user.id);
    
    // Удаляем cookie
    cookieStore.delete('git_analyzer_anon_id');
  }
  
  return true;
}
```

---

## КРИТИЧНЫЕ МОМЕНТЫ

⚠️ **Security:**
- Cookie ДОЛЖЕН быть httpOnly (защита от XSS)
- Валидация anonymousId на серверной стороне
- Проверка что анонимный юзер не может получить чужие данные

⚠️ **Performance:**
- Индексы на anonymousId и expiresAt
- Автоочистка через Supabase Cron (не при каждом запросе)

⚠️ **UX:**
- Плавная миграция (пользователь не теряет данные)
- Уведомление "История сохранена в браузере"
- Подсказка "Подключи GitHub для доступа с других устройств"

---

## ТЕСТОВЫЕ СЦЕНАРИИ

### Сценарий 1: Анонимный юзер
1. Открыть https://git-analyzer-seven.vercel.app
2. Нажать "Upload ZIP Archive"
3. Загрузить ZIP, проанализировать
4. ✅ История должна сохраниться
5. ✅ Задачи работают
6. ✅ Чат работает
7. ✅ Timeline работает
8. Обновить страницу (F5)
9. ✅ История НЕ пропала
10. Закрыть браузер, открыть заново
11. ✅ История всё ещё есть (cookie живёт 30 дней)

### Сценарий 2: Подключение GitHub
1. Зайти анонимно, создать 2-3 анализа
2. Нажать "🔗 Подключить GitHub"
3. Авторизоваться
4. ✅ Вернуться на /dashboard
5. ✅ ВСЕ старые анализы на месте (мигрировали)
6. ✅ Справа теперь аватар GitHub
7. ✅ Можно работать с GitHub URL теперь

### Сценарий 3: Автоочистка
1. Создать тестового анонимного юзера с expiresAt в прошлом
2. Запустить cron job
3. ✅ Анонимный юзер удалён
4. ✅ Его анализы тоже удалены (CASCADE)

---

## ПРИОРИТЕТ ЗАДАЧ

**HIGH (делаем СЕЙЧАС):**
- Задача 2: Кнопка "Подключить GitHub" для анонимных (5 мин)
  → Можно сделать БЕЗ миграции данных пока
  
**MEDIUM (делаем ПОСЛЕ):**
- Задача 1: Анонимные сессии с историей (30 мин)
  → Полноценная реализация

---

## БЫСТРОЕ РЕШЕНИЕ (MVP)

Если нужно БЫСТРО запустить:

1. Добавить Header с кнопкой "Подключить GitHub"
2. История пока в localStorage (не БД)
3. При подключении GitHub - просто редирект, данные не мигрируем

Это займёт 5 минут vs 30 минут для полного решения.

---

## ВОПРОС К ЗАКАЗЧИКУ

**Делаем полное решение (30 мин) или быстрое (5 мин)?**

Быстрое = кнопка работает, но история в браузере (не переносится)
Полное = всё работает идеально, миграция данных, БД

**ЧТО ВЫБИРАЕМ?**

