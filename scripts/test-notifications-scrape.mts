import { searchNotifications } from '../server/courtsNotificationsScraper.ts';

const q = 'نديم عدنان شحادة دراغمة';
const p1 = await searchNotifications({ query: q, page: 1 });
console.log('page1', JSON.stringify(p1, null, 2).slice(0, 1200));
if (p1.ok && p1.sessionCookie && (p1.totalPages ?? 0) > 1) {
    const p2 = await searchNotifications({
        query: q,
        page: 2,
        sessionCookie: p1.sessionCookie,
    });
    console.log('page2 rows', p2.ok ? p2.rows.length : p2);
}
