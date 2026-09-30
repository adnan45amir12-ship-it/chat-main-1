'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  query,
  limitToLast,
} from 'firebase/database';
import {
  Send,
  Sparkles,
  Reply,
  Copy,
  Trash2,
  Flag,
  Check,
  ChevronDown,
  Info,
  Shield,
  CornerDownRight,
  HardDrive,
  X,
  Zap,
  Bot,
  ListTodo,
  BarChart3,
  Award,
  Bell,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth, FIXED_ADMIN_UID } from '@/context/AuthContext';
import {
  Message,
  MessageReply,
  AISettings,
  CommunitySettings,
  CustomBot,
  AgentTask,
  CommunityPoll,
} from '@/lib/types';
import { AvatarDisplay } from '@/lib/avatars';
import { DriveCard } from '@/components/DriveCard';
import { ConfirmModal } from '@/components/ConfirmModal';
import { extractDriveLinks } from '@/lib/drive-parser';
import {
  getCurrentTimestamp,
  formatTime,
  getSafeLocalStorage,
  setSafeLocalStorage,
  removeSafeLocalStorage,
  generateClientMessageId,
} from '@/lib/utils';

interface MainGroupChatProps {
  onOpenReport: (msg: Message) => void;
  onOpenPrivateChatWithUser?: (uid: string) => void;
}

