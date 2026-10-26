'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LayoutGrid, Search } from 'lucide-react';
import { BrandLogo } from '@/components/shared/brand';
import { HeaderUserMenu } from '@/components/layout/header-user-menu';
import {
  BuyersIcon,
  LocationIconBuskool,
  MessagesIcon,
  SearchIconBuskool,
  SellersIcon,
} from '@/components/shared/buskool-icons';
import { useAuth } from '@/lib/mock/auth';
import { useCategoryTree, useSuggestions } from '@/lib/mock/hooks';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

/**
 * هدر ایمچ (v7):
 * ردیف ۱ (هدر اصلی): [لوگو | جستجو (flex) | لینک‌های نقش‌محور + پیام‌ها + منوی کاربر]
 * ردیف ۲ (نوار زیر هدر — فقط دسکتاپ): [دسته بندی (مگامنو) | فروشنده شوید]
 *
 * بعد از ورود (خواسته مالک): لینک ورود/ثبت‌نام حذف و به جایش آواتار + نام و
 * نام خانوادگی + آیکون دراپ‌داون می‌آید (منوی کانتکست نقش‌محور).
 * سیستم با نقش کاربر تطبیق می‌یابد: فروشنده → لینک «خریداران»، خریدار → لینک
 * «فروشندگان» (پیشنهادی)؛ هر دو + بدون آیکون پیام‌ها وقتی لاگین نیست.
 * موبایل: [لوگو | جستجو | آواتار] — ناوبری اصلی از نوار پایین.
 */
