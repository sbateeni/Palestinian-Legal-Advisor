
import React, { useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { COURTS_NOTIFICATIONS_URL } from './courtNotificationsConstants';

const API_PATH = '/api/notifications-search';

type NotificationRow = {
    publishDate: string;
    notificationNumber: string;
    notificationType: string;
    notifyPerson: string;
    court: string;
    caseType: string;
    caseNumber: string;
    detailsHref: string | null;
    detailsHtml?: string | null;
};

type SearchOk = {
    ok: true;
    query: string;
    page: number;
    totalResults: number | null;
    totalPages: number | null;
    rows: NotificationRow[];
    sessionCookie: string | null;
};

type SearchErr = { ok: false; error: string };

type SearchResponse = SearchOk | SearchErr;

const PURIFY_DETAIL = { USE_PROFILES: { html: true } as const };

function absoluteNotificationUrl(href: string | null): string | null {
    if (!href || !href.trim()) return null;
    if (/^https?:\/\//i.test(href)) return href;
    try {
        return new URL(href, COURTS_NOTIFICATIONS_URL).toString();
    } catch {
        return null;
    }
}

const CourtNotificationsPage: React.FC = () => {
    const [nameQuery, setNameQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<SearchOk | null>(null);
    const [sessionCookie, setSessionCookie] = useState<string | null>(null);

    const runSearch = useCallback(
        async (page: number, opts?: { resetSession?: boolean; cookie?: string | null }) => {
            const q = nameQuery.trim();
            if (page === 1 && !q) {
                setError('أدخل نصاً للبحث.');
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const cookieToSend =
                    page === 1 || opts?.resetSession
                        ? null
                        : opts?.cookie ?? sessionCookie;

                const res = await fetch(API_PATH, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify({
                        query: q,
                        page,
                        sessionCookie: page === 1 ? null : cookieToSend,
                    }),
                });
                const json = (await res.json()) as SearchResponse;
                if (!json.ok) {
                    setData(null);
                    setSessionCookie(null);
                    const fail = json as SearchErr;
                    setError(fail.error || 'فشل البحث');
                    return;
                }
                setData(json);
                setSessionCookie(json.sessionCookie);
            } catch (e: unknown) {
                setData(null);
                setSessionCookie(null);
                setError(e instanceof Error ? e.message : 'تعذر الاتصال بالخادم. جرّب `npm run dev` محلياً أو النشر على Vercel مع الدالة api/notifications-search.');
            } finally {
                setLoading(false);
            }
        },
        [nameQuery, sessionCookie]
    );

    const onSubmitSearch = useCallback(() => {
        void runSearch(1, { resetSession: true });
    }, [runSearch]);

    const goPage = useCallback(
        (p: number) => {
            if (!sessionCookie && p > 1) {
                setError('لا توجد جلسة تصفح. نفّذ بحثاً من جديد من الصفحة الأولى.');
                return;
            }
            void runSearch(p, { cookie: sessionCookie });
        },
        [runSearch, sessionCookie]
    );

    return (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-full bg-slate-950 transition-colors duration-300">
            <div className="mb-6 border-b border-slate-800 pb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">مجلس القضاء الأعلى — الموقع الرسمي</p>
                <h1 className="text-3xl font-black text-white flex items-center gap-3 flex-wrap">
                    <span className="p-2 bg-amber-900/40 rounded-lg text-amber-400 shadow-inner border border-amber-800/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </span>
                    تبليغات النشر
                </h1>
                <p className="text-slate-300 mt-1 text-base font-bold">دائرة التبليغات</p>
                <p className="text-slate-400 mt-2 text-base font-medium max-w-3xl">
                    البحث في قاعدة تبليغات النشر عبر خادم التطبيق؛ النتيجة تظهر <strong className="text-slate-200">في نفس الصندوق</strong> تحت زر التنفيذ مباشرة.
                </p>
            </div>

            <div className="bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-700 mb-4 space-y-4">
                <label htmlFor="notification-name-search" className="block text-sm font-black text-slate-200">
                    البحث في التبليغات
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        id="notification-name-search"
                        type="search"
                        value={nameQuery}
                        onChange={(e) => {
                            setNameQuery(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                onSubmitSearch();
                            }
                        }}
                        placeholder="اكتب للبحث..."
                        className="flex-grow p-4 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-amber-600 focus:outline-none placeholder-gray-600 font-bold"
                        autoComplete="off"
                    />
                    <button
                        type="button"
                        disabled={loading}
                        onClick={onSubmitSearch}
                        className="px-8 py-3 bg-emerald-700 text-white font-black rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg whitespace-nowrap"
                    >
                        {loading ? 'جاري البحث…' : 'تنفيذ البحث'}
                    </button>
                </div>
                {loading && (
                    <p className="text-sm font-bold text-amber-400 text-center py-1" aria-live="polite">
                        جاري جلب النتائج من خادم التبليغات…
                    </p>
                )}
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    يمكنك البحث عن: رقم التبليغ، المبلغ إليه، المحكمة، نوع القضية، أو أي جزء من التبليغ — كما في الموقع الرسمي.
                </p>

                {error && (
                    <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-sm font-medium">
                        {error}
                    </div>
                )}

                {data && data.ok && (
                    <div
                        id="notification-search-results"
                        className="mt-2 pt-4 border-t-2 border-amber-500/70 rounded-xl bg-gray-900/90 overflow-hidden -mx-1 sm:mx-0"
                    >
                        <p className="px-3 py-2 bg-amber-950/60 text-amber-200 text-sm font-black text-center border-b border-amber-800/50">
                            نتائج البحث
                        </p>
                    <div className="px-3 py-3 bg-gray-800/80 border-b border-gray-700 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-300 font-bold">
                            {data.totalResults != null && data.totalPages != null ? (
                                <>
                                    تم العثور على {data.totalResults.toLocaleString('ar-EG')} نتيجة — عرض صفحة{' '}
                                    {data.page.toLocaleString('ar-EG')} من {data.totalPages.toLocaleString('ar-EG')}
                                </>
                            ) : (
                                <>صفحة {data.page.toLocaleString('ar-EG')} — {data.rows.length} صف في هذه الصفحة</>
                            )}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={loading || data.page <= 1}
                                onClick={() => goPage(data.page - 1)}
                                className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-black disabled:opacity-40 hover:bg-slate-600"
                            >
                                السابق
                            </button>
                            <button
                                type="button"
                                disabled={
                                    loading ||
                                    sessionCookie == null ||
                                    (data.totalPages != null && data.page >= data.totalPages)
                                }
                                onClick={() => goPage(data.page + 1)}
                                className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-black disabled:opacity-40 hover:bg-slate-600"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-slate-200 min-w-[900px]">
                            <thead className="text-xs uppercase bg-gray-800 text-slate-400 border-b border-gray-700">
                                <tr>
                                    <th className="px-3 py-3 whitespace-nowrap">تاريخ النشر</th>
                                    <th className="px-3 py-3 whitespace-nowrap">رقم التبليغ</th>
                                    <th className="px-3 py-3">نوع التبليغ</th>
                                    <th className="px-3 py-3 min-w-[180px]">المبلغ إليه</th>
                                    <th className="px-3 py-3">المحكمة</th>
                                    <th className="px-3 py-3">نوع القضية</th>
                                    <th className="px-3 py-3 whitespace-nowrap">رقم القضية</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-bold">
                                            لا صفوف في هذه الصفحة.
                                        </td>
                                    </tr>
                                ) : (
                                    data.rows.map((row, idx) => {
                                        const detailUrl = absoluteNotificationUrl(row.detailsHref);
                                        const rawDetail = (row.detailsHtml ?? '').trim();
                                        const safeDetail = rawDetail
                                            ? DOMPurify.sanitize(rawDetail, PURIFY_DETAIL)
                                            : '';
                                        const hasSanitizedHtml = safeDetail.length > 0;
                                        const rowKey = `${row.notificationNumber}-${row.publishDate}-${idx}`;
                                        return (
                                            <React.Fragment key={rowKey}>
                                                <tr className="border-b border-gray-800 bg-gray-900/80 hover:bg-gray-800/80">
                                                    <td className="px-3 py-2 whitespace-nowrap">{row.publishDate}</td>
                                                    <td className="px-3 py-2 font-semibold text-amber-300 whitespace-nowrap">
                                                        {row.notificationNumber}
                                                    </td>
                                                    <td className="px-3 py-2">{row.notificationType}</td>
                                                    <td className="px-3 py-2 text-slate-300">{row.notifyPerson}</td>
                                                    <td className="px-3 py-2">{row.court}</td>
                                                    <td className="px-3 py-2">{row.caseType}</td>
                                                    <td className="px-3 py-2 whitespace-nowrap">{row.caseNumber}</td>
                                                </tr>
                                                <tr className="border-b border-gray-800 bg-slate-950/90">
                                                    <td colSpan={7} className="px-4 py-4 align-top border-s-4 border-amber-700/60">
                                                        <p className="text-xs font-black text-amber-500/90 mb-2">
                                                            نص التبليغ (رقم {row.notificationNumber})
                                                        </p>
                                                        {hasSanitizedHtml ? (
                                                            <div
                                                                className="notification-inline-detail prose prose-invert prose-sm max-w-none text-slate-200 [&_strong]:text-white [&_p]:leading-relaxed [&_h3]:text-base [&_h3]:my-2"
                                                                dir="rtl"
                                                                dangerouslySetInnerHTML={{ __html: safeDetail }}
                                                            />
                                                        ) : rawDetail ? (
                                                            <pre className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300">
                                                                {rawDetail}
                                                            </pre>
                                                        ) : detailUrl ? (
                                                            <a
                                                                href={detailUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 font-bold hover:underline"
                                                            >
                                                                فتح رابط التفاصيل على الموقع الرسمي
                                                            </a>
                                                        ) : (
                                                            <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
                                                                <p className="text-slate-400">
                                                                    لم يُرجع الخادم نصاً موسّعاً لهذا الصف (قد يكون الإنتاج
                                                                    بدون أحدث سكربنغ). بيانات الجدول أعلاه هي النتيجة
                                                                    المتاحة.
                                                                </p>
                                                                <ul className="list-disc list-inside space-y-1 text-slate-400">
                                                                    <li>المبلغ إليه: {row.notifyPerson || '—'}</li>
                                                                    <li>المحكمة: {row.court || '—'}</li>
                                                                    <li>نوع القضية / رقمها: {row.caseType} — {row.caseNumber}</li>
                                                                </ul>
                                                                <a
                                                                    href={COURTS_NOTIFICATIONS_URL}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-block text-amber-400 font-bold hover:underline"
                                                                >
                                                                    التحقق على الموقع الرسمي
                                                                </a>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourtNotificationsPage;
