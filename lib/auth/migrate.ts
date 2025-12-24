import { prisma } from '@/lib/db/prisma';
import { getAnonymousUserId, deleteAnonymousCookie } from './anonymous';

export async function migrateAnonymousToGithub(githubUserId: string): Promise<void> {
  const anonymousUserId = await getAnonymousUserId();
  
  if (!anonymousUserId) {
    console.log('No anonymous user to migrate');
    return;
  }
  
  console.log(`🔄 Migrating data from anonymous ${anonymousUserId} to GitHub user ${githubUserId}`);
  
  try {
    // Переносим все анализы
    await prisma.analysis.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: githubUserId },
    });
    
    // Переносим временные файлы
    await prisma.tempAnalysisFiles.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: githubUserId },
    });
    
    // Удаляем анонимного юзера (CASCADE удалит sessions если есть)
    await prisma.user.delete({
      where: { id: anonymousUserId },
    });
    
    // Удаляем cookie
    await deleteAnonymousCookie();
    
    console.log('✅ Anonymous data migrated successfully');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    // Не бросаем ошибку - пользователь всё равно авторизован
  }
}
