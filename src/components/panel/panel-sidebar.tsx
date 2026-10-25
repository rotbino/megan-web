'use client';

/**
 * سایدبار پنل فروشنده — ساختار عین باسکول:
 * هدر (برگر + لوگو) → پروفایل (تصویر/نام/شهر) → کیف پول → سوییچ فروشنده/خریدار → منوی ۹ آیتم.
 * دسکتاپ: ستون ثابت سمت راست (max 250px) با حالت جمع‌شونده (آیکون‌ها).
 * موبایل: همان محتوا داخل دراور بازشو از راست.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  Menu,
  Medal,
  MessageSquare,
  Package,
  PlusSquare,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';
import type { PanelProfile } from '@/lib/types';

interface PanelNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  exact?: boolean;
}

export const PANEL_NAV: PanelNavItem[] = [
  { href: '/panel', label: 'ایمچ من', icon: UserRound, exact: true },
  { href: '/panel/products/new', label: 'ثبت محصول', icon: PlusSquare, exact: true },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare, exact: true },
  { href: '/panel/buyers', label: 'خریداران', icon: Users },
  { href: '/panel/suggested-buyers', label: 'خریداران پیشنهادی', icon: BadgeCheck },
  { href: '/panel/products', label: 'محصولات من', icon: Package },
  { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
  { href: '/panel/pricing', label: 'ارتقا عضویت', icon: Medal },
  { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
];

export function PanelSidebar({
  profile,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  profile: PanelProfile | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? '';
  const [mode, setMode] = useState<'seller' | 'buyer'>('seller');

  const fullName = profile ? `${profile.userInfo.firstName} ${profile.userInfo.lastName}` : 'کاربر ایمچ';
  const city = profile ? `${profile.userInfo.province} - ${profile.userInfo.city}` : '';
  const wallet = profile?.userInfo.walletBalance ?? 0;

  return (
    <div className="flex h-full flex-col bg-primary-deep text-white">
      {/* هدر — برگر + لوگو */}
      <div className="flex h-[59px] shrink-0 items-center gap-3 border-b border-white/10 px-4">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}
            className="grid size-8 place-items-center rounded-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Menu size={18} />
          </button>
        )}
        {!collapsed && (
          <Link href="/" className="flex items-center" onClick={onNavigate}>
            {/* لوگوی SVG برند */}
            <img src="/logo-short.svg" alt="ایمچ" width={86} height={30} className="h-[26px] w-auto" />
          </Link>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
        {/* پروفایل */}
        <Link
          href="/panel"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 border-b border-white/10 px-4 py-4 transition-colors hover:bg-white/5',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-extrabold">
            {profile ? profile.userInfo.firstName.charAt(0) : '؟'}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{fullName}</span>
              <span className="block truncate text-xs text-white/60">{city}</span>
            </span>
          )}
          {!collapsed && <ChevronLeft size={16} className="shrink-0 text-white/50" />}
        </Link>

        {/* کیف پول */}
        <div className={cn('px-4 pt-4', collapsed && 'px-2')}>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-md bg-white/10 px-3 py-2.5 text-start transition-colors hover:bg-white/15',
              collapsed && 'justify-center px-0',
            )}
            title="شارژ کیف پول"
          >
            <Wallet size={16} className="shrink-0 text-amber-400" />
            {!collapsed && (
              <span className="min-w-0 flex-1 text-xs">
                <span className="block text-white/70">موجودی</span>
                <span className="block font-bold">
                  {toFa(wallet)} <span className="font-normal text-white/70">تومان</span>
                </span>
              </span>
            )}
          </button>
        </div>

        {/* سوییچ فروشنده / خریدار */}
        {!collapsed && (
          <div className="px-4 pt-3">
            <div className="flex rounded-md bg-white/10 p-1 text-xs" role="radiogroup" aria-label="نوع حساب کاربری">
              {(
                [
                  { key: 'seller', label: 'فروشنده' },
                  { key: 'buyer', label: 'خریدار' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={mode === key}
                  onClick={() => setMode(key)}
                  className={cn(
                    'flex-1 rounded-sm py-1.5 font-bold transition-colors',
                    mode === key ? 'bg-white text-primary-deep' : 'text-white/70 hover:text-white',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* منو */}
        <nav aria-label="منوی پنل" className="mt-4 flex-1 space-y-0.5 px-3">
          {PANEL_NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                title={label}
                className={cn(
                  'relative flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                  active
                    ? 'bg-white/10 font-bold text-white before:absolute before:inset-y-1.5 before:right-0 before:w-[3px] before:rounded-full before:bg-white'
                    : 'text-white/75 hover:bg-white/5 hover:text-white',
                  collapsed && 'justify-center px-0',
                )}
              >
                <Icon size={19} className={cn('shrink-0', active ? 'text-amber-400' : 'text-white/70')} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
