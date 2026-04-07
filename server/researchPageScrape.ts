/**
 * جلب نص صفحة من مصدر قانوني مسموح (مقارنة مع إجابة Gemini).
 * يُقيَّد النطاق لمنع SSRF — نفس قائمة المضيفات في legalPrompts.
 */

import { isAllowedOfficialSourceUri } from '../services/legalPrompts';

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MAX_BYTES = 2_000_000;
const MAX_TEXT_CHARS = 120_000;

export type ResearchScrapeOk = {
    ok: true;
    requestedUrl: string;
    finalUrl: string;
    title: string;
    text: string;
    truncated: boolean;
};

export type ResearchScrapeErr = {
    ok: false;
    error: string;
    status?: number;
};

export type ResearchScrapeResult = ResearchScrapeOk | ResearchScrapeErr;

function decodeBasicEntities(s: string): string {
    return s
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function extractTitle(html: string): string {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? decodeBasicEntities(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()) : '';
}

function htmlToPlainText(html: string): string {
    let s = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<\/(p|div|tr|h[1-6]|li|section|article)>/gi, '\n');
    s = s.replace(/<[^>]+>/g, ' ');
    s = decodeBasicEntities(s);
    s = s.replace(/[ \t\f\v]+/g, ' ');
    s = s.replace(/\n{3,}/g, '\n\n');
    return s.trim();
}

export async function scrapeOfficialResearchPage(inputUrl: string): Promise<ResearchScrapeResult> {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
        return { ok: false, error: 'الرابط فارغ' };
    }

    let startUrl: URL;
    try {
        startUrl = new URL(trimmed);
    } catch {
        return { ok: false, error: 'صيغة الرابط غير صالحة' };
    }

    if (startUrl.protocol !== 'http:' && startUrl.protocol !== 'https:') {
        return { ok: false, error: 'يُسمح فقط بروابط http أو https' };
    }

    if (!isAllowedOfficialSourceUri(trimmed)) {
        return {
            ok: false,
            error:
                'يُسمح فقط بمصادر رسمية معتمدة (مثل muqtafi.birzeit.edu، ogb.gov.ps، dftp.gov.ps، courts.gov.ps، …)',
        };
    }

    let res: Response;
    try {
        res = await fetch(startUrl.toString(), {
            redirect: 'follow',
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ar,en;q=0.8',
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `فشل الاتصال: ${msg}` };
    }

    const finalUrl = res.url;
    if (!isAllowedOfficialSourceUri(finalUrl)) {
        return { ok: false, error: 'أُعيد التوجيه إلى موقع غير مسموح به' };
    }

    if (!res.ok) {
        return { ok: false, error: `الخادم ردّ بخطأ (${res.status})`, status: res.status };
    }

    const ct = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml\+xml/i.test(ct) && !ct.includes('text/plain')) {
        return { ok: false, error: 'المحتوى ليس صفحة HTML نصية' };
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
        return { ok: false, error: 'حجم الصفحة كبير جداً' };
    }

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const title = extractTitle(html);
    let text = htmlToPlainText(html);
    let truncated = false;
    if (text.length > MAX_TEXT_CHARS) {
        text = text.slice(0, MAX_TEXT_CHARS) + '\n\n[… تم اقتطاع النص لطوله — راجع الصفحة الأصلية]';
        truncated = true;
    }

    return {
        ok: true,
        requestedUrl: trimmed,
        finalUrl,
        title: title || finalUrl,
        text,
        truncated,
    };
}
