'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { Users } from 'lucide-react';

function AppLoading() {
  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 p-0.5 shadow-2xl flex items-center justify-center animate-pulse">
        <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
          <Users className="w-6 h-6 text-sky-400" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold text-slate-100">CommUnity</h3>
        <p className="text-xs text-slate-500">Connecting to Realtime Database &amp; Auth...</p>
      </div>
    </div>
  );
}

const CommunityApp = dynamic(
  () => import('@/components/CommunityApp').then((mod) => mod.CommunityApp),
  {
    ssr: false,
    loading: () => <AppLoading />,
  }
);

export default function Home() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CommunityApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

