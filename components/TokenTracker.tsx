'use client';

import React, { useEffect, useState } from 'react';
import { getTokenUsageByTier } from '../services/dbService';

type TokenTrackerVariant = 'inline' | 'bar';

interface TokenTrackerProps {
  variant?: TokenTrackerVariant;
}

const TokenTracker: React.FC<TokenTrackerProps> = ({ variant = 'bar' }) => {
  const [flashUsed, setFlashUsed] = useState(0);
  const [proUsed, setProUsed] = useState(0);
  const [flashLiteUsed, setFlashLiteUsed] = useState(0);

  const flashLimit = 250;
  const proLimit = 50;
  const flashLiteLimit = 1000;

  const updateUsage = async () => {
    const [flash, pro, flashLite] = await Promise.all([
      getTokenUsageByTier('flash'),
      getTokenUsageByTier('pro'),
      getTokenUsageByTier('flash-lite'),
    ]);
    setFlashUsed(flash);
    setProUsed(pro);
    setFlashLiteUsed(flashLite);
  };

  useEffect(() => {
    updateUsage();
    const handleUpdate = () => updateUsage();
    window.addEventListener('tokensUpdated', handleUpdate);
    return () => window.removeEventListener('tokensUpdated', handleUpdate);
  }, []);

  const flashPercentage = Math.min(100, (flashUsed / flashLimit) * 100);
  const flashRemaining = Math.max(0, flashLimit - flashUsed);
  const proRemaining = Math.max(0, proLimit - proUsed);
  const flashLiteRemaining = Math.max(0, flashLiteLimit - flashLiteUsed);
  
  const shell =
    variant === 'inline'
      ? 'min-w-0 max-w-[11rem] xl:max-w-[13rem] 2xl:max-w-[15rem] shrink-0 items-end px-2 sm:px-2.5 py-1'
      : 'w-full min-w-0 max-w-full sm:w-auto sm:max-w-lg items-stretch sm:items-end px-2 sm:px-3 py-1.5';

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm transition-all duration-300 ${shell}`}
      title="استهلاك اليوم حسب النموذج"
    >
      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-none">
        <span className="inline-flex items-center gap-1 shrink-0" dir="ltr">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden />
          <span>Flash</span>
          <span className="text-gray-900 dark:text-white font-mono text-[11px] tabular-nums">
            {flashRemaining}/{flashLimit}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 shrink-0 opacity-90" dir="ltr">
          <span>Pro</span>
          <span className="text-gray-900 dark:text-white font-mono text-[11px] tabular-nums">
            {proRemaining}/{proLimit}
          </span>
        </span>
      </div>
      <div
        className={`h-1.5 rounded-full overflow-hidden border border-gray-100 dark:border-slate-800 bg-gray-200 dark:bg-slate-700 self-end ${
          variant === 'inline' ? 'w-[6.5rem] xl:w-28' : 'w-full min-w-[6rem] sm:w-32'
        }`}
      >
        <div
          className={`h-full transition-all duration-1000 ${flashPercentage > 90 ? 'bg-red-500' : flashPercentage > 70 ? 'bg-amber-500' : 'bg-blue-600'}`}
          style={{ width: `${flashPercentage}%` }}
        />
      </div>
      <div className="flex flex-col items-end gap-0.5 text-[8px] sm:text-[9px] font-medium text-gray-500 dark:text-slate-400 leading-snug text-end">
        <span className="inline-flex items-center gap-1 shrink-0" dir="ltr">
          Flash-Lite{' '}
          <span className="font-mono text-gray-700 dark:text-slate-300 tabular-nums">
            {flashLiteRemaining}/{flashLiteLimit}
          </span>
        </span>
        <span
          className={`break-words hyphens-auto ${variant === 'inline' ? 'max-w-full text-[7px] leading-tight' : 'max-w-[13rem] sm:max-w-[15rem]'}`}
        >
          يتم توجيه المهام تلقائياً للنموذج الأنسب
        </span>
      </div>
    </div>
  );
};

export default TokenTracker;