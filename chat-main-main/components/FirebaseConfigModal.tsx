'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Key, Database, RefreshCw, Copy, Check } from 'lucide-react';
import { getActiveFirebaseConfig, resetFirebaseInstance, isFirebaseConfigured } from '@/lib/firebase';
import { FirebaseClientConfig } from '@/lib/types';

export function FirebaseConfigModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<FirebaseClientConfig>(() => getActiveFirebaseConfig());
  const [configured] = useState(() => isFirebaseConfigured());
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState('');

  if (!isOpen) return null;

  const handleJsonPaste = (text: string) => {
    setRawJson(text);
    setJsonError('');
    try {
      // Find JSON object if wrapped in "const firebaseConfig = { ... };"
      const match = text.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : text;
      // Handle keys without quotes if formatted as JS object
      const sanitized = jsonStr
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"');
      const parsed = JSON.parse(sanitized);

      setConfig((prev) => ({
        ...prev,
        apiKey: parsed.apiKey || prev.apiKey,
        authDomain: parsed.authDomain || prev.authDomain,
        databaseURL: parsed.databaseURL || prev.databaseURL,
        projectId: parsed.projectId || prev.projectId,
        storageBucket: parsed.storageBucket || prev.storageBucket,
        messagingSenderId: parsed.messagingSenderId || prev.messagingSenderId,
        appId: parsed.appId || prev.appId,
      }));
    } catch {
      // Not valid json directly, keep raw input
    }
  };

  const handleSave = () => {
    if (!config.apiKey || !config.databaseURL || !config.projectId) {
      setJsonError('API Key, Database URL, and Project ID are required.');
      return;
    }
    resetFirebaseInstance(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-slate-900 border-0 sm:border border-slate-700/80 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Pinned Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 sm:px-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                Firebase Realtime Database &amp; Auth Setup
              </h3>
              <p className="text-xs text-slate-400">
                Configure your real Firebase credentials for Authentication &amp; Database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              configured
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
          >
            {configured ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                {configured
                  ? 'Firebase Realtime Database & Auth are Active'
                  : 'Firebase Setup Pending'}
              </p>
              <p className="opacity-80">
                {configured
                  ? `Connected to project: ${config.projectId || 'Default'}. Messages and auth are synchronized live.`
                  : 'To start real-time group chat and authentication, provide your Firebase Web App configuration below or via environment variables.'}
              </p>
            </div>
          </div>

          {/* Quick paste helper */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Quick Paste Firebase Config snippet
            </label>
            <textarea
              value={rawJson}
              onChange={(e) => handleJsonPaste(e.target.value)}
              placeholder="Paste `const firebaseConfig = { apiKey: '...', databaseURL: '...', projectId: '...' };` here..."
              rows={3}
              className="w-full text-xs font-mono p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {jsonError && <p className="text-xs text-rose-400 mt-1">{jsonError}</p>}
          </div>

          {/* Individual fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                API Key *
              </label>
              <input
                type="text"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Database URL (RTDB) *
              </label>
              <input
                type="text"
                value={config.databaseURL}
                onChange={(e) => setConfig({ ...config, databaseURL: e.target.value })}
                placeholder="https://project-default-rtdb.firebaseio.com"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Project ID *
              </label>
              <input
                type="text"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                placeholder="gen-lang-client-0517379971"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Auth Domain
              </label>
              <input
                type="text"
                value={config.authDomain}
                onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                placeholder="project.firebaseapp.com"
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Setup tips */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-sky-400" />
              Quick Firebase Console Checklist:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Open Firebase Console &gt; Project Settings &gt; General &gt; Your apps</li>
              <li>Authentication &gt; Sign-in method &gt; Enable Email/Password</li>
              <li>Realtime Database &gt; Create Database (Start in locked mode)</li>
              <li>Copy rules from <code>database.rules.json</code> and paste in RTDB Rules tab</li>
            </ol>
          </div>
        </div>

        {/* Pinned Bottom Footer */}
        <div className="shrink-0 px-5 py-4 sm:px-6 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-medium rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-900/30 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Save &amp; Connect</span>
          </button>
        </div>
      </div>
    </div>
  );
}
