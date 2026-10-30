'use client';

/**
 * قطعات مشترک صفحات پنل — کارت سفید، سرصفحه بخش، حالت خالی
 * و کارت‌های ارتقا (عین باسکول: ارتقا عضویت / احراز هویت / ربات بازاریابی / کیف پول).
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Bookmark,
  Coins,
  Package,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PanelCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5', className)}>
      {children}
    </section>
  );
}

export function PanelSectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-base font-extrabold sm:text-lg">{title}</h1>
      {action}
    </div>
  );
}

export function PanelEmptyState({
  icon: Icon,
  title,
  hint,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  hint: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-secondary text-muted-foreground">
        <Icon size={30} />
      </span>
      <p className="mt-4 text-sm font-bold">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">{hint}</p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-5 rounded-md">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && !actionHref && onAction && (
        <Button className="mt-5 rounded-md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** ردیف کارت‌های ارتقا — بالای صفحات پنل (الگوی باسکول): بسته اشتراک / احراز هویت / شارژ */
export function PanelPromoCards({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 lg:hidden" aria-label="پیشنهادهای پنل">
        <PromoCard
          icon={TrendingUp}
          title="بسته‌های اشتراک"
          hint="ثبت نامحدود + دسترسی به خریداران"
          href="/panel/pricing"
          tone="amber"
          compact
        />
        <PromoCard
          icon={ShieldCheck}
          title="احراز هویت"
          hint="برای خریداران فروشنده مطمئن‌تری باشید"
          href="/panel/verification"
          tone="sky"
          compact
        />
        <PromoCard
          icon={Coins}
          title="شارژ کیف پول"
          hint="پکیج‌های شارژ با جایزه"
          href="/panel/wallet"
          tone="emerald"
          compact
        />
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <PromoCard
        icon={TrendingUp}
        title="با بسته اشتراک، محصول نامحدود ثبت کنید و همه خریداران را ببینید."
        hint="از ۱۹۹ هزار تومان در ماه — نشان فروشنده ویژه، ثبت نامحدود محصول و دسترسی کامل به خریداران."
        href="/panel/pricing"
        tone="amber"
        action="بسته‌های اشتراک"
      />
      <PromoCard
        icon={BadgeCheck}
        title="گام بعدی تا یک پروفایل حرفه‌ای مطمئن، احراز هویت است."
        hint="برای جلب اعتماد بیشتر خریداران در معاملات، همین حالا احراز هویت کنید."
        href="/panel/verification"
        tone="sky"
        action="احراز هویت"
      />
      <PromoCard
        icon={Coins}
        title="شارژ کیف پول خود را افزایش دهید."
        hint="پکیج‌های شارژ کارت به کارت با تا ۲۰٪ جایزه؛ هزینه نردبان از همین کیف پول کسر می‌شود."
        href="/panel/wallet"
        tone="emerald"
        action="شارژ کیف پول"
      />
    </div>
  );
}

function PromoCard({
  icon: Icon,
  title,
  hint,
  href,
  action,
  tone,
  compact,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  hint: string;
  href: string;
  action?: string;
  tone: 'amber' | 'sky' | 'emerald';
  compact?: boolean;
}) {
  const tones = {
    amber: 'bg-amber-50 text-amber-600 border-amber-200/70',
    sky: 'bg-sky-50 text-sky-600 border-sky-200/70',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/70',
  } as const;

  if (compact) {
    return (
      <Link
        href={href}
        className="flex w-44 shrink-0 flex-col gap-1 rounded-lg border bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <span className={cn('grid size-8 place-items-center rounded-md border', tones[tone])}>
          <Icon size={16} />
        </span>
        <span className="text-xs font-bold">{title}</span>
        <span className="text-[11px] leading-4 text-muted-foreground">{hint}</span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <span className={cn('grid size-10 place-items-center rounded-md border', tones[tone])}>
        <Icon size={19} />
      </span>
      <p className="mt-3 text-sm font-bold leading-6">{title}</p>
      <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      <Button asChild size="sm" className="mt-4 w-fit rounded-md">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

/** آمار میان‌بر داشبورد */
export function QuickStat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{value}</span>
        <span className="block text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

export const QUICK_ICONS = { Bookmark, Package, Users, Coins, Smartphone };
