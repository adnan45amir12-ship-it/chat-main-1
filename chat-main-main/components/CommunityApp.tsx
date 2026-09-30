'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, FIXED_ADMIN_UID } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MainGroupChat } from '@/components/MainGroupChat';
import { PrivateChat } from '@/components/PrivateChat';
import { PersonalAiChat } from '@/components/PersonalAiChat';
import { AdminDashboard } from '@/components/AdminDashboard';
import { BlockedAccountScreen } from '@/components/BlockedAccountScreen';
import { SetupProfileModal } from '@/components/SetupProfileModal';
import { ProfileModal } from '@/components/ProfileModal';
import { ReportModal } from '@/components/ReportModal';
import { FirebaseConfigModal } from '@/components/FirebaseConfigModal';
import { Message, UserProfile } from '@/lib/types';
import { Users, MessageSquare, Sparkles, Shield, User as UserIcon } from 'lucide-react';
import { useIsMounted } from '@/hooks/use-mounted';
import { ref, onValue } from 'firebase/database';
import { getFirebaseInstances } from '@/lib/firebase';

export function CommunityApp() {
  const { user, profile, loading, needsProfileSetup, isAdmin } = useAuth();
  const mounted = useIsMounted();

  // Navigation State
  const [currentView, setCurrentView] = useState<'group' | 'ai' | 'private' | 'admin'>('group');
  const [activePrivateUid, setActivePrivateUid] = useState<string>('');
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // Track online members
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    const presenceRef = ref(rtdb, 'presence');
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (!snapshot.exists()) {
        setOnlineCount(1);
        return;
      }
      let count = 0;
      snapshot.forEach((child) => {
        const val = child.val();
        if (val && val.online === true) {
          count++;
        }
      });
      setOnlineCount(Math.max(1, count));
    });

    return () => unsubscribe();
  }, []);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Reporting State
  const [reportState, setReportState] = useState<{
    isOpen: boolean;
    targetType: 'message' | 'user';
    messageId?: string;
    messageText?: string;
    reportedUid?: string;
    reportedName?: string;
    context: 'main_group' | 'private_chat';
  }>({
    isOpen: false,
    targetType: 'message',
    context: 'main_group',
  });

  const handleOpenReport = (msg: Message, context: 'main_group' | 'private_chat' = 'main_group') => {
    setReportState({
      isOpen: true,
      targetType: 'message',
      messageId: msg.id,
      messageText: msg.text,
      reportedUid: msg.senderUid,
      reportedName: msg.senderName,
      context,
    });
  };

  const handleOpenPrivateChatWithUser = (otherUid: string) => {
    if (otherUid === user?.uid) return;
    setActivePrivateUid(otherUid);
    setCurrentView('private');
  };

  // Loading skeleton
  if (!mounted || loading) {
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

  // Not authenticated
  if (!user) {
    return (
      <>
        <AuthScreen onOpenFirebaseConfig={() => setShowFirebaseModal(true)} />
        <FirebaseConfigModal
          isOpen={showFirebaseModal}
          onClose={() => setShowFirebaseModal(false)}
        />
      </>
    );
  }

  // If user is banned/blocked by Admin and not the fixed admin UID -> Lock immediately to Blocked Account Screen
  const isUserBlocked = (profile?.banned === true || profile?.disabled === true) && user.uid !== FIXED_ADMIN_UID;
  if (isUserBlocked) {
    return <BlockedAccountScreen />;
  }

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenFirebaseConfig={() => setShowFirebaseModal(true)}
        onOpenAdmin={() => setCurrentView('admin')}
        onToggleSidebar={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        onlineCount={onlineCount}
      />

      {/* Main Body: Sidebar + Main Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          currentView={currentView}
          activePrivateUid={activePrivateUid}
          onSelectMainGroup={() => setCurrentView('group')}
          onSelectAi={() => setCurrentView('ai')}
          onSelectPrivateUser={(uid) => {
            setActivePrivateUid(uid);
            setCurrentView('private');
          }}
          onSelectAdmin={() => setCurrentView('admin')}
          isOpenMobile={sidebarMobileOpen}
          onCloseMobile={() => setSidebarMobileOpen(false)}
        />

        {/* Dynamic Center Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors pb-16 md:pb-0">
          {currentView === 'group' && (
            <MainGroupChat
              onOpenReport={(msg) => handleOpenReport(msg, 'main_group')}
              onOpenPrivateChatWithUser={handleOpenPrivateChatWithUser}
            />
          )}

          {currentView === 'ai' && <PersonalAiChat />}

          {currentView === 'private' && (
            <PrivateChat
              otherUid={activePrivateUid}
              onBack={() => setCurrentView('group')}
              onOpenReport={(msg) => handleOpenReport(msg, 'private_chat')}
            />
          )}

          {currentView === 'admin' && (
            <AdminDashboard onClose={() => setCurrentView('group')} />
          )}
        </main>
      </div>

      {/* Mobile Ergonomic Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0c1220]/95 border-t border-slate-200/90 dark:border-slate-800/80 backdrop-blur-md z-30 flex items-center justify-around px-2 transition-colors shadow-lg">
        <button
          onClick={() => {
            setCurrentView('group');
            setSidebarMobileOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] rounded-xl transition-all cursor-pointer ${
            currentView === 'group'
              ? 'text-blue-600 dark:text-sky-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <MessageSquare className={`w-5 h-5 ${currentView === 'group' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight mt-1">Community</span>
        </button>

        <button
          onClick={() => {
            setCurrentView('ai');
            setSidebarMobileOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] rounded-xl transition-all cursor-pointer ${
            currentView === 'ai'
              ? 'text-purple-600 dark:text-purple-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Sparkles className={`w-5 h-5 ${currentView === 'ai' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight mt-1">Gemini AI</span>
        </button>

        <button
          onClick={() => setSidebarMobileOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] rounded-xl transition-all cursor-pointer ${
            currentView === 'private'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Users className={`w-5 h-5 ${currentView === 'private' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight mt-1">Members</span>
        </button>

        {isAdmin ? (
          <button
            onClick={() => {
              setCurrentView('admin');
              setSidebarMobileOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] rounded-xl transition-all cursor-pointer ${
              currentView === 'admin'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            <Shield className={`w-5 h-5 ${currentView === 'admin' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight mt-1">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-all cursor-pointer"
          >
            <UserIcon className="w-5 h-5 stroke-2" />
            <span className="text-[10px] tracking-tight mt-1">Profile</span>
          </button>
        )}
      </nav>

      {/* Profile Onboarding Modal for First Time Sign-in / Gender selection */}
      <SetupProfileModal isOpen={needsProfileSetup} />

      {/* Profile View / Edit Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Firebase Database & Auth Configuration Modal */}
      <FirebaseConfigModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
      />

      {/* Moderation / Report Modal */}
      <ReportModal
        isOpen={reportState.isOpen}
        onClose={() => setReportState((prev) => ({ ...prev, isOpen: false }))}
        targetType={reportState.targetType}
        messageId={reportState.messageId}
        messageText={reportState.messageText}
        reportedUid={reportState.reportedUid}
        reportedName={reportState.reportedName}
        context={reportState.context}
      />
    </div>
  );
}
