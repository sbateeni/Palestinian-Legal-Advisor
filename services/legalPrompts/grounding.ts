import type { GroundingMetadata, LegalRegion } from '../../types';

export const OFFICIAL_SOURCE_HOSTS: string[] = [
    'birzeit.edu',
    'najah.edu',
    'dftp.gov.ps',
    'wafa.ps',
    'courts.gov.ps',
    'ogb.gov.ps',
];

export function isAllowedOfficialSourceUri(uri: string): boolean {
    try {
        const host = new URL(uri).hostname;
        return OFFICIAL_SOURCE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
    } catch {
        return false;
    }
}

export function isGroundingSearchProxyUri(uri: string): boolean {
    try {
        const host = new URL(uri).hostname;
        return host === 'vertexaisearch.cloud.google.com' || host.endsWith('.vertexaisearch.cloud.google.com');
    } catch {
        return false;
    }
}

/**
 * ما يزال «قابلاً للعرض» في بيانات API يشمل وسيط Google؛ لكن الروابط التي نُظهرها
 * للمستخدم يجب أن تمر بـ isAllowedOfficialSourceUri فقط (انظر MessageList / ChatMessageItem).
 */
export function isDisplayableGroundingUri(uri: string): boolean {
    return isAllowedOfficialSourceUri(uri) || isGroundingSearchProxyUri(uri);
}

export function extractOfficialUrlsFromGrounding(metadata: GroundingMetadata | undefined, maxUrls = 3): string[] {
    if (!metadata?.groundingChunks?.length) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const chunk of metadata.groundingChunks) {
        const uri = chunk.web?.uri?.trim();
        if (!uri || !isAllowedOfficialSourceUri(uri)) continue;
        let key: string;
        try {
            key = new URL(uri).href.split('#')[0];
        } catch {
            continue;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(uri);
        if (out.length >= maxUrls) break;
    }
    return out;
}

export const RESEARCH_URL_DISCOVERY_INSTRUCTION =
    'أنت تستخرج عناوين URL فقط من نتائج بحث Google المتاحة لك. لا تكتب تحليلاً قانونياً. التزم بالنطاقات الرسمية المذكورة في طلب المستخدم. أخرج JSON حسب الصيغة المطلوبة دون Markdown.';

export function getResearchUrlDiscoveryPrompt(query: string, region: LegalRegion): string {
    const regionName = region === 'gaza' ? 'قطاع غزة' : 'الضفة الغربية';
    const hosts = OFFICIAL_SOURCE_HOSTS.join(', ');
    return `الموضوع (في بيئة ${regionName}):
"${query}"

**المطلوب:** JSON خام فقط بالشكل التالي (بدون \`\`\` وبدون شرح):
{"urls":["https://..."]}

**قيود:**
- لا تزيد عن 3 روابط.
- كل رابط https ومباشر لصفحة تشريع/مادة/وثيقة قانونية.
- النطاقات المسموحة فقط (أو نطاقاتها الفرعية): ${hosts}
- لا تخترع روابط: أضف فقط عناوين ظهرت لك في نتائج البحث وتتعلق بالسؤال.
إن لم تجد شيئاً صالحاً: {"urls":[]}`;
}

export function parseOfficialUrlsFromDiscoveryText(text: string, maxUrls = 3): string[] {
    const cleaned = text
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
    const fromJson: string[] = [];
    try {
        const o = JSON.parse(cleaned) as unknown;
        if (o && typeof o === 'object' && Array.isArray((o as { urls?: unknown }).urls)) {
            for (const u of (o as { urls: unknown[] }).urls) {
                if (typeof u === 'string' && u.startsWith('http')) fromJson.push(u.trim());
            }
        }
    } catch {
        /* يُكمَل بـ regex */
    }
    const seen = new Set<string>();
    const out: string[] = [];
    const pushIfAllowed = (raw: string) => {
        const u = raw.replace(/[\s.,;:)]+$/g, '');
        if (!isAllowedOfficialSourceUri(u)) return;
        let key: string;
        try {
            key = new URL(u).href.split('#')[0];
        } catch {
            return;
        }
        if (seen.has(key)) return;
        seen.add(key);
        out.push(u);
    };
    for (const u of fromJson) {
        pushIfAllowed(u);
        if (out.length >= maxUrls) return out;
    }
    const re = /https:\/\/[^\s"'<>\])}]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        pushIfAllowed(m[0]);
        if (out.length >= maxUrls) break;
    }
    return out;
}
