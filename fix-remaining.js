const fs = require('fs');

const simpleFiles = [
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

simpleFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Заменяем imports
  content = content.replace(
    /import { getOrCreateAnonymousUser } from '[^']+';/g,
    ''
  );
  
  content = content.replace(
    "import { prisma } from '@/lib/db/prisma';",
    "import { prisma } from '@/lib/db/prisma';\nimport { getUserId } from '@/lib/auth/getUserId';"
  );
  
  // Заменяем весь блок получения userId
  content = content.replace(
    /const session = await getServerSession\(authOptions\);[\s\S]*?userId = await getOrCreateAnonymousUser\(\);[\s\S]*?}/m,
    'const userId = await getUserId();'
  );
  
  fs.writeFileSync(file, content);
  console.log(`✅ ${file}`);
});

console.log('\n✅ Готово!');
