'use client';

/**
 * داشبورد عملیاتی مدیریت (فاز A5) — نمودارهای SVG سبک بدون کتابخانه:
 *  • کارت‌های آماری زنده (getStats — به‌روزرسانی خودکار هر ۶۰ ثانیه)
 *  • روند ۳۰ روزه ثبت‌نام/آگهی/درخواست (TrendAreaChart + سوییچ سری)
 *  • درآمد ۳۰ روزه نردبان/شارژ (RevenueBarsChart انباشته)
 *  • صف‌های انتظار با لینک مستقیم به صف‌ها (آگهی/درخواست/شارژ/احراز)
 *  • فید فعالیت اخیر: عملیات ادمین‌ها + ثبت‌نام‌های جدید (getRecentActivity)
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Activity,
  BadgeCheck,
  Boxes,
  ClipboardList,
  Coins,
  Hourglass,
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  Store,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  fetchAdminRecentActivity,
  fetchAdminStatsV2,
  type AdminTrendPoint,
} from '@/lib/admin/api';
import { TrendAreaChart, RevenueBarsChart, type ChartSeries } from '@/components/admin/charts';
import { toFa, timeAgoFa, priceFa } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function StatCard({
  label,
  value,
  Icon,
  tone,
  subs,
  href,
}: {
  label: string;
  value: string;
  Icon: typeof Users;
  tone: 'navy' | 'green' | 'amber' | 'sky' | 'rose' | 'violet';
  subs?: Array<{ text: string; value: string }>;
  /** لینک مستقیم — مثل کارت‌های صف انتظار */
  href?: string;
}) {
  const tones: Record<typeof tone, string> = {
    navy: 'bg-primary/10 text-primary',
    green: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    sky: 'bg-sky-500/10 text-sky-600',
    rose: 'bg-rose-500/10 text-rose-600',
    violet: 'bg-violet-500/10 text-violet-600',
  };
  const body = (
    <>
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
    </>
  );
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      {href ? (
        <Link href={href} className="block" title={`رفتن به ${label}`}>
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

/** سری‌های نمودار روند — با سوییچ روشن/خاموش */
const TREND_DEFS = [
  { key: 'registrations', label: 'ثبت‌نام', color: 'var(--primary)' },
  { key: 'products', label: 'آگهی', color: '#059669' },
  { key: 'buyRequests', label: 'درخواست خرید', color: '#0284c7' },
] as const;

export default function AdminDashboardPage() {
  const [trendOn, setTrendOn] = useState<Record<string, boolean>>({
    registrations: true,
    products: true,
    buyRequests: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats-v2'],
    queryFn: fetchAdminStatsV2,
    refetchInterval: 60_000,
  });

  const { data: activity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: fetchAdminRecentActivity,
    refetchInterval: 60_000,
  });

  const trends: AdminTrendPoint[] = data?.trends ?? [];
  const dates = trends.map((t) => t.date);
  const series: ChartSeries[] = TREND_DEFS
    .filter((d) => trendOn[d.key])
    .map((d) => ({
      key: d.key,
      label: d.label,
      color: d.color,
      values: trends.map((t) => t[d.key as keyof AdminTrendPoint] as number),
    }));

  const queues = data?.queues;
  const revenue = data?.revenue;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* سربرگ */}
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <LayoutDashboard size={18} />
        </span>
        <div>
          <h1 className="text-base font-extrabold">داشبورد مدیریت</h1>
          <p className="text-[11px] text-muted-foreground">نمای عملیاتی بازارگاه — به‌روزشونده خودکار</p>
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
              subs={[{ text: 'در انتظار', value: toFa(queues?.pendingBuyRequests ?? 0) }]}
            />
            <StatCard
              label="چت‌های کاربران"
              value={toFa(data.chatThreads)}
              Icon={MessageSquare}
              tone="violet"
              href="/admin/chats"
              subs={[
                { text: 'خوانده‌نشده', value: toFa(data.chats?.withUnread ?? 0) },
                { text: 'در انتظار پاسخ فروشنده', value: toFa(data.chats?.awaitingSellerReply ?? 0) },
                { text: 'پیام امروز', value: toFa(data.chats?.messagesToday ?? 0) },
              ]}
            />
            <StatCard
              label="تماس‌های امروز"
              value={toFa(data.calls?.today ?? 0)}
              Icon={PhoneCall}
              tone="sky"
              href="/admin/calls"
              subs={[
                { text: '۷ روز اخیر', value: toFa(data.calls?.last7Days ?? 0) },
                { text: 'کل', value: toFa(data.calls?.total ?? 0) },
              ]}
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
              value={toFa(queues?.ladderOrders ?? 0)}
              Icon={Store}
              tone="rose"
              subs={[{ text: 'تنها قابلیت تبلیغاتی ایمچ', value: '' }]}
            />
          </div>

          {/* نمودارها — روند فعالیت + درآمد */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-md bg-emerald-500/10 text-emerald-600">
                    <Activity size={16} />
                  </span>
                  <h2 className="text-sm font-bold">روند فعالیت — ۳۰ روز اخیر</h2>
                </div>
                {/* سوییچ سری‌ها */}
                <div className="flex flex-wrap gap-1.5">
                  {TREND_DEFS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setTrendOn((s) => ({ ...s, [d.key]: !s[d.key] }))}
                      className={cn(
                        'flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold transition-colors',
                        trendOn[d.key]
                          ? 'border-transparent text-white'
                          : 'border-input bg-card text-muted-foreground hover:bg-secondary/60',
                      )}
                      style={trendOn[d.key] ? { backgroundColor: d.color } : undefined}
                    >
                      {trendOn[d.key] ? (
                        <span className="size-2 rounded-full bg-white/80" />
                      ) : (
                        <span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                      )}
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {trends.length === 30 ? (
                <TrendAreaChart dates={dates} series={series} />
              ) : (
                <Skeleton className="h-48 w-full rounded-md" />
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                مجموع ۳۰ روز: {toFa(trends.reduce((s, t) => s + t.registrations, 0))} ثبت‌نام ·{' '}
                {toFa(trends.reduce((s, t) => s + t.products, 0))} آگهی ·{' '}
                {toFa(trends.reduce((s, t) => s + t.buyRequests, 0))} درخواست
              </p>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-md bg-amber-500/10 text-amber-600">
                    <TrendingUp size={16} />
                  </span>
                  <h2 className="text-sm font-bold">درآمد — ۳۰ روز اخیر (تومان)</h2>
                </div>
                <div className="flex gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-[#b07818]" /> نردبان
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-[#0284c7]" /> شارژ
                  </span>
                </div>
              </div>
              {trends.length === 30 ? (
                <RevenueBarsChart
                  dates={dates}
                  parts={[
                    { key: 'charge', label: 'شارژ', color: '#0284c7', values: trends.map((t) => t.chargeRevenue) },
                    { key: 'ladder', label: 'نردبان', color: '#b07818', values: trends.map((t) => t.ladderRevenue) },
                  ]}
                />
              ) : (
                <Skeleton className="h-48 w-full rounded-md" />
              )}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/60 pt-2 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">درآمد ۳۰ روزه نردبان</p>
                  <p className="text-[13px] font-extrabold tabular-nums text-[#b07818]">
                    {priceFa(revenue?.last30Days.ladder ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">درآمد ۳۰ روزه شارژ</p>
                  <p className="text-[13px] font-extrabold tabular-nums text-sky-600">
                    {priceFa(revenue?.last30Days.charge ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">کل نردبان (تاریخچه)</p>
                  <p className="text-[13px] font-extrabold tabular-nums">{priceFa(revenue?.ladderTotal ?? 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">کل شارژ (تاریخچه)</p>
                  <p className="text-[13px] font-extrabold tabular-nums">{priceFa(revenue?.chargeTotal ?? 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* صف‌های انتظار — کار روزمره ادمین با لینک مستقیم */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md bg-amber-500/10 text-amber-600">
                <Hourglass size={16} />
              </span>
              <h2 className="text-sm font-bold">صف‌های انتظار بررسی</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Link
                href="/admin/chats?filter=awaiting"
                className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 transition-colors hover:bg-rose-100"
              >
                <span className="flex items-center gap-2 text-[13px] text-rose-900">
                  <MessageSquare size={16} /> در انتظار پاسخ فروشنده
                </span>
                <span className="text-lg font-extrabold tabular-nums text-rose-700">
                  {toFa(data.chats?.awaitingSellerReply ?? 0)}
                </span>
              </Link>
              <Link
                href="/admin/products?status=pending"
                className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 transition-colors hover:bg-rose-100"
              >
                <span className="flex items-center gap-2 text-[13px] text-rose-900">
                  <Boxes size={16} /> آگهی در انتظار تأیید
                </span>
                <span className="text-lg font-extrabold tabular-nums text-rose-700">
                  {toFa(queues?.pendingProducts ?? 0)}
                </span>
              </Link>
              <Link
                href="/admin/buy-requests?status=pending"
                className="flex items-center justify-between rounded-md border border-violet-200 bg-violet-50 px-3 py-2.5 transition-colors hover:bg-violet-100"
              >
                <span className="flex items-center gap-2 text-[13px] text-violet-900">
                  <ClipboardList size={16} /> درخواست خرید در انتظار
                </span>
                <span className="text-lg font-extrabold tabular-nums text-violet-700">
                  {toFa(queues?.pendingBuyRequests ?? 0)}
                </span>
              </Link>
              <Link
                href="/admin/charges"
                className="flex items-center justify-between rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 transition-colors hover:bg-sky-100"
              >
                <span className="flex items-center gap-2 text-[13px] text-sky-900">
                  <Coins size={16} /> فیش شارژ در انتظار
                </span>
                <span className="text-lg font-extrabold tabular-nums text-sky-700">
                  {toFa(queues?.pendingCharges ?? 0)}
                </span>
              </Link>
              <Link
                href="/admin/verifications"
                className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 transition-colors hover:bg-amber-100"
              >
                <span className="flex items-center gap-2 text-[13px] text-amber-900">
                  <BadgeCheck size={16} /> احراز هویت در بررسی
                </span>
                <span className="text-lg font-extrabold tabular-nums text-amber-700">
                  {toFa(queues?.pendingVerifications ?? 0)}
                </span>
              </Link>
            </div>
          </div>

          {/* فعالیت اخیر — عملیات ادمین‌ها + ثبت‌نام‌ها */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">آخرین عملیات مدیران</h2>
                <Link href="/admin/logs" className="text-[11px] font-bold text-primary hover:underline">
                  همه لاگ‌ها ←
                </Link>
              </div>
              <ul className="space-y-2">
                {(activity?.recentActions ?? []).slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold" dir="ltr">
                        {a.action}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {a.admin.name}
                        {a.message ? ` — ${a.message}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                      {timeAgoFa(a.createdAt)}
                    </span>
                  </li>
                ))}
                {(activity?.recentActions ?? []).length === 0 && (
                  <li className="rounded-md border border-dashed p-4 text-center text-[12px] text-muted-foreground">
                    هنوز عملیاتی ثبت نشده است.
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">آخرین ثبت‌نام‌ها</h2>
                <Link href="/admin/users" className="text-[11px] font-bold text-primary hover:underline">
                  همه کاربران ←
                </Link>
              </div>
              <ul className="space-y-2">
                {(activity?.recentUsers ?? []).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-secondary/20 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <UserPlus size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold">
                          {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.userName || u.phone}
                        </p>
                        <p className="text-[11px] text-muted-foreground" dir="ltr">
                          {u.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {u.isSeller && (
                        <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">فروشنده</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{timeAgoFa(u.createdAt)}</span>
                    </div>
                  </li>
                ))}
                {(activity?.recentUsers ?? []).length === 0 && (
                  <li className="rounded-md border border-dashed p-4 text-center text-[12px] text-muted-foreground">
                    ثبت‌نامی در چند روز اخیر نبوده است.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
