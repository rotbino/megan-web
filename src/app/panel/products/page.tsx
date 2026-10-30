'use client';

/**
 * محصولات من — تب‌های وضعیت (تایید شده/در انتظار تایید/حذف شده/رد شده) عین باسکول.
 * ردیف آگهی + دکمه نردبان (پرداخت واقعی از کیف پول — wallet/ladderProduct)
 * + دلایل رد شدن + حالت خالی + ویرایش (فرم کامل) + حذف واقعی.
 * تب فعال از ?tab= می‌آید (لینک عمقی صفحه موفقیت ثبت: tab=pending).
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Eye, ImageIcon, Pencil, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { useDeleteMyProduct, useLadderProduct, useMyProducts, usePanelProfile } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { LADDER_MONTHLY_PRICE, MIN_CHARGE, REJECTION_REASONS } from '@/lib/mock/data';
import { priceFa, stockFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product, ProductStatus } from '@/lib/types';

const TABS: { key: ProductStatus; label: string }[] = [
  { key: 'confirmed', label: 'تایید شده' },
  { key: 'pending', label: 'در انتظار تایید' },
  { key: 'deleted', label: 'حذف شده' },
  { key: 'rejected', label: 'رد شده' },
];

const STATUS_STYLE: Record<ProductStatus, string> = {
  confirmed: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  rejected: 'bg-red-50 text-red-600',
  deleted: 'bg-secondary text-muted-foreground',
};

const STATUS_LABEL: Record<ProductStatus, string> = {
  confirmed: 'تایید شده',
  pending: 'در انتظار تایید',
  rejected: 'رد شده',
  deleted: 'حذف شده',
};

const LADDER_LABEL = 'یک ماه';

function isTabKey(v: string | null): v is ProductStatus {
  return v === 'confirmed' || v === 'pending' || v === 'rejected' || v === 'deleted';
}

function MyProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading } = useMyProducts();
  const { data: profile } = usePanelProfile();
  const { toast } = useToast();
  const remove = useDeleteMyProduct();
  const ladder = useLadderProduct();

  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<ProductStatus>(isTabKey(tabParam) ? tabParam : 'confirmed');
  // لینک عمقی ?tab=pending (دکمه موفقیت ثبت) — الگوی «تنظیم state هنگام رندر»
  // برای همگام‌سازی با URL بدون effect (مثل فرم‌های دیگر ایمچ)
  const [lastParam, setLastParam] = useState<string | null>(tabParam);
  if (tabParam !== lastParam) {
    setLastParam(tabParam);
    if (isTabKey(tabParam)) setTab(tabParam);
  }

  const [ladderProduct, setLadderProduct] = useState<Product | null>(null);

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }

  const items = data.items.filter((p) => p.status === tab);
  const balance = profile?.userInfo.walletBalance ?? 0;
  const canPayLadder = balance >= LADDER_MONTHLY_PRICE;

  const changeTab = (key: ProductStatus) => {
    setTab(key);
    // آدرس هم‌گام شود — refresh/back دقیقاً همان تب را نشان می‌دهد
    router.replace(`/panel/products?tab=${key}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* نکته نردبان — عین باسکول */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-xs leading-5 text-primary">
        <TrendingUp size={16} className="shrink-0" />
        با استفاده از نردبان، محصول شما در صدر لیست محصولات قرار می‌گیرد.
      </div>

      {/* تب‌ها */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label }) => {
          const count = data.items.filter((p) => p.status === key).length;
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => changeTab(key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              {label} <span className={cn('font-num rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-primary-foreground/20' : 'bg-secondary')}>({toFa(count)})</span>
            </button>
          );
        })}
      </div>

      {/* دلایل رد شدن — فقط تب رد شده */}
      {tab === 'rejected' && (
        <PanelCard className="border-red-200 bg-red-50/50">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-red-600">
            <AlertTriangle size={16} /> دلایل رد شدن محصولات
          </p>
          <ul className="mt-2 space-y-1.5">
            {REJECTION_REASONS.map((r) => (
              <li key={r} className="flex items-start gap-2 text-xs leading-5 text-red-700/90">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-red-400" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </PanelCard>
      )}

      {/* لیست آگهی‌ها */}
      {items.length === 0 ? (
        <PanelEmptyState
          icon={ImageIcon}
          title={tab === 'confirmed' ? 'محصول تایید شده ای ندارید.' : `موردی در «${STATUS_LABEL[tab]}» ندارید.`}
          hint="برای ثبت محصول جدید در ایمچ، از طریق دکمه ثبت محصول اقدام کنید."
          actionLabel="ثبت محصول"
          actionHref="/panel/products/new"
        />
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <article key={p.id} className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex gap-3">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-md border bg-secondary sm:size-24">
                  {p.photos[0] ? (
                    <img src={(p.photoThumbs && p.photoThumbs[0]) ?? p.photos[0]} alt={p.productName} className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted-foreground/40">
                      <ImageIcon size={26} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-extrabold">{p.productName}</h2>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_STYLE[p.status ?? 'confirmed'])}>
                      {STATUS_LABEL[p.status ?? 'confirmed']}
                    </span>
                    {p.isLadder && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">نردبان فعال</span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {p.categoryName} ← {p.subCategoryName} | {p.provinceName}، {p.cityName}
                  </p>
                  {/* دلایل اختصاصی رد همین آگهی — از بازبینی ادمین */}
                  {p.status === 'rejected' && p.rejectionReasons && p.rejectionReasons.length > 0 && (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50/60 px-3 py-2">
                      <p className="text-[11px] font-extrabold text-red-600">دلیل رد این آگهی:</p>
                      <ul className="mt-1 space-y-1">
                        {p.rejectionReasons.map((r) => (
                          <li key={r} className="flex items-start gap-1.5 text-[11px] leading-5 text-red-700/90">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-red-400" aria-hidden />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    <span>
                      موجودی: <b>{stockFa(p.stock, p.unit)}</b>
                    </span>
                    <span>
                      حداقل سفارش: <b>{stockFa(p.minSaleAmount, p.unit)}</b>
                    </span>
                    <span>
                      کف قیمت: <b>{priceFa(p.minSalePrice)}</b>
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye size={13} /> {toFa(p.viewCount)} بازدید
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed pt-3">
                <Button
                  size="sm"
                  className="rounded-md text-xs"
                  disabled={p.status !== 'confirmed'}
                  onClick={() => setLadderProduct(p)}
                >
                  <TrendingUp size={14} /> نردبان
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
                  <Link href={`/panel/products/edit/${p.id}`}>
                    <Pencil size={14} /> ویرایش
                  </Link>
                </Button>
                {p.status !== 'deleted' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-md text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(p.id, {
                        onSuccess: () => toast({ description: `آگهی «${p.productName}» حذف شد.` }),
                        onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
                      })
                    }
                  >
                    <Trash2 size={14} /> حذف
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ظرفیت ثبت — بسته فعال = نامحدود (-۱) */}
      <PanelCard className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {data.capacity === -1 ? (
            <>
              ظرفیت ثبت محصول: <b className="text-emerald-600">نامحدود</b>
              <span className="ms-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">بسته فعال</span>
            </>
          ) : (
            <>
              ظرفیت ثبت محصول: <b className="font-num text-foreground">{toFa(data.items.filter((p) => p.status !== 'deleted').length)}</b> از{' '}
              <span className="font-num">{toFa(data.capacity)}</span> آگهی بسته رایگان
            </>
          )}
        </p>
        <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
          <Link href="/panel/pricing">{data.capacity === -1 ? 'مدیریت بسته اشتراک' : 'افزایش ظرفیت با بسته اشتراک'}</Link>
        </Button>
      </PanelCard>

      {/* مودال نردبان — یک‌ماهه، پرداخت واقعی از کیف پول */}
      <Dialog open={Boolean(ladderProduct)} onOpenChange={(o) => !o && setLadderProduct(null)}>
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-start">پرداخت هزینه نردبان</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-md bg-secondary/70 p-3">
              <p className="text-xs text-muted-foreground">هزینه نردبان این محصول</p>
              <p className="font-num mt-1 text-base font-extrabold">
                {priceFa(LADDER_MONTHLY_PRICE)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {ladderProduct?.productName} — {LADDER_LABEL} (۳۰ روز)
              </p>
            </div>

            <p className="rounded-md bg-primary/5 p-3 text-[11px] leading-5 text-primary">
              نردبان هر محصول برای یک ماه {priceFa(LADDER_MONTHLY_PRICE)} است و هزینه آن از شارژ کیف پول شما کسر می‌شود؛
              بنابراین حداقل شارژ کیف پول {priceFa(MIN_CHARGE)} می‌باشد.
            </p>

            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet size={14} /> موجودی کیف پول
              </span>
              <span className="font-num text-sm font-extrabold">
                {priceFa(balance)}
              </span>
            </div>

            {canPayLadder ? (
              <Button
                className="w-full rounded-md"
                disabled={ladder.isPending}
                onClick={() =>
                  ladder.mutate(ladderProduct!.id, {
                    onSuccess: () => {
                      toast({
                        description: `نردبان «${ladderProduct?.productName}» برای یک ماه فعال شد — ${priceFa(LADDER_MONTHLY_PRICE)} از کیف پول کسر شد.`,
                      });
                      setLadderProduct(null);
                    },
                    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
                  })
                }
              >
                {ladder.isPending ? 'در حال پرداخت…' : 'پرداخت از کیف پول'}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-700">
                  موجودی کیف پول برای نردبان کافی نیست — حداقل {priceFa(MIN_CHARGE)} شارژ کنید.
                </p>
                <Button asChild className="w-full rounded-md">
                  <Link href="/panel/wallet">شارژ کیف پول (کارت به کارت)</Link>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MyProductsPage() {
  return (
    <Suspense>
      <MyProductsPageInner />
    </Suspense>
  );
}
