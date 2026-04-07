'use client';

export default function ClientPageFallback() {
    return (
        <div className="p-8 flex flex-col items-center justify-center gap-4 text-slate-400 min-h-[200px]">
            <div className="h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold">جاري التحميل…</p>
        </div>
    );
}
