'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
 * نوار ناوبری پایین موبایل — عین باسکول:
 * ارتفاع ۵۹px، پس‌زمینه سفید، خط بالا #cbcbcb، سایه رو به بالا،
 * پنج آیتم هم‌عرض (آیکون ۲۴px + برچسب ۱۲px).
 * آیتم فعال: رنگ سرمه‌ای + وزن بولد.
 * ترتیب از راست به چپ — فروشنده: ایمچ من، پیام‌ها، ثبت محصول، خریداران، فروشندگان
 * خریدار (عین MHTML باسکول): ایمچ من، پیام‌ها، ثبت درخواست، پیشنهادی، فروشندگان
 */

const sellerItems = [
  { href: '/panel', label: 'ایمچ من', Icon: MyAccountIcon, match: (p: string) => p === '/panel' || (p.startsWith('/panel/') && !p.startsWith('/panel/buy-requests') && !p.startsWith('/panel/my-requests') && !p.startsWith('/panel/suggested-sellers')) },
  { href: '/panel/messages', label: 'پیام ها', Icon: MessagesIcon, match: (p: string) => p === '/panel/messages' },
  { href: '/panel/products/new', label: 'ثبت محصول', Icon: AddProductIcon, match: (p: string) => p === '/panel/products/new' },
  { href: '/buyAd-requests', label: 'خریداران', Icon: BuyersIcon, match: (p: string) => p === '/buyAd-requests' },
  { href: '/product-list', label: 'فروشندگان', Icon: SellersIcon, match: (p: string) => p === '/product-list' || p.startsWith('/product-list/') },
];

const buyerItems = [
  { href: '/panel', label: 'ایمچ من', Icon: MyAccountIcon, match: (p: string) => p === '/panel' || (p.startsWith('/panel/') && !p.startsWith('/panel/buy-requests') && !p.startsWith('/panel/my-requests') && !p.startsWith('/panel/suggested-sellers')) },
  { href: '/panel/messages', label: 'پیام ها', Icon: MessagesIcon, match: (p: string) => p === '/panel/messages' },
  { href: '/panel/buy-requests/new', label: 'ثبت درخواست', Icon: AddProductIcon, match: (p: string) => p === '/panel/buy-requests/new' },
  { href: '/panel/suggested-sellers', label: 'پیشنهادی', Icon: BuyersIcon, match: (p: string) => p === '/panel/suggested-sellers' || p === '/panel/my-requests' },
  { href: '/product-list', label: 'فروشندگان', Icon: SellersIcon, match: (p: string) => p === '/product-list' || p.startsWith('/product-list/') },
];

export function MobileBottomNav() {
  const pathname = usePathname() ?? '/';
  const { user } = useAuth();
  const items = user?.role === 'buyer' ? buyerItems : sellerItems;
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
