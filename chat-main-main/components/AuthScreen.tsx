'use client';

import React, { useState } from 'react';
import {
  Users,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Database,
  User,
  Sparkles,
  MessageSquare,
  HardDrive,
  Bot,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Gender } from '@/lib/types';
import { AvatarDisplay } from '@/lib/avatars';

export function AuthScreen({
  onOpenFirebaseConfig,
}: {
  onOpenFirebaseConfig: () => void;
}) {
  const {
    loginWithEmail,
    signUpWithEmail,
    resetPassword,
    isConfigured,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<Gender>('Male');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Advance from Step 1 (Email & Password) to Step 2 (Gender Selection)
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full display name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    // Move directly to Step 2 for Male / Female gender selection
    setSignupStep(2);
  };

  // Step 2: Final account creation after choosing Gender
  const handleFinalSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isConfigured) {
      setError('Firebase configuration is required. Please click "Setup Database".');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim(), gender);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Signup failed';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
        setSignupStep(1);
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
        setSignupStep(1);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Standard Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isConfigured) {
      setError('Firebase configuration is required. Please click "Setup Database".');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Authentication failed';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        msg = 'Invalid email or password. Please check your credentials or create an account.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Password Reset
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#070b14] flex flex-col items-center justify-start pt-4 sm:pt-8 pb-24 sm:pb-28 px-3 sm:px-6 lg:px-8 overflow-y-auto transition-colors">
      {/* Background Ambience */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Database Setup Notice if not configured */}
      {!isConfigured && (
        <div className="max-w-xl lg:max-w-4xl w-full mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between shadow-lg relative z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Database className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <strong className="block text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                Firebase Realtime Database &amp; Auth Connection
              </strong>
              <span className="hidden sm:inline">Connect Firebase credentials to enable live messaging, user avatars, and AI.</span>
            </div>
          </div>
          <button
            onClick={onOpenFirebaseConfig}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition-colors cursor-pointer ml-3 shadow-md"
          >
            Setup Database
          </button>
        </div>
      )}

      {/* Main Container - Fully Responsive Grid on Desktop */}
      <div className="w-full max-w-xl lg:max-w-4xl bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden relative z-10 transition-colors grid grid-cols-1 lg:grid-cols-12 shrink-0">
        
        {/* Left Column: Brand Showcase (Visible on Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md p-0.5 shadow-lg flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-white text-blue-600 flex items-center justify-center font-black">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white">CommUnity</h1>
                <span className="text-xs text-blue-100 font-medium">Realtime Hub &amp; AI Platform</span>
              </div>
            </div>

            <div className="space-y-3.5 pt-1">
              <div className="flex items-start gap-3 text-xs text-blue-50">
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  <MessageSquare className="w-4 h-4 text-sky-200" />
                </div>
                <div>
                  <strong className="block text-white font-bold">Realtime Group &amp; Direct Chat</strong>
                  <span className="text-blue-100/90">Instant synchronization with Firebase RTDB.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-blue-50">
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  <Bot className="w-4 h-4 text-purple-200" />
                </div>
                <div>
                  <strong className="block text-white font-bold">Gemini AI Assistant</strong>
                  <span className="text-blue-100/90">Tag @community or consult 1-on-1 privately.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-blue-50">
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  <HardDrive className="w-4 h-4 text-emerald-200" />
                </div>
                <div>
                  <strong className="block text-white font-bold">Google Drive Card Previews</strong>
                  <span className="text-blue-100/90">Share Docs &amp; Sheets with auto interactive cards.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-blue-50">
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-amber-200" />
                </div>
                <div>
                  <strong className="block text-white font-bold">Admin Moderation &amp; Safety</strong>
                  <span className="text-blue-100/90">5-Mistake Protection Policy &amp; ban system.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-100/90">
            <span>Enterprise Security</span>
            <span>Desktop &amp; Mobile Responsive</span>
          </div>
        </div>

        {/* Right Column: Step-by-Step Interactive Form Area */}
        <div className="lg:col-span-7 p-5 sm:p-6 lg:p-7 flex flex-col justify-center space-y-3.5">
          
          {/* Header & Mode Switcher */}
          <div>
            <div className="lg:hidden flex items-center justify-center gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-[10px] bg-white dark:bg-[#0e1526] flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                </div>
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">CommUnity</h2>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-2xl mb-2.5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSignupStep(1);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-[#0e1526] text-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In (سائن ان)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                  setSignupStep(1);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-[#0e1526] text-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create Account (اکاؤنٹ بنائیں)
              </button>
            </div>

            {/* Step Progress Bar (In Signup Mode) */}
            {mode === 'signup' && (
              <div className="bg-slate-50 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 mb-1.5">
                <div className="flex items-center justify-between">
                  {/* Step 1 Indicator */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                        signupStep === 1
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400/40'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {signupStep === 2 ? <Check className="w-3 h-3 stroke-[3]" /> : '1'}
                    </span>
                    <div>
                      <span className={`text-[11px] font-bold block leading-tight ${signupStep === 1 ? 'text-blue-600 dark:text-sky-400' : 'text-slate-500'}`}>
                        Step 1: Credentials
                      </span>
                      <span className="text-[10px] text-slate-400">Name &amp; Password</span>
                    </div>
                  </div>

                  <div className="flex-1 mx-3 h-0.5 bg-slate-200 dark:bg-slate-800" />

                  {/* Step 2 Indicator */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                        signupStep === 2
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-2 ring-indigo-400/40'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      2
                    </span>
                    <div>
                      <span className={`text-[11px] font-bold block leading-tight ${signupStep === 2 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                        Step 2: Gender
                      </span>
                      <span className="text-[10px] text-slate-400">Male / Female</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {/* Reset Sent Confirmation */}
          {resetSent && mode === 'reset' && (
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>Password reset instructions sent to your email address.</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError('');
                    }}
                    className="text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-blue-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <span>{loading ? 'Signing in...' : 'Sign In to CommUnity'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 2. SIGNUP STEP 1: Enter Name, Email & Password -> Click Continue */}
          {mode === 'signup' && signupStep === 1 && (
            <form onSubmit={handleProceedToStep2} className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Display Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Adnan Amir"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password * (min 6)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1.5"
              >
                <span>Continue to Gender &amp; Avatar (कंटिन्यू)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 3. SIGNUP STEP 2: Choose Male or Female & Click Create Account */}
          {mode === 'signup' && signupStep === 2 && (
            <form onSubmit={handleFinalSignUp} className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      Step 2: Choose Gender (مرد یا عورت منتخب کریں)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select Male or Female to assign your unique community avatar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Large, Beautiful Interactive Choice Cards */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
                {/* Male Card */}
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

                {/* Female Card */}
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

              {/* Verified Credentials Badge */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wider">
                    Creating Account For
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-black text-slate-900 dark:text-white truncate">{name}</span>
                    <span className="text-slate-400 font-mono text-[11px] truncate">({email})</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSignupStep(1)}
                  className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Edit Step 1
                </button>
              </div>

              {/* Action Buttons: Back + Submit */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSignupStep(1)}
                  className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-900/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Creating Account...' : 'Create Account (اکاؤنٹ بنائیں)'}</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </form>
          )}

          {/* 4. PASSWORD RESET FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Reset Your Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your registered email address and we&apos;ll send you a recovery link.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-blue-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? 'Sending link...' : 'Send Password Reset Email'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

