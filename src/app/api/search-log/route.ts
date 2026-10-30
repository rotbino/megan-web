import { NextResponse } from 'next/server';
import { normalizeQuery, recordSearch } from '@/lib/search-log';

/**
 * ثبت جستجوی کاربر — POST { q } از SearchPing (صفحه جستجو).
 * برای خزنده‌ها فرقی نمی‌کند؛ فیلتر UA سمت کلاینت است.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { q?: unknown };
    const q = normalizeQuery(String(body?.q ?? ''));
    if (!q) return NextResponse.json({ ok: false }, { status: 400 });
    await recordSearch(q);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