export function MainGroupChat({
  onOpenReport,
  onOpenPrivateChatWithUser,
}: MainGroupChatProps) {
  const { user, profile, isAdmin } = useAuth();
  const groupId = 'main_group';
  const aiModeStorageKey = user ? `dc_ai_mode_${user.uid}_${groupId}` : '';
  const groupCacheKey = user ? `dc_chat_cache_${user.uid}_${groupId}` : '';

  const [messages, setMessages] = useState<Message[]>(() => {
    if (!groupCacheKey) return [];
    return getSafeLocalStorage<Message[]>(groupCacheKey, []);
  });
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<MessageReply | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [communitySettings, setCommunitySettings] = useState<CommunitySettings | null>(null);
  const [showDesktopInfo, setShowDesktopInfo] = useState(true);
  const [customBots, setCustomBots] = useState<CustomBot[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [communityPolls, setCommunityPolls] = useState<CommunityPoll[]>([]);
  const [showAgentDrawer, setShowAgentDrawer] = useState(false);
  const [activeAgentTab, setActiveAgentTab] = useState<'tasks' | 'bots' | 'polls'>('tasks');

  // User-specific AI Mode trigger in group chat
  const [isAiModeActive, setIsAiModeActive] = useState<boolean>(() => {
    if (!aiModeStorageKey) return false;
    return getSafeLocalStorage<boolean>(aiModeStorageKey, false);
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load live settings from RTDB
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    const unAi = onValue(ref(rtdb, 'settings/ai'), (snap) => {
      if (snap.exists()) setAiSettings(snap.val());
    });
    const unComm = onValue(ref(rtdb, 'settings/community'), (snap) => {
      if (snap.exists()) setCommunitySettings(snap.val());
    });
    const unBots = onValue(ref(rtdb, 'customBots'), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: CustomBot[] = Object.keys(data).map((k) => ({
          id: k,
          ...data[k],
        }));
        setCustomBots(list);
      } else {
        setCustomBots([]);
      }
    });
    const unTasks = onValue(query(ref(rtdb, 'agentTasks'), limitToLast(30)), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: AgentTask[] = Object.keys(data).map((k) => ({
          id: k,
          ...data[k],
        }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAgentTasks(list);
      } else {
        setAgentTasks([]);
      }
    });
    const unPolls = onValue(query(ref(rtdb, 'communityPolls'), limitToLast(10)), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: CommunityPoll[] = Object.keys(data).map((k) => ({
          id: k,
          ...data[k],
        }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setCommunityPolls(list);
      } else {
        setCommunityPolls([]);
      }
    });

    return () => {
      unAi();
      unComm();
      unBots();
      unTasks();
      unPolls();
    };
  }, []);

  // Listen to realtime community messages from Firebase
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    const messagesQuery = query(ref(rtdb, 'communityMessages'), limitToLast(80));

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setMessages([]);
        if (groupCacheKey) removeSafeLocalStorage(groupCacheKey);
        return;
      }

      const list: Message[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        list.push({
          id: child.key || '',
          ...val,
          senderUid: val.senderUid || val.senderId,
          timestamp: val.createdAt || val.timestamp || Date.now(),
        });
      });

      list.sort((a, b) => (a.createdAt || a.timestamp || 0) - (b.createdAt || b.timestamp || 0));
      setMessages(list);

      // Persist to safe local storage
      if (groupCacheKey && list.length > 0) {
        setSafeLocalStorage(groupCacheKey, list);
      }
    });

    return () => unsubscribe();
  }, [groupCacheKey]);

  const handleClearHistoryConfirmed = async () => {
    if (!user) return;
    setMessages([]);
    if (groupCacheKey) {
      removeSafeLocalStorage(groupCacheKey);
    }

    const { rtdb } = getFirebaseInstances();
    if (rtdb && (isAdmin || user.uid === FIXED_ADMIN_UID)) {
      try {
        await remove(ref(rtdb, 'communityMessages'));
      } catch (err) {
        console.error('Failed to clear community messages from RTDB:', err);
      }
    }
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, isAiTyping, scrollToBottom]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceToBottom > 150);
  };

  const handleCopyMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!user) return;
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    if (groupCacheKey) {
      const cached = getSafeLocalStorage<Message[]>(groupCacheKey, []);
      const filtered = cached.filter((m) => m.id !== msgId);
      setSafeLocalStorage(groupCacheKey, filtered);
    }

    const { rtdb } = getFirebaseInstances();
    if (rtdb && msgId) {
      try {
        await remove(ref(rtdb, `communityMessages/${msgId}`));
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    }
  };

  const toggleAiMode = (active: boolean) => {
    setIsAiModeActive(active);
    if (aiModeStorageKey) {
      setSafeLocalStorage(aiModeStorageKey, active);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || sending || !user || !profile) return;

    if (profile.banned || profile.disabled) {
      return;
    }

    const lower = cleanText.toLowerCase();

    // Command: @close -> stop AI assistance mode
    if (lower === '@close' || lower.startsWith('@close ')) {
      toggleAiMode(false);
      setText('');
      return;
    }

    // Command: @community -> activate AI mode
    const isCommunityCommand =
      lower === '@community' ||
      lower.startsWith('@community ') ||
      lower.startsWith('@community:');

    if (isCommunityCommand) {
      toggleAiMode(true);
    }

    // Check if any sub-bot or agent trigger matches
    const isBotTrigger = checkIsBotTrigger(cleanText, customBots);
    const willTriggerAi = isCommunityCommand || isAiModeActive || isBotTrigger;

    setSending(true);
    setText('');
    const currentReply = replyTo;
    setReplyTo(null);

    const clientMsgId = generateClientMessageId();

    try {
      const { rtdb } = getFirebaseInstances();
      if (!rtdb) throw new Error('Database not connected');

      const driveLinks = extractDriveLinks(cleanText);
      const messagesRef = ref(rtdb, 'communityMessages');
      const newMsgRef = push(messagesRef);
      const now = getCurrentTimestamp();

      const messagePayload = {
        clientMessageId: clientMsgId,
        senderId: user.uid,
        senderUid: user.uid,
        senderName: profile.name || user.displayName || 'Member',
        senderGender: profile.gender || 'Male',
        senderAvatarType: profile.avatarType || 'male',
        text: cleanText.slice(0, 5000),
        createdAt: now,
        timestamp: now,
        type: driveLinks.length > 0 ? 'drive' : 'text',
        deleted: false,
        replyTo: currentReply || null,
        driveLinks: driveLinks.length > 0 ? driveLinks : null,
      };

      await set(newMsgRef, messagePayload);

      // Trigger Community AI / Small Bots if requested
      if (willTriggerAi) {
        checkAndTriggerGroupAi(
          cleanText,
          profile.name || 'Member',
          user.uid,
          isCommunityCommand || isAiModeActive || isBotTrigger
        );
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const checkIsBotTrigger = (msgText: string, bots: CustomBot[]): boolean => {
    const low = msgText.toLowerCase().trim();
    if (
      low.includes('@community') ||
      low.includes('@ai') ||
      low.includes('@gemini') ||
      low.includes('@bot') ||
      low.includes('@brain') ||
      low.includes('@agent') ||
      low.includes('@mod') ||
      low.includes('@code') ||
      low.includes('@helper') ||
      low.includes('@summarize') ||
      low.includes('@research')
    ) {
      return true;
    }
    const standardTriggers = [
      '!task', '#task', '!tasks', '#listtasks', '!addtask', '#todo',
      '!poll', '#poll', '!vote', '#vote',
      '!point', '!points', '!karma', '#kudos', '!rep',
      '!stats', '#stats', '!info', '#analytics',
      '!log', '#log', '!announce', '#notice',
    ];
    for (const st of standardTriggers) {
      if (
        low === st ||
        low.startsWith(`${st} `) ||
        low.startsWith(`${st}:`) ||
        low.includes(` ${st} `) ||
        low.includes(` ${st}`)
      ) {
        return true;
      }
    }
    for (const bot of bots) {
      if (!bot.enabled || !bot.triggerWords) continue;
      for (const tw of bot.triggerWords) {
        const cleanTw = tw.toLowerCase().trim();
        if (
          cleanTw &&
          (low === cleanTw ||
            low.startsWith(`${cleanTw} `) ||
            low.startsWith(`${cleanTw}:`) ||
            low.includes(` ${cleanTw} `) ||
            low.includes(` ${cleanTw}`))
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const handleCompleteTask = async (taskId: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb || !taskId) return;
    try {
      await update(ref(rtdb, `agentTasks/${taskId}`), {
        status: 'completed',
        completedAt: getCurrentTimestamp(),
        completedByName: profile?.name || 'Member',
      });
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb || !pollId || !user) return;
    try {
      const targetPoll = communityPolls.find((p) => p.id === pollId);
      if (!targetPoll) return;
      const currentVoterOption = targetPoll.voters?.[user.uid];
      if (currentVoterOption === optionId) return;

      const updatedOptions = targetPoll.options.map((opt) => {
        let count = opt.votes || 0;
        if (opt.id === currentVoterOption) count = Math.max(0, count - 1);
        if (opt.id === optionId) count = count + 1;
        return { ...opt, votes: count };
      });

      await update(ref(rtdb, `communityPolls/${pollId}`), {
        options: updatedOptions,
        [`voters/${user.uid}`]: optionId,
      });
    } catch (err) {
      console.error('Failed voting on poll:', err);
    }
  };

  const checkAndTriggerGroupAi = async (
    userMsg: string,
    userName: string,
    senderUid: string,
    activeForUser: boolean
  ) => {
    if (aiSettings && (aiSettings.status === false || aiSettings.groupAi === false)) {
      return;
    }

    try {
      setIsAiTyping(true);

      const recent = messages.slice(-5).map((m) => ({
        senderName: m.senderName,
        text: m.text,
        isAi: Boolean(m.isAi),
      }));

      const res = await fetch('/api/ai/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUid,
          senderName: userName,
          message: userMsg,
          recentMessages: recent,
          aiSettings: aiSettings || undefined,
          aiActiveForUser: activeForUser,
          customBots,
          communityStats: {
            totalMessages: messages.length,
            totalTasks: agentTasks.length,
          },
        }),
      });

      const data = await res.json();

      if (data.shouldReply && data.reply) {
        const { rtdb } = getFirebaseInstances();
        if (rtdb && user) {
          // Execute database action if returned by bot
          if (data.databaseAction) {
            const dbAction = data.databaseAction;
            if (dbAction.type === 'create_task' && dbAction.task) {
              const taskRef = push(ref(rtdb, 'agentTasks'));
              await set(taskRef, {
                id: taskRef.key,
                ...dbAction.task,
              });
            } else if (dbAction.type === 'create_poll' && dbAction.poll) {
              const pollRef = push(ref(rtdb, 'communityPolls'));
              await set(pollRef, {
                id: pollRef.key,
                ...dbAction.poll,
              });
            } else if (dbAction.type === 'award_karma' && dbAction.karma) {
              const logRef = push(ref(rtdb, 'botLogs'));
              await set(logRef, {
                id: logRef.key,
                type: 'karma',
                ...dbAction.karma,
              });
            } else if (dbAction.type === 'record_log' && dbAction.log) {
              const logRef = push(ref(rtdb, 'botLogs'));
              await set(logRef, {
                id: logRef.key,
                type: 'notice',
                ...dbAction.log,
              });
            }
          }

          const aiDriveLinks = extractDriveLinks(data.reply);
          const aiMsgRef = push(ref(rtdb, 'communityMessages'));
          const now = getCurrentTimestamp();

          await set(aiMsgRef, {
            clientMessageId: generateClientMessageId(),
            senderId: 'community_ai',
            senderUid: 'community_ai',
            senderName: data.aiName || 'Community AI',
            isAi: true,
            botType: data.botType || 'agent',
            botId: data.botId || null,
            aiTargetUser: userName,
            text: data.reply.slice(0, 5000),
            createdAt: now,
            timestamp: now,
            type: aiDriveLinks.length > 0 ? 'drive' : 'text',
            deleted: false,
            driveLinks: aiDriveLinks.length > 0 ? aiDriveLinks : null,
          });
        }
      }
    } catch (err) {
      console.error('Group AI error:', err);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleMentionAi = () => {
    setText((prev) => (prev ? `${prev} @community ` : `@community `));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/60 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors">
      {/* Header Bar */}
      <div className="px-3.5 py-3 sm:px-6 bg-white/95 dark:bg-[#0c1220]/95 border-b border-slate-200/90 dark:border-slate-800/80 backdrop-blur-md flex items-center justify-between z-10 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-600 to-indigo-600 p-0.5 shadow-md shadow-blue-600/20 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#0c1220] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-sky-400" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1220]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {communitySettings?.communityName || 'Main Community Room'}
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-500/30 shrink-0">
                Hub
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
              <span>Public Discussions</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live RTDB
              </span>
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Agent Fleet & Tasks Button */}
          <button
            onClick={() => setShowAgentDrawer(!showAgentDrawer)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showAgentDrawer
                ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/30'
                : 'bg-white dark:bg-[#0e1526] text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
            title="Agent Fleet, Tasks & Polls"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agent Fleet</span>
            {agentTasks.filter((t) => t.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500 text-white font-black">
                {agentTasks.filter((t) => t.status === 'pending').length}
              </span>
            )}
          </button>

          {isAiModeActive && (
            <button
              onClick={() => toggleAiMode(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-purple-600 text-white shadow-md shadow-purple-900/30 animate-pulse cursor-pointer"
              title="Click or type @close to disable Community AI for you"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Active</span>
              <X className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}

          {aiSettings?.groupAi !== false && !isAiModeActive && (
            <button
              onClick={handleMentionAi}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 transition-colors cursor-pointer"
              title="Ask AI with @community"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>@community</span>
            </button>
          )}

          <button
            onClick={() => setShowDesktopInfo(!showDesktopInfo)}
            className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              showDesktopInfo
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-sky-300 border-blue-200 dark:border-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200'
            }`}
            title="Toggle Room Details Panel"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">{showDesktopInfo ? 'Hide Details' : 'Show Details'}</span>
          </button>

          <button
            onClick={() => setShowClearModal(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/80 hover:border-rose-300 dark:hover:border-rose-500/30 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline ml-1.5">Clear</span>
          </button>
        </div>
      </div>

      {/* AI Active Indicator Banner */}
      {isAiModeActive && (
        <div className="px-4 py-2 bg-gradient-to-r from-purple-900/80 via-indigo-900/70 to-purple-950 text-white border-b border-purple-500/30 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-4 h-4 text-purple-300 animate-spin shrink-0" />
            <span className="truncate">
              <strong>Community AI Mode is ACTIVE.</strong> AI will answer your messages. Type <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-purple-200 font-bold">@close</code> to stop.
            </span>
          </div>
          <button
            onClick={() => toggleAiMode(false)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold transition-colors cursor-pointer shrink-0 ml-2"
          >
            Close AI
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      {communitySettings?.welcomeMessage && !isAiModeActive && (
        <div className="px-4 py-1.5 bg-blue-50/80 dark:bg-blue-950/30 border-b border-blue-200/60 dark:border-blue-900/40 text-xs font-medium text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
          <span className="truncate">{communitySettings.welcomeMessage}</span>
        </div>
      )}

      {/* Main Body: Chat stream + Optional Desktop Right Details Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left / Center: Messages + Message Input */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Messages Scroll Area */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-blue-600 dark:text-sky-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Welcome to the Community!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    Say hello, ask a question with{' '}
                    <span className="text-purple-600 dark:text-purple-400 font-bold">@community</span>, or share a Google Drive document link!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderUid === user?.uid;
                const isAi = Boolean(msg.isAi);

                return (
                  <div
                    key={msg.id || msg.clientMessageId}
                    className={`group flex items-start gap-2.5 transition-colors ${
                      isMe ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar Display */}
                    <div
                      className="cursor-pointer shrink-0 mt-0.5"
                      onClick={() => {
                        const targetUid = msg.senderUid || msg.senderId;
                        if (!isAi && !isMe && onOpenPrivateChatWithUser && targetUid) {
                          onOpenPrivateChatWithUser(targetUid);
                        }
                      }}
                      title={isAi ? 'Community AI' : `Open 1-on-1 chat with ${msg.senderName}`}
                    >
                      <AvatarDisplay
                        gender={isAi ? 'ai' : msg.senderGender || 'male'}
                        size="md"
                      />
                    </div>

                    {/* Message Content */}
                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                        isMe ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Sender Name & Meta */}
                      <div className="flex items-center gap-1.5 mb-1 text-xs">
                        <span
                          onClick={() => {
                            const targetUid = msg.senderUid || msg.senderId;
                            if (!isAi && !isMe && onOpenPrivateChatWithUser && targetUid) {
                              onOpenPrivateChatWithUser(targetUid);
                            }
                          }}
                          className={`font-bold cursor-pointer transition-colors ${
                            isAi
                              ? 'text-purple-600 dark:text-purple-400 font-extrabold'
                              : isMe
                              ? 'text-blue-700 dark:text-sky-300 font-bold'
                              : 'text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400'
                          }`}
                        >
                          {msg.senderName}
                        </span>

                        {isAi && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 font-extrabold uppercase">
                            AI
                          </span>
                        )}

                        {(msg.senderUid === FIXED_ADMIN_UID || msg.senderId === FIXED_ADMIN_UID) && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-bold flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                            Admin
                          </span>
                        )}

                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          {formatTime(msg.timestamp, msg.createdAt)}
                        </span>
                      </div>

                      {/* Reply Quote */}
                      {msg.replyTo && (
                        <div
                          className={`mb-1 px-3 py-1 rounded-xl text-xs flex items-center gap-2 border shadow-2xs max-w-full ${
                            isMe
                              ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
                              : 'bg-slate-100 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <CornerDownRight className="w-3 h-3 text-blue-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold">{msg.replyTo.senderName}:</span>{' '}
                            <span className="opacity-90 italic">{msg.replyTo.text}</span>
                          </div>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        dir="auto"
                        className={`relative p-3 sm:p-3.5 rounded-2xl text-[13.5px] sm:text-[14px] leading-relaxed break-words whitespace-pre-wrap shadow-xs transition-all ${
                          isAi
                            ? 'bg-purple-50/90 dark:bg-[#151022] border border-purple-200 dark:border-purple-500/30 text-slate-900 dark:text-purple-50 rounded-tl-xs shadow-md shadow-purple-900/10'
                            : isMe
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-tr-xs shadow-md shadow-blue-900/20'
                            : 'bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800/90 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-2xs'
                        }`}
                      >
                        {msg.text}

                        {/* Google Drive Link Cards */}
                        {msg.driveLinks && msg.driveLinks.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {msg.driveLinks.map((link, idx) => (
                              <DriveCard key={idx} link={link} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions (Reply, Copy, Delete, Report) */}
                      <div
                        className={`mt-1 flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <button
                          onClick={() =>
                            setReplyTo({
                              id: msg.id,
                              senderName: msg.senderName,
                              text: msg.text.slice(0, 50),
                            })
                          }
                          title="Reply"
                          className="p-1 rounded-lg hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleCopyMessage(msg)}
                          title="Copy"
                          className="p-1 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        {(isMe || isAdmin || user?.uid === FIXED_ADMIN_UID) && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Delete Message"
                            className="p-1 rounded-lg hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        {!isMe && !isAi && (
                          <button
                            onClick={() => onOpenReport(msg)}
                            title="Report Message"
                            className="p-1 rounded-lg hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* AI Generating Indicator */}
            {isAiTyping && (
              <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400 text-xs py-1">
                <AvatarDisplay gender="ai" size="sm" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 shadow-xs font-semibold">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>{aiSettings?.name || 'Community AI'} is answering...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Scroll to Bottom */}
          {showScrollBottom && (
            <button
              onClick={() => scrollToBottom('smooth')}
              className="absolute right-4 bottom-20 p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all z-20 cursor-pointer"
              title="Scroll to bottom"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {/* Reply Preview Bar */}
          {replyTo && (
            <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">
                  Replying to <strong className="text-slate-900 dark:text-white">{replyTo.senderName}</strong>:{' '}
                  <em className="opacity-80 italic">&ldquo;{replyTo.text}&rdquo;</em>
                </span>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Message Input Dock */}
          <form
            onSubmit={handleSendMessage}
            className="p-2 sm:p-3 bg-white/95 dark:bg-[#0c1220]/95 border-t border-slate-200/90 dark:border-slate-800/80 backdrop-blur-md transition-colors"
          >
            {/* Quick Multi-Bot Trigger Chips */}
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-none pb-0.5 text-[11px]">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 shrink-0 mr-0.5">
                Agents:
              </span>
              <button
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev} @ai ` : `@ai `))}
                className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>🧠 @ai</span>
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev} !task ` : `!task `))}
                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                title="Create a database task (!task <Title> priority:high)"
              >
                <span>📋 !task</span>
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev} !poll ` : `!poll `))}
                className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                title="Create a live poll (!poll Question | Opt1 | Opt2)"
              >
                <span>📊 !poll</span>
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev} !points @` : `!points @`))}
                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                title="Award karma points (!points @user <reason>)"
              >
                <span>🏆 !points</span>
              </button>
              <button
                type="button"
                onClick={() => setText('!stats')}
                className="px-2 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                title="Query real-time database stats (!stats)"
              >
                <span>📈 !stats</span>
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev} @code ` : `@code `))}
                className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>💻 @code</span>
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev} @mod ` : `@mod `))}
                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>🛡️ @mod</span>
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev} @summarize ` : `@summarize `))}
                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>📊 @summarize</span>
              </button>
              <button
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev} @helper ` : `@helper `))}
                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>⚡ @helper</span>
              </button>
              {/* Custom bots */}
              {customBots.map((bot) => (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => setText((prev) => (prev ? `${prev} ${bot.triggerWords[0]} ` : `${bot.triggerWords[0]} `))}
                  className="px-2 py-1 rounded-lg bg-fuchsia-50 hover:bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-500/30 font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                  title={bot.description}
                >
                  <Bot className="w-3 h-3" />
                  <span>{bot.triggerWords[0]} ({bot.name})</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  dir="auto"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type message, @ai, !task, !poll, !points, or Drive link..."
                  className="w-full px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-xs sm:text-sm font-normal transition-colors"
                  disabled={sending}
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-900/20 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Desktop Right Info Sidebar (Visible on xl screens when toggled) */}
        {showDesktopInfo && (
          <aside className="hidden xl:flex flex-col w-80 shrink-0 border-l border-slate-200/90 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0a0f1d]/80 overflow-y-auto p-4 space-y-4">
            {/* Agent Fleet Quick Overview */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-500/30 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-purple-900 dark:text-purple-200">
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Agent Fleet &amp; Tasks</span>
                </div>
                <button
                  onClick={() => setShowAgentDrawer(true)}
                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  Open Hub →
                </button>
              </div>

              {/* Active Tasks Widget */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span>Pending Tasks</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-200 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200">
                    {agentTasks.filter((t) => t.status === 'pending').length}
                  </span>
                </div>
                {agentTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-2 rounded-xl bg-white dark:bg-[#0c1220] border border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <p className={`font-semibold truncate text-[11px] ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.title}
                      </p>
                      <span className="text-[9px] text-slate-400 uppercase font-black">
                        {task.priority || 'medium'} · by @{task.createdByName}
                      </span>
                    </div>
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0 cursor-pointer"
                        title="Mark Completed"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Room Info */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Info className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                <span>About Community Room</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {communitySettings?.welcomeMessage ||
                  'Welcome to the live public discussions hub. Share documents, collaborate, and ask questions.'}
              </p>
            </div>

            {/* AI Assistant Guide */}
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/30 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Agent Commands</span>
              </div>
              <div className="space-y-1.5 text-xs text-purple-900 dark:text-purple-200">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                    !task &lt;Title&gt;
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-purple-300">Add DB Task</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                    !poll Question | Opts
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-purple-300">Create Poll</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                    !points @user reason
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-purple-300">Award Karma</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold bg-white/70 dark:bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                    !stats
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-purple-300">Live Metrics</span>
                </div>
              </div>
            </div>

            {/* Google Drive Tip */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Drive Sharing</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Paste any Google Drive, Docs, Sheets, or Slides link in your message to generate an interactive preview card with quick open and copy actions.
              </p>
            </div>
          </aside>
        )}
      </div>

      {/* Agent Fleet & Tasks Modal / Drawer */}
      {showAgentDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-[#0c1220] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#090d16]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-900/30">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Agent Fleet &amp; Database Tasks
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automated sub-bots and database action hub
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAgentDrawer(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex items-center gap-2 px-4 sm:px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] text-xs font-bold">
              <button
                onClick={() => setActiveAgentTab('tasks')}
                className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeAgentTab === 'tasks'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ListTodo className="w-4 h-4" />
                <span>Tasks ({agentTasks.length})</span>
              </button>
              <button
                onClick={() => setActiveAgentTab('polls')}
                className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeAgentTab === 'polls'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Live Polls ({communityPolls.length})</span>
              </button>
              <button
                onClick={() => setActiveAgentTab('bots')}
                className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeAgentTab === 'bots'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>Active Bots Fleet</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {activeAgentTab === 'tasks' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
                    <span>💡 Create tasks in chat with <code className="font-mono font-bold bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">!task &lt;Title&gt; priority:high</code></span>
                  </div>

                  {agentTasks.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No tasks in the database yet. Send <code className="font-bold">!task Sample Task</code> in the chat to create one!
                    </div>
                  ) : (
                    agentTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                              {t.title}
                            </span>
                            <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                              t.priority === 'urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                              t.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {t.priority || 'medium'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Created by @{t.createdByName} · {formatTime(t.createdAt)}
                            {t.status === 'completed' && ' · ✅ Completed'}
                          </p>
                        </div>
                        {t.status === 'pending' ? (
                          <button
                            onClick={() => handleCompleteTask(t.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 shadow-sm cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            Completed
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeAgentTab === 'polls' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200">
                    💡 Launch a poll in chat with <code className="font-mono font-bold bg-purple-100 dark:bg-purple-900 px-1 py-0.5 rounded">!poll Question | Opt 1 | Opt 2</code>
                  </div>

                  {communityPolls.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No active polls found. Type <code className="font-bold">!poll Best IDE? | VSCode | WebStorm</code> in chat!
                    </div>
                  ) : (
                    communityPolls.map((poll) => {
                      const totalVotes = poll.options.reduce((acc, curr) => acc + (curr.votes || 0), 0);
                      const myVote = user ? poll.voters?.[user.uid] : null;

                      return (
                        <div
                          key={poll.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                              📊 {poll.question}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {totalVotes} total votes
                            </span>
                          </div>

                          <div className="space-y-2">
                            {poll.options.map((opt) => {
                              const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                              const isSelected = myVote === opt.id;

                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleVotePoll(poll.id, opt.id)}
                                  className={`w-full text-left p-2.5 rounded-xl border relative overflow-hidden transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40'
                                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0c1220]'
                                  }`}
                                >
                                  {/* Progress bar fill */}
                                  <div
                                    className="absolute left-0 top-0 bottom-0 bg-purple-200/40 dark:bg-purple-900/40 transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                  <div className="relative z-10 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    <span className="flex items-center gap-1.5">
                                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-600" />}
                                      {opt.text}
                                    </span>
                                    <span className="font-mono text-slate-500 text-[11px]">
                                      {opt.votes || 0} ({pct}%)
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Created by @{poll.createdByName} · {formatTime(poll.createdAt)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeAgentTab === 'bots' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <ListTodo className="w-4 h-4 text-blue-600" />
                        <span>Task Manager Agent</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Creates and tracks items in the database.</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">!task</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">#todo</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">!tasks</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        <span>Community Poll Agent</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Dispatches interactive member votes.</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold">!poll</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold">#vote</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Award className="w-4 h-4 text-amber-600" />
                        <span>Karma &amp; Kudos Agent</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Awards contribution points and praises.</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">!points</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">!karma</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Zap className="w-4 h-4 text-cyan-600" />
                        <span>Stats &amp; Metrics Agent</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Queries live database and member stats.</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-bold">!stats</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-bold">#analytics</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-[#090d16]">
              <button
                onClick={() => setShowAgentDrawer(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 cursor-pointer"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        title={isAdmin ? 'Clear Community Chat' : 'Clear Local Cache'}
        description={
          isAdmin
            ? 'Are you sure you want to clear community messages? This will delete messages for everyone.'
            : 'Are you sure you want to clear your local chat history on this device?'
        }
        confirmText="Clear History"
        onConfirm={handleClearHistoryConfirmed}
        onClose={() => setShowClearModal(false)}
      />
    </div>
  );
}
