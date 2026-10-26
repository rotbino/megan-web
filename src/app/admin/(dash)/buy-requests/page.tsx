'use client';

/**
 * مدیریت درخواست‌های خرید (فاز A4) — جدول جستجو + تب‌های وضعیت + صفحه‌بندی.
 *
 * ردیف‌ها join‌شده (نام دسته-مکان + موبایل خریدار)؛ بازبینی با دیالوگ دلیل
 * (تأیید/رد) و حذف نرم. پشتیبانی لینک عمقی ?userId= از صفحه مدیریت کاربر.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  deleteAdminBuyRequest,
  fetchAdminBuyRequests,
  reviewAdminBuyRequest,
  type AdminBuyRequestRow,
  type AdminItemStatus,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { stockFa, toFa, timeAgoFa } from '@/lib/format';

type TabKey = AdminItemStatus | 'all';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'pending', label: 'در انتظار تایید' },
  { key: 'confirmed', label: 'تایید شده' },
  { key: 'rejected', label: 'رد شده' },
  { key: 'deleted', label: 'حذف شده' },
];

/** چیپ وضعیت — هم‌راستا با صفحه آگهی‌ها */
function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'در انتظار تایید', cls: 'bg-amber-500/10 text-amber-600' },
    confirmed: { label: 'تایید شده', cls: 'bg-emerald-500/10 text-emerald-600' },
    rejected: { label: 'رد شده', cls: 'bg-destructive/10 text-destructive' },
    deleted: { label: 'حذف شده', cls: 'bg-secondary text-muted-foreground' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-secondary text-muted-foreground' };
  return <span className={cn('rounded-full px-2 py-0.5 text-[9.5px] font-bold', s.cls)}>{s.label}</span>;
}

