'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutDashboard, Package, PlusCircle, Store } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/shared/brand';

const NAV = [
  { href: '/panel', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/panel/products/new', label: 'ثبت محصول جدید', icon: PlusCircle },
  { href: '/product-list', label: 'مشاهده بازار', icon: Package },
  { href: '/buyAd-requests', label: 'درخواست‌های خرید', icon: BarChart3 },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <Header />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr] lg:px-6">
        <aside aria-label="منوی پنل" className="h-fit rounded-2xl border bg-card p-3 lg:sticky lg:top-28">
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-secondary/60 p-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary font-extrabold">م</span>
            <div className="min-w-0 text-xs">
              <p className="truncate font-extrabold">محمد رضا جعفری</p>
              <p className="text-muted-foreground">فروشنده ویژه</p>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
                    active ? 'bg-accent font-bold text-accent-foreground' : 'text-muted-foreground hover:bg-secondary',
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 rounded-xl bg-gradient-to-br from-primary to-emerald-700 p-4 text-primary-foreground">
            <Store size={18} />
            <p className="mt-2 text-xs font-bold leading-5">ارتقا به فروشنده ویژه</p>
            <p className="mt-1 text-[11px] leading-5 text-primary-foreground/80">آگهی‌های شما بالای لیست نمایش داده می‌شوند.</p>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}
