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
  update,
  get,
} from 'firebase/database';
import {
  Send,
  ArrowLeft,
  Copy,
  Trash2,
  Flag,
  Check,
  Ban,
  ShieldAlert,
  CornerDownRight,
  HardDrive,
  Reply,
  WifiOff,
} from 'lucide-react';
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { UserProfile, Message, MessageReply, PendingMessage } from '@/lib/types';
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

interface PrivateChatProps {
  otherUid: string;
  onBack: () => void;
  onOpenReport: (msg: Message) => void;
}

export function PrivateChat({ otherUid, onBack, onOpenReport }: PrivateChatProps) {
  const { user, profile } = useAuth();
  // Deterministic chatId between the two users
  const chatId = user && otherUid ? [user.uid, otherUid].sort().join('_') : '';
  const cacheKey = user && chatId ? `dc_chat_cache_${user.uid}_${chatId}` : '';
  const pendingQueueKey = user ? `dc_pending_messages_${user.uid}` : '';

  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!cacheKey) return [];
    return getSafeLocalStorage<Message[]>(cacheKey, []);
  });
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<MessageReply | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Flush pending offline messages
  const flushPendingMessages = useCallback(async () => {
    if (!user || !pendingQueueKey) return;
    const pendingList = getSafeLocalStorage<PendingMessage[]>(pendingQueueKey, []);
    if (pendingList.length === 0) return;

    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    const remaining: PendingMessage[] = [];

    for (const item of pendingList) {
      try {
        const msgRef = push(ref(rtdb, `personalChats/${item.chatId}/messages`));
        await set(msgRef, {
          clientMessageId: item.clientMessageId,
          senderId: item.senderUid,
          senderUid: item.senderUid,
          senderName: profile?.name || 'Member',
          senderGender: profile?.gender || 'Male',
          senderAvatarType: profile?.avatarType || 'male',
          text: item.text,
          type: item.type,
          createdAt: item.createdAt,
          timestamp: item.createdAt,
          deleted: false,
          replyTo: item.replyTo || null,
          driveLinks: item.driveLinks || null,
        });
      } catch (err) {
        remaining.push(item);
      }
    }

    setSafeLocalStorage(pendingQueueKey, remaining);
  }, [user, profile, pendingQueueKey]);

  // Network listener for offline support
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      flushPendingMessages();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [chatId, flushPendingMessages]);

  // Fetch other user profile & presence from RTDB
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb || !otherUid) return;

    const userRef = ref(rtdb, `users/${otherUid}`);
    const presenceRef = ref(rtdb, `presence/${otherUid}`);

    const unUser = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val() as UserProfile;
        setOtherUser((prev) => ({ ...prev, ...data }));
      }
    });

    const unPresence = onValue(presenceRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setOtherUser((prev) =>
          prev ? { ...prev, online: Boolean(val?.online), lastSeen: val?.lastSeen || prev.lastSeen } : null
        );
      }
    });

    return () => {
      unUser();
      unPresence();
    };
  }, [otherUid]);

  // Check 1-on-1 Block Status
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb || !user || !otherUid) return;

    const myBlockRef = ref(rtdb, `users/${user.uid}/blockedUsers/${otherUid}`);
    const theirBlockRef = ref(rtdb, `users/${otherUid}/blockedUsers/${user.uid}`);

    const un1 = onValue(myBlockRef, (snap) => {
      if (snap.val() === true) setIsBlocked(true);
      else setIsBlocked(false);
    });

    const un2 = onValue(theirBlockRef, (snap) => {
      if (snap.val() === true) setIsBlocked(true);
    });

    return () => {
      un1();
      un2();
    };
  }, [user, otherUid]);

  // Real-time messages listener
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb || !chatId) return;

    const messagesQuery = query(
      ref(rtdb, `personalChats/${chatId}/messages`),
      limitToLast(80)
    );

    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setMessages([]);
        if (cacheKey) removeSafeLocalStorage(cacheKey);
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

      if (cacheKey && list.length > 0) {
        setSafeLocalStorage(cacheKey, list);
      }
    });

    return () => unsubscribe();
  }, [chatId, cacheKey]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || sending || !user || !profile || isBlocked) return;

    setSending(true);
    setText('');
    const currentReply = replyTo;
    setReplyTo(null);

    const now = getCurrentTimestamp();
    const clientMid = generateClientMessageId();
    const driveLinks = extractDriveLinks(cleanText);

    const localMsg: Message = {
      id: 'temp_' + clientMid,
      clientMessageId: clientMid,
      senderId: user.uid,
      senderUid: user.uid,
      senderName: profile.name || 'Member',
      senderGender: profile.gender || 'Male',
      senderAvatarType: profile.avatarType || 'male',
      text: cleanText.slice(0, 5000),
      createdAt: now,
      timestamp: now,
      type: driveLinks.length > 0 ? 'drive' : 'text',
      deleted: false,
      replyTo: currentReply || undefined,
      driveLinks: driveLinks.length > 0 ? driveLinks : undefined,
    };

    // If offline, store to pending queue
    if (!navigator.onLine) {
      setMessages((prev) => [...prev, localMsg]);
      const pendingItem: PendingMessage = {
        chatId,
        clientMessageId: clientMid,
        senderUid: user.uid,
        receiverUid: otherUid,
        text: cleanText,
        type: driveLinks.length > 0 ? 'drive' : 'text',
        createdAt: now,
        replyTo: currentReply || null,
        driveLinks: driveLinks.length > 0 ? driveLinks : null,
      };
      const pendingList = getSafeLocalStorage<PendingMessage[]>(pendingQueueKey, []);
      setSafeLocalStorage(pendingQueueKey, [...pendingList, pendingItem]);
      setSending(false);
      return;
    }

    try {
      const { rtdb } = getFirebaseInstances();
      if (!rtdb) throw new Error('Database not connected');

      const messagesRef = ref(rtdb, `personalChats/${chatId}/messages`);
      const newMsgRef = push(messagesRef);

      await set(newMsgRef, {
        clientMessageId: clientMid,
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
      });

      // Update recent chats snippet
      await update(ref(rtdb, `personalChats/${chatId}`), {
        lastMessage: cleanText.slice(0, 120),
        lastMessageAt: now,
        participants: {
          [user.uid]: true,
          [otherUid]: true,
        },
      });
    } catch (err: any) {
      console.error('Failed sending private message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleBlockMember = async () => {
    if (!user) return;
    const { rtdb } = getFirebaseInstances();
    if (!rtdb) return;

    try {
      const willBlock = !isBlocked;
      await set(ref(rtdb, `users/${user.uid}/blockedUsers/${otherUid}`), willBlock ? true : null);
      setIsBlocked(willBlock);
    } catch (err) {
      console.error('Failed toggling block user:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    setMessages([]);
    if (cacheKey) removeSafeLocalStorage(cacheKey);

    const { rtdb } = getFirebaseInstances();
    if (rtdb && chatId) {
      try {
        await remove(ref(rtdb, `personalChats/${chatId}/messages`));
      } catch (err) {
        console.error('Failed clearing private chat history:', err);
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/60 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors">
      {/* Top Header */}
      <div className="px-3 py-2.5 sm:px-6 sm:py-3 bg-white/95 dark:bg-[#0c1220]/95 border-b border-slate-200/90 dark:border-slate-800/80 backdrop-blur-md flex items-center justify-between z-10 transition-colors">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Back to Group Chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <AvatarDisplay
            gender={otherUser?.gender || 'Male'}
            size="md"
            online={otherUser?.online}
          />

          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {otherUser?.name || 'Member'}
            </h2>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
              {otherUser?.online ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              ) : (
                <span>{otherUser?.lastSeen ? `Last seen ${formatTime(otherUser.lastSeen)}` : 'Offline'}</span>
              )}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleToggleBlockMember}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              isBlocked
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                : 'bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/30 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 border-slate-200 dark:border-slate-700/80'
            }`}
            title={isBlocked ? 'Unblock Member' : 'Block Member'}
          >
            <Ban className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline ml-1.5">{isBlocked ? 'Blocked' : 'Block'}</span>
          </button>

          <button
            onClick={() => setShowClearModal(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline ml-1.5">Clear</span>
          </button>
        </div>
      </div>

      {/* Offline Status Banner */}
      {isOffline && (
        <div className="px-4 py-1.5 bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-medium border-b border-amber-500/30 flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>You are offline. Messages will queue and auto-send once reconnected.</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <AvatarDisplay gender={otherUser?.gender || 'Male'} size="lg" />
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Direct Chat with {otherUser?.name || 'Member'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End-to-end private conversation.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUid === user?.uid;
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
                    gender={isMe ? profile?.gender || 'Male' : otherUser?.gender || 'Male'}
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
                      {isMe ? 'You' : otherUser?.name || 'Member'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatTime(msg.timestamp, msg.createdAt)}
                    </span>
                  </div>

                  {/* Reply Quote */}
                  {msg.replyTo && (
                    <div
                      className={`mb-1 px-3 py-1 rounded-xl text-xs flex items-center gap-2 border shadow-2xs ${
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

                  {/* Message Bubble */}
                  <div
                    dir="auto"
                    className={`relative p-3 sm:p-3.5 rounded-2xl text-[13.5px] sm:text-[14px] leading-relaxed break-words whitespace-pre-wrap shadow-xs transition-all ${
                      isMe
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-tr-xs shadow-md shadow-blue-900/20'
                        : 'bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800/90 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {msg.text}

                    {driveLinks.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {driveLinks.map((link, idx) => (
                          <DriveCard key={idx} link={link} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message Actions */}
                  <div
                    className={`mt-1 flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 ${
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
                      onClick={() => handleCopy(msg.id, msg.text)}
                      title="Copy"
                      className="p-1 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    {!isMe && (
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

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
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

      {/* Composer Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-2.5 sm:p-3.5 bg-white/95 dark:bg-[#0c1220]/95 border-t border-slate-200/90 dark:border-slate-800/80 backdrop-blur-md transition-colors"
      >
        {isBlocked ? (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs text-center font-bold">
            Direct messaging is blocked between you and this member.
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              dir="auto"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message ${otherUser?.name || 'Member'}...`}
              className="flex-1 px-3.5 py-2 sm:py-2.5 bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-xs sm:text-sm transition-colors"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-900/20 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </form>

      {/* Clear Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        title="Clear Private Conversation"
        description="Are you sure you want to clear your messages in this chat?"
        confirmText="Clear History"
        onConfirm={handleClearHistory}
        onClose={() => setShowClearModal(false)}
      />
    </div>
  );
}
