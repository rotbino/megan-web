'use client';

/**
 * منوی کاربر هدر — بعد از ورود، جای «ورود/ثبت‌نام» را می‌گیرد:
 * [آواتار] [نام و نام خانوادگی] [آیکون دراپ‌داون] → کانتکست منوی نقش‌محور.
 *
 * دسکتاپ: دکمه کامل (آواتار+نام+فلش) + دراپ‌داون.
 * موبایل: فقط آواتار در انتهای هدر؛ همان منو به‌صورت پنل تمام‌عرض زیر هدر.
 *
 * محتوای منو با نقش فعال (فروشنده/خریدار) عوض می‌شود — سیستم با نقش
 * کاربر تطبیق پیدا می‌کند (خواسته مالک):
 *   فروشنده: ایمچ من | محصولات من، ثبت محصول، ویرایش پروفایل | راهنما
 *   خریدار:  ایمچ من | درخواست‌های خرید من، ثبت درخواست خرید، ویرایش پروفایل | راهنما
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  FileText,
  HelpCircle,
  LogOut,
  Package,
  Pencil,
  PlusSquare,
  ShoppingCart,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/mock/auth';

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

interface MenuSection {
  items: MenuItem[];
  separatorAfter?: boolean;
}

/** منوی فروشنده — عین لیست مالک */
const SELLER_SECTIONS: MenuSection[] = [
  { items: [{ href: '/panel', label: 'ایمچ من', icon: UserRound }], separatorAfter: true },
  {
    items: [
      { href: '/panel/products', label: 'محصولات من', icon: Package },
      { href: '/panel/products/new', label: 'ثبت محصول', icon: PlusSquare },
      { href: '/panel/profile/edit', label: 'ویرایش پروفایل', icon: Pencil },
    ],
    separatorAfter: true,
  },
  { items: [{ href: '/help', label: 'راهنما', icon: HelpCircle }], separatorAfter: true },
];

/** منوی خریدار — جایگزین‌های نقش‌محور */
const BUYER_SECTIONS: MenuSection[] = [
  { items: [{ href: '/panel', label: 'ایمچ من', icon: UserRound }], separatorAfter: true },
  {
    items: [
      { href: '/panel/my-requests', label: 'درخواست های خرید من', icon: FileText },
      { href: '/panel/buy-requests/new', label: 'ثبت درخواست خرید', icon: ShoppingCart },
      { href: '/panel/profile/edit', label: 'ویرایش پروفایل', icon: Pencil },
    ],
    separatorAfter: true,
  },
  { items: [{ href: '/help', label: 'راهنما', icon: HelpCircle }], separatorAfter: true },
];

export function HeaderUserMenu({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!user) return null;

  const isSeller = user.role === 'seller';
  const sections = isSeller ? SELLER_SECTIONS : BUYER_SECTIONS;
  const displayName =
    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'کاربر ایمچ';
  const initial = (user.firstName || user.lastName || 'ک').charAt(0);

  const avatar = user.avatarUrl ? (
    // آواتار واقعی — آپلودی از ویرایش پروفایل (uploads/uploadImage)
    <img src={user.avatarUrl} alt="" className="size-full rounded-full object-cover" />
  ) : (
    <span className="grid size-full place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {initial}
    </span>
  );

  return (
    <div ref={wrapRef} className="relative">
      {/* دکمه — دسکتاپ: آواتار+نام+فلش / موبایل: فقط آواتار */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`منوی کاربر ${displayName}`}
        className={cn(
          'flex items-center gap-2 rounded-xl text-foreground transition-colors hover:bg-accent',
          variant === 'desktop'
            ? 'max-w-56 py-1 pe-2.5 ps-1.5'
            : 'p-1 nav-desktop:hidden',
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden">{avatar}</span>
        {variant === 'desktop' && (
          <>
            <span className="min-w-0 max-w-32 truncate text-sm font-medium leading-tight">{displayName}</span>
            <ChevronDown
              size={15}
              className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          </>
        )}
      </button>

      {/* کانتکست منو */}
      {open && (
        <div
          role="menu"
          aria-label="منوی حساب کاربری"
          className={cn(
            'absolute top-full z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover py-1.5 shadow-xl',
            variant === 'desktop' ? 'end-0 w-60' : 'end-0 w-64 max-w-[calc(100vw-1.5rem)]',
          )}
        >
          {sections.map((section, si) => (
            <div key={si}>
              {section.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Icon size={17} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
              {section.separatorAfter && <div className="my-1 h-px bg-border/70" aria-hidden />}
            </div>
          ))}
          {/* خروج — تنها راه خروج از صفحات عمومی */}
          <div className="my-1 h-px bg-border/70" aria-hidden />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-start text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={17} className="shrink-0" />
            <span className="truncate">خروج از حساب کاربری</span>
          </button>
        </div>
      )}
    </div>
  );
}
