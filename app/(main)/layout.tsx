import MainAppShell from '@/components/MainAppShell';

/** منع التوليد الثابت: التطبيق يعتمد على localStorage وIndexedDB في المتصفح */
export const dynamic = 'force-dynamic';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return <MainAppShell>{children}</MainAppShell>;
}
