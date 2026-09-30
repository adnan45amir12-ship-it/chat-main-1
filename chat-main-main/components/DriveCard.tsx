'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check, FileText, Sheet, Presentation, Folder, HardDrive } from 'lucide-react';
import { DriveLink } from '@/lib/types';

export function DriveCard({ link }: { link: DriveLink }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIconAndColor = () => {
    switch (link.type) {
      case 'document':
        return {
          icon: <FileText className="w-5 h-5 text-blue-400" />,
          bg: 'bg-blue-950/60 border-blue-500/30',
          badge: 'Google Docs',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        };
      case 'spreadsheet':
        return {
          icon: <Sheet className="w-5 h-5 text-emerald-400" />,
          bg: 'bg-emerald-950/60 border-emerald-500/30',
          badge: 'Google Sheets',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'presentation':
        return {
          icon: <Presentation className="w-5 h-5 text-amber-400" />,
          bg: 'bg-amber-950/60 border-amber-500/30',
          badge: 'Google Slides',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'folder':
        return {
          icon: <Folder className="w-5 h-5 text-indigo-400" />,
          bg: 'bg-indigo-950/60 border-indigo-500/30',
          badge: 'Drive Folder',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        };
      default:
        return {
          icon: <HardDrive className="w-5 h-5 text-sky-400" />,
          bg: 'bg-slate-900/80 border-slate-700/60',
          badge: 'Google Drive',
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        };
    }
  };

  const styling = getIconAndColor();

  return (
    <div
      className={`my-2 p-3 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:shadow-lg ${styling.bg} max-w-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/50 flex-shrink-0">
            {styling.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styling.badgeColor}`}
              >
                {styling.badge}
              </span>
            </div>
            <h4 className="text-sm font-medium text-slate-100 truncate max-w-[220px] sm:max-w-[280px] mt-0.5">
              {link.title || 'Shared Google Drive File'}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          title="Copy link"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-700/30 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-[240px]">
          {link.url}
        </span>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors flex-shrink-0"
        >
          <span>Open File</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
