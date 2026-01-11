import React, { useEffect, useState } from 'react';
import { getTokenUsage } from '../services/dbService';

const TokenTracker: React.FC = () => {
  const [requests, setRequests] = useState(0);
  const limit = 250;

  const updateUsage = async () => {
    const count = await getTokenUsage();
    setRequests(count);
  };

  useEffect(() => {
    updateUsage();
    const handleUpdate = (e: any) => setRequests(e.detail || 0);
    window.addEventListener('tokensUpdated', handleUpdate as EventListener);
    return () => window.removeEventListener('tokensUpdated', handleUpdate as EventListener);
  }, []);

  const percentage = Math.min(100, (requests / limit) * 100);
  const remaining = Math.max(0, limit - requests);
  
  return (
    <div className="flex flex-col items-end px-2 sm:px-3 py-1 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 transition-all duration-300 shadow-sm" title="استهلاك اليوم لنموذج Flash">
      <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700 dark:text-blue-300">
         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
         <span>الرصيد المتاح (Flash):</span>
         <span className="text-gray-900 dark:text-white font-mono text-xs">{remaining}/{limit}</span>
      </div>
      <div className="w-24 sm:w-32 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden border border-gray-100 dark:border-slate-800">
        <div 
          className={`h-full transition-all duration-1000 ${percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-blue-600'}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-[8px] font-medium text-gray-500 dark:text-slate-400 mt-1 whitespace-nowrap">
        يتم توجيه المهام تلقائياً للنموذج الأنسب
      </div>
    </div>
  );
};

export default TokenTracker;