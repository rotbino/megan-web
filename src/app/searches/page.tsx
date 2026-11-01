import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { JsonLd } from '@/components/shared/json-ld';
import { toFa } from '@/lib/format';
import { stripSearchNoise } from '@/lib/popular-searches';
import { readGoogleLog, readSearchLog } from '@/lib/search-log';
import {
  SEARCH_PAGE_SIZE,
  SEED_CITIES,
  filterUniverse,
  getCategoryLeaves,
  getSearchUniverse,
  paginate,
  phraseUrl,
  type SearchIntent,
  type SearchPhrase,
} from '@/lib/search-universe';
import { SITE_URL } from '@/lib/site';

/** عنوان صفحه (خواستهٔ مالک) — بدون پاراگراف توضیحی اضافه */
const PAGE_TITLE = 'ورودی ها و جستجوهای کاربران از گوگل';

/**
 * صفحه «ورودی‌ها و جستجوهای کاربران از گوگل» — مینیمال (خواستهٔ مالک
 * ۱-۱۱ دور جدید): «فقط همان لیست فیلتر دار کافیه … بزار صفحه مینیمال باشه».
 *
 *  · فقط یک لیست: گرید کامل عبارت‌ها با فیلتر (دسته/شهر/نوع/عبارت) و
 *    صفحه‌بندی — لیست‌های «بیشترین/آخرین» بالای صفحه حذف شدند؛
 *  · همهٔ عبارت‌ها «عمده» دارند («خرید برنج» بدون عمده اصلاً وجود ندارد)؛
 *  · تعداد جستجو به زبان کاربر: «۲۷ بار» (نه عدد خام)؛
 *  · عبارت‌های شهری به صفحهٔ فرود اختصاصی همان شهر می‌روند
 *    (/product-list/search/{کالا}/{شهر} — نتایج واقعاً فیلترشده)؛
 *  · شمارش = عدد متناسب برندینگ [۱۰k..۱۰۰k] + رویدادهای واقعی
 *    (جستجوی داخلی + ورودی گوگل که +۱ می‌خورد و در جدول روزانه ثبت می‌شود)؛
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
      'جستجوهای پرتکرار کاربران گوگل در بازار عمده ایمچ؛ خرید عمده و فروش عمده هر کالا در شهرهای ایران با قیمت روز از تولیدکنندگان و فروشندگان.',
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

  // جهان جستجو (memo پروسه) + جدول‌های واقعی (فقط برای شمارش — لیست جدا نیست)
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

          {/* ─── فیلترها — GET خالص (بدون جاوااسکریپت هم کار می‌کند) ─── */}
          <form
            method="GET"
            action="/searches"
            className="mt-5 flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 sm:gap-3"
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

          {/* ─── لیست کامل جستجوها — فیلترشده و صفحه‌بندی‌شده ─────── */}
          <section className="mt-5" aria-labelledby="all-searches">
            <h2 id="all-searches" className="mb-2.5 flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
              <span className="inline-flex items-center gap-1.5">
                <Search size={15} className="text-primary" />
                همه جستجوها
              </span>
              <span className="font-num text-[11px] font-medium text-muted-foreground">
                {toFa(filtered.length)} عبارت
              </span>
            </h2>

            {items.length === 0 ? (
              <p className="rounded-lg border bg-card p-6 text-center text-xs text-muted-foreground">
                جستجویی با این فیلترها پیدا نشد.
              </p>
            ) : (
              <>
                {/* هر ردیف: عبارت + تعداد جستجو به زبان کاربر («۲۷ بار») —
                    عبارت شهری به صفحهٔ فرود همان شهر می‌رود */}
                <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 rounded-lg border bg-card p-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <li key={p.phrase}>
                      <Link
                        href={phraseUrl(p)}
                        className="flex items-center justify-between gap-2.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-accent/60"
                        title={p.phrase}
                      >
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium leading-6">{p.phrase}</span>
                        <span className="font-num shrink-0 text-[11px] font-extrabold text-primary">
                          {toFa(countOf(p))} بار
                        </span>
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
                  صفحه {toFa(safePage)} از {toFa(pageCount)}
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
            url: `${SITE_URL}${phraseUrl(p)}`,
            name: p.phrase,
          })),
        }}
      />
    </>
  );
}
