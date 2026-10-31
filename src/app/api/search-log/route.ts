import { NextResponse } from 'next/server';
import { stripSearchNoise } from '@/lib/popular-searches';
import { normalizeQuery, recordSearch } from '@/lib/search-log';

/**
 * ثبت ورودی جستجو — POST { q } از SearchPing (صفحه جستجو).
 * برای خزنده‌ها فرقی نمی‌کند؛ فیلتر UA سمت کلاینت است.
 * عبارت پاکسازی می‌شود تا شمارنده همیشه روی URL یکتای همان کالا بنشیند
 * («خرید سیب زمینی عمده در تهران» → «سیب زمینی»).
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { q?: unknown };
    const q = normalizeQuery(stripSearchNoise(String(body?.q ?? '')));
    if (!q) return NextResponse.json({ ok: false }, { status: 400 });
    await recordSearch(q);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
