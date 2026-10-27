'use client';

/**
 * گزارش تماس‌های کاربران (فاز A6) — «کی به کی زنگ زده».
 *
 * سنجه سلامت بازار lead-gen: خریدار شماره فروشنده را می‌بیند و بیرون سایت
 * زنگ می‌زند؛ تنها سیگنال قابل ثبتِ وب همان لحظه آشکارسازی شماره است که
 * خودکار ثبت می‌شود. جدول تازه‌ترین‌ها بالا + آمار (امروز/۷روز/۳۰روز/
 * تماس‌گیرندگان یکتا) + جستجو و بازه.
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PhoneCall,
  Search,
  User,
} from 'lucide-react';
import { fetchAdminCallReport, type AdminCallRow } from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

type RangeKey = 'all' | 'today' | 'd7' | 'd30';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'امروز' },
  { key: 'd7', label: '۷ روز' },
  { key: 'd30', label: '۳۰ روز' },
  { key: 'all', label: 'همه' },
];

const SOURCE_LABELS: Record<string, string> = {
  product: 'صفحه آگهی',
  profile: 'پروفایل',
  chat: 'چت',
};

const PER_PAGE = 20;

export default function AdminCallsPage() {
  const [range, setRange] = useState<RangeKey>('today');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim() || undefined);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-calls', range, q, page],
    queryFn: () => fetchAdminCallReport({ range, search: q, page, perPage: PER_PAGE }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];
  const stats = data?.stats;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PER_PAGE));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <PhoneCall size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">گزارش تماس‌های کاربران</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} تماس در بازه انتخابی` : 'کی به کی زنگ زده'}
            </p>
          </div>
        </div>
        {isFetching && !isLoading ? <Loader2 size={15} className="animate-spin text-muted-foreground" /> : null}
      </div>

      {/* آمار — همیشه کل (فیلتر صفحه روی شمارنده‌ها اثر ندارد) */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="تماس امروز" value={stats?.today} tone="primary" />
        <StatCard label="۷ روز اخیر" value={stats?.last7Days} />
        <StatCard label="کل تماس‌ها" value={stats?.total} />
        <StatCard label="تماس‌گیرندگان یکتا" value={stats?.uniqueCallers} tone="amber" />
      </div>

      {/* بازه + جستجو */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                setRange(r.key);
                setPage(1);
              }}
              className={cn(
                'h-9 rounded-[10px] border px-3.5 text-[12px] font-bold transition-colors',
                range === r.key
                  ? 'border-primary-line bg-primary-soft text-primary'
                  : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="relative ms-auto w-full sm:w-64">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="نام / موبایل طرف‌ها…"
            className="h-9 rounded-[10px] pe-9 text-[12.5px]"
          />
        </div>
      </div>

      {/* جدول تماس‌ها */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <PhoneCall size={28} className="opacity-40" />
          <p className="text-sm">تماسی در این بازه ثبت نشده است.</p>
          <p className="max-w-xs text-[11px] leading-5">
            هر بار که خریداری شماره فروشنده را در سایت می‌بیند، همان لحظه ثبت می‌شود.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          {/* هدر جدول — دسکتاپ */}
          <div className="hidden grid-cols-[1fr_auto_1fr_auto] items-center gap-3 border-b bg-secondary/30 px-4 py-2.5 text-[11px] font-bold text-muted-foreground md:grid">
            <span>تماس‌گیرنده (خریدار)</span>
            <span className="w-16 text-center">→</span>
            <span>دریافت‌کننده (فروشنده)</span>
            <span className="w-28 text-end">زمان</span>
          </div>
          <ul className="divide-y divide-border/70">
            {items.map((c) => (
              <CallRow key={c.id} c={c} />
            ))}
          </ul>
        </div>
      )}

      {/* صفحه‌بندی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronRight size={14} />
            قبلی
          </Button>
          <span className="text-[12px] font-bold tabular-nums text-muted-foreground">
            صفحه {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            بعدی
            <ChevronLeft size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

/** کارت آمار */
function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value?: number;
  tone?: 'default' | 'primary' | 'amber';
}) {
  return (
    <div className="rounded-lg border bg-card px-3.5 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-extrabold tabular-nums',
          tone === 'primary' && 'text-primary',
          tone === 'amber' && 'text-amber-600',
        )}
      >
        {value == null ? '—' : toFa(value)}
      </p>
    </div>
  );
}

/** ردیف تماس — تماس‌گیرنده → دریافت‌کننده + زمینه + زمان */
function CallRow({ c }: { c: AdminCallRow }) {
  return (
    <li className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-center md:gap-3">
      <UserCell user={c.caller} label="تماس‌گیرنده" />
      <span className="hidden w-16 text-center text-muted-foreground md:block" aria-hidden>
        ←
      </span>
      {/* موبایل: فلش و جهت خوانش */}
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground md:hidden">
        تماس به <span aria-hidden>←</span>
      </span>
      <UserCell user={c.callee} label="دریافت‌کننده" highlight />
      <div className="flex items-center justify-between gap-2 md:w-28 md:flex-col md:items-end md:justify-center md:gap-0.5">
        <RelativeTime date={c.createdAt} />
        {c.product ? (
          <span className="max-w-40 truncate text-[10px] text-muted-foreground" title={`زمینه: ${c.product.name} (${SOURCE_LABELS[c.source] ?? c.source})`}>
            {SOURCE_LABELS[c.source] ?? c.source} · {c.product.name}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{SOURCE_LABELS[c.source] ?? c.source}</span>
        )}
      </div>
    </li>
  );
}

/** سلول کاربر — نام + موبایل (کلیک = تماس) */
function UserCell({
  user,
  label,
  highlight = false,
}: {
  user: { id: string; displayName: string; phone: string; isVerified: boolean; isActive: boolean };
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-md',
          highlight ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground',
        )}
      >
        <User size={15} />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {label}
          {user.isVerified && <BadgeCheck size={10} className="text-verified" />}
          {!user.isActive && (
            <span className="rounded-full bg-rose-500/10 px-1.5 text-[9px] text-rose-600">غیرفعال</span>
          )}
        </p>
        <p className="truncate text-[12.5px] font-bold">{user.displayName}</p>
        <a href={`tel:${user.phone}`} dir="ltr" className="font-mono text-[11px] text-primary hover:underline">
          {user.phone}
        </a>
      </div>
    </div>
  );
}
