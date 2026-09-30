import React from 'react';
import { Gender } from './types';

export function AvatarDisplay({
  gender,
  size = 'md',
  className = '',
  online,
}: {
  gender?: Gender | 'ai' | 'male' | 'female' | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  online?: boolean;
}) {
  const sizeMap = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  const indicatorSize = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  if (gender === 'ai') {
    return (
      <div className={`relative inline-flex flex-shrink-0 ${className}`}>
        <div
          className={`${sizeMap[size]} rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-md flex items-center justify-center`}
        >
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
            <svg
              className="w-3/5 h-3/5 text-purple-300 animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
        </div>
        {online !== undefined && (
          <span
            className={`absolute bottom-0 right-0 ${indicatorSize[size]} rounded-full bg-emerald-500 ring-2 ring-slate-900`}
          />
        )}
      </div>
    );
  }

  const isFemale = typeof gender === 'string' && gender.toLowerCase() === 'female';

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-full overflow-hidden flex items-center justify-center shadow-md ${
          isFemale
            ? 'bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400'
            : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400'
        } p-0.5`}
      >
        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
          {isFemale ? (
            // Consistent Female Avatar SVG
            <svg
              className="w-full h-full text-pink-300"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="64" height="64" rx="32" fill="#1e1b4b" />
              {/* Hair Back */}
              <circle cx="32" cy="28" r="16" fill="#f43f5e" />
              <path
                d="M18 32 C 16 46, 20 54, 23 58 C 22 52, 23 42, 24 36 Z"
                fill="#e11d48"
              />
              <path
                d="M46 32 C 48 46, 44 54, 41 58 C 42 52, 41 42, 40 36 Z"
                fill="#e11d48"
              />
              {/* Face */}
              <ellipse cx="32" cy="30" rx="11" ry="13" fill="#fbcfe8" />
              {/* Hair Bangs */}
              <path
                d="M21 27 C 24 19, 38 18, 43 27 C 39 23, 26 23, 21 27 Z"
                fill="#be123c"
              />
              {/* Eyes */}
              <circle cx="28" cy="30" r="1.5" fill="#4c0519" />
              <circle cx="36" cy="30" r="1.5" fill="#4c0519" />
              {/* Smile */}
              <path
                d="M29 35 Q 32 38 35 35"
                stroke="#9f1239"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Shoulders / Dress */}
              <path
                d="M19 56 C 22 47, 42 47, 45 56 C 45 60, 19 60, 19 56 Z"
                fill="#fb7185"
              />
            </svg>
          ) : (
            // Consistent Male Avatar SVG
            <svg
              className="w-full h-full text-blue-300"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="64" height="64" rx="32" fill="#0f172a" />
              {/* Hair */}
              <path
                d="M20 28 C 20 18, 44 18, 44 28 C 42 21, 22 21, 20 28 Z"
                fill="#2563eb"
              />
              <path
                d="M22 25 C 24 16, 40 16, 42 25 C 38 19, 26 19, 22 25 Z"
                fill="#1d4ed8"
              />
              {/* Face */}
              <path
                d="M22 27 C 22 40, 42 40, 42 27 C 42 22, 22 22, 22 27 Z"
                fill="#bae6fd"
              />
              {/* Eyes */}
              <circle cx="28" cy="28" r="1.5" fill="#0c4a6e" />
              <circle cx="36" cy="28" r="1.5" fill="#0c4a6e" />
              {/* Smile */}
              <path
                d="M29 33 Q 32 36 35 33"
                stroke="#0369a1"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Shoulders / Shirt */}
              <path
                d="M18 56 C 21 46, 43 46, 46 56 C 46 60, 18 60, 18 56 Z"
                fill="#38bdf8"
              />
            </svg>
          )}
        </div>
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${indicatorSize[size]} rounded-full ${
            online ? 'bg-emerald-500' : 'bg-slate-500'
          } ring-2 ring-slate-900`}
        />
      )}
    </div>
  );
}
