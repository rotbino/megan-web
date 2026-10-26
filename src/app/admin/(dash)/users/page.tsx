'use client';

/**
 * مدیریت کاربران (فاز A3) — جدول جستجو/فیلتر/صفحه‌بندی + عملیات سریع.
 *
 * غیرفعال‌سازی = حذف نرم: ورود مسدود، نشست‌ها باطل و محتوای کاربر از
 * لیست‌های عمومی پنهان می‌شود (داده‌ها حذف نمی‌شوند). عملیات کامل در
 * صفحه جزئیات هر کاربر انجام می‌شود.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  fetchAdminUsers,
  setAdminUserActive,
  type AdminUserRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { priceFa, timeAgoFa, toFa } from '@/lib/format';

type FilterKey = 'all' | 'sellers' | 'unverified' | 'inactive';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'sellers', label: 'فروشندگان' },
  { key: 'unverified', label: 'احرازنشده' },
  { key: 'inactive', label: 'غیرفعال' },
];

function filterPayload(key: FilterKey): Record<string, unknown> {
  switch (key) {
    case 'sellers':
      return { seller: true };
    case 'unverified':
      return { verified: false };
    case 'inactive':
      return { active: false };
    default:
      return {};
  }
}

/** چیپ نقش‌ها — خریدار/فروشنده/ادمین */
function RoleChips({ user }: { user: AdminUserRow }) {
  return (
    <span className="flex flex-wrap justify-end gap-1 lg:justify-start">
      {user.role === 'ADMIN' && (
        <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">ادمین</span>
      )}
      {user.is_seller && (
        <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">فروشنده</span>
      )}
      {user.is_buyer && (
        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground">خریدار</span>
      )}
    </span>
  );
}

/** چیپ وضعیت احراز */
function VerifyChip({ user }: { user: AdminUserRow }) {
  if (user.is_verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-verified/10 px-1.5 py-0.5 text-[9px] font-bold text-verified">
        <ShieldCheck size={10} /> احرازشده
      </span>
    );
  }
  if (user.verification === 'pending') {
    return <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">در بررسی</span>;
  }
  return <span className="text-[10px] text-muted-foreground">—</span>;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);

  // جستجو با تأخیر ۴۰۰ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = useMemo(
    () => ['admin-users', debounced, filter, page] as const,
    [debounced, filter, page],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchAdminUsers({
        ...(debounced ? { search: debounced } : {}),
        ...filterPayload(filter),
        page,
        perPage: 20,
      }),
    placeholderData: keepPreviousData,
  });

  const toggleActive = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => setAdminUserActive(input.id, input.active),
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        description: input.active
          ? 'حساب کاربر فعال شد.'
          : 'حساب کاربر غیرفعال شد — ورود مسدود، نشست‌ها باطل و محتوایش از لیست‌های عمومی پنهان است.',
      });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const items = data?.items ?? [];
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Users size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">مدیریت کاربران</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} کاربر — جستجو با موبایل، نام یا شناسه` : 'جستجو و مدیریت حساب‌ها'}
            </p>
          </div>
        </div>
        {isFetching && !isLoading ? <Loader2 size={15} className="animate-spin text-muted-foreground" /> : null}
      </div>

      {/* جستجو + فیلترها */}
      <div className="space-y-2.5 rounded-lg border bg-card p-3">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: شماره موبایل، نام، نام خانوادگی یا شناسه کاربر…"
            className="h-9 rounded-md pe-9"
            maxLength={60}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={cn(
                'h-8 rounded-[10px] border px-3 text-[11.5px] font-bold transition-colors',
                filter === f.key
                  ? 'border-primary-line bg-primary-soft text-primary'
                  : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* جدول دسکتاپ */}
      <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-2 p-12 text-center text-muted-foreground">
            <Users size={28} className="opacity-40" />
            <p className="text-sm">کاربری مطابق جستجو/فیلتر پیدا نشد.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                <th className="px-3 py-2.5 text-start font-bold">کاربر</th>
                <th className="px-3 py-2.5 text-start font-bold">نقش‌ها</th>
                <th className="px-3 py-2.5 text-start font-bold">احراز</th>
                <th className="px-3 py-2.5 text-start font-bold">آگهی / درخواست</th>
                <th className="px-3 py-2.5 text-start font-bold">کیف پول</th>
                <th className="px-3 py-2.5 text-start font-bold">آخرین ورود</th>
                <th className="px-3 py-2.5 text-start font-bold">وضعیت</th>
                <th className="px-3 py-2.5 text-start font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className={cn('border-b transition-colors last:border-0 hover:bg-secondary/30', !u.is_active && 'opacity-60')}>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/users/${u.id}`} className="group flex flex-col">
                      <span className="font-bold group-hover:text-primary">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'بی‌نام'}
                      </span>
                      <span dir="ltr" className="text-[11px] text-muted-foreground">{u.phone}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5"><RoleChips user={u} /></td>
                  <td className="px-3 py-2.5"><VerifyChip user={u} /></td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                    {toFa(u.product_count)} / {toFa(u.request_count)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-bold">{priceFa(u.wallet_balance)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                    {u.last_login_at ? timeAgoFa(u.last_login_at) : 'هرگز'}
                  </td>
                  <td className="px-3 py-2.5">
                    {u.is_active ? (
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">فعال</span>
                    ) : (
                      <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">غیرفعال</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="rounded-[10px] border border-input bg-card px-2.5 py-1 text-[11px] font-bold text-secondary-foreground transition-colors hover:border-primary-line hover:bg-primary-soft hover:text-primary"
                      >
                        جزئیات
                      </Link>
                      <Button
                        size="sm"
                        variant={u.is_active ? 'outline' : 'default'}
                        className="h-7 rounded-[10px] px-2.5 text-[11px]"
                        disabled={toggleActive.isPending}
                        onClick={() => toggleActive.mutate({ id: u.id, active: !u.is_active })}
                      >
                        {u.is_active ? 'غیرفعال' : 'فعال'}
                      </Button>
                    </div>
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
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          : items.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className={cn('block rounded-lg border bg-card p-3', !u.is_active && 'opacity-60')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-bold">
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'بی‌نام'}
                  </span>
                  <VerifyChip user={u} />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span dir="ltr">{u.phone}</span>
                  <span>{u.last_login_at ? timeAgoFa(u.last_login_at) : 'بدون ورود'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <RoleChips user={u} />
                  <span className="text-[10px] text-muted-foreground">
                    {toFa(u.product_count)} آگهی · {priceFa(u.wallet_balance)}
                  </span>
                </div>
              </Link>
            ))}
        {!isLoading && items.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            کاربری پیدا نشد.
          </div>
        )}
      </div>

      {/* صفحه‌بندی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-[10px]"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronRight size={14} /> قبلی
          </Button>
          <span className="text-[11px] text-muted-foreground">
            صفحه {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="rounded-[10px]"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            بعدی <ChevronLeft size={14} />
          </Button>
        </div>
      )}

      {/* پانوشت راهنما */}
      <p className="text-center text-[10.5px] leading-6 text-muted-foreground">
        غیرفعال‌سازی حساب = حذف نرم: ورود مسدود، نشست‌ها باطل و محتوا از لیست‌های عمومی پنهان می‌شود؛ داده‌های کاربر حذف نمی‌شوند.
      </p>
    </div>
  );
}
