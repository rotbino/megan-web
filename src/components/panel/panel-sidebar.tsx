'use client';

/**
 * سایدبار پنل — عین باسکول (خواسته مالک ۲-۱۱ دور سیزدهم و چهاردهم):
 * هدر (برگر + لوگو) → پروفایل (تصویر/نام/نقش/شهر) → کیف پول (کارت برجسته — فقط
 * فروشنده؛ باسکول خریدار کیف پول ندارد) → سوییچ فروشنده/خریدار → منوی کوتاه.
 * فروشنده فقط ۹ آیتم دارد (دقیقاً منوی باسکول). خریدار ۸ آیتم دارد (۷ آیتم باسکول
 * + «دفتر خرید من» تمایز ما) — «پیشنهادهای تامین» و «ارتقا عضویت» خریدار به
 * صفحه ایمچ من رفتند (آیتم‌های خارج از سایدبار در باسکول من زندگی می‌کنند).
 * بقیه (تراکنش‌ها/ویرایش پروفایل/پرداخت امن/راهنما/پشتیبانی/نظرسنجی/خروج)
 * در صفحهٔ «ایمچ من» (AccountLinks) زندگی می‌کنند — مثل باسکول من.
 * دسکتاپ: ستون ثابت سمت راست (max 250px) با حالت جمع‌شونده (آیکون‌ها).
 * موبایل: همان محتوا داخل دراور بازشو از راست (صفحه ایمچ من خودش هم منوی
 * کامل دارد — الگوی menu-list باسکول).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  BookOpenText,
  Bookmark,
  ChevronLeft,
  FileText,
  Medal,
  Menu,
  MessageSquare,
  Package,
  PlusSquare,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRound,
  Users,
  Wallet,
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

/** منوی فروشنده — ۹ آیتم، ترتیب و برچسب عین باسکول (ارتقا عضویت نه «بسته‌های اشتراک») */
export const SELLER_NAV: PanelNavItem[] = [
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

/** منوی خریدار — ۸ آیتم: دقیقاً منوی باسکول (۷ آیتم) + «دفتر خرید من» (تمایز ما
 *  با باسکول، خواسته مالک ۳۱-۱۰). «پیشنهادهای تامین» و «ارتقا عضویت» از سایدبار
 *  حذف شدند و در صفحه ایمچ من زندگی می‌کنند (دور چهاردهم — باسکول برای خریدار
 *  نه کیف پول دارد نه ارتقا عضویت در سایدبار) */
export const BUYER_NAV: PanelNavItem[] = [
  { href: '/panel', label: 'ایمچ من', icon: UserRound, exact: true },
  { href: '/panel/buyer-book', label: 'دفتر خرید من', icon: BookOpenText },
  { href: '/panel/buy-requests/new', label: 'ثبت درخواست خرید', icon: ShoppingCart, exact: true },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare, exact: true },
  { href: '/panel/suggested-sellers', label: 'فروشندگان پیشنهادی', icon: Sparkles },
  { href: '/panel/my-requests', label: 'درخواست های من', icon: FileText },
  { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
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
  const { user, setRole } = useAuth();
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

        {/* کیف پول — کارت برجسته با فونت بولد (خواسته مالک دور چهاردهم:
            «روی باکس کیف پول یه کم جلوه بده، فونتش هم حداقل بولد»). الگوی
            wallet-main باسکول: کارت رنگی گرد با متن سفید. فقط فروشنده —
            باسکول برای خریدار کیف پول در سایدبار ندارد؛ خریدار از
            «تاریخچه تراکنش‌ها» در ایمچ من به کیف پول می‌رسد */}
        {role !== 'buyer' && (
          <div className={cn('px-4 pt-4', collapsed && 'px-2')}>
            <Link
              href="/panel/wallet"
              onClick={onNavigate}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl bg-primary p-3 text-start text-primary-foreground transition-all hover:opacity-90 hover:shadow-md',
                collapsed && 'justify-center p-2',
              )}
              title="شارژ کیف پول"
            >
              <Wallet size={19} className="shrink-0" />
              {!collapsed && (
                <span className="min-w-0 flex-1 text-xs">
                  <span className="block opacity-80">موجودی</span>
                  <span className="block text-sm font-extrabold font-num">
                    {toFa(wallet)} <span className="text-[10px] font-normal opacity-80">تومان</span>
                  </span>
                </span>
              )}
            </Link>
          </div>
        )}

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
      </div>
    </div>
  );
}
