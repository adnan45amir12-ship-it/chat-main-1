'use client';

import React from 'react';
import {
  Users,
  Shield,
  Sun,
  Moon,
  Database,
  Menu,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { AvatarDisplay } from '@/lib/avatars';

interface NavbarProps {
  currentView: 'group' | 'ai' | 'private' | 'admin';
  onOpenProfile: () => void;
  onOpenFirebaseConfig: () => void;
  onOpenAdmin: () => void;
  onToggleSidebar?: () => void;
  onlineCount?: number;
  communityName?: string;
}

export function Navbar({
  currentView,
  onOpenProfile,
  onOpenFirebaseConfig,
  onOpenAdmin,
  onToggleSidebar,
  onlineCount = 1,
  communityName = 'CommUnity',
}: NavbarProps) {
  const { profile, user, isAdmin, isConfigured } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 shrink-0 bg-white/95 dark:bg-[#0c1220]/95 border-b border-slate-200/90 dark:border-slate-800/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-30 transition-colors">
      {/* Left: Mobile Drawer Trigger + Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors shrink-0"
            title="Toggle Navigation Menu"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-md shadow-indigo-900/20 shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-[10px] bg-white dark:bg-[#0c1220] flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate leading-tight flex items-center gap-1.5">
              <span>{communityName}</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {onlineCount} {onlineCount === 1 ? 'member' : 'members'} online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Firebase Config status - only show if admin or if configuration is needed */}
        {(isAdmin || !isConfigured) && (
          <button
            onClick={onOpenFirebaseConfig}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-500/40 hover:bg-amber-100 animate-pulse'
            }`}
            title="Firebase Realtime Database Settings"
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {isConfigured ? 'Connected' : 'Setup Firebase'}
            </span>
          </button>
        )}

        {/* Admin Dashboard Button (Only for Admin) */}
        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              currentView === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20'
            }`}
            title="Open Admin Moderation Dashboard"
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline">Admin</span>
          </button>
        )}

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* User Profile Trigger */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="My Account & Profile"
        >
          <AvatarDisplay gender={profile?.gender || 'Male'} size="sm" online={true} />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden md:inline truncate max-w-[110px]">
            {profile?.name || user?.displayName || 'Member'}
          </span>
        </button>
      </div>
    </header>
  );
}
