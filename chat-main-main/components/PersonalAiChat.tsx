'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ref,
  push,
  set,
  remove,
  onValue,
  query,
  limitToLast,
} from 'firebase/database';
import {
  Send,
  Sparkles,
  RotateCcw,
  Zap,
  BookOpen,
  Code2,
  Compass,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Message, AISettings } from '@/lib/types';
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

export function PersonalAiChat() {
  const { user, profile } = useAuth();
  const aiCacheKey = user ? `dc_personal_ai_${user.uid}` : '';

  const [messages, setMessages] = useState<Message[]>(() => {
    if (!aiCacheKey) return [];
    return getSafeLocalStorage<Message[]>(aiCacheKey, []);
  });
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load AI settings from RTDB
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    const un = onValue(ref(rtdb, 'settings/ai'), (snap) => {
      if (snap.exists()) setAiSettings(snap.val());
    });
    return () => un();
  }, []);

  // Listen to private AI history from Firebase RTDB for this user only
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb || !user) return;

    const userAiQuery = query(
      ref(rtdb, `aiChats/${user.uid}`),
      limitToLast(60)
    );

    const unsubscribe = onValue(userAiQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setMessages([]);
        if (aiCacheKey) removeSafeLocalStorage(aiCacheKey);
        return;
      }

      const list: Message[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        list.push({
          id: child.key || '',
          senderId: val.role === 'assistant' ? 'assistant' : user.uid,
          senderName: val.role === 'assistant' ? (aiSettings?.name || 'CommUnity AI') : (profile?.name || 'You'),
          isAi: val.role === 'assistant',
          text: val.text,
          createdAt: val.createdAt,
          timestamp: val.createdAt,
          type: 'text',
          deleted: false,
          ...val,
        });
      });

      list.sort((a, b) => (a.createdAt || a.timestamp || 0) - (b.createdAt || b.timestamp || 0));
      setMessages(list);

      if (aiCacheKey && list.length > 0) {
        setSafeLocalStorage(aiCacheKey, list);
      }
    });

    return () => unsubscribe();
  }, [user, aiSettings?.name, profile?.name, aiCacheKey]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, loading, scrollToBottom]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || text).trim();
    if (!promptToSend || loading || !user) return;

    setText('');
    setLoading(true);

    const now = getCurrentTimestamp();
    const clientMid = generateClientMessageId();

    const userLocalMsg: Message = {
      id: 'local_' + clientMid,
      clientMessageId: clientMid,
      senderId: user.uid,
      senderUid: user.uid,
      senderName: profile?.name || 'You',
      isAi: false,
      text: promptToSend,
      createdAt: now,
      timestamp: now,
      type: 'text',
      deleted: false,
    };

    setMessages((prev) => [...prev, userLocalMsg]);

    try {
      const { rtdb } = getFirebaseInstances();
      if (!rtdb) throw new Error('Database unavailable');

      // 1. Save user prompt to Firebase RTDB under private node
      const userMsgRef = push(ref(rtdb, `aiChats/${user.uid}`));
      await set(userMsgRef, {
        clientMessageId: clientMid,
        role: 'user',
        text: promptToSend,
        createdAt: now,
      });

      // 2. Build history for Gemini
      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.isAi ? 'assistant' : 'user',
        content: m.text,
      }));

      // 3. Call server-side Next.js route for Gemini AI
      const res = await fetch('/api/ai/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history: historyPayload,
          aiSettings: aiSettings || undefined,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || data.text || 'I apologize, but I could not generate a response.';
      const aiNow = getCurrentTimestamp();

      // 4. Save AI reply to Firebase RTDB
      const aiMsgRef = push(ref(rtdb, `aiChats/${user.uid}`));
      await set(aiMsgRef, {
        clientMessageId: generateClientMessageId(),
        role: 'assistant',
        text: replyText,
        createdAt: aiNow,
      });
    } catch (err: any) {
      console.error('Personal AI error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    setMessages([]);
    if (aiCacheKey) removeSafeLocalStorage(aiCacheKey);

    const { rtdb } = getFirebaseInstances();
    if (rtdb) {
      try {
        await remove(ref(rtdb, `aiChats/${user.uid}`));
      } catch (err) {
        console.error('Failed to clear personal AI history in RTDB:', err);
      }
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const promptSuggestions = [
    { icon: BookOpen, label: 'Explain a Concept', prompt: 'Can you explain how neural networks and transformers work in simple terms?' },
    { icon: Code2, label: 'Write or Debug Code', prompt: 'Write a clean TypeScript helper function to debounce an API call.' },
    { icon: Compass, label: 'Brainstorm Ideas', prompt: 'Give me 5 creative ideas for a community tech meetup.' },
    { icon: Zap, label: 'Quick Summary', prompt: 'Summarize the key principles of responsive and accessible UI design.' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/60 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors">
      {/* Top Header */}
      <div className="px-3.5 py-3 sm:px-6 bg-white/95 dark:bg-[#0c1220]/95 border-b border-slate-200/90 dark:border-slate-800/80 backdrop-blur-md flex items-center justify-between z-10 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-indigo-600 p-0.5 shadow-md shadow-purple-600/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#0c1220] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {aiSettings?.name || 'CommUnity AI'}
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 shrink-0">
                1-on-1 Gemini
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Private workspace • Only visible to you
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowClearModal(true)}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/80 hover:border-rose-300 dark:hover:border-rose-500/30 transition-colors cursor-pointer shrink-0"
          title="Clear AI Chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline ml-1.5">Clear</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-xl shadow-purple-600/20 flex items-center justify-center">
              <div className="w-full h-full rounded-[22px] bg-white dark:bg-[#0c1220] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                How can I assist you today?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ask anything, brainstorm solutions, write code, or get quick summaries.
              </p>
            </div>

            {/* Prompt Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
              {promptSuggestions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="flex items-start gap-2.5 p-3 rounded-2xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/40 text-left transition-all group shadow-2xs cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {item.prompt}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = !msg.isAi;
            const driveLinks = extractDriveLinks(msg.text);

            return (
              <div
                key={msg.id || msg.clientMessageId}
                className={`group flex items-start gap-2.5 transition-colors ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <AvatarDisplay
                    gender={msg.isAi ? 'ai' : profile?.gender || 'male'}
                    size="md"
                  />
                </div>

                <div
                  className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {msg.isAi ? (aiSettings?.name || 'CommUnity AI') : (profile?.name || 'You')}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatTime(msg.timestamp, msg.createdAt)}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    dir="auto"
                    className={`relative p-3.5 sm:p-4 rounded-2xl text-[13.5px] sm:text-[14px] leading-relaxed break-words whitespace-pre-wrap shadow-xs transition-all ${
                      msg.isAi
                        ? 'bg-purple-50/90 dark:bg-[#151022] border border-purple-200 dark:border-purple-500/30 text-slate-900 dark:text-purple-50 rounded-tl-xs shadow-md shadow-purple-900/10 font-normal'
                        : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-medium rounded-tr-xs shadow-md shadow-purple-900/20'
                    }`}
                  >
                    {msg.text}

                    {/* Google Drive Links */}
                    {driveLinks.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {driveLinks.map((link, idx) => (
                          <DriveCard key={idx} link={link} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Copy */}
                  <div
                    className={`mt-1 flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      title="Copy response"
                      className="p-1 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400 text-xs py-1">
            <AvatarDisplay gender="ai" size="sm" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 shadow-xs font-semibold">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>Thinking with Gemini...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2.5 sm:p-3.5 bg-white/95 dark:bg-[#0c1220]/95 border-t border-slate-200/90 dark:border-slate-800/80 backdrop-blur-md transition-colors"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask anything or request code / summaries..."
            className="flex-1 px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 text-xs sm:text-sm transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-950/20 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Clear Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        title="Clear Personal AI History"
        description="Are you sure you want to clear your private conversation with the AI?"
        confirmText="Clear History"
        onConfirm={handleClearHistory}
        onClose={() => setShowClearModal(false)}
      />
    </div>
  );
}
