'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Flag,
  Settings,
  Shield,
  Sparkles,
  Search,
  CheckCircle,
  Trash2,
  Play,
  Activity,
  UserX,
  UserCheck,
  Bot,
  AlertTriangle,
  Send,
  X,
  Copy,
  ListTodo,
  Plus,
  CheckCircle2,
  Zap,
  BarChart3,
  Award,
} from 'lucide-react';
import {
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  query,
  limitToLast,
} from 'firebase/database';
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth, FIXED_ADMIN_UID } from '@/context/AuthContext';
import {
  UserProfile,
  Message,
  ReportItem,
  AISettings,
  CommunitySettings,
  CustomBot,
  AgentTask,
  PredefinedTaskType,
} from '@/lib/types';
import { DEFAULT_SMALL_BOTS } from '@/lib/constants';
import { AvatarDisplay } from '@/lib/avatars';
import { getCurrentTimestamp, formatTime, formatDateTime } from '@/lib/utils';

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'appeals' | 'moderation' | 'reports' | 'ai' | 'agents' | 'community' | 'security'
  >('overview');

  // Real Database Data
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [messagesList, setMessagesList] = useState<Message[]>([]);
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [appealsList, setAppealsList] = useState<any[]>([]);
  const [customBotsList, setCustomBotsList] = useState<CustomBot[]>([]);
  const [agentTasksList, setAgentTasksList] = useState<AgentTask[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [aiAppealNotes, setAiAppealNotes] = useState<Record<string, string>>({});
  const [analyzingAppealId, setAnalyzingAppealId] = useState<string | null>(null);

  // New Custom Bot Form State
  const [newBot, setNewBot] = useState<{
    name: string;
    triggerWords: string;
    actionType: PredefinedTaskType;
    description: string;
    systemPrompt: string;
  }>({
    name: '',
    triggerWords: '!custom, #custom',
    actionType: 'create_task',
    description: 'Custom community automated sub-bot.',
    systemPrompt: 'You are a specialized custom community agent bot. Follow instructions carefully.',
  });

  // In-App Interactive Block User Modal (Safe, in-app modal replacing window.prompt)
  const [blockModal, setBlockModal] = useState<{
    isOpen: boolean;
    targetUser: UserProfile | null;
    reason: string;
    customReason: string;
  }>({
    isOpen: false,
    targetUser: null,
    reason: 'کمیونٹی قوانین کی خلاف ورزی (Community Guideline Violation)',
    customReason: '',
  });

  // AI settings state
  const [aiSettings, setAiSettings] = useState<AISettings>({
    status: true,
    name: 'Community AI',
    model: 'gemini-3.1-flash-lite',
    language: 'Auto Detect',
    groupAi: true,
    personalAi: true,
    groupResponseMode: 'mention',
    systemInstructions:
      'You are CommUnity AI, a friendly, intelligent, and helpful assistant in this online community. Encourage respectful discussion, help users find information, and provide concise, accurate advice.',
  });

  // Community settings state
  const [communitySettings, setCommunitySettings] = useState<CommunitySettings>({
    communityName: 'CommUnity Main Hub',
    welcomeMessage: 'Welcome to our official community! Join discussions and collaborate.',
    rules: '1. Be respectful to all members.\n2. No hate speech or spam.\n3. Share Google Drive files safely.',
    status: 'active',
  });

  // AI Sandbox Testing
  const [aiTestPrompt, setAiTestPrompt] = useState('Say hello to the community in one sentence.');
  const [aiTestResult, setAiTestResult] = useState('');
  const [aiTesting, setAiTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Fetch real Firebase RTDB data
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    // Load users
    const unUsers = onValue(ref(rtdb, 'users'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: UserProfile[] = Object.keys(data).map((k) => ({
          uid: k,
          ...data[k],
        }));
        setUsersList(list);
      } else {
        setUsersList([]);
      }
    });

    // Load unblock requests
    const unAppeals = onValue(ref(rtdb, 'unblockRequests'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: any[] = Object.keys(data).map((k) => ({
          id: k,
          uid: k,
          ...data[k],
        }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAppealsList(list);
      } else {
        setAppealsList([]);
      }
    });

    // Load community messages
    const unMsgs = onValue(
      query(ref(rtdb, 'communityMessages'), limitToLast(60)),
      (snap) => {
        if (snap.exists()) {
          const list: Message[] = [];
          snap.forEach((c) => {
            const val = c.val();
            list.push({
              id: c.key || '',
              senderId: val.senderId || val.senderUid,
              senderUid: val.senderUid || val.senderId,
              timestamp: val.createdAt || val.timestamp || Date.now(),
              ...val,
            });
          });
          list.sort((a, b) => (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0));
          setMessagesList(list);
        } else {
          setMessagesList([]);
        }
      }
    );

    // Load reports
    const unReports = onValue(ref(rtdb, 'reports'), (snap) => {
      if (snap.exists()) {
        const list: ReportItem[] = [];
        snap.forEach((c) => {
          list.push({ id: c.key || '', ...c.val() });
        });
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setReportsList(list);
      } else {
        setReportsList([]);
      }
    });

    // Load AI settings
    const unAi = onValue(ref(rtdb, 'settings/ai'), (snap) => {
      if (snap.exists()) setAiSettings(snap.val());
    });

    // Load Community settings
    const unComm = onValue(ref(rtdb, 'settings/community'), (snap) => {
      if (snap.exists()) setCommunitySettings(snap.val());
    });

    // Load Custom Bots
    const unBots = onValue(ref(rtdb, 'customBots'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: CustomBot[] = Object.keys(data).map((k) => ({
          id: k,
          ...data[k],
        }));
        setCustomBotsList(list);
      } else {
        setCustomBotsList([]);
      }
    });

    // Load Agent Tasks
    const unTasks = onValue(query(ref(rtdb, 'agentTasks'), limitToLast(50)), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: AgentTask[] = Object.keys(data).map((k) => ({
          id: k,
          ...data[k],
        }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAgentTasksList(list);
      } else {
        setAgentTasksList([]);
      }
    });

    return () => {
      unUsers();
      unAppeals();
      unMsgs();
      unReports();
      unAi();
      unComm();
      unBots();
      unTasks();
    };
  }, []);

  // Custom Bots Management Handlers
  const handleCreateCustomBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBot.name.trim() || !newBot.triggerWords.trim()) return;
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    try {
      const triggers = newBot.triggerWords
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const botRef = push(ref(rtdb, 'customBots'));
      const botPayload: CustomBot = {
        id: botRef.key || `bot_${Date.now()}`,
        name: newBot.name.trim(),
        triggerWords: triggers.length > 0 ? triggers : ['!bot'],
        actionType: newBot.actionType,
        description: newBot.description.trim() || 'Custom community agent bot',
        systemPrompt: newBot.systemPrompt.trim(),
        enabled: true,
        createdBy: user?.displayName || 'Admin',
        createdAt: getCurrentTimestamp(),
      };

      await set(botRef, botPayload);
      setNewBot({
        name: '',
        triggerWords: '!custom, #custom',
        actionType: 'create_task',
        description: 'Custom community automated sub-bot.',
        systemPrompt: 'You are a specialized custom community agent bot.',
      });
      setSaveSuccess(`Bot "${botPayload.name}" created and deployed to Agent Swarm!`);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed creating bot:', err);
    }
  };

  const handleToggleBotStatus = async (botId: string, currentEnabled: boolean) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await update(ref(rtdb, `customBots/${botId}`), {
        enabled: !currentEnabled,
      });
      setSaveSuccess('Bot status updated');
      setTimeout(() => setSaveSuccess(''), 2000);
    } catch (err) {
      console.error('Failed updating bot status:', err);
    }
  };

  const handleDeleteCustomBot = async (botId: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await remove(ref(rtdb, `customBots/${botId}`));
      setSaveSuccess('Bot removed from Agent Swarm');
      setTimeout(() => setSaveSuccess(''), 2000);
    } catch (err) {
      console.error('Failed deleting bot:', err);
    }
  };

  const handleSeedDefaultBots = async () => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      for (const bot of DEFAULT_SMALL_BOTS) {
        await set(ref(rtdb, `customBots/${bot.id}`), {
          ...bot,
          createdAt: getCurrentTimestamp(),
          createdBy: 'System Preset',
        });
      }
      setSaveSuccess('Default Small Bots fleet synced to Firebase database!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Failed seeding bots:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await remove(ref(rtdb, `agentTasks/${taskId}`));
      setSaveSuccess('Task deleted from database');
      setTimeout(() => setSaveSuccess(''), 2000);
    } catch (err) {
      console.error('Failed deleting task:', err);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await update(ref(rtdb, `agentTasks/${taskId}`), {
        status: 'completed',
        completedAt: getCurrentTimestamp(),
        completedByName: 'Admin',
      });
      setSaveSuccess('Task marked as completed in database');
      setTimeout(() => setSaveSuccess(''), 2000);
    } catch (err) {
      console.error('Failed completing task:', err);
    }
  };

  // 1-Click Block / Unblock User with Strike updates and Ban Reason
  const handleToggleBlockUser = async (targetUid: string, currentBanned: boolean, customReason?: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb || targetUid === FIXED_ADMIN_UID) return;

    try {
      const willBlock = !currentBanned;
      const targetUser = usersList.find((u) => u.uid === targetUid);
      const currentStrikes = targetUser?.mistakeCount || 0;
      const newStrikes = willBlock ? currentStrikes + 1 : currentStrikes;
      const reasonToSave = customReason || (willBlock ? 'کمیونٹی گائیڈ لائنز کی خلاف ورزی (Community Guideline Violation)' : '');

      await update(ref(rtdb, `users/${targetUid}`), {
        banned: willBlock,
        disabled: willBlock,
        banReason: willBlock ? reasonToSave : '',
        mistakeCount: newStrikes,
        updatedAt: getCurrentTimestamp(),
        lastBannedAt: willBlock ? getCurrentTimestamp() : null,
      });

      if (willBlock) {
        await set(ref(rtdb, `blocks/admin/${targetUid}`), {
          targetUid,
          bannedAt: getCurrentTimestamp(),
          bannedBy: user?.uid,
          reason: reasonToSave,
          mistakeCount: newStrikes,
        });
      } else {
        await set(ref(rtdb, `blocks/admin/${targetUid}`), null);
        await update(ref(rtdb, `unblockRequests/${targetUid}`), {
          status: 'resolved_by_admin',
          resolvedAt: getCurrentTimestamp(),
        });
      }

      setSaveSuccess(willBlock ? `User blocked (Strike ${newStrikes}/5 logged)` : 'User unblocked successfully');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed toggling block user:', err);
    }
  };

  // Reset user strike count
  const handleResetStrikes = async (targetUid: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await update(ref(rtdb, `users/${targetUid}`), {
        mistakeCount: 0,
        updatedAt: getCurrentTimestamp(),
      });
      setSaveSuccess('User violation strikes reset to 0/5');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Failed resetting strikes:', err);
    }
  };

  // Instant AI Appeal Analysis
  const handleAiAnalyzeAppeal = async (appeal: any) => {
    setAnalyzingAppealId(appeal.uid);
    try {
      const res = await fetch('/api/ai/appeal-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: appeal.uid,
          userName: appeal.userName,
          userEmail: appeal.userEmail,
          appealText: appeal.appealText,
          banReason: appeal.banReason || 'Community Guidelines',
          mistakeCount: usersList.find((u) => u.uid === appeal.uid)?.mistakeCount || 1,
        }),
      });
      const data = await res.json();
      setAiAppealNotes((prev) => ({
        ...prev,
        [appeal.uid]: data.aiReply || (data.approved ? 'AI recommends UNBLOCKING with warning.' : 'AI recommends KEEPING BLOCKED.'),
      }));
    } catch (err) {
      setAiAppealNotes((prev) => ({
        ...prev,
        [appeal.uid]: 'Unable to run AI analysis right now.',
      }));
    } finally {
      setAnalyzingAppealId(null);
    }
  };

  // Approve & Unblock appeal
  const handleApproveAppeal = async (appeal: any) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    try {
      await update(ref(rtdb, `users/${appeal.uid}`), {
        banned: false,
        disabled: false,
        lastUnblockedAt: getCurrentTimestamp(),
        unblockedBy: 'Admin_Manual_Approval',
      });
      await set(ref(rtdb, `blocks/admin/${appeal.uid}`), null);
      await update(ref(rtdb, `unblockRequests/${appeal.uid}`), {
        status: 'approved_by_admin',
        resolvedAt: getCurrentTimestamp(),
      });

      setSaveSuccess(`Appeal approved and ${appeal.userName} unblocked!`);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Failed approving appeal:', err);
    }
  };

  // Delete message from RTDB
  const handleDeleteGroupMessage = async (msgId: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await remove(ref(rtdb, `communityMessages/${msgId}`));
      setSaveSuccess('Message deleted from group');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Failed deleting message:', err);
    }
  };

  // Resolve user report
  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await update(ref(rtdb, `reports/${reportId}`), {
        status,
        resolvedAt: getCurrentTimestamp(),
        resolvedBy: user?.uid,
      });
      setSaveSuccess(`Report marked as ${status}`);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Failed resolving report:', err);
    }
  };

  // Save AI Settings to RTDB
  const handleSaveAiSettings = async () => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await set(ref(rtdb, 'settings/ai'), aiSettings);
      setSaveSuccess('AI settings saved successfully');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Failed saving AI settings:', err);
    }
  };

  // Save Community Settings to RTDB
  const handleSaveCommunitySettings = async () => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;
    try {
      await set(ref(rtdb, 'settings/community'), communitySettings);
      setSaveSuccess('Community settings saved successfully');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Failed saving community settings:', err);
    }
  };

  // Test AI in admin sandbox
  const handleTestAi = async () => {
    if (!aiTestPrompt.trim() || aiTesting) return;
    setAiTesting(true);
    setAiTestResult('');
    try {
      const res = await fetch('/api/ai/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiTestPrompt,
          aiSettings,
        }),
      });
      const data = await res.json();
      setAiTestResult(data.reply || data.text || 'No response from AI model');
    } catch (err: any) {
      setAiTestResult(`Error: ${err.message || 'Failed connecting to OpenRouter AI'}`);
    } finally {
      setAiTesting(false);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.uid && u.uid.toLowerCase().includes(q))
    );
  });

  const blockedCount = usersList.filter((u) => u.banned || u.disabled).length;
  const pendingAppealsCount = appealsList.filter((a) => a.status === 'pending' || a.status === 'evaluating_by_ai' || !a.status).length;
  const pendingReportsCount = reportsList.filter((r) => r.status === 'pending').length;
  const onlineCount = usersList.filter((u) => u.online).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {/* Top Header */}
      <div className="px-4 py-3 sm:px-6 bg-white dark:bg-[#0c1220] border-b border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Admin Management Dashboard</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
                Fixed UID Protected
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              1-Click User Moderation, AI Appeals, and Community Settings
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          Exit Admin
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 bg-white dark:bg-[#0c1220] border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-1 overflow-x-auto scrollbar-none transition-colors">
        {[
          { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
          {
            id: 'users',
            label: `Users (${usersList.length})`,
            icon: <Users className="w-4 h-4" />,
            badge: blockedCount > 0 ? `${blockedCount} Blocked` : null,
          },
          {
            id: 'appeals',
            label: `Appeals (${appealsList.length})`,
            icon: <Bot className="w-4 h-4" />,
            badge: pendingAppealsCount > 0 ? `${pendingAppealsCount} New` : null,
          },
          { id: 'moderation', label: 'Group Feed', icon: <MessageSquare className="w-4 h-4" /> },
          {
            id: 'reports',
            label: `Reports (${reportsList.length})`,
            icon: <Flag className="w-4 h-4" />,
            badge: pendingReportsCount > 0 ? `${pendingReportsCount}` : null,
          },
          { id: 'ai', label: 'AI Settings', icon: <Sparkles className="w-4 h-4" /> },
          {
            id: 'agents',
            label: `Bot Management (${customBotsList.length})`,
            icon: <Zap className="w-4 h-4 text-purple-500" />,
          },
          { id: 'community', label: 'Community', icon: <Settings className="w-4 h-4" /> },
          { id: 'security', label: 'Security & Rules', icon: <Shield className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 shadow-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{saveSuccess}</span>
            </div>
          )}

        {/* 1. OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
                  <Users className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {usersList.length}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Registered accounts
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Blocked Users</span>
                  <UserX className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {blockedCount}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Restricted from chat
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Unblock Appeals</span>
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {pendingAppealsCount}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Pending review queue
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Online Members</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {onlineCount}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Live presence in database
                </p>
              </div>
            </div>

            {/* Moderation Guide */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>1-Click Member Moderation &amp; 5-Mistakes Policy</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Clicking <strong>&ldquo;1-Click Block User&rdquo;</strong> in the Users tab immediately restricts the user&apos;s account. A block reason and strike (e.g. 1/5) are logged. If an appeal is filed, AI and Admin can review and approve/reject.
              </p>
            </div>
          </div>
        )}

        {/* 2. USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, or UID..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Showing {filteredUsers.length} of {usersList.length} users
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e1526] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Firebase UID</th>
                      <th className="p-3.5">Gender</th>
                      <th className="p-3.5">Strikes / Warnings</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredUsers.map((u) => {
                      const isSelf = u.uid === user?.uid || u.uid === FIXED_ADMIN_UID;
                      const isBlocked = Boolean(u.banned || u.disabled);
                      const strikes = u.mistakeCount || 0;

                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <AvatarDisplay gender={u.gender} size="sm" online={u.online} />
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-500/30">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {u.uid}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full capitalize font-semibold ${
                                u.gender === 'Female' || (u.gender as string)?.toLowerCase() === 'female'
                                  ? 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300'
                                  : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-sky-300'
                              }`}
                            >
                              {u.gender || 'Male'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  strikes >= 5
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                                    : strikes > 0
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {strikes} / 5 Mistakes
                              </span>
                              {strikes > 0 && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleResetStrikes(u.uid)}
                                  className="text-[10px] text-blue-600 dark:text-sky-400 hover:underline cursor-pointer font-bold"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {isBlocked ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-500/30">
                                  <UserX className="w-3 h-3" />
                                  <span>BLOCKED</span>
                                </span>
                                {u.banReason && (
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                                    {u.banReason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-500/30">
                                <UserCheck className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            {isSelf ? (
                              <span className="text-[11px] text-slate-400 italic">Protected Admin</span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    if (isBlocked) {
                                      handleToggleBlockUser(u.uid, true);
                                    } else {
                                      setBlockModal({
                                        isOpen: true,
                                        targetUser: u,
                                        reason: 'کمیونٹی قوانین کی خلاف ورزی (Community Guideline Violation)',
                                        customReason: '',
                                      });
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isBlocked
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                                  }`}
                                >
                                  {isBlocked ? '✓ Unblock' : '🚫 Block User'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. APPEALS TAB */}
        {activeTab === 'appeals' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Unblock Appeals Queue ({appealsList.length})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review appeal statements submitted by suspended members.
              </p>
            </div>

            {appealsList.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#0e1526] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs shadow-xs">
                No unblock appeals submitted.
              </div>
            ) : (
              <div className="space-y-3.5">
                {appealsList.map((a) => {
                  const isPending = a.status === 'pending' || a.status === 'evaluating_by_ai';
                  const isAnalyzing = analyzingAppealId === a.uid;
                  const aiNote = aiAppealNotes[a.uid];

                  return (
                    <div
                      key={a.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isPending
                          ? 'bg-white dark:bg-[#0e1526] border-purple-300 dark:border-purple-500/40 shadow-sm'
                          : 'bg-white dark:bg-[#0e1526] border-slate-200 dark:border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isPending
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                            }`}
                          >
                            {a.status || 'pending'}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{a.userName}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{a.userEmail}</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {formatDateTime(a.createdAt)}
                        </span>
                      </div>

                      {/* Appeal text */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 mb-3 space-y-1">
                        <strong className="block text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                          User Statement:
                        </strong>
                        <p className="italic">&ldquo;{a.appealText}&rdquo;</p>
                      </div>

                      {/* AI analysis */}
                      {aiNote && (
                        <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 text-xs text-purple-900 dark:text-purple-200 mb-3 space-y-1">
                          <strong className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Assistant Recommendation:</span>
                          </strong>
                          <p>{aiNote}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-[11px] text-slate-400 font-mono">
                          UID: {a.uid}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAiAnalyzeAppeal(a)}
                            disabled={isAnalyzing}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            <span>{isAnalyzing ? 'Analyzing...' : 'AI Evaluation'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApproveAppeal(a)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve &amp; Restore</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. MODERATION TAB */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Recent Group Messages ({messagesList.length})
            </h3>

            <div className="space-y-2">
              {messagesList.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-start gap-3">
                    <AvatarDisplay
                      gender={msg.isAi ? 'ai' : msg.senderGender || 'male'}
                      size="sm"
                    />
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {msg.senderUid}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTime(msg.timestamp, msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteGroupMessage(msg.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                    title="Delete Message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Member Reports ({reportsList.length})
            </h3>

            {reportsList.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#0e1526] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs shadow-xs">
                No reports submitted.
              </div>
            ) : (
              <div className="space-y-3">
                {reportsList.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e1526] shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-700 dark:text-rose-300 uppercase text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30">
                          {r.targetType} Report
                        </span>
                        <span className="text-slate-500">
                          By <strong className="text-slate-800 dark:text-slate-200">{r.reporterName}</strong>
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {formatDateTime(r.timestamp)}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 my-2">
                      <p className="text-slate-700 dark:text-slate-300">
                        <strong className="text-slate-500">Reason:</strong> {r.reason}
                      </p>
                      {r.messageText && (
                        <p className="text-slate-700 dark:text-slate-300 italic p-2 rounded-lg bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800">
                          &ldquo;{r.messageText}&rdquo;
                        </p>
                      )}
                    </div>

                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleResolveReport(r.id, 'resolved')}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => handleResolveReport(r.id, 'dismissed')}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. AI SETTINGS TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>OpenRouter AI Configuration (Qwen Model)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage Community AI behavior and prompts.
                </p>
              </div>
              <button
                onClick={handleSaveAiSettings}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/20 cursor-pointer"
              >
                Save Settings
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">AI Status</span>
                  <span className="text-[11px] text-slate-500">Enable AI responses</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.status}
                  onChange={(e) => setAiSettings({ ...aiSettings, status: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Group AI</span>
                  <span className="text-[11px] text-slate-500">Respond in Main Group</span>
                </div>
                <input
                  type="checkbox"
                  checked={aiSettings.groupAi}
                  onChange={(e) => setAiSettings({ ...aiSettings, groupAi: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </div>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                OpenRouter Model Selection (Default: qwen/qwen3.8-27b:free)
              </label>
              <select
                value={aiSettings.model || 'qwen/qwen3.8-27b:free'}
                onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                className="w-full text-xs p-2.5 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-semibold shadow-2xs font-mono"
              >
                <option value="qwen/qwen3.8-27b:free">qwen/qwen3.8-27b:free (Requested OpenRouter Model)</option>
                <option value="qwen/qwen-2.5-72b-instruct">qwen/qwen-2.5-72b-instruct (Qwen 72B High Accuracy)</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">meta-llama/llama-3.3-70b-instruct:free (Llama 3.3 70B Free)</option>
                <option value="deepseek/deepseek-r1-distill-llama-70b:free">deepseek/deepseek-r1-distill-llama-70b:free (DeepSeek R1 Reasoning Free)</option>
                <option value="google/gemini-2.5-flash">google/gemini-2.5-flash (Gemini 2.5 Flash via OpenRouter)</option>
              </select>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                System Instructions &amp; Persona
              </label>
              <textarea
                value={aiSettings.systemInstructions}
                onChange={(e) =>
                  setAiSettings({ ...aiSettings, systemInstructions: e.target.value })
                }
                rows={4}
                className="w-full text-xs p-3 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono shadow-2xs"
              />
            </div>

            {/* Test Sandbox */}
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/30 space-y-3">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                <span>Test Live Response</span>
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiTestPrompt}
                  onChange={(e) => setAiTestPrompt(e.target.value)}
                  placeholder="Enter test prompt..."
                  className="flex-1 text-xs p-2 bg-white dark:bg-[#070b14] border border-purple-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleTestAi}
                  disabled={aiTesting}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 cursor-pointer"
                >
                  {aiTesting ? 'Running...' : 'Test'}
                </button>
              </div>

              {aiTestResult && (
                <div className="p-3 bg-white dark:bg-[#070b14] rounded-xl border border-purple-200 dark:border-purple-500/20 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {aiTestResult}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6.5 BOT MANAGEMENT & AGENT SWARM TAB */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Bot Management &amp; Trigger Mapping</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Register trigger words and map them to specific database actions for the AI agent to execute automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeedDefaultBots}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Seed Default Small Bots</span>
              </button>
            </div>

            {/* Register New Bot Form */}
            <form onSubmit={handleCreateCustomBot} className="p-5 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>Register New Small Bot</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bot Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newBot.name}
                    onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                    placeholder="e.g. Onboarding Agent, Poll Master"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trigger Words (Comma Separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={newBot.triggerWords}
                    onChange={(e) => setNewBot({ ...newBot, triggerWords: e.target.value })}
                    placeholder="e.g. !task, #todo, !addtask, #task"
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mapped Database Action
                  </label>
                  <select
                    value={newBot.actionType}
                    onChange={(e) => setNewBot({ ...newBot, actionType: e.target.value as PredefinedTaskType })}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="create_task">📋 create_task (Writes to rtdb/agentTasks)</option>
                    <option value="create_poll">📊 create_poll (Writes to rtdb/communityPolls)</option>
                    <option value="award_karma">🏆 award_karma (Awards points in rtdb/userPoints)</option>
                    <option value="record_log">🔔 record_log (Writes notice to rtdb/botLogs)</option>
                    <option value="community_stats">⚡ community_stats (Reads &amp; aggregates stats)</option>
                    <option value="custom_action">🤖 custom_action (General AI database instruction)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newBot.description}
                    onChange={(e) => setNewBot({ ...newBot, description: e.target.value })}
                    placeholder="Short description of bot duties..."
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bot System Instructions &amp; Behavior Prompt
                </label>
                <textarea
                  value={newBot.systemPrompt}
                  onChange={(e) => setNewBot({ ...newBot, systemPrompt: e.target.value })}
                  rows={3}
                  placeholder="Instructions for Gemini when this bot's triggers are activated..."
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register &amp; Deploy Bot</span>
                </button>
              </div>
            </form>

            {/* Registered Bots List */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span>Active Registered Bots ({customBotsList.length})</span>
                <span className="text-[11px] text-slate-500 font-normal lowercase">Trigger word listener fleet</span>
              </h4>

              {customBotsList.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#0e1526] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  No bots registered yet. Click &quot;Seed Default Small Bots&quot; above to add presets!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {customBotsList.map((bot) => (
                    <div
                      key={bot.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        bot.enabled
                          ? 'bg-white dark:bg-[#0e1526] border-slate-200 dark:border-slate-800 shadow-xs'
                          : 'bg-slate-50 dark:bg-[#090d18] border-slate-200/60 dark:border-slate-800/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 dark:text-white text-xs">{bot.name}</h5>
                            <span className="inline-block px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold border border-purple-200 dark:border-purple-500/30">
                              Action: {bot.actionType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleBotStatus(bot.id, bot.enabled)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              bot.enabled
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {bot.enabled ? 'ACTIVE' : 'PAUSED'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomBot(bot.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                            title="Delete Bot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-2.5 line-clamp-2">
                        {bot.description}
                      </p>

                      {/* Triggers */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Triggers:</span>
                        {bot.triggerWords.map((tw, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-mono font-bold"
                          >
                            {tw}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Database Tasks Executed by Bots */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-blue-500" />
                  <span>Agent Executed Tasks ({agentTasksList.length})</span>
                </span>
                <span className="text-[11px] text-slate-500 font-normal lowercase">Realtime Database records</span>
              </h4>

              {agentTasksList.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No database tasks recorded yet. Mention a bot (e.g. &quot;!task Review report&quot;) in group chat to create one!
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {agentTasksList.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            task.status === 'completed'
                              ? 'bg-emerald-500'
                              : task.priority === 'urgent'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <span className={`font-bold block truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {task.title}
                          </span>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>Created by {task.createdByName}</span>
                            {task.assigneeName && (
                              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                                Assignee: {task.assigneeName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleCompleteTask(task.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer"
                          >
                            Mark Done
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. COMMUNITY TAB */}
        {activeTab === 'community' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Community General Settings
              </h3>
              <button
                onClick={handleSaveCommunitySettings}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                Save Settings
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Community Name
              </label>
              <input
                type="text"
                value={communitySettings.communityName}
                onChange={(e) =>
                  setCommunitySettings({
                    ...communitySettings,
                    communityName: e.target.value,
                  })
                }
                className="w-full text-xs p-2.5 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Welcome Message Banner
              </label>
              <input
                type="text"
                value={communitySettings.welcomeMessage}
                onChange={(e) =>
                  setCommunitySettings({
                    ...communitySettings,
                    welcomeMessage: e.target.value,
                  })
                }
                className="w-full text-xs p-2.5 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Community Guidelines
              </label>
              <textarea
                value={communitySettings.rules}
                onChange={(e) =>
                  setCommunitySettings({ ...communitySettings, rules: e.target.value })
                }
                rows={4}
                className="w-full text-xs p-3 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* 8. SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Security Rules &amp; Authorization</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Security is validated on the Firebase Realtime Database level.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Admin Diagnostic
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#070b14]">
                  <span className="text-slate-500">Your UID:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{user?.uid}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#070b14]">
                  <span className="text-slate-500">Fixed Admin UID:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{FIXED_ADMIN_UID}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#070b14]">
                  <span className="text-slate-500">Authorization:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">AUTHORIZED ADMINISTRATOR</span>
                </div>
              </div>
            </div>

            {/* Realtime Database Rules Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Firebase Realtime Database Rules (database.rules.json)
                  </h4>
                  <p className="text-[11px] text-slate-500">Paste in Firebase Console ➔ Realtime Database ➔ Rules</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const rules = `{
  "rules": {
    ".read": false,
    ".write": false,
    "info": {
      "connected": {
        ".read": true
      }
    },
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === '${FIXED_ADMIN_UID}' || root.child('users').child(auth.uid).child('role').val() === 'admin')"
      }
    },
    "presence": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === '${FIXED_ADMIN_UID}')"
      }
    },
    "unblockRequests": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "communityMessages": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$messageId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "aiChats": {
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || auth.uid === '${FIXED_ADMIN_UID}')",
        ".write": "auth != null && (auth.uid === $uid || auth.uid === '${FIXED_ADMIN_UID}')",
        "$msgId": {
          ".read": "auth != null && (auth.uid === $uid || auth.uid === '${FIXED_ADMIN_UID}')",
          ".write": "auth != null && (auth.uid === $uid || auth.uid === '${FIXED_ADMIN_UID}')"
        }
      }
    },
    "personalChats": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$chatId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "participants": {
          ".read": "auth != null",
          ".write": "auth != null"
        },
        "deletedFor": {
          "$uid": {
            ".read": "auth != null",
            ".write": "auth != null"
          }
        },
        "messages": {
          ".read": "auth != null",
          ".write": "auth != null",
          "$messageId": {
            ".read": "auth != null",
            ".write": "auth != null"
          }
        }
      }
    },
    "userChats": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null",
        "$chatId": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    },
    "blocks": {
      ".read": "auth != null",
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null",
        "$otherUid": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    },
    "reports": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$reportId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "settings": {
      ".read": true,
      ".write": "auth != null && (auth.uid === '${FIXED_ADMIN_UID}' || root.child('users').child(auth.uid).child('role').val() === 'admin')"
    }
  }
}`;
                    navigator.clipboard.writeText(rules);
                    alert('Realtime Database Rules copied to clipboard!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Rules</span>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Block User Modal */}
      {blockModal.isOpen && blockModal.targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <UserX className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Block Member: {blockModal.targetUser.name}
                </h3>
              </div>
              <button
                onClick={() => setBlockModal({ isOpen: false, targetUser: null, reason: '', customReason: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#070b14] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">User:</span>
                <span className="font-bold text-slate-900 dark:text-white">{blockModal.targetUser.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Strikes:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">{blockModal.targetUser.mistakeCount || 0} / 5</span>
              </div>
            </div>

            {/* Select reason */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Reason for Block / بلاک کرنے کی وجہ منتخب کریں:
              </label>
              <div className="space-y-1.5">
                {[
                  'کمیونٹی قوانین کی خلاف ورزی (Community Guideline Violation)',
                  'نازیبا یا غیر اخلاقی گفتگو (Inappropriate Language)',
                  'اسپیم یا غیر ضروری پیغامات (Spamming / Promotion)',
                  'بدتمیزی یا ہراساں کرنا (Abusive Behavior)',
                  'other',
                ].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setBlockModal((prev) => ({ ...prev, reason: r }))}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      blockModal.reason === r
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070b14] text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {r === 'other' ? '✍️ دوسری کسٹم وجہ لکھیں (Custom Reason)' : r}
                  </button>
                ))}
              </div>

              {blockModal.reason === 'other' && (
                <textarea
                  value={blockModal.customReason}
                  onChange={(e) => setBlockModal((prev) => ({ ...prev, customReason: e.target.value }))}
                  placeholder="کسٹم وجہ درج کریں..."
                  rows={2}
                  className="w-full mt-2 p-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBlockModal({ isOpen: false, targetUser: null, reason: '', customReason: '' })}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalReason = blockModal.reason === 'other' ? (blockModal.customReason.trim() || 'کمیونٹی قوانین کی خلاف ورزی') : blockModal.reason;
                  const targetUid = blockModal.targetUser!.uid;
                  setBlockModal({ isOpen: false, targetUser: null, reason: '', customReason: '' });
                  handleToggleBlockUser(targetUid, false, finalReason);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/30 flex items-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Confirm &amp; Block Member</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
