import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import AnalyzerClient from '@/components/analyzer/AnalyzerClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm bg-gray-800/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            Git <span className="text-green-400">Analyzer</span>
          </h1>
          
          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="flex items-center gap-3 bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-600">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-green-500"
                />
              )}
              <span className="text-sm text-gray-300 font-medium">
                {session.user?.name || session.user?.email}
              </span>
            </div>
            
            {/* Sign Out Button */}
            <a
              href="/api/auth/signout"
              className="px-4 py-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition border border-gray-600 hover:border-red-500"
            >
              Выйти
            </a>
          </div>
        </div>
      </header>

      <main>
        <AnalyzerClient />
      </main>
    </div>
  );
}
