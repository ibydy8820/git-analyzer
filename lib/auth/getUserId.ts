import { getServerSession } from 'next-auth';
import { authOptions } from './config';
import { getOrCreateAnonymousUser } from './anonymous';

/**
 * Универсальная функция получения userId для API endpoints
 * Работает как для авторизованных, так и для анонимных пользователей
 */
export async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.id) {
    return session.user.id;
  }
  
  return await getOrCreateAnonymousUser();
}
