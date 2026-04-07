'use client';

import { useEffect } from 'react';

/** يطبّق الوضع الليلي/النهاري من localStorage أو تفضيل النظام */
export default function ThemeInit() {
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (
            savedTheme === 'dark' ||
            (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);
    return null;
}
