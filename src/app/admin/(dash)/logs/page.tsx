'use client';

/**
 * لاگ عملیات ادمین‌ها (فاز A5) — هر mutation موفق خودکار ثبت می‌شود.
 * فیلتر: ادمین (از لیست)، جستجوی مسیر عملیات، نوع هدف.
 * payload خلاصه‌شده است (رمزها «[حذف شد]») — با کلیک باز می‌شود.
 */

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, ScrollText, Search } from 'lucide-react';
import {
  fetchAdminActions,
  fetchAdminAdmins,
  type AdminActionRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toFa, timeAgoFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const TARGET_TYPES: Array<{ key: string; label: string }> = [
  { key: 'product', label: 'آگهی' },
  { key: 'user', label: 'کاربر' },
  { key: 'buy_request', label: 'درخواست خرید' },
  { key: 'charge_order', label: 'شارژ' },
  { key: 'base_data', label: 'اطلاعات پایه' },
  { key: 'admin', label: 'ادمین' },
];

/** برچسب فارسی نوع هدف */
function targetLabel(t?: string | null): string {
  return TARGET_TYPES.find((x) => x.key === t)?.label ?? '—';
}

/** payload خلاصه — یک خط خوانا */
function payloadSummary(p?: Record<string, unknown> | null): string {
  if (!p) return '—';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) continue;
    const shown = Array.isArray(v) ? `${toFa(v.length)} مورد` : String(v);
    parts.push(`${k}: ${shown.slice(0, 60)}`);
    if (parts.length >= 4) break;
  }
  return parts.join(' · ') || '—';
}

export default function AdminLogsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [targetType, setTargetType] = useState('');
  const [adminId, setAdminId] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = useMemo(
    () => ['admin-actions', debounced, targetType, adminId, page] as const,
    [debounced, targetType, adminId, page],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchAdminActions({
        ...(debounced ? { action: debounced } : {}),
        ...(targetType ? { targetType } : {}),
        ...(adminId ? { adminId } : {}),
        page,
        perPage: 30,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  // لیست ادمین‌ها برای فیلتر — فقط سوپر ادمین می‌تواند ببیند؛ خطا → بدون فیلتر ادمین
  const { data: admins } = useQuery({
    queryKey: ['admin-admins-filter'],
    queryFn: () => fetchAdminAdmins(1, 50),
    retry: false,
  });

  const items = data?.items ?? [];
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <ScrollText size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">لاگ عملیات مدیران</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} عملیات ثبت‌شده — ثبت خودکار هر تغییر` : 'هر mutation ادمین خودکار ثبت می‌شود'}
            </p>
          </div>
        </div>
        {isFetching && !isLoading ? <Loader2 size={15} className="animate-spin text-muted-foreground" /> : null}
      </div>

      {/* فیلترها */}
      <div className="space-y-2.5 rounded-lg border bg-card p-3">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی مسیر عملیات — مثل review یا setLadder…"
            className="h-9 rounded-md pe-9 font-mono"
            maxLength={80}
            dir="ltr"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setTargetType(''); setPage(1); }}
            className={cn(
              'h-8 rounded-[10px] border px-3 text-[11.5px] font-bold transition-colors',
              !targetType
                ? 'border-primary-line bg-primary-soft text-primary'
                : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
            )}
          >
            همه اهداف
          </button>
          {TARGET_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTargetType(t.key === targetType ? '' : t.key); setPage(1); }}
              className={cn(
                'h-8 rounded-[10px] border px-3 text-[11.5px] font-bold transition-colors',
                targetType === t.key
                  ? 'border-primary-line bg-primary-soft text-primary'
                  : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
              )}
            >
              {t.label}
            </button>
          ))}
          {admins && admins.items.length > 1 && (
            <select
              value={adminId}
              onChange={(e) => { setAdminId(e.target.value); setPage(1); }}
              className="h-8 rounded-[10px] border border-input bg-card px-2 text-[11.5px] font-bold text-secondary-foreground"
              aria-label="فیلتر ادمین"
            >
              <option value="">همه مدیران</option>
              {admins.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role === 'SUPER_ADMIN' ? 'مدیر ارشد' : 'ادمین'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* جدول دسکتاپ */}
      <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-2 p-12 text-center text-muted-foreground">
            <ScrollText size={28} className="opacity-40" />
            <p className="text-sm">عملیاتی مطابق فیلترها پیدا نشد.</p>
          </div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                <th className="px-3 py-2.5 text-start font-bold">عملیات</th>
                <th className="px-3 py-2.5 text-start font-bold">مدیر</th>
                <th className="px-3 py-2.5 text-start font-bold">هدف</th>
                <th className="px-3 py-2.5 text-start font-bold">خلاصه</th>
                <th className="px-3 py-2.5 text-start font-bold">زمان</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/30"
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                >
                  <td className="px-3 py-2.5">
                    <span dir="ltr" className="font-mono text-[11.5px] font-bold">
                      {row.action}
                    </span>
                    {row.message && expanded !== row.id ? (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{row.message}</p>
                    ) : null}
                    {expanded === row.id && row.payload ? (
                      <pre
                        dir="ltr"
                        className="mt-1.5 max-h-40 overflow-auto rounded-md border bg-secondary/40 p-2 text-left font-mono text-[10.5px] leading-4 text-foreground/80"
                      >
                        {JSON.stringify(row.payload, null, 2)}
                      </pre>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="font-bold">{row.admin.name}</span>
                    {row.admin.role === 'SUPER_ADMIN' ? (
                      <span className="ms-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">ارشد</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {targetLabel(row.targetType)}
                  </td>
                  <td className="max-w-64 truncate px-3 py-2.5 text-[11px] text-muted-foreground">
                    {payloadSummary(row.payload)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                    {timeAgoFa(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* کارت موبایل */}
      <div className="space-y-2 lg:hidden">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          : items.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                className="block w-full rounded-lg border bg-card p-3 text-start"
              >
                <div className="flex items-center justify-between gap-2">
                  <span dir="ltr" className="truncate font-mono text-[11px] font-bold">
                    {row.action}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeAgoFa(row.createdAt)}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {row.admin.name} · {targetLabel(row.targetType)}
                </p>
                {row.message && <p className="mt-1 truncate text-[11.5px]">{row.message}</p>}
                {expanded === row.id && row.payload ? (
                  <pre
                    dir="ltr"
                    className="mt-2 max-h-40 overflow-auto rounded-md border bg-secondary/40 p-2 text-left font-mono text-[10px] text-foreground/80"
                  >
                    {JSON.stringify(row.payload, null, 2)}
                  </pre>
                ) : null}
              </button>
            ))}
        {!isLoading && items.length === 0 && (
          <div className="grid place-items-center gap-2 rounded-lg border bg-card p-10 text-center text-muted-foreground">
            <ScrollText size={28} className="opacity-40" />
            <p className="text-sm">عملیاتی مطابق فیلترها پیدا نشد.</p>
          </div>
        )}
      </div>

      {/* صفحه‌بندی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronRight size={14} />
            قبلی
          </Button>
          <span className="text-[12px] font-bold tabular-nums text-muted-foreground">
            صفحه {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            بعدی
            <ChevronLeft size={14} />
          </Button>
        </div>
      )}

      <p className="text-center text-[11px] leading-5 text-muted-foreground">
        ثبت خودکار توسط سیستم — payload ها خلاصه شده‌اند (رمزها هرگز ذخیره نمی‌شوند).{' '}
        <Link href="/admin" className="text-primary hover:underline">
          بازگشت به داشبورد
        </Link>
      </p>
    </div>
  );
}
