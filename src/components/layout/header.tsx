'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { BrandLogo } from '@/components/shared/brand';
import {
  ArrowLeftIcon,
  BuyersIcon,
  LocationIconBuskool,
  SearchIconBuskool,
  SellersIcon,
} from '@/components/shared/buskool-icons';
import { useCategoryTree, useSuggestions } from '@/lib/mock/hooks';
import type { Category } from '@/lib/types';

/**
 * هدر ایمچ:
 * دسکتاپ: بنر ثبت‌نام + [لوگو | جستجو (flex-1) | فروشندگان، خریداران، ورود/ثبت‌نام (ته نوار)]
 *         + نوار دسته‌بندی‌ها در ردیف جدا زیر جستجو (با «فروشنده شوید!» در انتهای نوار)
 * موبایل: بنر ثبت‌نام + [لوگو | نوار جستجوی خاکستری (جستجوی محصول + همه ایران)]
 * ناوبری موبایل از طریق نوار پایین (MobileBottomNav) انجام می‌شود.
 */
export function Header() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [megaRoot, setMegaRoot] = useState<Category | null>(null);
  const searchWrap = useRef<HTMLDivElement>(null);

  const { data: tree = [] } = useCategoryTree();
  const { data: suggestions = [] } = useSuggestions(q);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchWrap.current && !searchWrap.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (term?: string) => {
    const value = (term ?? q).trim();
    if (!value) return;
    setFocused(false);
    setQ('');
    router.push(`/product-list?s=${encodeURIComponent(value)}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-card shadow-[0_3px_8px_rgba(150,150,150,0.15)]">
      {/* بنر ثبت‌نام — عین باسکول: «شروع قیمت گیری، خرید و فروش عمده با ثبت نام رایگان» */}
      <div className="border-b border-border/70 bg-[oklch(0.945_0.02_250)]">
        <Link
          href="/register"
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-1 px-4 py-2.5 nav-desktop:gap-4 nav-desktop:py-4 lg:px-6"
        >
          <p className="text-center text-xs text-foreground/90 nav-desktop:text-sm">شروع قیمت گیری، خرید و فروش عمده با</p>
          <span className="flex items-center gap-2 text-xs text-foreground/90 nav-desktop:text-sm">
            <span className="border-b border-foreground/90">ثبت نام رایگان</span>
            <ArrowLeftIcon size={16} className="nav-desktop:size-5" />
          </span>
        </Link>
      </div>

      {/* ─── ردیف اصلی: لوگو و جستجو ابتدای نوار، لینک‌ها انتهای نوار ─────── */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 pb-3 pt-1.5 nav-desktop:gap-5 nav-desktop:px-6 nav-desktop:pb-2.5 nav-desktop:pt-2.5 lg:gap-6">
        <Link href="/" aria-label="ایمچ — صفحه اصلی" className="shrink-0">
          <BrandLogo size="sm" className="h-7" />
        </Link>

        {/* جستجوی دسکتاپ — flex-1: کل فضای خالی نوار را می‌گیرد */}
        <div ref={searchWrap} className="relative hidden min-w-0 flex-1 nav-desktop:block">
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="flex h-10 items-stretch rounded-lg border border-primary bg-card"
            role="search"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="به دنبال چه محصولی هستید؟"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              aria-label="جستجوی محصول"
            />
            <button
              type="submit"
              aria-label="جستجو"
              className="flex w-14 shrink-0 items-center justify-center bg-primary text-primary-foreground transition-colors hover:bg-primary-deep"
            >
              <Search size={19} strokeWidth={2.4} />
            </button>
          </form>

          {focused && q.trim().length >= 2 && (
            <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-md border bg-popover shadow-lg">
              {suggestions.length > 0 ? (
                <ul className="max-h-72 overflow-y-auto p-1 text-sm">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => submit(s)}
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-start hover:bg-accent"
                      >
                        <Search size={14} className="text-muted-foreground" />
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">نتیجه‌ای یافت نشد.</p>
              )}
            </div>
          )}
        </div>

        {/* لینک‌های انتهای نوار — فروشندگان، خریداران، ورود/ثبت‌نام (آخر) — آیکون بالای متن */}
        <nav className="hidden items-center nav-desktop:flex" aria-label="حساب کاربری">
          <Link
            href="/product-list"
            className="flex min-w-20 flex-col items-center rounded-xl px-2.5 py-1 text-sm text-[#5f6368] hover:bg-accent hover:text-foreground"
          >
            <SellersIcon size={24} />
            <span className="mt-1">فروشندگان</span>
          </Link>
          <span className="mx-1 h-9 w-px bg-[#eee]" aria-hidden />
          <Link
            href="/buyAd-requests"
            className="flex min-w-20 flex-col items-center rounded-xl px-2.5 py-1 text-sm text-[#5f6368] hover:bg-accent hover:text-foreground"
          >
            <BuyersIcon size={24} />
            <span className="mt-1">خریداران</span>
          </Link>
          <span className="mx-1 h-9 w-px bg-[#eee]" aria-hidden />
          <Link
            href="/register"
            className="flex min-w-20 flex-col items-center rounded-xl px-2.5 py-1 text-sm text-[#5f6368] hover:bg-accent hover:text-foreground"
          >
            <UserPlusBadge />
            <span className="mt-1">ورود / ثبت نام</span>
          </Link>
        </nav>

        {/* نوار جستجوی موبایل — عین باسکول: خاکستری #f2f3f7 + همه ایران */}
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          role="search"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-[#f2f3f7] px-2 shadow-[0_2px_10px_rgba(196,196,196,0.15)] nav-desktop:hidden"
        >
          <button type="submit" aria-label="جستجو" className="shrink-0 text-black/50">
            <SearchIconBuskool size={24} />
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی محصول"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="جستجوی محصول"
          />
          <span className="h-6 w-px shrink-0 bg-[#cbcbcb]" aria-hidden />
          <button
            type="button"
            title="فیلتر مکان"
            aria-label="فیلتر مکان: همه ایران"
            className="flex shrink-0 items-center gap-2 text-[rgba(38,70,83,0.8)]"
          >
            <span className="whitespace-nowrap text-sm font-medium">همه ایران</span>
            <LocationIconBuskool size={20} className="text-[#757575]" />
          </button>
        </form>
      </div>

      {/* ─── نوار دسته‌بندی‌ها — ردیف جدا زیر جستجو + «فروشنده شوید!» ─────── */}
      <nav
        className="relative hidden border-t border-border/70 nav-desktop:block"
        aria-label="دسته‌بندی محصولات"
        onMouseLeave={() => setMegaRoot(null)}
      >
        <div className="mx-auto max-w-7xl px-4 nav-desktop:px-6">
          <div className="flex items-center gap-2.5 py-1">
            {/* دسته‌های اصلی — ردیف افقی اسکرولی؛ «فروشنده شوید!» همیشه ثابت در انتهای نوار */}
            <ul className="no-scrollbar min-w-0 flex flex-1 items-center gap-0.5 overflow-x-auto">
              {tree.map((c) => (
                <li key={c.id} className="shrink-0" onMouseEnter={() => setMegaRoot(c.children?.length ? c : null)}>
                  <Link
                    href={`/product-list/category/${c.slug}`}
                    className="block whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {c.categoryName}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="h-4 w-px bg-border" aria-hidden />
              <Link
                href="/register"
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-bold text-primary transition-colors hover:bg-accent"
              >
                فروشنده شوید!
              </Link>
            </div>
          </div>
        </div>

        {megaRoot && <MegaPanel root={megaRoot} onNavigate={() => setMegaRoot(null)} />}
      </nav>
    </header>
  );
}

/** آیکون کاربر + نشان مثبت کوچک — الگوی fa-user باسکول */
function UserPlusBadge() {
  return (
    <span className="relative inline-flex" aria-hidden>
      <svg width="21" height="24" viewBox="0 0 448 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0 96 57.3 96 128s57.3 128 128 128zm89.6 32h-16.7c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16h-16.7C60.2 288 0 348.2 0 422.4V464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48v-41.6c0-74.2-60.2-134.4-134.4-134.4z"
          fill="currentColor"
        />
      </svg>
      <svg className="absolute -top-1 -end-0.5" width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5 0c.4 0 .7.3.7.7v3.6h3.6c.4 0 .7.3.7.7s-.3.7-.7.7H5.7v3.6c0 .4-.3.7-.7.7s-.7-.3-.7-.7V5.7H.7c-.4 0-.7-.3-.7-.7s.3-.7.7-.7h3.6V.7c0-.4.3-.7.7-.7z"
          fill="var(--primary)"
        />
      </svg>
    </span>
  );
}

/** پنل مگامنو — زیر نوار دسته‌بندی‌ها، زیرشاخه‌های دسته فعال */
function MegaPanel({ root, onNavigate }: { root: Category; onNavigate: () => void }) {
  return (
    <div className="absolute inset-x-0 top-full z-50 border-b border-e border-s bg-popover shadow-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-x-6 gap-y-5 px-4 py-4 nav-desktop:px-6 lg:grid-cols-4">
        {root.children?.map((l2) => (
          <div key={l2.id}>
            <Link
              href={`/product-list/category/${l2.slug}`}
              onClick={onNavigate}
              className="text-sm font-bold text-foreground hover:text-primary"
            >
              {l2.categoryName}
            </Link>
            <ul className="mt-1.5 space-y-1">
              {l2.children?.map((l3) => (
                <li key={l3.id}>
                  <Link
                    href={`/product-list/category/${l3.slug}`}
                    onClick={onNavigate}
                    className="line-clamp-1 block text-[13px] text-muted-foreground hover:text-primary"
                  >
                    {l3.categoryName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
