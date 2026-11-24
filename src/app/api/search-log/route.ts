import { NextResponse } from 'next/server';
import { stripSearchNoise } from '@/lib/popular-searches';
import { normalizeQuery, recordGoogleEntry, recordSearch } from '@/lib/search-log';

/**
 * ثبت یک رویداد واقعی برای آمار «ورودی‌ها و جستجوهای کاربران» — POST { q, source }.
 *
 *  source = 'google'   → ورودی واقعی از گوگل (رفرر گوگل، تشخیص سمت کلاینت):
 *                        جدول دوم به تفکیک تاریخ + مجموع (recordGoogleEntry).
 *  source = 'internal' → جستجوی داخلی کاربر (پیش‌فرض — سازگار با فراخوان‌های
 *                        قبلی): شمارندهٔ search-log (recordSearch).
 *
 * عبارت پاکسازی می‌شود تا شمارنده همیشه روی URL یکتای همان کالا بنشیند
 * («خرید سیب زمینی عمده در تهران» → «سیب زمینی»).
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { q?: unknown; source?: unknown };
    const q = normalizeQuery(stripSearchNoise(String(body?.q ?? '')));
    if (!q) return NextResponse.json({ ok: false }, { status: 400 });

    if (body?.source === 'google') await recordGoogleEntry(q);
    else await recordSearch(q);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
