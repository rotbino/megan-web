'use client';

/**
 * محصولات من — تب‌های وضعیت (تایید شده/در انتظار تایید/حذف شده/رد شده) عین باسکول.
 * ردیف آگهی + دکمه نردبان (مودال پرداخت: آنلاین/کیف پول) + دلایل رد شدن + حالت خالی.
 */

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Eye, ImageIcon, Pencil, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { useMyProducts } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { REJECTION_REASONS } from '@/lib/mock/data';
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

const LADDER_DAILY_PRICE = 10_000;

export default function MyProductsPage() {
  const { data, isLoading } = useMyProducts();
  const { toast } = useToast();
  const [tab, setTab] = useState<ProductStatus>('confirmed');
  const [ladderProduct, setLadderProduct] = useState<Product | null>(null);
  const [ladderDays, setLadderDays] = useState(3);
  const [payMethod, setPayMethod] = useState<'online' | 'wallet'>('online');
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }

  const items = data.items.filter((p) => p.status === tab && !removed.has(p.id));
  const ladderTotal = ladderDays * LADDER_DAILY_PRICE;

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
          const count = data.items.filter((p) => p.status === key && !(key === 'deleted' && removed.has(p.id))).length;
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              {label} <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-primary-foreground/20' : 'bg-secondary')}>({toFa(count)})</span>
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
                    <img src={p.photos[0]} alt={p.productName} className="size-full object-cover" />
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
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    <span>
                      موجودی: <b>{stockFa(p.stock, p.unit)}</b>
                    </span>
                    <span>
                      حداقل فروش: <b>{stockFa(p.minSaleAmount, p.unit)}</b>
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
                  onClick={() => {
                    setLadderProduct(p);
                    setLadderDays(3);
                  }}
                >
                  <TrendingUp size={14} /> نردبان
                </Button>
                <Button size="sm" variant="outline" className="rounded-md text-xs">
                  <Pencil size={14} /> ویرایش
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-md text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setRemoved((prev) => new Set(prev).add(p.id))}
                >
                  <Trash2 size={14} /> حذف
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ظرفیت ثبت */}
      <PanelCard className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          ظرفیت ثبت محصول: <b className="text-foreground">{toFa(data.items.filter((p) => !removed.has(p.id)).length)}</b> از{' '}
          {toFa(data.capacity)} آگهی رایگان
        </p>
        <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
          <Link href="/panel/pricing">افزایش ظرفیت</Link>
        </Button>
      </PanelCard>

      {/* مودال پرداخت نردبان — عین باسکول */}
      <Dialog open={Boolean(ladderProduct)} onOpenChange={(o) => !o && setLadderProduct(null)}>
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-start">پرداخت هزینه نردبان</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-md bg-secondary/70 p-3">
              <p className="text-xs text-muted-foreground">هزینه نردبان این محصول</p>
              <p className="mt-1 text-base font-extrabold">
                {priceFa(ladderTotal)} <span className="text-xs font-normal text-muted-foreground">تومان</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {ladderProduct?.productName} — {toFa(ladderDays)} روز × {priceFa(LADDER_DAILY_PRICE)} تومان
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold">مدت نردبان</p>
              <div className="flex gap-2">
                {[1, 3, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setLadderDays(d)}
                    className={cn(
                      'flex-1 rounded-md border py-2 text-xs font-bold transition-colors',
                      ladderDays === d ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/40',
                    )}
                  >
                    {toFa(d)} روز
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold">روش های پرداخت</p>
              <div className="space-y-2">
                {(
                  [
                    { key: 'online', label: 'پرداخت آنلاین', icon: TrendingUp },
                    { key: 'wallet', label: 'کیف پول (موجودی: ۰ تومان)', icon: Wallet },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPayMethod(key)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-bold transition-colors',
                      payMethod === key ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/40',
                    )}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-xs text-muted-foreground">هزینه قابل پرداخت</span>
              <span className="text-sm font-extrabold">
                {priceFa(ladderTotal)} <span className="text-xs font-normal text-muted-foreground">تومان</span>
              </span>
            </div>

            <Button
              className="w-full rounded-md"
              onClick={() => {
                setLadderProduct(null);
                toast({
                  description:
                    payMethod === 'online'
                      ? 'در حال انتقال به درگاه پرداخت… (نمونه)'
                      : 'موجودی کیف پول کافی نیست — شارژ کنید. (نمونه)',
                });
              }}
            >
              {payMethod === 'online' ? 'پرداخت آنلاین' : 'پرداخت از کیف پول'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
