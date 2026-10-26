'use client';

/**
 * داشبورد مدیریت — کارت‌های آماری زنده از /admin/dashboard/getStats
 * (به‌روزرسانی خودکار هر ۶۰ ثانیه). صف‌های انتظار (احراز/شارژ/نردبان) با
 * رنگ هشدار — کار ادمین از همین‌جا شروع می‌شود.
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  Coins,
  Hourglass,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { fetchAdminStats } from '@/lib/admin/api';
import { toFa } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function StatCard({
  label,
  value,
  Icon,
  tone,
  subs,
}: {
  label: string;
  value: string;
  Icon: typeof Users;
  tone: 'navy' | 'green' | 'amber' | 'sky' | 'rose' | 'violet';
  subs?: Array<{ text: string; value: string }>;
}) {
  const tones: Record<typeof tone, string> = {
    navy: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    sky: 'bg-sky-500/10 text-sky-600',
    rose: 'bg-rose-500/10 text-rose-600',
    violet: 'bg-violet-500/10 text-violet-600',
  };
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-md', tones[tone])}>
          <Icon size={20} />
        </span>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-extrabold tabular-nums">{value}</p>
      {subs && subs.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-2">
          {subs.map((s) => (
            <p key={s.text} className="text-[11px] leading-5 text-muted-foreground">
              {s.text}: <span className="font-bold tabular-nums text-foreground/80">{s.value}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    refetchInterval: 60_000,
  });

  const queues = data?.queues;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* سربرگ */}
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <LayoutDashboard size={18} />
        </span>
        <div>
          <h1 className="text-base font-extrabold">داشبورد مدیریت</h1>
          <p className="text-[11px] text-muted-foreground">نمای کلی بازارگاه — به‌روزشونده خودکار</p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* کارت‌های آماری */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="کاربران"
              value={toFa(data.users.total)}
              Icon={Users}
              tone="navy"
              subs={[
                { text: 'فروشنده', value: toFa(data.users.sellers) },
                { text: 'احرازشده', value: toFa(data.users.verified) },
              ]}
            />
            <StatCard
              label="آگهی‌های فروش"
              value={toFa(data.products.total)}
              Icon={Boxes}
              tone="green"
              subs={[
                { text: 'تأییدشده', value: toFa(data.products.confirmed) },
                { text: 'در انتظار', value: toFa(data.products.pending) },
                { text: 'ردشده', value: toFa(data.products.rejected) },
              ]}
            />
            <StatCard
              label="درخواست‌های خرید"
              value={toFa(data.buyRequests)}
              Icon={ClipboardList}
              tone="sky"
            />
            <StatCard
              label="مکالمات چت"
              value={toFa(data.chatThreads)}
              Icon={MessageSquare}
              tone="violet"
            />
            <StatCard
              label="گردش کیف پول (تومان)"
              value={toFa(data.wallet.totalBalance.toLocaleString('en-US'))}
              Icon={Coins}
              tone="amber"
              subs={[{ text: 'مجموع مانده کیف‌های کاربران', value: '' }]}
            />
            <StatCard
              label="سفارش‌های نردبان"
              value={toFa(data.queues.ladderOrders)}
              Icon={Store}
              tone="rose"
              subs={[{ text: 'تنها قابلیت تبلیغاتی ایمچ', value: '' }]}
            />
          </div>

          {/* صف‌های انتظار — کار روزمره ادمین */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md bg-amber-500/10 text-amber-600">
                <Hourglass size={16} />
              </span>
              <h2 className="text-sm font-bold">صف‌های انتظار بررسی</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[13px] text-amber-900">
                  <BadgeCheck size={16} /> احراز هویت کاربران
                </span>
                <span className="text-lg font-extrabold tabular-nums text-amber-700">
                  {toFa(queues?.pendingVerifications ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[13px] text-sky-900">
                  <Coins size={16} /> شارژ کیف پول
                </span>
                <span className="text-lg font-extrabold tabular-nums text-sky-700">
                  {toFa(queues?.pendingCharges ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[13px] text-rose-900">
                  <Boxes size={16} /> آگهی‌های در انتظار تأیید
                </span>
                <Link
                  href="/admin/products?status=pending"
                  className="text-lg font-extrabold tabular-nums text-rose-700 hover:underline"
                >
                  {toFa(data.products.pending)}
                </Link>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              بازبینی آگهی‌ها و درخواست‌های خرید از فاز A4 فعال است — صف احراز و
              شارژ در جزئیات هر کاربر (فاز A3).
            </p>
          </div>

          {/* یادآوری فازهای بعد */}
          <div className="rounded-lg border border-dashed bg-card/60 p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck size={16} />
              </span>
              <h2 className="text-sm font-bold">نقشه تکمیل پنل مدیریت</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 text-[12px] leading-6 text-muted-foreground sm:grid-cols-2">
              <p>
                <span className="ms-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground/70">A2</span>{' '}
                مدیریت اطلاعات پایه — دسته‌بندی‌ها و مکان‌ها
              </p>
              <p>
                <span className="ms-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground/70">A3</span>{' '}
                مدیریت کاربران — جستجو، غیرفعال‌سازی، احراز، کیف پول
              </p>
              <p>
                <span className="ms-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">A4 ✓</span>{' '}
                مدیریت آگهی‌ها و درخواست‌ها — تأیید، رد، نردبان (فعال)
              </p>
              <p>
                <span className="ms-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground/70">A5</span>{' '}
                لاگ عملیات، ادمین‌ها و نمودارهای روند
              </p>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              نقشه کامل:{' '}
              <Link
                href="https://github.com/rotbino/megan-back/blob/main/docs/ADMIN-IMPLEMENTATION.md"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                docs/ADMIN-IMPLEMENTATION.md
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
