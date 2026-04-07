/**
 * سكربنغ لبوابة «تبليغات النشر» — نفس طلبات المتصفح (GET + POST ASP.NET)
 * https://www.courts.gov.ps/notifications/
 */

const BASE = 'https://www.courts.gov.ps/notifications/';
const RESULTS_PAGE = new URL('Notifications.aspx', BASE).toString();

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type NotificationRow = {
    publishDate: string;
    notificationNumber: string;
    notificationType: string;
    notifyPerson: string;
    court: string;
    caseType: string;
    caseNumber: string;
    detailsHref: string | null;
    /** محتوى HTML مُشفّر في onclick=showNotificationDetails(...) */
    detailsHtml: string | null;
};

export type NotificationsSearchResult = {
    ok: true;
    query: string;
    page: number;
    totalResults: number | null;
    totalPages: number | null;
    rows: NotificationRow[];
    /** أرسله مع طلب page التالية (جلسة ASP.NET بعد البحث) */
    sessionCookie: string | null;
    warning?: string;
};

export type NotificationsSearchError = {
    ok: false;
    error: string;
    status?: number;
};

function extractViewState(html: string): {
    viewState: string | null;
    viewStateGenerator: string | null;
    eventValidation: string | null;
} {
    const viewState =
        html.match(/name="__VIEWSTATE"[^>]*value="([^"]*)"/i)?.[1] ??
        html.match(/id="__VIEWSTATE"[^>]*value="([^"]*)"/i)?.[1] ??
        null;
    const viewStateGenerator =
        html.match(/name="__VIEWSTATEGENERATOR"[^>]*value="([^"]*)"/i)?.[1] ?? null;
    const eventValidation =
        html.match(/name="__EVENTVALIDATION"[^>]*value="([^"]*)"/i)?.[1] ?? null;
    return { viewState, viewStateGenerator, eventValidation };
}

/** يستخرج الوسيط الأول من showNotificationDetails("...", "رقم", ...) كما في الموقع الرسمي */
function extractDetailsEncodedFromTr(tr: string): string | null {
    const key = 'showNotificationDetails("';
    const i = tr.indexOf(key);
    if (i === -1) return null;
    const start = i + key.length;
    const endMarker = '", "';
    const end = tr.indexOf(endMarker, start);
    if (end === -1) return null;
    return tr.slice(start, end);
}

