#!/bin/bash

FILES=(
  "app/api/task-complete/route.ts"
  "app/api/history/route.ts"
  "app/api/follow-up-chat/route.ts"
  "app/api/task-chat/route.ts"
  "app/api/task-instructions/route.ts"
  "app/api/refresh-analysis/route.ts"
  "app/api/archive-tasks/route.ts"
  "app/api/export-pdf/route.ts"
  "app/api/snapshots/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Добавляем import
    sed -i '' '/import { prisma }/a\
import { getOrCreateAnonymousUser } from '\''@/lib/auth/anonymous'\'';
' "$file"
    
    # Заменяем проверку авторизации
    sed -i '' 's/if (!session?.user?.id) {/let userId: string;\
    \
    if (session?.user?.id) {\
      userId = session.user.id;\
    } else {\
      userId = await getOrCreateAnonymousUser();\
    }\
    \
    if (false) {/' "$file"
    
    # Заменяем session.user.id на userId
    sed -i '' 's/session\.user\.id/userId/g' "$file"
    
    echo "✅ Updated: $file"
  fi
done

echo "✅ Все API endpoints обновлены!"
