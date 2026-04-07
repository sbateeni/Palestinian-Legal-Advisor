'use client';

import React, { useEffect, useState } from 'react';

const ThemeToggle: React.FC = () => {
    const [isDark, setIsDark] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('theme');
            const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const dark = saved === 'dark' || (saved !== 'light' && prefers);
            setIsDark(dark);
        } catch {
            setIsDark(false);
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark, hydrated]);

    return (
        <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className="inline-flex shrink-0 items-center justify-center p-2 rounded-xl transition-all duration-300 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-amber-400 hover:ring-2 hover:ring-blue-400 focus:outline-none"
            title={isDark ? "التبديل للوضع الفاتح" : "التبديل للوضع الليلي"}
        >
            {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    );
};

export default ThemeToggle;