import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Flame, History, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { JsonLd } from '@/components/shared/json-ld';
import { toFa, timeAgoFa } from '@/lib/format';
import { searchPath, stripSearchNoise } from '@/lib/popular-searches';
import { readGoogleLog, readSearchLog } from '@/lib/search-log';
import {
  SEARCH_PAGE_SIZE,
  SEED_CITIES,
  filterUniverse,
  getCategoryLeaves,
  getSearchUniverse,
  paginate,
  type SearchIntent,
  type SearchPhrase,
} from '@/lib/search-universe';
import { SITE_URL } from '@/lib/site';

/** عنوان صفحه (خواستهٔ مالک) — بدون پاراگراف توضیحی اضافه */
const PAGE_TITLE = 'ورودی ها و جستجوهای کاربران از گوگل';

/**
 * صفحه «ورودی‌ها و جستجوهای کاربران از گوگل» — دایرةالمعارف لینک‌های سئو:
 *
 *  · تمام نودهای برگ دسته‌ها × {خرید|فروش} × {—|عمده} × {—|نوع کالا} ×
 *    {—|در شهر} — ده‌ها هزار عبارت یکتا با لینک به صفحات فرود کنونیکال؛
 *  · مینیمال: دو ستون «بیشترین جستجوها» (با تعداد) و «آخرین جستجوها»
 *    (رویدادهای واقعی) + گرید کامل فیلترشدنی و صفحه‌بندی‌شده؛
 *  · شمارش هر عبارت = عدد متناسب برندینگ [۱۰k..۱۰۰k] + رویدادهای واقعی
 *    (جستجوی داخلی + ورودی گوگل — ورودی گوگل +۱ می‌خورد و در جدول
 *    روزانهٔ جدا ثبت می‌شود)؛
 *  · همهٔ لینک‌ها سمت سرور رندر می‌شوند تا اولین کرالِ گوگل همه را
 *    ایندکس کند؛ فیلترها با GET خالص (بدون جاوااسکریپت) کار می‌کنند.
 */
export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** خواندن تک‌مقداری از searchParams */
function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : undefined;
}

/**
 * متادیتای داینامیک — کنونیکال: صفحهٔ ۱ بدون فیلتر → /searches؛
 * صفحات صفحه‌بندی → /searches?page=N (خودارجاع تا هر صفحه جدا ایندکس شود)؛
 * صفحات فیلترشده → بدون فیلتر (سیگنال‌ها روی نسخهٔ اصلی جمع شود).
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const page = Number(one(sp.page) ?? 1) || 1;
  const canonical = page > 1 ? `/searches?page=${page}` : '/searches';
  return {
    title: `${PAGE_TITLE} — جستجوهای پرتکرار بازار عمده`,
    description:
      'جستجوهای پرتکرار کاربران گوگل در بازار عمده ایمچ؛ خرید عمده و فروش عمده هر کالا با قیمت روز از تولیدکنندگان و فروشندگان سراسر ایران.',
    alternates: { canonical },
    openGraph: {
      title: PAGE_TITLE,
      description: 'جستجوهای پرتکرار کاربران گوگل در بازار عمده ایمچ',
      type: 'website',
    },
  };
}

/** ساخت لینک صفحه‌بندی/فیلتر — پارامترهای خالی حذف می‌شوند */
function pageUrl(params: { page?: number; root?: string; city?: string; intent?: string; q?: string }): string {
  const usp = new URLSearchParams();
  if (params.root) usp.set('root', params.root);
  if (params.city) usp.set('city', params.city);
  if (params.intent) usp.set('intent', params.intent);
  if (params.q) usp.set('q', params.q);
  if (params.page && params.page > 1) usp.set('page', String(params.page));
  const qs = usp.toString();
  return qs ? `/searches?${qs}` : '/searches';
}

