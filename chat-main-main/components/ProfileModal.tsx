'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Mail, Calendar, Hash, Edit3, User, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AvatarDisplay } from '@/lib/avatars';
import { Gender } from '@/lib/types';

export function ProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return <ProfileModalContent onClose={onClose} />;
}

function ProfileModalContent({ onClose }: { onClose: () => void }) {
  const { profile, user, isAdmin, updateProfileData } = useAuth();
  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [gender, setGender] = useState<Gender>(
    (profile?.gender as Gender) || 'Male'
  );
  const [copiedUid, setCopiedUid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfileData({
        name: name.trim(),
        gender: gender,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to update profile:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Responsive Container: Centered on desktop with max-w-md and constrained height, fullscreen on mobile */}
      <div className="w-full h-full sm:h-auto sm:max-h-[88vh] sm:max-w-md bg-white dark:bg-[#0e1526] border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 transition-colors">
        
        {/* Pinned Top Header using flex-shrink-0 */}
        <div className="flex-shrink-0 shrink-0 px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0e1526]/95 backdrop-blur-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight">
                My Profile
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Manage your account &amp; avatar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body using flex-grow & overflow-y-auto with min-h-0 */}
        <form
          id="profile-edit-form"
          onSubmit={handleSaveProfile}
          className="flex-1 flex-grow overflow-y-auto min-h-0 overscroll-contain p-5 sm:p-6 space-y-5"
        >
          {saveSuccess && (
            <div className="p-3 text-xs rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Current Avatar & Badges */}
          <div className="flex flex-col items-center text-center pt-1">
            <div className="relative">
              <AvatarDisplay gender={gender || 'Male'} size="xl" online={true} />
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-600 text-white shadow-sm ring-2 ring-white dark:ring-[#0e1526]">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span
                className={`text-[11px] font-bold px-3 py-1 rounded-full capitalize ${
                  gender === 'Female'
                    ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30'
                    : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30'
                }`}
              >
                {gender} Avatar
              </span>

              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Admin</span>
                </span>
              )}
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <Edit3 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={35}
                placeholder="Enter display name"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-medium transition-colors"
              />
            </div>
          </div>

          {/* Gender & Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Gender &amp; Avatar
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Male option */}
              <button
                type="button"
                onClick={() => setGender('Male')}
                className={`p-3.5 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  gender === 'Male'
                    ? 'border-blue-600 bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-blue-500/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Male (مرد)</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      gender === 'Male' ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {gender === 'Male' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
                <AvatarDisplay gender="Male" size="md" />
              </button>

              {/* Female option */}
              <button
                type="button"
                onClick={() => setGender('Female')}
                className={`p-3.5 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all cursor-pointer ${
                  gender === 'Female'
                    ? 'border-pink-500 bg-pink-50/90 dark:bg-pink-950/60 ring-2 ring-pink-400/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Female (عورت)</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      gender === 'Female' ? 'bg-pink-600 text-white' : 'border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {gender === 'Female' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
                <AvatarDisplay gender="Female" size="md" />
              </button>
            </div>
          </div>

          {/* Account Details Box */}
          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            {/* Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                <span>Email</span>
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[190px]">
                {user?.email || 'No email attached'}
              </span>
            </div>

            {/* UID */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Hash className="w-3.5 h-3.5 text-sky-500" />
                <span>User ID</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-200 text-[11px]">
                <span className="truncate max-w-[140px]">{user?.uid}</span>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="Copy UID"
                >
                  {copiedUid ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Joined */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Joined</span>
              </div>
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Recent'}
              </span>
            </div>
          </div>
        </form>

        {/* Pinned Bottom Footer using flex-shrink-0 to guarantee submit button is always pinned & accessible */}
        <div className="flex-shrink-0 shrink-0 p-4 sm:p-5 bg-slate-50 dark:bg-[#0c1220] border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="submit"
            form="profile-edit-form"
            disabled={saving}
            className="px-5 py-2.5 text-xs font-black rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-900/20 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
