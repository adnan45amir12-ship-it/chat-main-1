'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
  Users,
  Search,
  LogOut,
  Shield,
  X,
  ChevronRight,
  Circle,
} from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth, FIXED_ADMIN_UID } from '@/context/AuthContext';
import { UserProfile } from '@/lib/types';
import { AvatarDisplay } from '@/lib/avatars';

interface SidebarProps {
  currentView: 'group' | 'ai' | 'private' | 'admin';
  activePrivateUid?: string;
  onSelectMainGroup: () => void;
  onSelectAi: () => void;
  onSelectPrivateUser: (uid: string) => void;
  onSelectAdmin: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  currentView,
  activePrivateUid,
  onSelectMainGroup,
  onSelectAi,
  onSelectPrivateUser,
  onSelectAdmin,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const { user, profile, logout, isAdmin } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Realtime Member Directory listener from RTDB
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    const un = onValue(ref(rtdb, 'users'), (snapshot) => {
      if (!snapshot.exists()) {
        setMembers([]);
        return;
      }

      const list: UserProfile[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        list.push({
          uid: child.key || '',
          ...val,
        });
      });

      // Sort: Online users first, then alphabetically
      list.sort((a, b) => {
        if (a.online === b.online) {
          return (a.name || '').localeCompare(b.name || '');
        }
        return a.online ? -1 : 1;
      });

      setMembers(list);
    });

    return () => un();
  }, []);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter((m) => {
      if (m.uid === user?.uid) return false;
      if (!q) return true;
      return (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
    });
  }, [members, memberSearch, user?.uid]);

  const onlineMembersCount = useMemo(() => {
    return members.filter((m) => m.online).length;
  }, [members]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white dark:bg-[#0c1220] border-r border-slate-200/90 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Mobile Close Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between md:hidden">
          <span className="font-extrabold text-sm text-slate-900 dark:text-white">Navigation</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Channels */}
        <div className="p-3 space-y-1.5">
          {/* MAIN GROUP */}
          <button
            onClick={() => {
              onSelectMainGroup();
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              currentView === 'group'
                ? 'bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  currentView === 'group'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="text-left truncate">
                <span className="block leading-tight font-extrabold truncate">Main Group</span>
                <span
                  className={`text-[10px] font-normal truncate block ${
                    currentView === 'group' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Community Room
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                currentView === 'group'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-sky-400'
              }`}
            >
              Live
            </span>
          </button>

          {/* PERSONAL AI ASSISTANT */}
          <button
            onClick={() => {
              onSelectAi();
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              currentView === 'ai'
                ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-md shadow-purple-600/25'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  currentView === 'ai'
                    ? 'bg-white/20 text-white'
                    : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left truncate">
                <span className="block leading-tight font-extrabold truncate">AI Assistant</span>
                <span
                  className={`text-[10px] font-normal truncate block ${
                    currentView === 'ai' ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Personal 1-on-1 Chat
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                currentView === 'ai'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
              }`}
            >
              Private
            </span>
          </button>

          {/* ADMIN DASHBOARD (Strictly visible only to Admin) */}
          {isAdmin && (
            <button
              onClick={() => {
                onSelectAdmin();
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    currentView === 'admin'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left truncate">
                  <span className="block leading-tight font-extrabold truncate">Admin Panel</span>
                  <span
                    className={`text-[10px] font-normal truncate block ${
                      currentView === 'admin' ? 'text-slate-900' : 'text-amber-600/80 dark:text-amber-400/80'
                    }`}
                  >
                    Users &amp; Moderation
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
            </button>
          )}
        </div>

        {/* Member Directory */}
        <div className="flex-1 flex flex-col min-h-0 px-3 pt-3 border-t border-slate-200/90 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Direct Messages
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredMembers.length}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Member List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                {memberSearch ? 'No matching members' : 'No other members yet'}
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isActive = currentView === 'private' && activePrivateUid === m.uid;
                const isMemberAdmin = m.uid === FIXED_ADMIN_UID || m.role === 'admin';

                return (
                  <button
                    key={m.uid}
                    onClick={() => {
                      onSelectPrivateUser(m.uid);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-300 font-bold shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarDisplay
                        gender={m.gender || 'Male'}
                        size="sm"
                        online={m.online}
                      />
                      <div className="text-left truncate">
                        <span className="font-bold block truncate text-slate-900 dark:text-white flex items-center gap-1">
                          <span>{m.name || 'Member'}</span>
                          {isMemberAdmin && (
                            <Shield className="w-3 h-3 text-amber-500 shrink-0 inline" />
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                          {m.online ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Online</span>
                          ) : (
                            <span>Offline</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">
                      Chat
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-200/90 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#090e1a]/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <AvatarDisplay
              gender={profile?.gender || 'Male'}
              size="sm"
              online={true}
            />
            <div className="truncate">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block truncate">
                {profile?.name || user?.displayName || 'Member'}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active Account
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
