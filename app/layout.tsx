import type { Metadata } from 'next';
import { Cairo, Amiri } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
    subsets: ['arabic', 'latin'],
    variable: '--font-cairo',
    display: 'swap',
});

const amiri = Amiri({
    weight: ['400', '700'],
    subsets: ['arabic', 'latin'],
    variable: '--font-amiri',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'المستشار القانوني الفلسطيني',
    description: 'مساعد قانوني فلسطيني — محادثة، بحث تشريعات، أدوات',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ar" dir="rtl" className={`${cairo.variable} ${amiri.variable}`} suppressHydrationWarning>
            <body className="bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-50 antialiased">{children}</body>
        </html>
    );
}
