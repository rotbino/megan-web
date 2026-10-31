import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, History, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { JsonLd } from '@/components/shared/json-ld';
import { toFa, timeAgoFa } from '@/lib/format';
import { GOOGLE_ENTRY_QS, searchPath, seedTitleFor } from '@/lib/popular-searches';
import { readSearchLog } from '@/lib/search-log';
import { SITE_URL } from '@/lib/site';

/** عنوان واحد بخش فوتر و این صفحه — «ورودی کاربران از گوگل» (خواسته مالک) */
const PAGE_TITLE = 'کاربران گوگل چه سرچ کردند و به ایمچ رسیدند؟';

/**
 * صفحه «ورودی‌های گوگل» — عبارت‌هایی که کاربران در گوگل جستجو کرده و به
 * ایمچ رسیده‌اند، به‌صورت لینک به صفحات جستجوی ایندکس‌پذیر
 * (/product-list/search/{q}).
 *
 * ارزش سئو: خزنده‌ها از فوتر و این صفحه به صفحات فرودِ همهٔ کالاها لینک
 * می‌گیرند (long-tail) و ما هم می‌بینیم از هر لینک ثبت‌شده در گوگل چند
 * کاربر آمده است (شمارنده هر URL). ISR کوتاه ۶۰ ثانیه‌ای تا شمارش‌ها و
 * جستجوهای تازه زود reflected شوند.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: `${PAGE_TITLE} — جستجوهای پرتکرار بازار عمده`,
  description:
    'جستجوهای واقعی کاربران گوگل که به بازار عمده ایمچ رسیده‌اند؛ خرید عمده و فروش عمده هر کالا با بهترین قیمت از تولیدکنندگان و فروشندگان سراسر ایران.',
  alternates: { canonical: '/searches' },
  openGraph: {
    title: PAGE_TITLE,
    description: 'جستجوهای واقعی کاربران گوگل که به بازار عمده ایمچ رسیده‌اند',
    type: 'website',
  },
};

export default async function SearchesPage() {
  const log = await readSearchLog();
  const rank = new Map(GOOGLE_ENTRY_QS.map((q, i) => [q, i]));

  // پربازدیدترین ورودی‌ها — شمارش نزولی؛ تساوی‌ها با ترتیب seed (رتبه بازار)
  const top = [...log]
    .sort((a, b) => b.count - a.count || (rank.get(a.q) ?? 999) - (rank.get(b.q) ?? 999))
    .slice(0, 24);

  // آخرین جستجوهای واقعی — فقط ورودی‌های دارای رویداد
  const recent = [...log]
    .filter((e) => e.lastAt > 0)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, 24);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <h1 className="text-lg font-extrabold lg:text-2xl">{PAGE_TITLE}</h1>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground lg:text-sm">
            این‌ها همان عبارت‌هایی است که کاربران در گوگل جستجو کردند و به بازار عمده ایمچ رسیدند؛
            روی هر کدام کلیک کنید تا آگهی‌های فروش عمده همان کالا را با قیمت روز ببینید. ورودی هر
            لینک اینجا شمرده می‌شود تا معروف‌ترین کالاهای بازار عمده ایران مشخص بماند.
          </p>

          {/* ─── پربازدیدترین ورودی‌های گوگل ─────────────────────── */}
          <section className="mt-6" aria-labelledby="popular-searches">
            <h2 id="popular-searches" className="mb-3 flex items-center gap-1.5 text-sm font-bold">
              <Flame size={15} className="text-primary" />
              پربازدیدترین ورودی‌های گوگل
            </h2>
            <ul className="flex flex-wrap gap-2">
              {top.map((e) => (
                <li key={e.q}>
                  <Link
                    href={searchPath(e.q)}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Search size={12} className="text-muted-foreground" aria-hidden />
                    {seedTitleFor(e.q) ?? e.q}
                    {e.count > 0 && (
                      <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {toFa(e.count)} ورودی
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ─── آخرین جستجوهای کاربران ──────────────────────────── */}
          <section className="mt-8" aria-labelledby="recent-searches">
            <h2 id="recent-searches" className="mb-3 flex items-center gap-1.5 text-sm font-bold">
              <History size={15} className="text-primary" />
              آخرین جستجوهای کاربران
            </h2>
            {recent.length === 0 ? (
              <p className="rounded-md border bg-card p-4 text-xs text-muted-foreground">
                هنوز جستجویی ثبت نشده است؛ اولین جستجو را شما انجام دهید — از نوار جستجوی بالا.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((e) => (
                  <li key={e.q}>
                    <Link
                      href={searchPath(e.q)}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-xs transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 font-medium">
                        <Search size={12} className="shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{e.q}</span>
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {timeAgoFa(new Date(e.lastAt).toISOString())}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── متن سئو + لینک داخلی ────────────────────────────── */}
          <section className="mt-10 rounded-md border bg-card p-4 lg:p-6">
            <h2 className="mb-2 text-sm font-bold">بازار عمده ایمچ — خرید عمده و فروش عمده بدون واسطه</h2>
            <p className="text-xs leading-6 text-muted-foreground lg:text-sm">
              ایمچ بازار خرید و فروش عمده کالاست؛ فروشندگان و تولیدکنندگان از سراسر ایران آگهی فروش عمده
              ثبت می‌کنند و خریداران عمده با یک جستجو به لیست قیمت روز، حداقل حجم فروش و مشخصات فروشنده
              می‌رسند. می‌توانید از{' '}
              <Link href="/product-list" className="font-medium text-primary hover:underline">
                لیست کامل محصولات عمده
              </Link>{' '}
              شروع کنید یا در نوار جستجو کالای موردنظرتان را جستجو کنید — جستجوی شما هم به صفحه اختصاصی
              همان کالا می‌رود تا خریداران بعدی را راهنمایی کند.
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: PAGE_TITLE,
          numberOfItems: top.length,
          itemListElement: top.map((e, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}${searchPath(e.q)}`,
            name: seedTitleFor(e.q) ?? e.q,
          })),
        }}
      />
    </>
  );
}
