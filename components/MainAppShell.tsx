'use client';

import Header from '@/components/Header';
import ThemeInit from '@/components/ThemeInit';

export default function MainAppShell({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ThemeInit />
            <div className="h-full flex flex-col bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-300">
                <Header />
                <main className="flex-grow container mx-auto flex flex-col overflow-y-auto">{children}</main>
            </div>
        </>
    );
}
