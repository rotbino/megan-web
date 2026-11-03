'use client';

/**
 * محصولات من — تب‌های وضعیت (تایید شده/در انتظار تایید/حذف شده/رد شده) عین باسکول.
 * ردیف آگهی + دکمه نردبان (پرداخت واقعی از کیف پول — wallet/ladderProduct)
 * + دلایل رد شدن + حالت خالی + ویرایش (فرم کامل).
 * حذف = زیر دکمهٔ سه‌نقطه + دیالوگ تأیید + حذف نرم با حفظ سوابق
 * (خواسته مالک ۳-۱۱: بدون تأیید حذف نشود؛ فروشندهٔ حقه‌باز نتواند پس از
 * فروش، آگهی و تاریخچه‌اش را ناپدید کند).
 * تب فعال از ?tab= می‌آید (لینک عمقی صفحه موفقیت ثبت: tab=pending).
 * دکمهٔ «ثبت محصول» در سربرگ (خواسته مالک دور ۱۵): لینک مستقل منو حذف شد
 * و «محصولات من» اولین آیتم است — دکمهٔ ثبت همان‌جا زندگی می‌کند.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Eye,
  History,
  ImageIcon,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useDeleteMyProduct, useMyProducts, usePanelProfile } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { LadderPayDialog } from '@/components/panel/ladder-pay-dialog';
import { DeleteProductDialog } from '@/components/panel/delete-product-dialog';
import { REJECTION_REASONS } from '@/lib/mock/data';
import { priceFa, stockFa, toFa, parseServerDate, timeAgoFa } from '@/lib/format';
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

/** دکمهٔ سه‌نقطهٔ ردیف آگهی (خواسته مالک ۳-۱۱) — «حذف» زندگی‌اش اینجاست،
 *  نه دکمهٔ مستقیم؛ کلیک بیرون یا Escape منو را می‌بندد
 *  (الگوی book-record-card). */
function RowMenu({ onDelete, hidden }: { onDelete: () => void; hidden?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);

  // بستن منو با کلیک بیرون یا Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  if (hidden) return null;
  return (
    <span ref={menuRef} className="relative">
      <Button
        variant="outline"
        size="icon-sm"
        className="rounded-md"
        aria-label="گزینه‌های بیشتر"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <MoreVertical size={15} />
      </Button>
      {menuOpen && (
        <span
          role="menu"
          className="absolute end-0 top-[calc(100%+6px)] z-30 block w-40 rounded-md border bg-card p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 size={14} />
            حذف آگهی
          </button>
        </span>
      )}
    </span>
  );
}

function MyProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading } = useMyProducts();
  const { data: profile } = usePanelProfile();
  const { toast } = useToast();
  const remove = useDeleteMyProduct();

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
  // هدف دیالوگ تأیید حذف (خواسته مالک ۳-۱۱) — حذف فقط بعد از تأیید صریح
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }

  const items = data.items.filter((p) => p.status === tab);
  const balance = profile?.userInfo.walletBalance ?? 0;

  const changeTab = (key: ProductStatus) => {
    setTab(key);
    // آدرس هم‌گام شود — refresh/back دقیقاً همان تب را نشان می‌دهد
    router.replace(`/panel/products?tab=${key}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ + دکمهٔ ثبت (دور ۱۵) — بدون جملهٔ توضیحی اضافه (خواسته مالک ۲-۱۱ دور ۱۸) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-extrabold sm:text-lg">محصولات من</h1>
        <Button asChild className="rounded-md">
          <Link href="/panel/products/new">
            <Plus size={16} />
            ثبت محصول
          </Link>
        </Button>
      </div>

      {/* نکته نردبان — عین باسکول */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-xs leading-5 text-primary">
        <TrendingUp size={16} className="shrink-0" />
        با استفاده از نردبان، محصول شما در صدر لیست محصولات — حتی بالاتر از آگهی‌های ویژه — قرار می‌گیرد.
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
                    {/* زمان به‌روزرسانی — کنار قیمت، همه‌جا (خواسته مالک ۲-۱۱) */}
                    <span
                      className="flex items-center gap-1 text-muted-foreground"
                      title={`آخرین به‌روزرسانی قیمت: ${timeAgoFa(parseServerDate(p.updatedAt))}`}
                    >
                      <History size={13} /> به‌روزرسانی {timeAgoFa(parseServerDate(p.updatedAt))}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye size={13} /> {toFa(p.viewCount)} بازدید
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed pt-3">
                <Button
                  size="sm"
                  className="rounded-md text-xs"
                  disabled={p.status !== 'confirmed'}
                  onClick={() => setLadderProduct(p)}
                >
                  <TrendingUp size={14} /> نردبان
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
                  <Link href={`/panel/products/stats/${p.id}`} title={`آمار «${p.productName}» — چه کسانی دیدند، تماس زدند و ذخیره کردند`}>
                    <BarChart3 size={14} /> آمار
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
                  <Link href={`/panel/products/edit/${p.id}`}>
                    <Pencil size={14} /> ویرایش
                  </Link>
                </Button>
                {/* حذف زیر سه‌نقطه + تأیید (خواسته مالک ۳-۱۱) */}
                <RowMenu hidden={p.status === 'deleted'} onDelete={() => setDeleteTarget(p)} />
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ظرفیت ثبت — فقط بستهٔ رایگان (خواسته مالک ۲-۱۱ دور ۱۸): با بستهٔ
          فعال ظرفیت نامحدود است و این کادر اصلاً نمایش داده نمی‌شود */}
      {data.capacity !== -1 && (
        <PanelCard className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            ظرفیت ثبت محصول: <b className="font-num text-foreground">{toFa(data.items.filter((p) => p.status !== 'deleted').length)}</b> از{' '}
            <span className="font-num">{toFa(data.capacity)}</span> آگهی بسته رایگان
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
            <Link href="/panel/pricing">افزایش ظرفیت با بسته اشتراک</Link>
          </Button>
        </PanelCard>
      )}

      {/* مودال نردبان — ۱ تا ۴ ماه، پرداخت واقعی از کیف پول (خواسته مالک ۳۱-۱۰)؛
          کامپوننت مشترک با صفحهٔ آمار (خواسته مالک ۳-۱۱) */}
      <LadderPayDialog product={ladderProduct} balance={balance} onClose={() => setLadderProduct(null)} />

      {/* دیالوگ تأیید حذف (خواسته مالک ۳-۱۱) — حذف نرم با حفظ سوابق */}
      <DeleteProductDialog
        product={deleteTarget}
        deleting={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          remove.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast({ description: `آگهی «${deleteTarget.productName}» حذف شد — به تب «حذف شده» منتقل شد.` });
              setDeleteTarget(null);
            },
            onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
          })
        }
      />
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
