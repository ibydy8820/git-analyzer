import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const COOKIE_NAME = 'git_analyzer_anon_id';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 дней

export async function getOrCreateAnonymousUser(): Promise<string> {
  const cookieStore = await cookies();
  let anonymousId = cookieStore.get(COOKIE_NAME)?.value;
  
  if (anonymousId) {
    // Проверяем что юзер существует
    const user = await prisma.user.findUnique({
      where: { anonymousId },
    });
    
    if (user) {
      return user.id;
    }
  }
  
  // Создаём нового анонимного юзера
  anonymousId = randomUUID();
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  
  const user = await prisma.user.create({
    data: {
      anonymousId,
      isAnonymous: true,
      expiresAt,
    },
  });
  
  // Сохраняем в cookie
  cookieStore.set(COOKIE_NAME, anonymousId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  
  console.log(`👤 Created anonymous user: ${user.id}`);
  
  return user.id;
}

export async function getAnonymousUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const anonymousId = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!anonymousId) {
    return null;
  }
  
  const user = await prisma.user.findUnique({
    where: { anonymousId },
  });
  
  return user?.id || null;
}

export async function deleteAnonymousCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
