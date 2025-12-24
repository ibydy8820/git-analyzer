'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Header() {
  const { data: session } = useSession();
  
  return (
    <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
      {session?.user ? (
        <>
          <div className="flex items-center gap-3">
            {session.user.image && (
              <img src={session.user.image} alt="Avatar" className="w-10 h-10 rounded-full" />
            )}
            <span className="text-white font-medium">{session.user.name}</span>
          </div>
          <Link
            href="/api/auth/signout"
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm font-medium"
          >
            Выйти
          </Link>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Анонимный режим
          </div>
          <Link
            href="/api/auth/signin?callbackUrl=/dashboard"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition text-sm font-medium flex items-center gap-2"
          >
            <span>🔗</span>
            Подключить GitHub
          </Link>
        </>
      )}
    </div>
  );
}
