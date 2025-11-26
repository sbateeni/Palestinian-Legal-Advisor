
import React, { useEffect, useState } from 'react';
import { getTokenUsage } from '../services/dbService';

const TokenTracker: React.FC = () => {
  const [tokens, setTokens] = useState(0);
  const DAILY_LIMIT = 1500000; // Gemini Free Tier (Approx 1.5M/day)

  const updateTokens = async () => {
    const count = await getTokenUsage();
    setTokens(count);
  };

  useEffect(() => {
    updateTokens();

    // Listen for updates from db service
    const handleUpdate = (e: CustomEvent) => {
        if (e.detail !== undefined) setTokens(e.detail);
        else updateTokens();
    };

    window.addEventListener('tokensUpdated', handleUpdate as EventListener);
    return () => {
        window.removeEventListener('tokensUpdated', handleUpdate as EventListener);
    };
  }, []);

  const percentage = Math.min(100, (tokens / DAILY_LIMIT) * 100);
  const remaining = Math.max(0, DAILY_LIMIT - tokens);
  
  // Color logic based on usage
  let colorClass = "bg-green-500";
  if (percentage > 50) colorClass = "bg-yellow-500";
  if (percentage > 80) colorClass = "bg-orange-500";
  if (percentage > 95) colorClass = "bg-red-600";

  return (
    <div className="flex items-center gap-2 md:gap-3 bg-slate-100/10 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-slate-200/20 shadow-sm backdrop-blur-sm" title={`تم استخدام ${tokens.toLocaleString()} من أصل ${DAILY_LIMIT.toLocaleString()}`}>
      <div className="flex flex-col items-end">
        <div className="text-[9px] md:text-[10px] font-bold text-slate-400 flex items-center gap-1">
           <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 ${percentage > 90 ? 'text-red-500 animate-pulse' : 'text-indigo-400 fill-indigo-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
           <span className="hidden sm:inline">رصيد التوكنز اليومي</span>
        </div>
        <div className="w-16 md:w-24 h-1.5 bg-slate-700/50 rounded-full mt-1 overflow-hidden">
          <div 
             className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`} 
             style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
      
      <div className="flex flex-col items-end justify-center border-r border-slate-200/20 pr-2 md:pr-3 min-w-[50px] md:min-w-[60px]">
         <span className={`text-[10px] md:text-xs font-mono font-black leading-none ${remaining < 100000 ? 'text-red-400' : 'text-slate-300'}`}>
           {remaining.toLocaleString()}
         </span>
         <span className="text-[8px] md:text-[9px] text-slate-500 font-bold mt-0.5">متبقي</span>
      </div>
    </div>
  );
};

export default TokenTracker;