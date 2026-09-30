'use client';

import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Gender } from '@/lib/types';
import { AvatarDisplay } from '@/lib/avatars';

export function SetupProfileModal({
  isOpen,
  onComplete,
}: {
  isOpen: boolean;
  onComplete?: () => void;
}) {
  const { user, completeProfileSetup } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [gender, setGender] = useState<Gender>('Male');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your display name.');
      return;
    }
    if (!gender) {
      setError('Please choose whether you are Male or Female.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await completeProfileSetup(name.trim(), gender);
      if (onComplete) onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Container: Centered on desktop with max-w-lg and constrained max-h, fullscreen on mobile */}
      <div className="w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-lg bg-white dark:bg-[#0e1526] border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 transition-colors">
        
        {/* Pinned Top Header using flex-shrink-0 */}
        <div className="flex-shrink-0 shrink-0 p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0e1526]/95 backdrop-blur-sm text-center">
          <div className="inline-flex p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-900/20 mb-2">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Complete Your Profile
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Choose your community gender avatar and display name to get started.
          </p>
        </div>

        {/* Scrollable Form Body using flex-grow & overflow-y-auto with min-h-0 */}
        <form
          id="setup-profile-form"
          onSubmit={handleSubmit}
          className="flex-1 flex-grow overflow-y-auto min-h-0 overscroll-contain p-5 sm:p-6 space-y-5"
        >
          {error && (
            <div className="p-3 text-xs rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 font-semibold">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Your Display Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adnan Amir"
                maxLength={35}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-xs sm:text-sm transition-colors"
              />
            </div>
          </div>

          {/* Gender & Avatar Selector Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Gender &amp; Avatar (مرد یا عورت منتخب کریں) *
            </label>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Male Option Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setGender('Male')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setGender('Male');
                  }
                }}
                className={`p-4 sm:p-5 rounded-3xl border-2 text-center flex flex-col items-center justify-between gap-3 transition-all cursor-pointer relative select-none ${
                  gender === 'Male'
                    ? 'border-blue-600 bg-blue-50/95 dark:bg-blue-950/70 shadow-xl shadow-blue-900/25 ring-2 ring-blue-500/40 scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Selection Radio Badge */}
                <div className="absolute top-3 right-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      gender === 'Male'
                        ? 'bg-blue-600 text-white shadow-xs scale-110'
                        : 'border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {gender === 'Male' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="pt-2">
                  <AvatarDisplay gender="Male" size="xl" />
                </div>

                <div className="space-y-0.5">
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block">
                    Male (مرد)
                  </span>
                  <span
                    className={`text-[11px] font-extrabold block ${
                      gender === 'Male'
                        ? 'text-blue-600 dark:text-sky-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {gender === 'Male' ? '✓ Selected (منتخب شدہ)' : 'Tap to Choose'}
                  </span>
                </div>
              </div>

              {/* Female Option Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setGender('Female')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setGender('Female');
                  }
                }}
                className={`p-4 sm:p-5 rounded-3xl border-2 text-center flex flex-col items-center justify-between gap-3 transition-all cursor-pointer relative select-none ${
                  gender === 'Female'
                    ? 'border-pink-500 bg-pink-50/95 dark:bg-pink-950/70 shadow-xl shadow-pink-900/25 ring-2 ring-pink-400/40 scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Selection Radio Badge */}
                <div className="absolute top-3 right-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      gender === 'Female'
                        ? 'bg-pink-600 text-white shadow-xs scale-110'
                        : 'border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {gender === 'Female' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="pt-2">
                  <AvatarDisplay gender="Female" size="xl" />
                </div>

                <div className="space-y-0.5">
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block">
                    Female (عورت)
                  </span>
                  <span
                    className={`text-[11px] font-extrabold block ${
                      gender === 'Female'
                        ? 'text-pink-600 dark:text-pink-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {gender === 'Female' ? '✓ Selected (منتخب شدہ)' : 'Tap to Choose'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Pinned Bottom Footer using flex-shrink-0 to guarantee submit button is always pinned & accessible */}
        <div className="flex-shrink-0 shrink-0 p-4 sm:p-5 bg-slate-50 dark:bg-[#0c1220] border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            form="setup-profile-form"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl shadow-indigo-900/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <span>Save Profile &amp; Enter CommUnity Hub</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


