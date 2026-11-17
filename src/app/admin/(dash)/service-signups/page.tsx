'use client';

/**
 * ثبت‌نام سرویس‌های تخصصی (پنل ادمین) — خروجی فرم /services (بازطراحی ۱۷-۱۱):
 *
 * چه کسانی (کاربر + موبایل)، با چه نقشی (خریدار/فروشنده/هر دو)، چه صنعفی
 * و نام کسب‌وکاری برای میدان‌یار / خرید از کارخانه / پخشیار / همخرید
 * ثبت‌نام کرده‌اند + لینک کاتالوگ هر کاربر + آمار تفکیکی سرویس و نقش —
 * سیگنال «کدام طرح را اول اجرا کنیم». فقط خواندن؛ دادهٔ علاقه‌مندی حذف نمی‌شود.
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Factory,
  Search,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import { fetchAdminServiceSignupList, type AdminServiceSignupRow } from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const SERVICE_META: Record<
  string,
  { label: string; icon: typeof Store; cls: string }
> = {
  'maidan-yar': { label: 'میدان‌یار', icon: Sprout, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'factory-buy': { label: 'خرید از کارخانه', icon: Factory, cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  pakhshyar: { label: 'پخشیار', icon: Truck, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  hamkharid: { label: 'همخرید', icon: Users, cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: 'همه' },
  { key: 'maidan-yar', label: 'میدان‌یار' },
  { key: 'factory-buy', label: 'خرید از کارخانه' },
  { key: 'pakhshyar', label: 'پخشیار' },
  { key: 'hamkharid', label: 'همخرید' },
];

const ROLE_META: Record<AdminServiceSignupRow['role'], { label: string; cls: string }> = {
  buyer: { label: 'خریدار', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  seller: { label: 'فروشنده', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  both: { label: 'خریدار و فروشنده', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const svcOf = (id: string) =>
  SERVICE_META[id] ?? { label: id, icon: ClipboardList, cls: 'bg-secondary text-secondary-foreground' };

const PER_PAGE = 20;

function initials(row: AdminServiceSignupRow): string {
  const n = `${row.user.firstName ?? ''} ${row.user.lastName ?? ''}`.trim();
  return n ? n.charAt(0) : '؟';
}

export default function AdminServiceSignupsPage() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState<string | undefined>(undefined);
  const [service, setService] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim() || undefined);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-service-signups', q, service, page],
    queryFn: () =>
      fetchAdminServiceSignupList({
        search: q,
        serviceId: service || undefined,
        page,
        perPage: PER_PAGE,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];
  const stats = data?.stats;
  const pageCount = data?.pageCount ?? 1;
  /** شمار هر سرویس برای نمایش روی فیلترها */
  const countOf = (id: string) =>
    stats?.byService.find((s) => s.serviceId === id)?.count ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold">
            <Sparkles size={19} className="text-primary" />
            ثبت‌نام سرویس‌های تخصصی
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            علاقه‌مندان طرح‌های میدان‌یار، خرید از کارخانه، پخشیار و همخرید — خروجی فرم /services
          </p>
        </div>
        {stats && (
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.total)}</p>
              <p className="text-muted-foreground">کل ثبت‌نام</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="flex items-center justify-center gap-1 text-base font-extrabold">
                <ShoppingBasket size={13} className="text-emerald-600" />
                {toFa(stats.byRole.buyer + stats.byRole.both)}
              </p>
              <p className="text-muted-foreground">خریداران</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="flex items-center justify-center gap-1 text-base font-extrabold">
                <Store size={13} className="text-sky-600" />
                {toFa(stats.byRole.seller + stats.byRole.both)}
              </p>
              <p className="text-muted-foreground">فروشندگان</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.last7Days)}</p>
              <p className="text-muted-foreground">۷ روز اخیر</p>
            </div>
          </div>
        )}
      </div>

      {/* فیلترها — شمار ثبت‌نام هر طرح روی خود فیلتر */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: نام، موبایل، صنف یا نام کسب‌وکار…"
            className="pe-9 text-sm"
          />
        </div>
        <div className="flex overflow-hidden rounded-md border text-xs">
          {FILTERS.map(({ key, label }) => {
            const count = key ? countOf(key) : stats?.total;
            return (
              <button
                key={key || 'all'}
                type="button"
                onClick={() => {
                  setService(key);
                  setPage(1);
                }}
                className={cn(
                  'px-3 py-2 font-medium transition-colors',
                  service === key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent',
                )}
              >
                {label}
                {typeof count === 'number' && count > 0 ? (
                  <span className={cn('ms-1', service === key ? 'text-primary-foreground/80' : 'text-foreground/60')}>
                    ({toFa(count)})
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* جدول */}
      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-2 p-14 text-center text-sm text-muted-foreground">
            <Sparkles size={30} className="text-muted-foreground/50" />
            هنوز ثبت‌نامی انجام نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-start font-medium">ثبت‌نام‌کننده</th>
                  <th className="px-4 py-2.5 text-start font-medium">سرویس</th>
                  <th className="px-4 py-2.5 text-start font-medium">نقش</th>
                  <th className="px-4 py-2.5 text-start font-medium">صنف</th>
                  <th className="px-4 py-2.5 text-start font-medium">نام کسب‌وکار</th>
                  <th className="px-4 py-2.5 text-start font-medium">کاتالوگ</th>
                  <th className="px-4 py-2.5 text-start font-medium">زمان ثبت‌نام</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const meta = svcOf(row.serviceId);
                  const SvcIcon = meta.icon;
                  const role = ROLE_META[row.role] ?? ROLE_META.seller;
                  const catalogPath = `/c/${row.user.catalogId || row.user.userName}`;
                  return (
                    <tr key={row.id} className={cn('border-b last:border-0', isFetching && 'opacity-60')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {row.user.avatarUrl ? (
                            <img src={row.user.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                              {initials(row)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-bold">
                              {`${row.user.firstName ?? ''} ${row.user.lastName ?? ''}`.trim() || 'بی‌نام'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {toFa(row.user.phone)} · {row.user.userName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold', meta.cls)}>
                          <SvcIcon size={12} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold', role.cls)}>
                          {row.role === 'buyer' ? <ShoppingBasket size={12} /> : row.role === 'seller' ? <Store size={12} /> : <Users size={12} />}
                          {role.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">{row.guild}</td>
                      <td className="px-4 py-3 text-xs">{row.businessName || '—'}</td>
                      <td className="px-4 py-3">
                        <a
                          href={catalogPath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border bg-secondary/60 px-2.5 py-1 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
                          title={`کاتالوگ ${row.user.userName}`}
                        >
                          <BookOpen size={13} className="text-primary" />
                          مشاهده
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <RelativeTime date={row.createdAt} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* صفحه‌بندی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" className="size-8 rounded-md" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="صفحه قبل">
            <ChevronRight size={15} />
          </Button>
          <span className="text-xs text-muted-foreground">
            صفحه {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button variant="outline" size="icon" className="size-8 rounded-md" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} aria-label="صفحه بعد">
            <ChevronLeft size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
