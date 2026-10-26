'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/mock/auth';
import {
  AddProductIcon,
  BuyersIcon,
  MessagesIcon,
  MyAccountIcon,
  SellersIcon,
} from '@/components/shared/buskool-icons';

/**
 * نوار ناوبری پایین موبایل (فوتر اپ‌گونه) — نقش‌محور (خواسته مالک):
 * ارتفاع ۵۹px، پس‌زمینه سفید، خط بالا #cbcbcb، سایه رو به بالا،
 * پنج آیتم هم‌عرض (آیکون ۲۴px + برچسب ۱۲px). آیتم فعال: سرمه‌ای + بولد.
 *
 * ترتیب از راست به چپ (مثل دیجی‌کالا — بازار لبه راست، ایمچ من لبه چپ):
 *   فروشنده: بازار، خریداران (پیشنهادی با امتیاز تطابق)، ثبت محصول، پیام‌ها، ایمچ من
 *   خریدار:  بازار، فروشندگان (پیشنهادی با امتیاز تطابق)، ثبت درخواست، پیام‌ها، ایمچ من
 *   لاگین‌نشده: بازار، خریداران، فروشندگان — هر دو لینک، بدون پیام‌ها
 *
 * «بازار» = لیست محصولات (نام قبلی: فروشندگان) — خواناتر (خواسته مالک).
 */

type IconType = React.ComponentType<{ size?: number; className?: string }>;

interface NavItem {
  href: string;
  label: string;
  Icon: IconType;
  match: (p: string) => boolean;
}

const isMarket = (p: string) => p === '/product-list' || p.startsWith('/product-list/');
const isMessages = (p: string) => p === '/panel/messages' || p.startsWith('/panel/messages/');
const isSuggestedBuyers = (p: string) => p.startsWith('/panel/suggested-buyers');
const isSuggestedSellers = (p: string) => p.startsWith('/panel/suggested-sellers');

/** ایمچ من = /panel + صفحات پنلی که آیتم اختصاصی ندارند (fallback) */
const isMyAimach = (p: string) =>
  p === '/panel' ||
  (p.startsWith('/panel/') &&
    !isSuggestedBuyers(p) &&
    !isSuggestedSellers(p) &&
    !p.startsWith('/panel/products/new') &&
    !p.startsWith('/panel/buy-requests/new') &&
    !isMessages(p));

/** منوی فروشنده */
const sellerItems: NavItem[] = [
  { href: '/product-list', label: 'بازار', Icon: Store, match: isMarket },
  // خریداران پیشنهادی با امتیاز تطابق — و صفحه عمومی درخواست‌های خرید
  {
    href: '/panel/suggested-buyers',
    label: 'خریداران',
    Icon: BuyersIcon,
    match: (p) => isSuggestedBuyers(p) || p === '/buyAd-requests' || p.startsWith('/buyAd-requests/'),
  },
  { href: '/panel/products/new', label: 'ثبت محصول', Icon: AddProductIcon, match: (p) => p === '/panel/products/new' },
  { href: '/panel/messages', label: 'پیام ها', Icon: MessagesIcon, match: isMessages },
  { href: '/panel', label: 'ایمچ من', Icon: MyAccountIcon, match: isMyAimach },
];

/** منوی خریدار — جایگزین‌های نقش‌محور */
const buyerItems: NavItem[] = [
  { href: '/product-list', label: 'بازار', Icon: Store, match: isMarket },
  // فروشندگان پیشنهادی با امتیاز تطابق
  { href: '/panel/suggested-sellers', label: 'فروشندگان', Icon: SellersIcon, match: isSuggestedSellers },
  { href: '/panel/buy-requests/new', label: 'ثبت درخواست', Icon: AddProductIcon, match: (p) => p === '/panel/buy-requests/new' },
  { href: '/panel/messages', label: 'پیام ها', Icon: MessagesIcon, match: isMessages },
  { href: '/panel', label: 'ایمچ من', Icon: MyAccountIcon, match: isMyAimach },
];

/** لاگین‌نشده — هر دو لینک خریداران و فروشندگان، بدون پیام‌ها (خواسته مالک) */
const loggedOutItems: NavItem[] = [
  { href: '/product-list', label: 'بازار', Icon: Store, match: isMarket },
  { href: '/buyAd-requests', label: 'خریداران', Icon: BuyersIcon, match: (p) => p === '/buyAd-requests' || p.startsWith('/buyAd-requests/') },
  { href: '/panel/suggested-sellers', label: 'فروشندگان', Icon: SellersIcon, match: () => false },
  { href: '/panel/products/new', label: 'ثبت محصول', Icon: AddProductIcon, match: () => false },
  { href: '/panel', label: 'ایمچ من', Icon: MyAccountIcon, match: () => false },
];

export function MobileBottomNav() {
  const pathname = usePathname() ?? '/';
  const { user } = useAuth();
  // پنل ادمین پوسته و ناوبری خودش را دارد — نوار پایین اپ عمومی آنجا نیست
  if (pathname.startsWith('/admin')) return null;
  const items = !user ? loggedOutItems : user.role === 'buyer' ? buyerItems : sellerItems;
  return (
    <nav
      aria-label="ناوبری موبایل ایمچ"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-[#cbcbcb] bg-white shadow-[0_-4px_8px_rgba(115,115,115,0.1)]"
    >
      <div className="flex h-[58px] pe-2">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-[58px] flex-1 flex-col items-center justify-center gap-0 px-0 pb-1 pt-[2px]',
                active ? 'font-bold text-primary' : 'font-normal text-[#757575]',
              )}
            >
              <Icon size={24} className="shrink-0" />
              <span className={cn('mt-0.5 text-[12px] leading-none', active && 'font-bold')}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
