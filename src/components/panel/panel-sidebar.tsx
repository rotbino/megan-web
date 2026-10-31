'use client';

/**
 * سایدبار پنل — عین الگوی باسکول، دو منوی جدا برای فروشنده و خریدار:
 * هدر (برگر + لوگو) → پروفایل (تصویر/نام/نقش/شهر) → کیف پول → سوییچ فروشنده/خریدار → منو → خروج.
 * دسکتاپ: ستون ثابت سمت راست (max 250px) با حالت جمع‌شونده (آیکون‌ها).
 * موبایل: همان محتوا داخل دراور بازشو از راست.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  FileText,
  Handshake,
  Heart,
  HelpCircle,
  LifeBuoy,
  LogOut,
  Medal,
  Menu,
  MessageSquare,
  Package,
  Pencil,
  PlusSquare,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  BookOpenText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';
import { useAuth } from '@/lib/mock/auth';
import { useUnreadMessagesCount } from '@/lib/mock/hooks';
import { UnreadBadge } from '@/components/shared/unread-badge';
import type { PanelProfile } from '@/lib/types';

interface PanelNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  exact?: boolean;
}

/** منوی فروشنده — آیتم‌های فروش + صفحات مشترک (دفتر خرید فقط در پنل خریدار است) */
export const SELLER_NAV: PanelNavItem[] = [
  { href: '/panel', label: 'ایمچ من', icon: UserRound, exact: true },
  { href: '/panel/products/new', label: 'ثبت محصول', icon: PlusSquare, exact: true },
  { href: '/panel/products', label: 'محصولات من', icon: Package },
  { href: '/panel/buyers', label: 'خریداران', icon: Users },
  { href: '/panel/suggested-buyers', label: 'خریداران پیشنهادی', icon: BadgeCheck },
  { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
  { href: '/panel/favorites', label: 'علاقه‌مندی‌ها', icon: Heart },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare, exact: true },
  { href: '/panel/secure-deals', label: 'معاملات پرداخت امن', icon: Handshake },
  { href: '/panel/profile', label: 'پروفایل', icon: UserRound },
  { href: '/panel/profile/edit', label: 'ویرایش پروفایل', icon: Pencil },
  { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
  { href: '/panel/pricing', label: 'بسته‌های اشتراک', icon: TrendingUp },
  { href: '/help', label: 'راهنما', icon: HelpCircle },
  { href: '/panel/support', label: 'پشتیبانی', icon: LifeBuoy },
  { href: '/panel/survey', label: 'نظرسنجی', icon: ScrollText },
];

/** منوی خریدار — دفتر خرید بالاتر، درست زیر ایمچ من (خواسته مالک ۳۱-۱۰) */
export const BUYER_NAV: PanelNavItem[] = [
  { href: '/panel', label: 'ایمچ من', icon: UserRound, exact: true },
  { href: '/panel/buyer-book', label: 'دفتر خرید من', icon: BookOpenText },
  { href: '/panel/buy-requests/new', label: 'ثبت درخواست خرید', icon: ShoppingCart, exact: true },
  { href: '/panel/my-requests', label: 'درخواست های من', icon: FileText },
  { href: '/panel/suggested-sellers', label: 'پیشنهادی', icon: Sparkles },
  { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
  { href: '/panel/favorites', label: 'علاقه‌مندی‌ها', icon: Heart },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare, exact: true },
  { href: '/panel/secure-deals', label: 'معاملات پرداخت امن', icon: Handshake },
  { href: '/panel/profile', label: 'پروفایل', icon: UserRound },
  { href: '/panel/profile/edit', label: 'ویرایش پروفایل', icon: Pencil },
  { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
  { href: '/help', label: 'راهنما', icon: HelpCircle },
  { href: '/panel/support', label: 'پشتیبانی', icon: LifeBuoy },
  { href: '/panel/survey', label: 'نظرسنجی', icon: ScrollText },
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
  const { user, setRole, logout } = useAuth();
  const role = user?.role ?? 'seller';
  const nav = role === 'buyer' ? BUYER_NAV : SELLER_NAV;

  // بج پیام‌های خوانده‌نشده روی آیتم «پیام ها» — زنده با push WS
  const { data: unread } = useUnreadMessagesCount(Boolean(user));
  const unreadCount = unread?.count ?? 0;

  const fullName = profile ? `${profile.userInfo.firstName} ${profile.userInfo.lastName}` : 'کاربر ایمچ';
  const city = profile ? `${profile.userInfo.province} - ${profile.userInfo.city}` : '';
  const wallet = profile?.userInfo.walletBalance ?? 0;

  // فقط یک آیتم فعال: طولانی‌ترین مسیرِ منطبق برمی‌گرد (ثبت محصول در
  // /panel/products/new نباید «محصولات من» را هم روشن کند — باگ ۳۰-۱۰)
  const matchScore = (href: string, exact?: boolean) =>
    exact
      ? pathname === href
        ? href.length
        : -1
      : pathname === href || pathname.startsWith(`${href}/`)
        ? href.length
        : -1;
  const bestHref =
    nav.find((item) => nav.every((o) => matchScore(item.href, item.exact) >= matchScore(o.href, o.exact)))?.href ??
    null;

  return (
    <div className="flex h-full flex-col border-e border-border bg-card text-foreground">
      {/* هدر — برگر + لوگو */}
      <div className="flex h-[59px] shrink-0 items-center gap-3 border-b border-border px-4">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}
            className="grid size-8 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
        {/* پروفایل → صفحه اختصاصی پروفایل */}
        <Link
          href="/panel/profile"
          onClick={onNavigate}
          title="پروفایل"
          className={cn(
            'flex items-center gap-3 border-b border-border px-4 py-4 transition-colors hover:bg-secondary/60',
            collapsed && 'justify-center px-0',
          )}
        >
          {profile?.userInfo.avatarUrl ? (
            // آواتار واقعی — آپلودی از ویرایش پروفایل
            <img src={profile.userInfo.avatarUrl} alt="" className="grid size-11 shrink-0 place-items-center rounded-full object-cover" />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
              {profile ? profile.userInfo.firstName.charAt(0) : '؟'}
            </span>
          )}
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-bold">{fullName}</span>
                <span className="shrink-0 rounded-full bg-verified/10 px-1.5 py-0.5 text-[10px] font-bold text-verified">
                  {role === 'buyer' ? 'خریدار' : 'فروشنده'}
                </span>
              </span>
              <span className="block truncate text-xs text-muted-foreground">{city}</span>
            </span>
          )}
          {!collapsed && <ChevronLeft size={16} className="shrink-0 text-muted-foreground/60" />}
        </Link>

        {/* کیف پول */}
        <div className={cn('px-4 pt-4', collapsed && 'px-2')}>
          <Link
            href="/panel/wallet"
            onClick={onNavigate}
            className={cn(
              'flex w-full items-center gap-2 rounded-md border border-border px-3 py-2.5 text-start transition-colors hover:bg-secondary',
              collapsed && 'justify-center px-0',
            )}
            title="شارژ کیف پول"
          >
            <Wallet size={16} className="shrink-0 text-amber-400" />
            {!collapsed && (
              <span className="min-w-0 flex-1 text-xs">
                <span className="block text-muted-foreground">موجودی</span>
                <span className="block font-bold">
                  {toFa(wallet)} <span className="font-normal text-muted-foreground">تومان</span>
                </span>
              </span>
            )}
          </Link>
        </div>

        {/* سوییچ فروشنده / خریدار — درشت و تابلوتر (خواسته مالک): سمت فعال
            پررنگ/پرشده دیده می‌شود تا کاربر بفهمد کدام پنل را می‌بیند */}
        {!collapsed && (
          <div className="px-4 pt-3">
            <div
              className="flex rounded-lg border border-border bg-secondary p-1.5"
              role="radiogroup"
              aria-label="نوع حساب کاربری"
            >
              {(
                [
                  { key: 'seller', label: 'فروشنده' },
                  { key: 'buyer', label: 'خریدار' },
                ] as const
              ).map(({ key, label }) => {
                const active = role === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRole(key)}
                    className={cn(
                      'flex-1 rounded-md py-2 text-sm font-extrabold transition-all',
                      active
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:bg-card hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-center text-[10px] leading-4 text-muted-foreground">
              پنل {role === 'buyer' ? 'خریدار' : 'فروشنده'} ایمچ
            </p>
          </div>
        )}
        {collapsed && (
          <div className="flex flex-col gap-1 px-2 pt-3">
            {(
              [
                { key: 'seller', label: 'ف', title: 'پنل فروشنده' },
                { key: 'buyer', label: 'خ', title: 'پنل خریدار' },
              ] as const
            ).map(({ key, label, title }) => {
              const active = role === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={title}
                  aria-label={title}
                  onClick={() => setRole(key)}
                  className={cn(
                    'grid size-9 place-items-center rounded-md text-sm font-extrabold transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* منو — فقط یک آیتم فعال: طولانی‌ترین مسیرِ منطبق (باگ ۳۰-۱۰:
            ثبت محصول در /panel/products/new «محصولات من» را هم روشن می‌کرد) */}
        <nav aria-label="منوی پنل" className="mt-4 flex-1 space-y-0.5 px-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = bestHref === href;
            const showUnread = label === 'پیام ها';
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                title={label}
                className={cn(
                  'relative flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                  // مینیمال (خواسته مالک): بدون پس‌زمینه و بدون نوار رنگی — فقط فونت پررنگ
                  active
                    ? 'font-bold text-primary'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                <span className="relative">
                  <Icon size={19} className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground/70')} />
                  {showUnread && !collapsed && <UnreadBadge count={unreadCount} className="-top-1.5 -end-2" />}
                </span>
                {!collapsed && <span className="truncate">{label}</span>}
                {/* جمع‌شده: نقطه قرمز کوچک — جا برای عدد نیست */}
                {showUnread && collapsed && unreadCount > 0 && (
                  <span className="absolute end-2 top-1.5 size-2 rounded-full bg-primary" aria-hidden />
                )}
              </Link>
            );
          })}
        </nav>

        {/* خروج از حساب کاربری */}
        <div className={cn('mt-2 border-t border-border px-3 pt-2', collapsed && 'px-2')}>
          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate?.();
            }}
            title="خروج از حساب کاربری"
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-red-300 transition-colors hover:bg-red-400/10 hover:text-red-200',
              collapsed && 'justify-center px-0',
            )}
          >
            <LogOut size={19} className="shrink-0" />
            {!collapsed && <span className="truncate">خروج از حساب کاربری</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
