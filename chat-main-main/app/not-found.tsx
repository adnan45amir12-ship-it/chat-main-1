'use client';

import Link from 'next/link';
import { Home, Users } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 p-0.5 shadow-2xl flex items-center justify-center animate-bounce">
        <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center">
          <Users className="w-8 h-8 text-sky-400" />
        </div>
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link
        href="/"
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
      >
        <Home className="w-4 h-4" />
        Back to CommUnity Hub
      </Link>
    </div>
  );
}
