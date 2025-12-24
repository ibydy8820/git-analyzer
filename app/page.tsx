import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Git <span className="text-green-400">Analyzer</span>
          </h1>
          <p className="text-gray-400">
            Analyze your GitHub repository and get actionable recommendations
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/api/auth/signin"
            className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-4 px-6 rounded-xl font-medium transition shadow-lg shadow-green-500/20"
          >
            <span className="flex items-center justify-center gap-2">
              🐙 Sign in with GitHub
            </span>
          </Link>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">or</span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="block w-full bg-gray-700 hover:bg-gray-600 text-white text-center py-4 px-6 rounded-xl font-medium transition border border-gray-600"
          >
            <span className="flex items-center justify-center gap-2">
              📦 Upload ZIP Archive
            </span>
          </Link>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          Connect GitHub for automatic updates, or upload a ZIP file for one-time analysis
        </p>
      </div>
    </div>
  );
}
