'use client';

/**
 * ثبت‌نام سرویس‌های تخصصی (پنل ادمین) — خروجی فرم /services:
 *
 * چه کسانی (کاربر + موبایل)، با چه صنعفی و نام کسب‌وکاری، برای ریتو/همخرید
 * ثبت‌نام کرده‌اند + آمار تفکیکی هر سرویس — سیگنال «کدام سرویس را اول
 * راه‌اندازی کنیم». فقط خواندن؛ دادهٔ علاقه‌مندی حذف نمی‌شود.
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ClipboardList, Search, Sparkles, Store, Users } from 'lucide-react';
import { fetchAdminServiceSignupList, type AdminServiceSignupRow } from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const SERVICE_META: Record<string, { label: string; icon: typeof Store; cls: string }> = {
  ritu: { label: 'سرویس ریتو', icon: Store, cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  hamkharid: { label: 'سرویس همخرید', icon: Users, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const svcOf = (id: string) => SERVICE_META[id] ?? { label: id, icon: ClipboardList, cls: 'bg-secondary text-secondary-foreground' };

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold">
            <Sparkles size={19} className="text-primary" />
            ثبت‌نام سرویس‌های تخصصی
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            فروشندگان علاقه‌مند به ریتو و همخرید — خروجی فرم /services
          </p>
        </div>
        {stats && (
          <div className="flex gap-2 text-xs">
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.total)}</p>
              <p className="text-muted-foreground">کل ثبت‌نام</p>
            </div>
            {stats.byService.map(({ serviceId, count }) => {
              const meta = svcOf(serviceId);
              const SvcIcon = meta.icon;
              return (
                <div key={serviceId} className="rounded-md border bg-card px-3 py-2 text-center">
                  <p className="flex items-center justify-center gap-1 text-base font-extrabold">
                    <SvcIcon size={13} className="text-primary" />
                    {toFa(count)}
                  </p>
                  <p className="text-muted-foreground">{meta.label}</p>
                </div>
              );
            })}
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.last7Days)}</p>
              <p className="text-muted-foreground">۷ روز اخیر</p>
            </div>
          </div>
        )}
      </div>

      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: نام کسب‌وکار، صنف، نام، موبایل یا یوزرنیم…"
            className="pe-9 text-sm"
          />
        </div>
        <div className="flex overflow-hidden rounded-md border text-xs">
          {[
            { key: '', label: 'همه' },
            { key: 'ritu', label: 'ریتو' },
            { key: 'hamkharid', label: 'همخرید' },
          ].map(({ key, label }) => (
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
            </button>
          ))}
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
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-start font-medium">فروشنده</th>
                  <th className="px-4 py-2.5 text-start font-medium">سرویس</th>
                  <th className="px-4 py-2.5 text-start font-medium">صنف</th>
                  <th className="px-4 py-2.5 text-start font-medium">نام کسب‌وکار</th>
                  <th className="px-4 py-2.5 text-start font-medium">زمان ثبت‌نام</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const meta = svcOf(row.serviceId);
                  const SvcIcon = meta.icon;
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
                      <td className="px-4 py-3 text-xs font-bold">{row.guild}</td>
                      <td className="px-4 py-3 text-xs">{row.businessName}</td>
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
