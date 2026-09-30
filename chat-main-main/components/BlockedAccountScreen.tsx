'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Send,
  Sparkles,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Bot,
  Zap,
  RefreshCw,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { ref, set, update, onValue } from 'firebase/database';
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { getCurrentTimestamp, formatDateTime } from '@/lib/utils';

export function BlockedAccountScreen() {
  const { user, profile, logout } = useAuth();
  const [appealText, setAppealText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [appealData, setAppealData] = useState<any>(null);
  const [aiEvaluating, setAiEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    approved?: boolean;
    explanation?: string;
    permanentBan?: boolean;
    mistakeCount?: number;
  } | null>(null);

  const mistakeCount = profile?.mistakeCount || 0;
  const isPermanentBan = mistakeCount >= 5;
  const banReason = profile?.banReason || 'کمیونٹی گائیڈ لائنز یا نامناسب پیغامات کی خلاف ورزی (Community Guideline Violation)';

  // Real-time listener for existing unblock request
  useEffect(() => {
    const { rtdb } = getFirebaseInstances();
    if (!rtdb || !user) return;

    const appealRef = ref(rtdb, `unblockRequests/${user.uid}`);
    const un = onValue(appealRef, (snap) => {
      if (snap.exists()) {
        setAppealData(snap.val());
      } else {
        setAppealData(null);
      }
    });

    return () => un();
  }, [user]);

  // Handle Instant AI Review & Auto-Unblock (under 1 minute)
  const handleInstantAiReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSubmit = appealText.trim() || appealData?.appealText;
    if (!textToSubmit || submitting || aiEvaluating || !user) return;

    setSubmitting(true);
    setAiEvaluating(true);
    setAiResult(null);

    try {
      const { rtdb } = getFirebaseInstances();
      if (!rtdb) throw new Error('Database unavailable');

      const now = getCurrentTimestamp();

      // First submit/update request in RTDB
      const appealPayload = {
        uid: user.uid,
        userName: profile?.name || user.displayName || 'Member',
        userEmail: user.email || profile?.email || '',
        appealText: textToSubmit.slice(0, 3000),
        status: 'evaluating_by_ai',
        createdAt: appealData?.createdAt || now,
        updatedAt: now,
      };
      await set(ref(rtdb, `unblockRequests/${user.uid}`), appealPayload);

      // Call AI Appeal Evaluation API
      const res = await fetch('/api/ai/appeal-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          userName: profile?.name || user.displayName || 'Member',
          userEmail: user.email || profile?.email || '',
          appealText: textToSubmit,
          banReason,
          mistakeCount,
        }),
      });

      const data = await res.json();
      setAiResult({
        approved: data.approved,
        explanation: data.aiReply,
        permanentBan: data.permanentBan,
        mistakeCount: data.mistakeCount,
      });

      if (data.approved) {
        // Auto-unblock in RTDB!
        await update(ref(rtdb, `users/${user.uid}`), {
          banned: false,
          disabled: false,
          mistakeCount: data.mistakeCount || (mistakeCount + 1),
          lastUnblockedAt: now,
          unblockedBy: 'AI_ASSISTANT_AUTO_APPROVAL',
        });

        await update(ref(rtdb, `unblockRequests/${user.uid}`), {
          status: 'approved_by_ai',
          resolvedAt: now,
          aiFeedback: data.aiReply,
        });

        // Also remove from admin blocks list
        await set(ref(rtdb, `blocks/admin/${user.uid}`), null);
      } else {
        await update(ref(rtdb, `unblockRequests/${user.uid}`), {
          status: data.permanentBan ? 'permanently_rejected' : 'pending_admin_manual_review',
          aiFeedback: data.aiReply,
          updatedAt: now,
        });
      }

      setAppealText('');
    } catch (err: any) {
      alert(err.message || 'Appeal processing error');
    } finally {
      setSubmitting(false);
      setAiEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#06080e] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900/95 border border-rose-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative backdrop-blur-2xl">
        
        {/* Header with Suspended Badge */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/40 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider border border-rose-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>اکاؤنٹ بلاک ہے / Account Suspended</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {profile?.name ? `${profile.name}, آپ کا اکاؤنٹ بلاک کر دیا گیا ہے` : 'Your Account Has Been Blocked'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              کمیونٹی قوانین کی پاسداری نہ کرنے یا سیکیورٹی کی وجوہات کی بنا پر آپ کی چیٹ اور رسائی کو روک دیا گیا ہے۔
            </p>
          </div>
        </div>

        {/* Reason for Block Card */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-rose-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-rose-400 font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              <span>بلاک کرنے کی وجہ (Reason for Block):</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
              چانسز: {mistakeCount} / 5 استعمال شدہ
            </span>
          </div>
          <p className="text-xs text-slate-200 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            {banReason}
          </p>
        </div>

        {/* AI & 5-Mistake Policy Details */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/20 space-y-3 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>AI Assistant 1-Minute Fast Resolution &amp; Policy</span>
            </div>
            <span className="text-[11px] text-amber-400 font-medium">5 غلطیوں پر مستقل بلاک</span>
          </div>
          
          <div className="space-y-2 text-[11px] leading-relaxed text-slate-400">
            <p>
              • اگر آپ سے انجانے میں غلطی ہوئی ہے اور آپ نے کوئی گندا یا غیر اخلاقی پیغام نہیں بھیجا، تو آپ کی اپیل سن کر <strong>اے آئی اسسٹنٹ 1 منٹ کے اندر</strong> آپ کا اکاؤنٹ دوبارہ بحال کر سکتا ہے۔
            </p>
            <p>
              • <strong>5 غلطیوں کا اصول:</strong> اگر آپ 5 بار غلطی کریں گے تو 6ویں بار اکاؤنٹ ہمیشہ کے لیے مستقل بلاک ہو جائے گا اور اے آئی اسے نہیں کھولے گا۔
            </p>
            <p>
              • <strong>ایڈمنسٹریٹر پاور:</strong> ایڈمن جب چاہے کسی بھی وقت کسی بھی ممبر کو 1 سیکنڈ میں بلاک یا ان بلاک کر سکتا ہے۔
            </p>
          </div>
        </div>

        {/* AI Decision Alert Box if evaluated */}
        {aiResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              aiResult.approved
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {aiResult.approved ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>اپیل منظور ہو گئی! اکاؤنٹ بحال کیا جا رہا ہے...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <span>اپیل خودکار منظور نہیں ہو سکی</span>
                </>
              )}
            </div>
            <p className="leading-relaxed text-xs">{aiResult.explanation}</p>
            {aiResult.approved && (
              <div className="pt-2">
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[11px]">
                  ✓ وارننگ درج کر لی گئی ({aiResult.mistakeCount || 1}/5) • آپ اب چیٹ کر سکتے ہیں
                </span>
              </div>
            )}
          </div>
        )}

        {/* If user is permanently banned (>=5 offenses) */}
        {isPermanentBan ? (
          <div className="p-5 rounded-2xl bg-rose-950/60 border border-rose-600/50 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="font-bold text-sm text-white">اکاؤنٹ مستقل بلاک ہے (5 چانسز ختم)</h3>
            <p className="text-xs text-rose-200">
              آپ کے تمام 5 چانسز ختم ہو چکے ہیں۔ اے آئی اسسٹنٹ اب خودکار طور پر بحال نہیں کر سکتا۔ صرف ایڈمنسٹریٹر ہی دستی طور پر اجازت دے سکتے ہیں۔
            </p>
          </div>
        ) : (
          /* Appeal Form / Status */
          <div className="space-y-3">
            {appealData && appealData.status !== 'approved_by_ai' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-sky-400">
                    <Clock className="w-4 h-4" />
                    <span>موجودہ اپیل کی صورتحال (Appeal Status)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDateTime(appealData.createdAt)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 italic">
                  &ldquo;{appealData.appealText}&rdquo;
                </div>
                {appealData.aiFeedback && (
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300">
                    <strong>اے آئی جواب:</strong> {appealData.aiFeedback}
                  </div>
                )}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleInstantAiReview()}
                    disabled={aiEvaluating}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/50"
                  >
                    {aiEvaluating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{aiEvaluating ? 'اے آئی جائزہ لے رہا ہے...' : 'اے آئی اسسٹنٹ سے 1 منٹ میں دوبارہ جائزہ کروائیں'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInstantAiReview} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>اپیل لکھیں (Explain your reason to Admin &amp; AI):</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Max 3000 chars</span>
                </div>

                <textarea
                  required
                  rows={3}
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="اپنی وضاحت اور معذرت لکھیں کہ یہ غلطی سے ہوا یا آپ کا اکاؤنٹ کیوں ان بلاک کیا جائے..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!appealText.trim() || submitting || aiEvaluating}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-950/50 disabled:opacity-40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {aiEvaluating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>اے آئی اسسٹنٹ اپیل کا جائزہ لے رہا ہے (1 منٹ)...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>اپیل جمع کروائیں اور 1 منٹ میں AI سے بحال کروائیں (Instant Review)</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer: User profile name & Logout button (NO RAW UID) */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            لاگ ان اکاؤنٹ: <span className="text-slate-200 font-semibold">{profile?.name || user?.email || 'User'}</span>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>لاگ آؤٹ / Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
