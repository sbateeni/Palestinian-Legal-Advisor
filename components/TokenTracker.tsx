import React, { useEffect, useState } from 'react';
import { getTokenUsageByTier } from '../services/dbService';

const TokenTracker: React.FC = () => {
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
  
  return (
    <div className="flex flex-col items-end px-2 sm:px-3 py-1 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 transition-all duration-300 shadow-sm" title="استهلاك اليوم لنموذج Flash">
      <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700 dark:text-blue-300">
         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
         <span>Flash:</span>
         <span className="text-gray-900 dark:text-white font-mono text-xs">{flashRemaining}/{flashLimit}</span>
         <span className="opacity-70">Pro:</span>
         <span className="text-gray-900 dark:text-white font-mono text-xs">{proRemaining}/{proLimit}</span>
      </div>
      <div className="w-24 sm:w-32 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden border border-gray-100 dark:border-slate-800">
        <div 
          className={`h-full transition-all duration-1000 ${flashPercentage > 90 ? 'bg-red-500' : flashPercentage > 70 ? 'bg-amber-500' : 'bg-blue-600'}`} 
          style={{ width: `${flashPercentage}%` }}
        ></div>
      </div>
      <div className="text-[8px] font-medium text-gray-500 dark:text-slate-400 mt-1 whitespace-nowrap">
        Flash-Lite: {flashLiteRemaining}/{flashLiteLimit} • يتم توجيه المهام تلقائياً للنموذج الأنسب
      </div>
    </div>
  );
};

export default TokenTracker;