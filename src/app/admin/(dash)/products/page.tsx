'use client';

/**
 * مدیریت آگهی‌ها (فاز A4) — جدول جستجو/تب‌های وضعیت/فیلتر نردبان + صفحه‌بندی.
 *
 * تب‌ها با شمارنده زنده (کل فضای جستجو/فیلترهای غیرِ وضعیت)؛ ردیف‌ها
 * join‌شده از سرور (نام دسته-مکان + موبایل فروشنده + عکس شاخص).
 * عملیات: بازبینی (دیالوگ دلایل)، جزئیات کامل (گالری/ویژگی‌ها/نردبان‌ها)، حذف.
 * پشتیبانی لینک عمقی ?sellerId= از صفحه مدیریت کاربر.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  deleteAdminProduct,
  fetchAdminProducts,
  type AdminItemStatus,
  type AdminProductRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { priceFa, stockFa, toFa, timeAgoFa } from '@/lib/format';
import { ReviewProductDialog } from './review-dialog';
import { ProductDetailDialog, StatusChip } from './detail-dialog';

type TabKey = AdminItemStatus | 'all';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'pending', label: 'در انتظار تایید' },
  { key: 'confirmed', label: 'تایید شده' },
  { key: 'rejected', label: 'رد شده' },
  { key: 'deleted', label: 'حذف شده' },
];

function ProductsPageInner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sellerId, setSellerId] = useState<string | null>(searchParams.get('sellerId'));
  const [reviewRow, setReviewRow] = useState<AdminProductRow | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  // تب اولیه از لینک عمقی (مثل داشبورد: /admin/products?status=pending)
  const statusParam = searchParams.get('status');
  const [tab, setTab] = useState<TabKey>(
    TABS.some((t) => t.key === statusParam) ? (statusParam as TabKey) : 'all',
  );
  const [ladderOnly, setLadderOnly] = useState(false);
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
    () => ['admin-products', debounced, tab, ladderOnly, sellerId, page] as const,
    [debounced, tab, ladderOnly, sellerId, page],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchAdminProducts({
        ...(debounced ? { search: debounced } : {}),
        ...(tab !== 'all' ? { status: tab } : {}),
        ...(ladderOnly ? { ladder: true } : {}),
        ...(sellerId ? { sellerId } : {}),
        page,
        perPage: 20,
      }),
    placeholderData: keepPreviousData,
    // تازگی زنده (خواسته مالک): آگهی تازه‌ثبت‌شده بدون رفرش دستی دیده شود —
    // ۱۵ ثانیه stale + poll دوره‌ای + تازه‌سازی هنگام بازگشت به تب مرورگر
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-product-detail'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminProduct(id),
    onSuccess: () => {
      invalidate();
      toast({ description: 'آگهی حذف و فایل‌هایش پاک شد.' });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const items = data?.items ?? [];
  const pageCount = data?.pageCount ?? 1;
  const counts = data?.counts;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Boxes size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">مدیریت آگهی‌ها</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} آگهی — جستجو با نام محصول، موبایل یا نام فروشنده` : 'جستجو و بازبینی آگهی‌ها'}
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
            placeholder="جستجو: نام محصول، موبایل یا نام کاربری فروشنده، نام دسته…"
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
          <button
            type="button"
            onClick={() => { setLadderOnly((v) => !v); setPage(1); }}
            className={cn(
              'ms-auto inline-flex h-8 items-center gap-1.5 rounded-[10px] border px-3 text-[11.5px] font-bold transition-colors',
              ladderOnly
                ? 'border-primary-line bg-primary-soft text-primary'
                : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
            )}
            aria-pressed={ladderOnly}
          >
            <TrendingUp size={13} /> نردبان‌شده
          </button>
        </div>
        {/* فیلتر فروشنده از لینک عمقی صفحه کاربر */}
        {sellerId ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
              فقط آگهی‌های این فروشنده
              <button
                type="button"
                aria-label="حذف فیلتر فروشنده"
                onClick={() => { setSellerId(null); setPage(1); }}
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
            <Boxes size={28} className="opacity-40" />
            <p className="text-sm">آگهی‌ای مطابق جستجو/فیلتر پیدا نشد.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                <th className="px-3 py-2.5 text-start font-bold">آگهی</th>
                <th className="px-3 py-2.5 text-start font-bold">فروشنده</th>
                <th className="px-3 py-2.5 text-start font-bold">موجودی / کف قیمت</th>
                <th className="px-3 py-2.5 text-start font-bold">بازدید</th>
                <th className="px-3 py-2.5 text-start font-bold">وضعیت</th>
                <th className="px-3 py-2.5 text-start font-bold">به‌روزرسانی</th>
                <th className="px-3 py-2.5 text-start font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className={cn('border-b transition-colors last:border-0 hover:bg-secondary/30', p.status === 'deleted' && 'opacity-60')}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {p.photo ? (
                         
                        <img src={p.photo} alt="" className="size-10 shrink-0 rounded-md border object-cover" loading="lazy" />
                      ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-md border bg-secondary text-muted-foreground/50">
                          <Boxes size={15} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setDetailId(p.id)}
                          className="block max-w-[220px] truncate text-start font-bold hover:text-primary"
                        >
                          {p.product_name}
                        </button>
                        <span className="text-[10.5px] text-muted-foreground">
                          {p.sub_category_name} · {p.city_name}
                          {p.is_ladder ? <span className="ms-1.5 font-bold text-primary">نردبان</span> : null}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      {/* نام کامل (خواسته مالک) — نام کاربری زیرش کوچک */}
                      <span className="text-[12px] font-bold">{p.seller.full_name || p.seller.user_name}</span>
                      <span className="text-[10px] text-muted-foreground">{p.seller.user_name}</span>
                      <span dir="ltr" className="font-num text-[11px] text-muted-foreground">{p.seller.phone}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[11px]">
                    <span className="text-muted-foreground">{stockFa(p.stock, p.unit)}</span>
                    <br />
                    <span className="font-bold">{p.min_sale_price > 0 ? priceFa(p.min_sale_price) : 'تماس'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{toFa(p.view_count)}</td>
                  <td className="px-3 py-2.5"><StatusChip status={p.status} /></td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{timeAgoFa(p.updated_at)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {p.status === 'pending' ? (
                        <Button
                          size="sm"
                          className="h-7 rounded-[10px] px-2.5 text-[11px]"
                          onClick={() => setReviewRow(p)}
                        >
                          بازبینی
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-[10px] px-2.5 text-[11px]"
                        onClick={() => setDetailId(p.id)}
                      >
                        جزئیات
                      </Button>
                      {p.status !== 'deleted' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-[10px] border-destructive/30 px-2 text-[11px] text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(p.id)}
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
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          : items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDetailId(p.id)}
                className={cn('block w-full rounded-lg border bg-card p-3 text-start', p.status === 'deleted' && 'opacity-60')}
              >
                <div className="flex items-center gap-2.5">
                  {p.photo ? (
                     
                    <img src={p.photo} alt="" className="size-12 shrink-0 rounded-md border object-cover" loading="lazy" />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-md border bg-secondary text-muted-foreground/50">
                      <Boxes size={16} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-bold">{p.product_name}</span>
                      <StatusChip status={p.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {p.sub_category_name} · {p.city_name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span dir="ltr">{p.seller.phone}</span> · {stockFa(p.stock, p.unit)}
                      {p.is_ladder ? <span className="ms-1.5 font-bold text-primary">نردبان</span> : null}
                    </p>
                  </div>
                </div>
              </button>
            ))}
        {!isLoading && items.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            آگهی‌ای پیدا نشد.
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
        حذف = نرم: آگهی از لیست‌های عمومی پنهان می‌شود و فایل‌های گالری‌اش پاک می‌شوند؛ سفارش‌های نردبان در تاریخچه می‌مانند.
      </p>

      {/* دیالوگ‌ها */}
      {reviewRow ? (
        <ReviewProductDialog
          product={reviewRow}
          onClose={() => setReviewRow(null)}
          onDone={invalidate}
        />
      ) : null}
      {detailId != null ? (
        <ProductDetailDialog
          productId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={invalidate}
        />
      ) : null}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <ProductsPageInner />
    </Suspense>
  );
}
