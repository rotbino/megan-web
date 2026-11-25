'use client';

/**
 * هاب گزارشات (۲۵-۱۱ راند ۲) — تنها ورودیِ سایدبار: «گزارشات».
 * پنج گزارش؛ چهار کارت + یکی که روی خود آگهی‌ها زندگی می‌کند.
 * مینیمال: آیکون + عنوان + یک خط. نه توضیح اضافه.
 */

import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/shared/pascal-icons';
import { Compass, LineChart, PackageSearch, TrendingUp } from 'lucide-react';
import { PanelCard, PanelSectionTitle } from '@/components/panel/panel-parts';
import type { LucideIcon } from 'lucide-react';

interface ReportCard {
  href: string;
  icon: LucideIcon;
  title: string;
  line: string;
}

const CARDS: ReportCard[] = [
  {
    href: '/panel/reports/market',
    icon: TrendingUp,
    title: 'گزارش بازار صنف',
    line: 'قیمت‌های هفتگی صنف خودم؛ میانه، بازه، پلهٔ حجمی و شهر',
  },
  {
    href: '/panel/reports/advisor',
    icon: Compass,
    title: 'مشاور خرید',
    line: 'سبد خرید دوره‌ای من؛ کی بخرم، کجا ارزان‌تر است',
  },
  {
    href: '/panel/reports/opportunities',
    icon: PackageSearch,
    title: 'فرصت‌های فروش',
    line: 'کدام صنف تقاضا دارد و رقابتش کم است',
  },
  {
    href: '/panel/reports/price-index',
    icon: LineChart,
    title: 'شاخص قیمت ایمچ',
    line: 'تغییر هفتگی قیمت‌ها بر صنف‌های پرآگهی',
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-3">
      <PanelCard className="p-4 sm:p-5">
        <PanelSectionTitle title="گزارشات" />
        <div className="grid gap-2 sm:grid-cols-2">
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex items-center gap-3 rounded-md border p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <c.icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{c.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{c.line}</span>
              </span>
              <ArrowLeftIcon size={16} className="shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-0.5" />
            </Link>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          گزارش قیمت هر کالا جداگانه زیر آمار همان آگهی است.
        </p>
      </PanelCard>
    </div>
  );
}
