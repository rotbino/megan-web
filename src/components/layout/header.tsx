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
  MyAccountIcon,
  SearchIconBuskool,
  SellersIcon,
} from '@/components/shared/buskool-icons';
import { useAuth } from '@/lib/mock/auth';
import { useCategoryTree, useSuggestions, useUnreadMessagesCount } from '@/lib/mock/hooks';
import { searchPath } from '@/lib/popular-searches';
import { UnreadBadge } from '@/components/shared/unread-badge';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

/**
 * هدر ایمچ (v9):
 * ردیف ۱ (هدر اصلی): [گروه راست: لوگو |۱۶px| جستجو (flex)] ⟵ فاصله آزاد ⟵ [نوار کاربر]
 *         جستجو داخل یک گروه flex-1 نشسته و با gap ثابت ۱۶px (nav-desktop:gap-4)
 *         به لوگو چسبیده است — هرچه صفحه پهن‌تر شود جستجو فقط پهن‌تر می‌شود و
 *         از لوگو دور نمی‌افتد (باگ justify-between نسخه قبل همین بود).
 *         نوار کاربر (خریداران/فروشندگان، پیام‌ها، پروفایل) با shrink-0 و
 *         پدینگ ۲۴px هدر (px-6) به منتهی‌الیه چپ می‌چسبد و وسط نمی‌ماند.
 *         باکس جستجو تپل‌تر (h-12) بدون بکگراند، فقط بوردر طوسی کمرنگ
 *         (خواسته مالک — بار سوم!) + دکمه آبی تمام‌ارتفاع در انتهای چپ.
 * ردیف ۲ (نوار زیر هدر — فقط دسکتاپ): [دسته بندی (مگامنو) | فروشنده شوید] — هم‌تراز با px-6
 *         با اسکرول به داخل صفحه جمع می‌شود (فضای بیشتری برای محتوا) و با
 *         اسکرول به سمت بالا دوباره باز می‌شود (خواسته مالک ۱-۱۱ — در همه صفحات).
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
  const [barHidden, setBarHidden] = useState(false);
  const searchWrap = useRef<HTMLDivElement>(null);
  const megaWrap = useRef<HTMLDivElement>(null);

  // ─── نوار زیر هدر: با اسکرول به پایین جمع، با اسکرول به بالا باز ───
  // جهش‌های ریز (کمتر از ۴px) نادیده گرفته می‌شوند؛ بالای صفحه همیشه باز است.
  // مگامنوی باز هم همراهِ جمع‌شدن نوار بسته می‌شود (بدون افکت — همان رویداد).
  useEffect(() => {
    let raf = 0;
    let lastY = window.scrollY;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const dy = y - lastY;
        lastY = y;
        if (y <= 64) {
          setBarHidden(false);
          return;
        }
        if (dy > 4) {
          setBarHidden(true);
          setMegaOpen(false);
        } else if (dy < -4) {
          setBarHidden(false);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const isSeller = user?.role === 'seller';

  // بج پیام‌های خوانده‌نشده — کنار آیکون پیام‌ها (کاربر واردشده)
  const { data: unread } = useUnreadMessagesCount(Boolean(user));
  const unreadCount = unread?.count ?? 0;

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
    // جستجو به مسیر سئو-پسند می‌رود — کلمات اضافه (عمده/خرید/شهر…) همان‌جا
    // حذف می‌شوند تا کاربر مستقیم به صفحه یکتای همان کالا برسد و نتیجه پُر باشد:
    // «خرید سیب زمینی عمده در تهران» → /product-list/search/سیب زمینی
    router.push(searchPath(value));
  };

  const closeMega = () => {
    setMegaOpen(false);
    setActiveRoot(null);
  };

  const openMega = () => {
    setBarHidden(false);
    setMegaOpen(true);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card shadow-[0_2px_12px_rgba(35,38,43,0.08)]">
      {/* ─── ردیف ۱ — هدر اصلی ──
          گروه راست (لوگو + جستجو) flex-1 است؛ یعنی فضای اضافه همیشه داخل گروه
          می‌ماند و جستجو هرگز از لوگو جدا نمی‌شود. نوار کاربر shrink-0 است و
          چون گروه راست تمام فضای آزاد را می‌بلعد، به منتهی‌الیه چپ (۲۴px = px-6)
          می‌چسبد. */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 nav-desktop:gap-4 nav-desktop:px-6 nav-desktop:py-3">
        {/* گروه راست — لوگو + جستجو؛ جستجو با ۱۶px به لوگو چسبیده */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 nav-desktop:gap-4">
          <Link href="/" aria-label="ایمچ — صفحه اصلی" className="shrink-0">
            <BrandLogo size="sm" className="h-7" />
          </Link>

          {/* جستجوی دسکتاپ — تپل (h-12)، بدون بکگراند، بوردر طوسی کمرنگ؛
              چسبیده به لوگو (۱۶px) و کشسان تا خود نوار کاربر (مثل باسکول) */}
          <div ref={searchWrap}  className="relative hidden min-w-0 flex-1 nav-desktop:block nav-desktop:max-w-[500px]">
            <form
                onSubmit={(e) => { e.preventDefault(); submit(); }}
                className="flex h-12 items-stretch overflow-hidden rounded border border-input bg-transparent transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10"
                role="search"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                placeholder="به دنبال چه محصولی هستید؟"
                className="min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-muted-foreground"
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

          {/* نوار جستجوی موبایل — چیپ خاکستری ملایم + همه ایران */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            role="search"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-secondary px-2 nav-desktop:hidden"
          >
            {/* ذره‌بین سمت چپِ اینپوت — متن فارسی از راست شروع می‌شود و
                زیر آیکون نمی‌رود (خواسته مالک ۲-۱۱) */}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی محصول"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="جستجوی محصول"
            />
            <button type="submit" aria-label="جستجو" className="shrink-0 text-muted-foreground">
              <SearchIconBuskool size={24} />
            </button>
            <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
            <button
              type="button"
              title="فیلتر مکان"
              aria-label="فیلتر مکان: همه ایران"
              className="flex shrink-0 items-center gap-2 text-secondary-foreground"
            >
              <span className="whitespace-nowrap text-sm font-medium">همه ایران</span>
              <LocationIconBuskool size={20} className="text-muted-foreground" />
            </button>
          </form>
        </div>

        {/* نوار کاربر — منتهی‌الیه چپ؛ گروه راست flex-1 است پس این نوار به لبه
            چپ می‌چسبد (فقط ۲۴px پدینگ هدر) و وسط هدر معلق نمی‌ماند */}
        <nav className="hidden shrink-0 items-center nav-desktop:flex" aria-label="حساب کاربری">
          {user ? (
            <>
              {/* فروشنده → خریداران پنل (سورت امتیاز تطابق — خواسته مالک ۴-۱۱) /
                  خریدار → فروشندگان پیشنهادی */}
              <Link
                href={isSeller ? '/panel/buyers' : '/panel/suggested-sellers'}
                className="flex min-w-20 flex-col items-center rounded-md px-2.5 py-1 text-sm text-secondary-foreground hover:bg-accent hover:text-foreground"
              >
                {isSeller ? <BuyersIcon size={24} /> : <SellersIcon size={24} />}
                <span className="mt-1">{isSeller ? 'خریداران' : 'فروشندگان'}</span>
              </Link>
              <span className="mx-1 h-9 w-px bg-border" aria-hidden />
              {/* آیکون پیام‌ها — فقط برای کاربر واردشده؛ بج خوانده‌نشده با push WS زنده می‌ماند */}
              <Link
                href="/panel/messages"
                aria-label={unreadCount > 0 ? `پیام‌ها — ${unreadCount} پیام خوانده‌نشده` : 'پیام‌ها'}
                title="پیام‌ها"
                className="flex min-w-20 flex-col items-center rounded-md px-2.5 py-1 text-sm text-secondary-foreground hover:bg-accent hover:text-foreground"
              >
                <span className="relative">
                  <MessagesIcon size={24} />
                  <UnreadBadge count={unreadCount} />
                </span>
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
                className="flex min-w-20 flex-col items-center rounded-md px-2.5 py-1 text-sm text-secondary-foreground hover:bg-accent hover:text-foreground"
              >
                <SellersIcon size={24} />
                <span className="mt-1">فروشندگان</span>
              </Link>
              <span className="mx-1 h-9 w-px bg-border" aria-hidden />
              <Link
                href="/buyers"
                className="flex min-w-20 flex-col items-center rounded-md px-2.5 py-1 text-sm text-secondary-foreground hover:bg-accent hover:text-foreground"
              >
                <BuyersIcon size={24} />
                <span className="mt-1">خریداران</span>
              </Link>
              <span className="mx-1 h-9 w-px bg-border" aria-hidden />
              <Link
                href="/register"
                className="flex min-w-20 flex-col items-center rounded-md px-2.5 py-1 text-sm text-secondary-foreground hover:bg-accent hover:text-foreground"
              >
                {/* نقطه ورود = نارنجی ثابت (خواسته مالک ۲-۱۱ دور دوازدهم) — مثل
                    طلاییِ فروشنده ویژه از رنگ برند کاربر پیروی نمی‌کند تا در هر تمی
                    دیده شود؛ آدمک داخل دایره هم‌خانوادهٔ باقی آیکون‌های نوار است */}
                <MyAccountIcon size={24} className="text-orange-500" />
                <span className="mt-1">ورود / ثبت نام</span>
              </Link>
            </>
          )}
        </nav>

        {/* آواتار کاربر در هدر موبایل — در جای خودش، بعد از جستجو */}
        <HeaderUserMenu variant="mobile" />
      </div>

      {/* ─── ردیف ۲ — نوار زیر هدر (دسکتاپ): دسته بندی | فروشنده شوید ──
          با اسکرول به داخل صفحه جمع می‌شود (grid-rows 1fr→0fr + محو تدریجی)
          تا فضای بیشتری برای محتوا باز شود؛ با اسکرول به بالا برمی‌گردد. */}
      <div
        className={cn(
          'hidden nav-desktop:grid nav-desktop:transition-[grid-template-rows,opacity] nav-desktop:duration-300 nav-desktop:ease-in-out',
          barHidden
            ? 'nav-desktop:grid-rows-[0fr] nav-desktop:opacity-0'
            : 'nav-desktop:grid-rows-[1fr] nav-desktop:opacity-100',
        )}
      >
        <div className="nav-desktop:min-h-0 nav-desktop:overflow-hidden">
          <div
            ref={megaWrap}
            onMouseLeave={() => setMegaOpen(false)}
            inert={barHidden ? true : undefined}
            className="relative hidden items-center gap-2.5 border-t border-border/60 nav-desktop:flex nav-desktop:gap-3 nav-desktop:px-6"
          >
            <button
              type="button"
              onClick={openMega}
              onMouseEnter={openMega}
              aria-expanded={megaOpen}
              aria-haspopup="true"
              aria-label="باز کردن دسته‌بندی‌ها"
              className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <LayoutGrid size={17} className="text-primary" />
              دسته بندی
              <ChevronDown size={14} className={cn('transition-transform', megaOpen && 'rotate-180')} />
            </button>

            <span className="h-5 w-px shrink-0 bg-border" aria-hidden />

            {/* CTA بازاریابی — رنگ تمایز (آبی زندهٔ ثابت، نه رنگ برند کاربر) */}
            <Link
              href={user ? '/panel/products/new' : '/register'}
              className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-md px-2.5 text-sm font-bold text-emphasis transition-colors hover:bg-emphasis-soft hover:text-emphasis-deep"
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
        </div>
      </div>
    </header>
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
