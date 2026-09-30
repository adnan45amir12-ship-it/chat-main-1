'use client';

import React, { useState } from 'react';
import { X, Flag, AlertCircle, CheckCircle } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { getCurrentTimestamp } from '@/lib/utils';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'message' | 'user';
  messageId?: string;
  messageText?: string;
  reportedUid?: string;
  reportedName?: string;
  context: 'main_group' | 'private_chat';
}

const REPORT_REASONS = [
  'Inappropriate or offensive language',
  'Harassment or hate speech',
  'Spam, advertising, or scam',
  'Impersonation or fake persona',
  'Violating community guidelines',
  'Other issue',
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  messageId,
  messageText,
  reportedUid,
  reportedName,
  context,
}: ReportModalProps) {
  const { user, profile } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to submit a report.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { rtdb } = getFirebaseInstances();
      if (!rtdb) throw new Error('Database is not initialized.');

      const reportsRef = ref(rtdb, 'reports');
      const newReportRef = push(reportsRef);
      const cleanReason = `${reason}${details ? ` - ${details}` : ''}`.trim().slice(0, 500);

      const reportData = {
        reporterId: user.uid,
        reporterUid: user.uid,
        reporterName: profile?.name || user.displayName || 'Community Member',
        targetType,
        messageId: messageId || '',
        messageText: messageText ? messageText.slice(0, 500) : '',
        reportedUid: reportedUid || '',
        reportedName: reportedName || '',
        reason: cleanReason.length < 3 ? `${cleanReason} details` : cleanReason,
        status: 'open' as const,
        createdAt: getCurrentTimestamp(),
        timestamp: getCurrentTimestamp(),
      };

      await set(newReportRef, reportData);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-white dark:bg-[#0e1526] border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 transition-colors">
        
        {/* Pinned Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0e1526]/95 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-500">
            <Flag className="w-5 h-5" />
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              Report {targetType === 'message' ? 'Message' : 'User'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-12 px-6 text-center space-y-3 my-auto">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <p className="font-bold text-slate-900 dark:text-slate-100 text-base">Report Submitted</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Thank you. The community administration team will review this report shortly.
            </p>
          </div>
        ) : (
          <>
            {/* Scrollable Body */}
            <form id="report-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {error && (
                <div className="p-2.5 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {targetType === 'message' && messageText && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">
                    Reported Message by {reportedName || 'User'}:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 italic line-clamp-3">&ldquo;{messageText}&rdquo;</p>
                </div>
              )}

              {targetType === 'user' && reportedName && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-0.5">
                    Reported User:
                  </span>
                  <p className="text-slate-900 dark:text-slate-100 font-bold">{reportedName}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe what occurred..."
                  rows={3}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </form>

            {/* Pinned Bottom Footer with Submit Button */}
            <div className="shrink-0 p-4 sm:p-5 bg-slate-50 dark:bg-[#0c1220] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="report-modal-form"
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
