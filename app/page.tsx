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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Git <span className="text-green-400">Analyzer</span>
          </h1>
          <p className="text-gray-400">
            Analyze your GitHub repository and get actionable recommendations
          </p>
        </div>
        
        <Link
          href="/api/auth/signin"
          className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-4 px-6 rounded-xl font-medium transition shadow-lg shadow-green-500/20"
        >
          Sign in with GitHub
        </Link>

        <p className="text-sm text-gray-500 text-center mt-6">
          We'll analyze your repository and give you concrete tasks to move your project forward
        </p>
      </div>
    </div>
  );
}
