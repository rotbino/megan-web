'use client';

/**
 * سایدبار پنل — خلوت (خواسته مالک ۲-۱۱ دور شانزدهم):
 * هدر (برگر + لوگوی کامل ایمچ) → کیف پول (هر دو نقش — جای باکس نام/شهرِ حذف‌شده
 * نشسته؛ نام و شهر توی هدر دسکتاپ و صفحهٔ آیمچ من هست، اینجا تکرار بود) →
 * سوییچر «پنل فروش/پنل خرید» با رادیو → منوی کوتاه با «آیمچ من» اول از همه.
 * فروشنده ۷ آیتم دارد، خریدار ۷ آیتم (خواسته مالک ۶-۱۱: «پیشنهادات تامین»
 * به تب سوم صفحهٔ خریداران رفت). بقیهٔ لینک‌های حساب در صفحهٔ «آیمچ من»
 * (AccountLinks) زندگی می‌کنند.
 * دسکتاپ: ستون ثابت سمت راست (max 250px) با حالت جمع‌شونده (آیکون‌ها).
 * موبایل: سایدبار فقط دسکتاپ است — ناوبری موبایل از منوی درون‌صفحهٔ آیمچ من
 * و نوار پایین اپ انجام می‌شود (برگر حذف شد — دور ۱۶).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bookmark,
  BookMarked,
  FileText,
  Medal,
  MessageSquare,
  Package,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';
import { useAuth } from '@/lib/mock/auth';
import { useMyPackage, useUnreadMessagesCount } from '@/lib/mock/hooks';
import { UnreadBadge } from '@/components/shared/unread-badge';
import { RoleSwitcher } from '@/components/panel/role-switcher';
import type { PanelProfile } from '@/lib/types';

interface PanelNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  exact?: boolean;
}

/** منوی فروشنده — ۷ آیتم؛ دور ۱۶: «آیمچ من» اول از همه (هر دو پنل).
 *  دور ۱۹+ (خواسته مالک ۴-۱۱): «خریداران پیشنهادی» حذف شد — تطبیق حالا داخل
 *  صفحهٔ «خریداران» است. خواسته مالک ۶-۱۱: «پیشنهادات تامین» هم حذف شد —
 *  همان لیست تب سوم «پیشنهادات ارسال شده» صفحهٔ خریداران شد؛ منو خلوت‌تر
 *  و هر چیز در جای گویاتر خودش. */
export const SELLER_NAV: PanelNavItem[] = [
  { href: '/panel', label: 'آیمچ من', icon: UserRound, exact: true },
  { href: '/panel/products', label: 'محصولات من', icon: Package },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare, exact: true },
  { href: '/panel/buyers', label: 'خریداران', icon: Users },
  { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
  { href: '/panel/pricing', label: 'ارتقا عضویت', icon: Medal },
  { href: '/panel/sell-leads', label: 'سرنخ‌های فروش', icon: Bookmark },
];

/** منوی خریدار — ۶ آیتم؛ «کاتالوگ های ذخیره شده» (خواسته مالک ۱۰-۱۱):
 *  دفترچهٔ تلفن کاتالوگ‌هایی که کاربر ذخیره کرده — از هر کاتالوگ می‌شود
 *  مستقیم تماس/چت گرفت. دور ۲۸: «احراز هویت» حذف شد؛ «دفتر خرید من»
 *  تب «درخواست‌های خرید دوره‌ای» است. دور ۱۶: «آیمچ من» اول از همه */
export const BUYER_NAV: PanelNavItem[] = [
  { href: '/panel', label: 'آیمچ من', icon: UserRound, exact: true },
  { href: '/panel/my-requests', label: 'درخواست های خرید من', icon: FileText },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare, exact: true },
  { href: '/panel/suggested-sellers', label: 'فروشندگان پیشنهادی', icon: Sparkles },
  { href: '/panel/saved-catalogs', label: 'کاتالوگ های ذخیره شده', icon: BookMarked },
  { href: '/panel/saved', label: 'سرنخ‌های خرید', icon: Bookmark },
];

export function PanelSidebar({
  profile,
  collapsed,
  onToggleCollapse,
}: {
  profile: PanelProfile | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname() ?? '';
  const { user, setRole } = useAuth();
  const role = user?.role ?? 'seller';

  // ارتقا عضویت فقط برای بی‌بسته‌ها (خواسته مالک دور ۱۵) — وضعیت بسته از
  // همان کش react-query خوانده می‌شود؛ سایدبار و ایمچ من همیشه هم‌گام‌اند
  const { data: myPackage } = useMyPackage(Boolean(user));
  const nav = (role === 'buyer' ? BUYER_NAV : SELLER_NAV).filter(
    (item) => item.href !== '/panel/pricing' || !myPackage?.isActive,
  );

  // بج پیام‌های خوانده‌نشده روی آیتم «پیام ها» — زنده با push WS
  const { data: unread } = useUnreadMessagesCount(Boolean(user));
  const unreadCount = unread?.count ?? 0;

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
      {/* هدر — برگر + لوگوی کامل ایمچ (خواسته مالک دور ۱۶: به‌جای نشان
          مختصر، وردمارک کامل) */}
      <div className="flex h-[59px] shrink-0 items-center gap-3 border-b border-border px-4">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'باز کردن منو' : 'جمع کردن منو'}
            className="grid size-8 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 5.5h18M3 12h18M3 18.5h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {!collapsed && (
          <Link href="/" className="flex items-center" aria-label="رفتن به سایت ایمچ">
            {/* وردمارک کامل ایمچ (logo2) — نشانهٔ برند، دسکتاپ */}
            <img src="/logo2.svg" alt="ایمچ" width={96} height={38} className="h-[27px] w-auto" />
          </Link>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
        {/* کیف پول — بالای سایدبار، هر دو نقش (دور ۱۶): باکس نام/شهر حذف شد
            (تکرار بود — توی هدر دسکتاپ و آیمچ من هست) و همین کارت جایش نشست؛
            کارت ساده با سایهٔ ظریف (دور ۱۵: «رنگی نکن، فقط یکم سایه») */}
        <div className={cn('px-4 pt-4', collapsed && 'px-2')}>
          <Link
            href="/panel/wallet"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg border border-border bg-card p-3 text-start shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-md',
              collapsed && 'justify-center p-2',
            )}
            title="شارژ کیف پول"
          >
            <Wallet size={19} className="shrink-0 text-primary" />
            {!collapsed && (
              <span className="min-w-0 flex-1 text-xs">
                <span className="block text-muted-foreground">موجودی کیف پول</span>
                <span className="block text-sm font-extrabold font-num text-foreground">
                  {toFa(wallet)} <span className="text-[10px] font-normal text-muted-foreground">تومان</span>
                </span>
              </span>
            )}
          </Link>
        </div>

        {/* سوییچر «پنل فروش / پنل خرید» با رادیو (دور ۱۶) — جملهٔ «نوع حساب
            شما … است» حذف شد؛ دکمهٔ فعال خودش گویاست. سوییچ = بازگشت به
            آیمچ من (setRole داخل auth — دور ۱۵) */}
        {!collapsed && <RoleSwitcher className="mx-4 mt-3" />}
        {collapsed && (
          <div className="flex flex-col gap-1 px-2 pt-3">
            {(
              [
                { key: 'seller', label: 'ف', title: 'پنل فروش' },
                { key: 'buyer', label: 'خ', title: 'پنل خرید' },
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
                  onClick={() => {
                    setRole(key);
                  }}
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