function decodeNotificationDetailHtml(encoded: string): string {
    let s = encoded
        .replace(/\\n/g, '')
        .replace(/\\t/g, '')
        .replace(/\\\//g, '/');
    let prev = '';
    while (prev !== s) {
        prev = s;
        s = s.replace(/\\"/g, '"');
    }
    s = s
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');
    return s.trim();
}

function parseTableRows(html: string): NotificationRow[] {
    const rows: NotificationRow[] = [];
    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) return rows;

    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trM: RegExpExecArray | null;
    const tbody = tbodyMatch[1];

    while ((trM = trRe.exec(tbody)) !== null) {
        const tr = trM[1];
        const cells: string[] = [];
        const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdM: RegExpExecArray | null;
        while ((tdM = tdRe.exec(tr)) !== null) {
            const inner = tdM[1]
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            cells.push(inner);
        }
        if (cells.length >= 7) {
            const detailsCell = tr.match(/<td[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>/i);
            const detailsHref = detailsCell ? detailsCell[1].replace(/&amp;/g, '&') : null;
            const enc = extractDetailsEncodedFromTr(tr);
            const detailsHtml = enc ? decodeNotificationDetailHtml(enc) : null;
            rows.push({
                publishDate: cells[0] || '',
                notificationNumber: cells[1] || '',
                notificationType: cells[2] || '',
                notifyPerson: cells[3] || '',
                court: cells[4] || '',
                caseType: cells[5] || '',
                caseNumber: cells[6] || '',
                detailsHref,
                detailsHtml,
            });
        }
    }
    return rows;
}

function parseTotals(html: string): { totalResults: number | null; totalPages: number | null } {
    let totalResults: number | null = null;
    let totalPages: number | null = null;

    const sr = html.match(
        /تم العثور على\s*(\d+)\s*نتيجة[\s\S]*?عرض صفحة\s*\d+\s*من\s*(\d+)/i
    );
    if (sr) {
        totalResults = parseInt(sr[1], 10);
        totalPages = parseInt(sr[2], 10);
    }
    return { totalResults, totalPages };
}

function mergeSetCookie(res: Response): string | null {
    const headers = res.headers as unknown as { getSetCookie?: () => string[] };
    if (typeof headers.getSetCookie === 'function') {
        const parts = headers.getSetCookie();
        if (parts?.length) {
            return parts.map((c) => c.split(';')[0].trim()).join('; ');
        }
    }
    const single = res.headers.get('set-cookie');
    if (single) {
        return single
            .split(/,(?=[A-Za-z_%][a-zA-Z0-9_%]*=)/)
            .map((p) => p.split(';')[0].trim())
            .join('; ');
    }
    return null;
}

function buildFormBody(fields: Record<string, string>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
        p.append(k, v);
    }
    return p.toString();
}

export type SearchNotificationsInput = {
    query: string;
    page: number;
    /** مطلوب عندما page &gt; 1 */
    sessionCookie?: string | null;
};

/**
 * بحث مع تصفح الصفحات: الصفحة 1 تنفّذ POST؛ الصفحات التالية GET مع كوكي الجلسة.
 */
export async function searchNotifications(
    input: SearchNotificationsInput
): Promise<NotificationsSearchResult | NotificationsSearchError> {
    const query = input.query.trim();
    const page = Math.max(1, Math.floor(input.page || 1));

    if (page === 1 && !query) {
        return { ok: false, error: 'أدخل نصاً للبحث' };
    }

    const commonHeaders: Record<string, string> = {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9',
    };

    try {
        if (page === 1) {
            const r0 = await fetch(BASE, { headers: commonHeaders });
            if (!r0.ok) return { ok: false, error: `فشل تحميل الصفحة: HTTP ${r0.status}` };
            const html0 = await r0.text();
            const { viewState, viewStateGenerator, eventValidation } = extractViewState(html0);
            if (!viewState || !eventValidation) {
                return {
                    ok: false,
                    error:
                        'تعذر قراءة حقول النموذج (__VIEWSTATE). ربما تغيّر هيكل الموقع أو هو غير متاح.',
                };
            }

            const body = buildFormBody({
                __VIEWSTATE: viewState,
                __VIEWSTATEGENERATOR: viewStateGenerator || '',
                __EVENTVALIDATION: eventValidation,
                txtSearch: query,
                btnSearch: 'بحث',
                hidCurrentPage: '1',
            });

            const r1 = await fetch(BASE, {
                method: 'POST',
                headers: {
                    ...commonHeaders,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Referer: BASE,
                    Origin: 'https://www.courts.gov.ps',
                },
                body,
                redirect: 'follow',
            });

            if (!r1.ok) return { ok: false, error: `فشل البحث: HTTP ${r1.status}` };
            const html1 = await r1.text();
            const sessionCookie = mergeSetCookie(r1);
            const rows = parseTableRows(html1);
            const { totalResults, totalPages } = parseTotals(html1);

            return {
                ok: true,
                query,
                page: 1,
                totalResults,
                totalPages,
                rows,
                sessionCookie,
            };
        }

        const cookie = input.sessionCookie?.trim();
        if (!cookie) {
            return { ok: false, error: 'انتهت الجلسة أو لم تُجرَ عملية بحث. ابدأ من الصفحة الأولى.' };
        }

        const url = `${RESULTS_PAGE}?page=${page}`;
        const r2 = await fetch(url, {
            headers: {
                ...commonHeaders,
                Cookie: cookie,
                Referer: BASE,
            },
        });

        if (!r2.ok) return { ok: false, error: `فشل جلب الصفحة ${page}: HTTP ${r2.status}` };
        const html2 = await r2.text();
        const rows = parseTableRows(html2);
        const { totalResults, totalPages } = parseTotals(html2);

        return {
            ok: true,
            query: input.query.trim(),
            page,
            totalResults,
            totalPages,
            rows,
            sessionCookie: cookie,
        };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('certificate') || msg.includes('TLS') || msg.includes('SSL')) {
            return {
                ok: false,
                error:
                    'فشل الاتصال الآمن (TLS). على الخادم: استخدم Node مع شهادات النظام أو بيئة تثق بشهادة الموقع.',
            };
        }
        return { ok: false, error: msg };
    }
}

/** للاختبار اليدوي */
export async function searchNotificationsPage1(
    query: string
): Promise<NotificationsSearchResult | NotificationsSearchError> {
    return searchNotifications({ query, page: 1 });
}
