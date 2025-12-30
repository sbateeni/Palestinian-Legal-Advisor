
import React, { useEffect, useState } from 'react';
import { getTokenUsage } from '../services/dbService';
import { DEFAULT_GEMINI_MODELS } from '../constants';

const TokenTracker: React.FC = () => {
  const [requests, setRequests] = useState(0);
  const [limit, setLimit] = useState(250);

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
  
  return (
    <div className="flex flex-col items-end px-3 py-1 bg-slate-900/40 rounded-lg border border-white/10" title="استهلاك اليوم لنموذج Flash الأساسي">
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
         <span>الرصيد المتاح (Flash)</span>
         <span className="text-white font-mono">{250 - requests}/250</span>
      </div>
      <div className="w-24 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
        <div className={`h-full bg-blue-500 transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
      </div>
      <div className="text-[8px] text-slate-500 mt-0.5">يتم توجيه المهام تلقائياً للنموذج الأنسب</div>
    </div>
  );
};

export default TokenTracker;
