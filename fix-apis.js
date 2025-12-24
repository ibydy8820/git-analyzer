const fs = require('fs');

const files = [
  'app/api/task-complete/route.ts',
  'app/api/history/route.ts',
  'app/api/follow-up-chat/route.ts',
  'app/api/task-chat/route.ts',
  'app/api/task-instructions/route.ts',
  'app/api/refresh-analysis/route.ts',
  'app/api/archive-tasks/route.ts',
  'app/api/export-pdf/route.ts',
  'app/api/snapshots/route.ts',
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`⏭️  Skip: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Добавляем import если нет
  if (!content.includes('getOrCreateAnonymousUser')) {
    content = content.replace(
      "import { prisma } from '@/lib/db/prisma';",
      "import { prisma } from '@/lib/db/prisma';\nimport { getOrCreateAnonymousUser } from '@/lib/auth/anonymous';"
    );
  }
  
  // Заменяем проверку авторизации
  content = content.replace(
    /const session = await getServerSession\(authOptions\);\s+if \(!session\?\.user\?\.id\) \{\s+return NextResponse\.json\([^}]+\}, \{ status: 401 \}\);\s+\}/,
    `const session = await getServerSession(authOptions);
    let userId: string;
    
    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      userId = await getOrCreateAnonymousUser();
    }`
  );
  
  // Заменяем использование session.user.id на userId там где нужно
  content = content.replace(/const userId = session\.user\.id;/g, '');
  content = content.replace(/userId: session\.user\.id,/g, 'userId,');
  
  fs.writeFileSync(file, content);
  console.log(`✅ ${file}`);
});

console.log('\n✅ Все API обновлены!');