export function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeRoot, setActiveRoot] = useState<number | null>(null);
  const searchWrap = useRef<HTMLDivElement>(null);
  const megaWrap = useRef<HTMLDivElement>(null);

  const isSeller = user?.role === 'seller';

  const { data: tree = [] } = useCategoryTree();
  const { data: suggestions = [] } = useSuggestions(q);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchWrap.current && !searchWrap.current.contains(e.target as Node)) setFocused(false);
      if (megaWrap.current && !megaWrap.current.contains(e.target as Node)) setMegaOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMegaOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const submit = (term?: string) => {
    const value = (term ?? q).trim();
    if (!value) return;
    setFocused(false);
    setQ('');
    router.push(`/product-list?s=${encodeURIComponent(value)}`);
  };

  const closeMega = () => {
    setMegaOpen(false);
    setActiveRoot(null);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      {/* ─── ردیف ۱ — هدر اصلی: لوگو | جستجو | دکمه‌های انتها ── */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 nav-desktop:gap-4 nav-desktop:px-4 nav-desktop:py-3">
        <Link href="/" aria-label="ایمچ — صفحه اصلی" className="shrink-0">
          <BrandLogo size="sm" className="h-7" />
        </Link>

        {/* جستجوی دسکتاپ — فضای باقی‌مانده بین لوگو و دکمه‌ها (سقف عرض منطقی) */}
        <div ref={searchWrap} className="relative hidden min-w-0 max-w-[680px] flex-1 nav-desktop:block">
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="flex h-10 items-stretch overflow-hidden rounded-[10px] bg-secondary transition-colors focus-within:ring-2 focus-within:ring-ring/30"
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
              className="my-1 me-1 flex w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary-deep"
            >
              <Search size={18} strokeWidth={2.4} />
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

        {/* نوار جستجوی موبایل — چیپ خاکستری ملایم + همه ایران */}
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          role="search"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-secondary px-2 nav-desktop:hidden"
        >
          <button type="submit" aria-label="جستجو" className="shrink-0 text-muted-foreground">
            <SearchIconBuskool size={24} />
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی محصول"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="جستجوی محصول"
          />
          <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
          <button
            type="button"
            title="فیلتر مکان"
            aria-label="فیلتر مکان: همه ایران"
            className="flex shrink-0 items-center gap-2 text-[#4a505b]"
          >
            <span className="whitespace-nowrap text-sm font-medium">همه ایران</span>
            <LocationIconBuskool size={20} className="text-muted-foreground" />
          </button>
        </form>

        {/* دکمه‌های انتها — نقش‌محور: سیستم با نقش کاربر تطبیق می‌یابد */}
        <nav className="hidden items-center nav-desktop:flex" aria-label="حساب کاربری">
          {user ? (
            <>
              {/* فروشنده → خریداران (بازار درخواست‌های خرید) / خریدار → فروشندگان پیشنهادی */}
              <Link
                href={isSeller ? '/buyAd-requests' : '/panel/suggested-sellers'}
                className="flex min-w-20 flex-col items-center rounded-xl px-2.5 py-1 text-sm text-[#4a505b] hover:bg-accent hover:text-foreground"
              >
                {isSeller ? <BuyersIcon size={24} /> : <SellersIcon size={24} />}
                <span className="mt-1">{isSeller ? 'خریداران' : 'فروشندگان'}</span>
              </Link>
              <span className="mx-1 h-9 w-px bg-border" aria-hidden />
              {/* آیکون پیام‌ها — فقط برای کاربر واردشده */}
              <Link
                href="/panel/messages"
                aria-label="پیام‌ها"
                title="پیام‌ها"
                className="flex min-w-20 flex-col items-center rounded-xl px-2.5 py-1 text-sm text-[#4a505b] hover:bg-accent hover:text-foreground"
              >
                <MessagesIcon size={24} />
                <span className="mt-1">پیام ها</span>
              </Link>
              <span className="mx-1 h-9 w-px bg-border" aria-hidden />
              {/* آواتار + نام + آیکون دراپ‌داون → منوی کانتکست نقش‌محور */}
              <HeaderUserMenu variant="desktop" />
            </>
          ) : (
            <>
              <Link
                href="/product-list"
                className="flex min-w-20 flex-col items-center rounded-xl px-2.5 py-1 text-sm text-[#4a505b] hover:bg-accent hover:text-foreground"
              >
                <SellersIcon size={24} />
                <span className="mt-1">فروشندگان</span>
              </Link>
              <span className="mx-1 h-9 w-px bg-border" aria-hidden />
              <Link
                href="/buyAd-requests"
                className="flex min-w-20 flex-col items-center rounded-xl px-2.5 py-1 text-sm text-[#4a505b] hover:bg-accent hover:text-foreground"
              >
                <BuyersIcon size={24} />
                <span className="mt-1">خریداران</span>
              </Link>
              <span className="mx-1 h-9 w-px bg-border" aria-hidden />
              <Link
                href="/register"
                className="flex min-w-20 flex-col items-center rounded-xl px-2.5 py-1 text-sm text-[#4a505b] hover:bg-accent hover:text-foreground"
              >
                <UserPlusBadge />
                <span className="mt-1">ورود / ثبت نام</span>
              </Link>
            </>
          )}
        </nav>

        {/* آواتار کاربر در هدر موبایل — در جای خودش، بعد از جستجو */}
        <HeaderUserMenu variant="mobile" />
      </div>

      {/* ─── ردیف ۲ — نوار زیر هدر (دسکتاپ): دسته بندی | فروشنده شوید ── */}
      <div
        ref={megaWrap}
        onMouseLeave={() => setMegaOpen(false)}
        className="relative hidden items-center gap-2.5 border-t border-border/60 nav-desktop:flex nav-desktop:gap-3 nav-desktop:px-4"
      >
        <button
          type="button"
          onClick={() => setMegaOpen((v) => !v)}
          onMouseEnter={() => setMegaOpen(true)}
          aria-expanded={megaOpen}
          aria-haspopup="true"
          aria-label="باز کردن دسته‌بندی‌ها"
          className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <LayoutGrid size={17} className="text-primary" />
          دسته بندی
          <ChevronDown size={14} className={cn('transition-transform', megaOpen && 'rotate-180')} />
        </button>

        <span className="h-5 w-px shrink-0 bg-border" aria-hidden />

        <Link
          href={user ? '/panel/products/new' : '/register'}
          className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-[10px] px-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary-soft hover:text-primary-deep"
        >
          فروشنده شوید
        </Link>

        {/* مگامنوی دسته‌بندی — چسبیده به نوار (بدون فاصله تا هاور قطع نشود) */}
        {megaOpen && (
          <MegaMenu
            tree={tree}
            activeRoot={activeRoot}
            setActiveRoot={setActiveRoot}
            onNavigate={closeMega}
          />
        )}
      </div>
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

/** مگامنوی دسته‌بندی — مثل قبل: ستون ریشه‌ها راست + گرید زیرشاخه‌ها */
function MegaMenu({
  tree,
  activeRoot,
  setActiveRoot,
  onNavigate,
}: {
  tree: Category[];
  activeRoot: number | null;
  setActiveRoot: (id: number | null) => void;
  onNavigate: () => void;
}) {
  const current = tree.find((c) => c.id === activeRoot) ?? tree[0];
  return (
    <div
      className="absolute start-0 top-full z-50 flex w-[720px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-popover shadow-xl"
      role="menu"
      aria-label="دسته‌بندی محصولات"
    >
      <ul className="w-52 shrink-0 border-e bg-secondary/30 p-2 text-sm">
        {tree.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              role="menuitem"
              onMouseEnter={() => setActiveRoot(c.id)}
              onFocus={() => setActiveRoot(c.id)}
              onClick={() => setActiveRoot(c.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-sm px-3 py-2 text-start hover:bg-accent',
                current?.id === c.id && 'bg-accent font-semibold text-accent-foreground',
              )}
            >
              <span className="line-clamp-1">{c.categoryName}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="grid max-h-96 flex-1 grid-cols-3 gap-x-4 gap-y-5 overflow-y-auto p-4">
        {current?.children?.map((l2) => (
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
        {current && !current.children?.length && (
          <p className="col-span-3 py-8 text-center text-sm text-muted-foreground">زیرشاخه‌ای برای این دسته ثبت نشده است.</p>
        )}
      </div>
    </div>
  );
}