export default async function SearchesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Number(one(sp.page) ?? 1) || 1;
  const root = one(sp.root);
  const city = one(sp.city);
  const intent = one(sp.intent) === 'خرید' || one(sp.intent) === 'فروش' ? (one(sp.intent) as SearchIntent) : undefined;
  const q = one(sp.q);

  // جهان جستجو (memo پروسه) + جدول‌های واقعی
  const [universe, searchLog, googleLog, leaves] = await Promise.all([
    getSearchUniverse(),
    readSearchLog(),
    readGoogleLog(),
    getCategoryLeaves(),
  ]);

  // رویدادهای واقعی به تفکیک عبارت هسته‌ای — روی شمارش پایه جمع می‌شود.
  // کلید = عبارت پاک‌شده (ورودی‌های قدیمی لاگ ممکن است واژه‌های عمده/خرید داشته باشند)
  const realCounts = new Map<string, number>();
  const addReal = (rawQ: string, n: number) => {
    const key = stripSearchNoise(rawQ) || rawQ;
    realCounts.set(key, (realCounts.get(key) ?? 0) + n);
  };
  for (const e of searchLog) if (e.count > 0) addReal(e.q, e.count);
  for (const e of googleLog) if (e.total > 0) addReal(e.q, e.total);
  const countOf = (p: SearchPhrase) => p.count + (realCounts.get(p.core) ?? 0);

  // فیلتر + مرتب‌سازی (بیشترین → کمترین) + صفحه‌بندی
  const filtered = filterUniverse(universe, { root, city, intent, q });
  filtered.sort((a, b) => countOf(b) - countOf(a) || (a.phrase < b.phrase ? -1 : a.phrase > b.phrase ? 1 : 0));
  const { items, page: safePage, pageCount } = paginate(filtered, page);

  // دو ستون بالای صفحه — مینیمال (خواستهٔ مالک):
  // جهان از قبل بر اساس شمارش پایه مرتب است؛ عبارت‌های دارای رویداد واقعی
  // هم به کاندیدها اضافه می‌شوند تا جهششان دیده شود.
  const realCores = new Set(realCounts.keys());
  const top = universe
    .filter((p, i) => i < 40 || realCores.has(p.core))
    .sort((a, b) => countOf(b) - countOf(a))
    .slice(0, 12);

  // آخرین رویدادهای واقعی (ورودی گوگل + جستجوی داخلی) — بر اساس واقعیت
  const recent = [
    ...googleLog.map((e) => ({ q: e.q, at: e.lastAt, src: 'گوگل' as const })),
    ...searchLog.filter((e) => e.lastAt > 0).map((e) => ({ q: e.q, at: e.lastAt, src: 'جستجوی داخلی' as const })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 12);

  // دسته‌های ریشه برای فیلتر — از دادهٔ زنده
  const roots = [...new Set(leaves.map((l) => l.root))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  // پنجرهٔ شماره‌های صفحه (۱ … n)
  const windowPages: Array<number | '…'> = [];
  const push = (n: number | '…') => windowPages.push(n);
  const from = Math.max(1, safePage - 2);
  const to = Math.min(pageCount, safePage + 2);
  if (from > 1) push(1);
  if (from > 2) push('…');
  for (let n = from; n <= to; n++) push(n);
  if (to < pageCount - 1) push('…');
  if (to < pageCount) push(pageCount);

  const hasFilters = !!(root || city || intent || q);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <h1 className="text-lg font-extrabold lg:text-2xl">{PAGE_TITLE}</h1>

          {/* ─── دو ستون مینیمال: بیشترین جستجوها | آخرین جستجوها ─────── */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* بیشترین جستجوها — ستون اول: تعداد جستجو + عبارت */}
            <section aria-labelledby="top-searches">
              <h2 id="top-searches" className="mb-2.5 flex items-center gap-1.5 text-sm font-bold">
                <Flame size={15} className="text-primary" />
                بیشترین جستجوها
              </h2>
              <ul className="divide-y divide-border/70 rounded-lg border bg-card">
                {top.map((p) => (
                  <li key={p.phrase}>
                    <Link
                      href={searchPath(p.core)}
                      className="flex items-center justify-between gap-3 px-3.5 py-2 text-[13px] transition-colors hover:bg-accent/60"
                    >
                      <span className="font-num shrink-0 text-xs font-extrabold text-primary">
                        {toFa(countOf(p))}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-start font-medium">{p.phrase}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">جستجو</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* آخرین جستجوها — رویدادهای واقعی (گوگل + داخلی) */}
            <section aria-labelledby="recent-searches">
              <h2 id="recent-searches" className="mb-2.5 flex items-center gap-1.5 text-sm font-bold">
                <History size={15} className="text-primary" />
                آخرین جستجوها
              </h2>
              <ul className="divide-y divide-border/70 rounded-lg border bg-card">
                {recent.length === 0 ? (
                  <li className="px-3.5 py-6 text-center text-xs text-muted-foreground">
                    هنوز رویداد واقعی ثبت نشده است؛ ورودی‌های گوگل همین‌جا شمرده می‌شوند.
                  </li>
                ) : (
                  recent.map((r, i) => (
                    <li key={`${r.q}-${i}`}>
                      <Link
                        href={searchPath(r.q)}
                        className="flex items-center justify-between gap-3 px-3.5 py-2 text-[13px] transition-colors hover:bg-accent/60"
                      >
                        <span className="min-w-0 flex-1 truncate text-start font-medium">{r.q}</span>
                        <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {r.src}
                        </span>
                        <span className="w-20 shrink-0 text-end text-[10px] text-muted-foreground">
                          {timeAgoFa(new Date(r.at).toISOString())}
                        </span>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>

          {/* ─── فیلترها — GET خالص (بدون جاوااسکریپت هم کار می‌کند) ─── */}
          <form
            method="GET"
            action="/searches"
            className="mt-7 flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 sm:gap-3"
            aria-label="فیلتر جستجوها"
          >
            <label className="flex min-w-36 flex-1 flex-col gap-1 text-[11px] font-medium text-muted-foreground sm:max-w-44">
              دسته بندی
              <select
                name="root"
                defaultValue={root ?? ''}
                className="h-9 rounded-md border bg-background px-2 text-[13px] text-foreground"
              >
                <option value="">همه</option>
                {roots.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-28 flex-1 flex-col gap-1 text-[11px] font-medium text-muted-foreground sm:max-w-36">
              شهر
              <select
                name="city"
                defaultValue={city ?? ''}
                className="h-9 rounded-md border bg-background px-2 text-[13px] text-foreground"
              >
                <option value="">همه</option>
                {SEED_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-24 flex-1 flex-col gap-1 text-[11px] font-medium text-muted-foreground sm:max-w-32">
              نوع
              <select
                name="intent"
                defaultValue={intent ?? ''}
                className="h-9 rounded-md border bg-background px-2 text-[13px] text-foreground"
              >
                <option value="">خرید و فروش</option>
                <option value="خرید">خرید</option>
                <option value="فروش">فروش</option>
              </select>
            </label>
            <label className="flex min-w-36 flex-1 flex-col gap-1 text-[11px] font-medium text-muted-foreground sm:max-w-52">
              نوع کالا / کالای موردنظر
              <input
                type="search"
                name="q"
                defaultValue={q ?? ''}
                placeholder="مثلاً هاشمی"
                className="h-9 rounded-md border bg-background px-2.5 text-[13px] text-foreground"
              />
            </label>
            <button
              type="submit"
              className="h-9 rounded-md border border-primary/40 px-4 text-[13px] font-bold text-primary transition-colors hover:bg-primary-soft"
            >
              اعمال فیلتر
            </button>
            {hasFilters && (
              <Link
                href="/searches"
                className="flex h-9 items-center px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                حذف فیلترها
              </Link>
            )}
          </form>

          {/* ─── گرید کامل جستجوها — فیلترشده و صفحه‌بندی‌شده ─────── */}
          <section className="mt-5" aria-labelledby="all-searches">
            <h2 id="all-searches" className="mb-2.5 flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
              <span className="inline-flex items-center gap-1.5">
                <Search size={15} className="text-primary" />
                همه جستجوها
              </span>
              <span className="font-num text-[11px] font-medium text-muted-foreground">
                {toFa(filtered.length)} عبارت
                {hasFilters ? ' — با فیلتر فعلی' : ' ایندکس‌پذیر'}
              </span>
            </h2>

            {items.length === 0 ? (
              <p className="rounded-lg border bg-card p-6 text-center text-xs text-muted-foreground">
                جستجویی با این فیلترها پیدا نشد.
              </p>
            ) : (
              <>
                {/* هر ردیف: تعداد (ستون اول) + عبارت به‌عنوان لینک + متا */}
                <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 rounded-lg border bg-card p-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <li key={p.phrase}>
                      <Link
                        href={searchPath(p.core)}
                        className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-accent/60"
                        title={p.phrase}
                      >
                        <span className="font-num w-16 shrink-0 text-end text-[11px] font-extrabold text-primary">
                          {toFa(countOf(p))}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium leading-6">{p.phrase}</span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* ─── صفحه‌بندی — لینک‌های ساده و کرال‌پذیر ───────── */}
                {pageCount > 1 && (
                  <nav
                    className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
                    aria-label="صفحه‌بندی جستجوها"
                  >
                    {safePage > 1 && (
                      <Link
                        href={pageUrl({ page: safePage - 1, root, city, intent, q })}
                        className="flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs transition-colors hover:border-primary/50 hover:text-primary"
                        rel="prev"
                      >
                        <ChevronRight size={14} aria-hidden />
                        قبلی
                      </Link>
                    )}
                    {windowPages.map((n, i) =>
                      n === '…' ? (
                        <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">
                          …
                        </span>
                      ) : (
                        <Link
                          key={n}
                          href={pageUrl({ page: n, root, city, intent, q })}
                          aria-current={n === safePage ? 'page' : undefined}
                          className={
                            n === safePage
                              ? 'font-num flex h-8 min-w-8 items-center justify-center rounded-md bg-primary px-2 text-xs font-bold text-primary-foreground'
                              : 'font-num flex h-8 min-w-8 items-center justify-center rounded-md border bg-card px-2 text-xs transition-colors hover:border-primary/50 hover:text-primary'
                          }
                        >
                          {toFa(n)}
                        </Link>
                      ),
                    )}
                    {safePage < pageCount && (
                      <Link
                        href={pageUrl({ page: safePage + 1, root, city, intent, q })}
                        className="flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs transition-colors hover:border-primary/50 hover:text-primary"
                        rel="next"
                      >
                        بعدی
                        <ChevronLeft size={14} aria-hidden />
                      </Link>
                    )}
                  </nav>
                )}
                <p className="font-num mt-2 text-center text-[11px] text-muted-foreground">
                  صفحه {toFa(safePage)} از {toFa(pageCount)} — هر صفحه {toFa(SEARCH_PAGE_SIZE)} عبارت
                </p>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: PAGE_TITLE,
          numberOfItems: filtered.length,
          itemListElement: items.slice(0, 100).map((p, i) => ({
            '@type': 'ListItem',
            position: (safePage - 1) * SEARCH_PAGE_SIZE + i + 1,
            url: `${SITE_URL}${searchPath(p.core)}`,
            name: p.phrase,
          })),
        }}
      />
    </>
  );
}
