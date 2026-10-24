'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronDown,
  LayoutGrid,
  LogIn,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Store,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCategoryTree, useSuggestions } from '@/lib/mock/hooks';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

export function Header() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeRoot, setActiveRoot] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
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
    setMobileOpen(false);
    router.push(`/product-list?s=${encodeURIComponent(value)}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-6">
        {/* موبایل: منو */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="باز کردن منو">
          <Menu />
        </Button>

        <Link href="/" aria-label="مِگان — صفحه اصلی" className="shrink-0">
          <BrandLogo />
        </Link>

        {/* جستجو */}
        <div ref={searchWrap} className="relative hidden flex-1 md:block">
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="relative"
            role="search"
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="به دنبال چه محصول عمده‌ای هستید؟ مثلا: پسته"
              className="h-11 rounded-xl bg-secondary/70 pe-4 ps-11 text-sm"
              aria-label="جستجوی محصول"
            />
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          </form>

          {focused && (q.trim().length >= 2) && (
            <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover shadow-lg">
              {suggestions.length > 0 ? (
                <ul className="max-h-72 overflow-y-auto p-1 text-sm">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => submit(s)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start hover:bg-accent"
                      >
                        <Search size={14} className="text-muted-foreground" />
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">نتیجه‌ای یافت نشد؛ کلید واژه دیگری امتحان کنید.</p>
              )}
            </div>
          )}
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="حساب کاربری">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/buyAd-requests">
              <ShoppingCart size={16} />
              درخواست‌های خرید
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/register">
              <LogIn size={16} />
              ورود / ثبت‌نام
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-2 rounded-xl">
            <Link href="/panel">
              <Store size={16} />
              پنل فروشنده
            </Link>
          </Button>
        </nav>
      </div>

      {/* ردیف دوم — دسته‌بندی‌ها */}
      <div className="hidden border-t bg-card/60 lg:block">
        <div className="mx-auto flex h-11 max-w-7xl items-center gap-2 px-6 text-sm">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMegaOpen((v) => !v)}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMegaOpen(false); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-primary hover:bg-accent"
              aria-expanded={megaOpen}
              aria-haspopup="true"
            >
              <LayoutGrid size={15} />
              دسته‌بندی‌ها
              <ChevronDown size={14} className={cn('transition-transform', megaOpen && 'rotate-180')} />
            </button>
            {megaOpen && <MegaMenu tree={tree} activeRoot={activeRoot} setActiveRoot={setActiveRoot} onNavigate={() => setMegaOpen(false)} />}
          </div>
          <span className="h-4 w-px bg-border" aria-hidden />
          <Link href="/product-list" className="rounded-lg px-2 py-1 hover:text-primary">همه محصولات</Link>
          <Link href="/product-list/category/پسته" className="rounded-lg px-2 py-1 hover:text-primary">قیمت پسته</Link>
          <Link href="/product-list/category/خرما" className="rounded-lg px-2 py-1 hover:text-primary">خرید خرما</Link>
          <Link href="/product-list/category/زعفران" className="rounded-lg px-2 py-1 hover:text-primary">قیمت زعفران</Link>
          <Link href="/product-list/category/برنج" className="rounded-lg px-2 py-1 hover:text-primary">برنج عمده</Link>
        </div>
      </div>

      {/* موبایل: کشوی منو */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-y-0 start-0 flex h-full w-[85vw] max-w-sm flex-col bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <BrandLogo size="sm" />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="بستن منو"><X /></Button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="relative mb-4">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی محصول عمده…" className="pe-4 ps-10" />
              <Search className="absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
            </form>
            <nav className="flex flex-col gap-1 text-sm font-medium">
              <Link href="/product-list" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent"><Package size={16} /> همه محصولات</Link>
              <Link href="/buyAd-requests" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent"><ShoppingCart size={16} /> درخواست‌های خرید</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent"><LogIn size={16} /> ورود / ثبت‌نام</Link>
              <Link href="/panel" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent"><Store size={16} /> پنل فروشنده</Link>
              <p className="mt-4 px-3 text-xs font-bold text-muted-foreground">دسته‌بندی‌های اصلی</p>
              {tree.map((c) => (
                <Link
                  key={c.id}
                  href={`/product-list/category/${c.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {c.categoryName}
                  <ChevronLeft size={14} />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

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
    <div className="absolute start-0 top-full z-50 mt-1 flex w-[720px] overflow-hidden rounded-xl border bg-popover shadow-xl" tabIndex={-1}>
      {/* ستون دسته‌های اصلی */}
      <ul className="w-52 shrink-0 border-e bg-secondary/30 p-2 text-sm">
        {tree.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onMouseEnter={() => setActiveRoot(c.id)}
              onFocus={() => setActiveRoot(c.id)}
              onClick={() => setActiveRoot(c.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-start hover:bg-accent',
                current?.id === c.id && 'bg-accent font-semibold text-accent-foreground',
              )}
            >
              <span className="line-clamp-1">{c.categoryName}</span>
              <ChevronLeft size={14} className="shrink-0 opacity-50" />
            </button>
          </li>
        ))}
      </ul>
      {/* زیرشاخه‌ها */}
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