function BuyRequestsPageInner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [buyerId, setBuyerId] = useState<string | null>(searchParams.get('userId'));
  const [reviewRow, setReviewRow] = useState<AdminBuyRequestRow | null>(null);
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);

  // تب اولیه از لینک عمقی (مثل داشبورد: /admin/buy-requests?status=pending)
  const statusParam = searchParams.get('status');
  const [tab, setTab] = useState<TabKey>(
    TABS.some((t) => t.key === statusParam) ? (statusParam as TabKey) : 'all',
  );
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = useMemo(
    () => ['admin-buy-requests', debounced, tab, buyerId, page] as const,
    [debounced, tab, buyerId, page],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchAdminBuyRequests({
        ...(debounced ? { search: debounced } : {}),
        ...(tab !== 'all' ? { status: tab } : {}),
        ...(buyerId ? { userId: buyerId } : {}),
        page,
        perPage: 20,
      }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-buy-requests'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminBuyRequest(id),
    onSuccess: () => {
      invalidate();
      toast({ description: 'درخواست خرید حذف شد.' });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const submitReview = async (approve: boolean) => {
    if (!reviewRow) return;
    if (!approve && !reason.trim()) {
      toast({ description: 'برای رد درخواست، دلیل را بنویسید.', variant: 'destructive' });
      return;
    }
    setPendingAction(approve ? 'approve' : 'reject');
    try {
      await reviewAdminBuyRequest(reviewRow.id, approve, approve ? undefined : reason.trim());
      invalidate();
      toast({ description: approve ? 'درخواست خرید تأیید شد.' : 'درخواست خرید رد شد.' });
      setReviewRow(null);
      setReason('');
    } catch (err) {
      toast({
        description: err instanceof Error ? err.message : 'عملیات ناموفق بود.',
        variant: 'destructive',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const items = data?.items ?? [];
  const pageCount = data?.pageCount ?? 1;
  const counts = data?.counts;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <ClipboardList size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">مدیریت درخواست‌های خرید</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} درخواست — جستجو با نوع محصول، موبایل یا نام خریدار` : 'جستجو و بازبینی درخواست‌ها'}
            </p>
          </div>
        </div>
        {isFetching && !isLoading ? <Loader2 size={15} className="animate-spin text-muted-foreground" /> : null}
      </div>

      {/* جستجو + تب‌ها */}
      <div className="space-y-2.5 rounded-lg border bg-card p-3">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: نوع محصول، موبایل یا نام کاربری خریدار، نام دسته…"
            className="h-9 rounded-md pe-9"
            maxLength={60}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((t) => {
            const count = counts ? (t.key === 'all' ? counts.all : counts[t.key]) : null;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => { setTab(t.key); setPage(1); }}
                className={cn(
                  'h-8 rounded-[10px] border px-3 text-[11.5px] font-bold transition-colors',
                  tab === t.key
                    ? 'border-primary-line bg-primary-soft text-primary'
                    : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
                )}
              >
                {t.label}
                {count != null ? <span className="ms-1 text-[10px] font-normal opacity-70">({toFa(count)})</span> : null}
              </button>
            );
          })}
        </div>
        {buyerId ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
              فقط درخواست‌های این خریدار
              <button
                type="button"
                aria-label="حذف فیلتر خریدار"
                onClick={() => { setBuyerId(null); setPage(1); }}
                className="grid size-4 place-items-center rounded-full hover:bg-primary/15"
              >
                <X size={11} />
              </button>
            </span>
          </div>
        ) : null}
      </div>

      {/* جدول دسکتاپ */}
      <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-2 p-12 text-center text-muted-foreground">
            <ClipboardList size={28} className="opacity-40" />
            <p className="text-sm">درخواستی مطابق جستجو/فیلتر پیدا نشد.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                <th className="px-3 py-2.5 text-start font-bold">درخواست</th>
                <th className="px-3 py-2.5 text-start font-bold">خریدار</th>
                <th className="px-3 py-2.5 text-start font-bold">نیازمندی</th>
                <th className="px-3 py-2.5 text-start font-bold">هدف</th>
                <th className="px-3 py-2.5 text-start font-bold">وضعیت</th>
                <th className="px-3 py-2.5 text-start font-bold">ثبت</th>
                <th className="px-3 py-2.5 text-start font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className={cn('border-b transition-colors last:border-0 hover:bg-secondary/30', r.status === 'deleted' && 'opacity-60')}>
                  <td className="px-3 py-2.5">
                    <div className="min-w-0">
                      <span className="block max-w-[260px] truncate font-bold">
                        {r.name || r.category_name}
                      </span>
                      <span className="text-[10.5px] text-muted-foreground">
                        {r.category_name}
                        {r.province_name ? ` · ${r.province_name}${r.city_name ? ` — ${r.city_name}` : ''}` : ' · بدون مکان'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <Link href={`/admin/users/${r.buyer.id}`} className="text-[12px] font-bold hover:text-primary">
                        {r.buyer.user_name}
                      </Link>
                      <span dir="ltr" className="text-[11px] text-muted-foreground">{r.buyer.phone}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-bold">{stockFa(r.requirement_amount, r.unit)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                    {r.goal === 'price_only' ? 'فقط اطلاع از قیمت' : 'قیمت + خرید'}
                    {r.has_history ? ' · سابقه دارد' : ''}
                  </td>
                  <td className="px-3 py-2.5"><StatusChip status={r.status} /></td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{timeAgoFa(r.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {r.status === 'pending' ? (
                        <Button
                          size="sm"
                          className="h-7 rounded-[10px] px-2.5 text-[11px]"
                          onClick={() => { setReviewRow(r); setReason(''); }}
                        >
                          بازبینی
                        </Button>
                      ) : null}
                      {r.status !== 'deleted' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-[10px] border-destructive/30 px-2 text-[11px] text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(r.id)}
                        >
                          حذف
                        </Button>
                      ) : null}
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
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
          : items.map((r) => (
              <div key={r.id} className={cn('rounded-lg border bg-card p-3', r.status === 'deleted' && 'opacity-60')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[13px] font-bold">{r.name || r.category_name}</span>
                  <StatusChip status={r.status} />
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {r.category_name} · {stockFa(r.requirement_amount, r.unit)}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span dir="ltr">{r.buyer.phone}</span>
                  <span>{timeAgoFa(r.created_at)}</span>
                </div>
                {r.status !== 'deleted' ? (
                  <div className="mt-2 flex gap-1.5">
                    {r.status === 'pending' ? (
                      <Button
                        size="sm"
                        className="h-7 flex-1 rounded-[10px] text-[11px]"
                        onClick={() => { setReviewRow(r); setReason(''); }}
                      >
                        بازبینی
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 rounded-[10px] border-destructive/30 text-[11px] text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(r.id)}
                    >
                      <Trash2 size={12} /> حذف
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
        {!isLoading && items.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            درخواستی پیدا نشد.
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
        درخواست‌های تأییدشده در صفحه عمومی خریداران نمایش داده می‌شوند؛ حذف = نرم و برگشت‌پذیر توسط کاربر در پنل خودش.
      </p>

      {/* دیالوگ بازبینی */}
      {reviewRow ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border bg-card p-4 shadow-xl">
            <p className="text-sm font-extrabold">بازبینی درخواست «{reviewRow.name || reviewRow.category_name}»</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              خریدار: {reviewRow.buyer.user_name} — نیازمندی {stockFa(reviewRow.requirement_amount, reviewRow.unit)}
            </p>
            {reviewRow.description ? (
              <p className="mt-2 rounded-md bg-secondary/40 p-2.5 text-[12px] leading-6">{reviewRow.description}</p>
            ) : null}
            <div className="mt-3 space-y-1.5">
              <label htmlFor="reject-reason" className="text-[11px] font-bold text-muted-foreground">
                دلیل رد (در صورت رد کردن — الزامی):
              </label>
              <Input
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثلاً: مقیاس خرده‌فروشی قابل قبول نیست."
                className="rounded-md text-[12px]"
                maxLength={500}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="lg"
                className="flex-1 rounded-md"
                disabled={pendingAction !== null}
                onClick={() => void submitReview(true)}
              >
                {pendingAction === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                تأیید
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 rounded-md border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                disabled={pendingAction !== null}
                onClick={() => void submitReview(false)}
              >
                {pendingAction === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                رد
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="rounded-md text-muted-foreground"
                disabled={pendingAction !== null}
                onClick={() => setReviewRow(null)}
              >
                بستن
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminBuyRequestsPage() {
  return (
    <Suspense>
      <BuyRequestsPageInner />
    </Suspense>
  );
}
