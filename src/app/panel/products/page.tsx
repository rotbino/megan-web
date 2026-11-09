'use client';

/**
 * محصولات من — تب‌های وضعیت (تایید شده/در انتظار تایید/حذف شده/رد شده).
 * کارت خلوت (خواسته مالک ۷-۱۱ دور هفدهم): بج وضعیت، خط دسته/موقعیت، بازدید
 * و «به‌روزرسانی … پیش» حذف شدند (وضعیت را تب می‌گوید، بازدید در آمار است)؛
 * به‌جای زمان به‌روزرسانی، اگر قیمت از پنجرهٔ اعتبارش گذشته باشد بج قابل‌کلیک
 * «قیمت منقضی شده» می‌نشیند که مدال سریع آپدیت قیمت را باز می‌کند — همان
 * مدالی که دکمهٔ ظریف «آپدیت قیمت» زیر کارت هم باز می‌کند.
 * دکمهٔ نردبان فقط وقتی دیده می‌شود که آگهی نردبان نشده باشد؛ دکمه‌های زیر
 * کارت لینک‌مانند و ریز شده‌اند (خواسته مالک: کمتر جا بگیرد، گویا بماند).
 * حذف = زیر دکمهٔ سه‌نقطه + دیالوگ تأیید + حذف نرم با حفظ سوابق.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  ImageIcon,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useDeleteMyProduct, useMyProducts, usePanelProfile } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { LadderPayDialog } from '@/components/panel/ladder-pay-dialog';
import { DeleteProductDialog } from '@/components/panel/delete-product-dialog';
import { QuickPriceModal } from '@/components/panel/quick-price-modal';
import { CatalogSettingsButton } from '@/components/panel/catalog/catalog-settings-button';
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

const STATUS_LABEL: Record<ProductStatus, string> = {
  confirmed: 'تایید شده',
  pending: 'در انتظار تایید',
  rejected: 'رد شده',
  deleted: 'حذف شده',
};

function isTabKey(v: string | null): v is ProductStatus {
  return v === 'confirmed' || v === 'pending' || v === 'rejected' || v === 'deleted';
}

/** دکمهٔ سه‌نقطهٔ ردیف آگهی (خواسته مالک ۳-۱۱) — «حذف» زندگی‌اش اینجاست،
 *  نه دکمهٔ مستقیم؛ «ویرایش» هم زیر همین منو رفت (خواسته مالک ۴-۱۱ —
 *  ردیف شلوغ بود و ویرایش به‌ندرت لازم می‌شود). کلیک بیرون یا Escape منو
 *  را می‌بندد (الگوی book-record-card). */
function RowMenu({ editHref, canDelete, onDelete }: { editHref: string; canDelete: boolean; onDelete: () => void }) {
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

  return (
    <span ref={menuRef} className="relative ms-auto">
      <button
        type="button"
        aria-label="گزینه‌های بیشتر"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <MoreVertical size={14} />
      </button>
      {menuOpen && (
        <span
          role="menu"
          className="absolute end-0 top-[calc(100%+6px)] z-30 block w-40 rounded-md border bg-card p-1 shadow-lg"
        >
          <Link
            href={editHref}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-medium transition-colors hover:bg-secondary"
          >
            <Pencil size={14} />
            ویرایش آگهی
          </Link>
          {canDelete && (
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
          )}
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
  // هدف مدال سریع آپدیت قیمت (۷-۱۱ دور هفدهم) — دکمهٔ «آپدیت قیمت» و بج
  // «قیمت منقضی شده» هر دو همین مودال را باز می‌کنند
  const [priceTarget, setPriceTarget] = useState<Product | null>(null);

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }

  const items = data.items.filter((p) => p.status === tab);
  const balance = profile?.userInfo.walletBalance ?? 0;
  // دکمهٔ «تغییر قیمت گروهی» فقط با بیش از یک آگهی (خواسته مالک ۴-۱۱) —
  // با یک آگهی ویرایش تکی خودش کفایت می‌کند
  const activeCount = data.items.filter((p) => p.status !== 'deleted').length;

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
        <div className="flex flex-wrap items-center gap-2">
          {/* تغییر گروهی قیمت/موجودی (خواسته مالک ۴-۱۱) — فقط با ۲+ آگهی */}
          {activeCount > 1 && (
            <Button asChild size="sm" variant="outline" className="rounded-md text-xs h-9">
              <Link href="/panel/products/bulk-price" title="آپدیت سریع قیمت و موجودی همهٔ آگهی‌ها در یک صفحه">
                <Layers size={14} /> تغییر قیمت گروهی
              </Link>
            </Button>
          )}
          {/* تنظیمات کاتالوگ (خواسته مالک ۱۰-۱۱ + بازنگری) — کاتالوگ همان
              پروفایل است؛ لینک/ذخیره‌کنندگان، بدون ساخت صفحهٔ جداگانه */}
          <CatalogSettingsButton />
          <Button asChild size="sm" className="rounded-md text-xs h-9">
            <Link href="/panel/products/new">
              <Plus size={16} />
              ثبت محصول
            </Link>
          </Button>
        </div>
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
          {items.map((p) => {
            /* آگهی تاییدشده — لینک عمومی روی عکس/عنوان (خواسته مالک ۴-۱۱):
               فروشنده محصولش را از دید بقیه کاربران ببیند */
            const publicHref =
              p.status === 'confirmed'
                ? `/product-view/${p.slug}/${p.categoryName}/${p.id}`
                : null;
            return (
            <article key={p.id} className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex gap-3">
                {publicHref ? (
                  <Link
                    href={publicHref}
                    title={`مشاهدهٔ «${p.productName}» در ایمچ`}
                    className="relative size-20 shrink-0 overflow-hidden rounded-md border bg-secondary transition-opacity hover:opacity-85 sm:size-24"
                  >
                    {p.photos[0] ? (
                      <img src={(p.photoThumbs && p.photoThumbs[0]) ?? p.photos[0]} alt={p.productName} className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-muted-foreground/40">
                        <ImageIcon size={26} />
                      </span>
                    )}
                  </Link>
                ) : (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-md border bg-secondary sm:size-24">
                    {p.photos[0] ? (
                      <img src={(p.photoThumbs && p.photoThumbs[0]) ?? p.photos[0]} alt={p.productName} className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-muted-foreground/40">
                        <ImageIcon size={26} />
                      </span>
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  {/* عنوان + نردبان فعال + قیمت منقضی — بج وضعیت حذف شد؛ تبِ فعال
                      خودش وضعیت را می‌گوید (خواسته مالک ۷-۱۱ دور هفدهم) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {publicHref ? (
                      <Link href={publicHref} title={`مشاهدهٔ «${p.productName}» در ایمچ`} className="truncate text-sm font-extrabold transition-colors hover:text-primary">
                        {p.productName}
                      </Link>
                    ) : (
                      <h2 className="truncate text-sm font-extrabold">{p.productName}</h2>
                    )}
                    {p.isLadder && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">نردبان فعال</span>
                    )}
                    {/* قیمت منقضی (۷-۱۱ دور هفدهم) — جای «به‌روزرسانی … پیش» نشست؛
                        کلیک = مدال سریع آپدیت قیمت */}
                    {p.priceExpired && p.status !== 'deleted' && (
                      <button
                        type="button"
                        onClick={() => setPriceTarget(p)}
                        title={`قیمت این آگهی بیش از ${toFa(p.priceValidityDays ?? 3)} روز است تازه نشده — برای آپدیت کلیک کنید`}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        <RefreshCw size={11} /> قیمت منقضی شده
                      </button>
                    )}
                  </div>
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
                  {/* سه‌گانهٔ اصلی — بازدید حذف شد (در آمار است — خواسته مالک ۷-۱۱) */}
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
                  </div>
                </div>
              </div>

              {/* اکشن‌های ظریف (خواسته مالک ۷-۱۱ دور هفدهم) — لینک‌مانند و ریز:
                  کمتر جا می‌گیرد اما گویا می‌ماند؛ نردبان فقط وقتی هنوز نردبان
                  نشده دیده می‌شود (خودِ «نردبان فعال» بالای کارت گویاست) */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-0.5 gap-y-1 border-t border-dashed pt-2.5">
                <button
                  type="button"
                  onClick={() => setPriceTarget(p)}
                  title={`آپدیت سریع قیمت «${p.productName}»`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition-colors',
                    p.priceExpired
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'text-primary hover:bg-primary/5',
                  )}
                >
                  <RefreshCw size={13} /> آپدیت قیمت
                </button>
                <Link
                  href={`/panel/products/stats/${p.id}`}
                  title={`آمار «${p.productName}» — چه کسانی دیدند، تماس زدند و ذخیره کردند`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <BarChart3 size={13} /> آمار
                </Link>
                <Link
                  href={`/panel/products/buyers/${p.id}`}
                  title={`خریداران و درخواست‌های خرید «${p.productName}»`}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Users size={13} /> خریداران
                </Link>
                {p.status === 'confirmed' && !p.isLadder && (
                  <button
                    type="button"
                    onClick={() => setLadderProduct(p)}
                    title={`نردبان کردن «${p.productName}» — صدر لیست نتایج`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-amber-50 hover:text-amber-700"
                  >
                    <TrendingUp size={13} /> نردبان
                  </button>
                )}
                {/* ویرایش + حذف زیر سه‌نقطه (خواسته مالک ۴-۱۱ — ردیف خلوت‌تر) */}
                <RowMenu
                  editHref={`/panel/products/edit/${p.id}`}
                  canDelete={p.status !== 'deleted'}
                  onDelete={() => setDeleteTarget(p)}
                />
              </div>
            </article>
            );
          })}
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

      {/* مدال سریع آپدیت قیمت (۷-۱۱ دور هفدهم) — از «آپدیت قیمت» و بج انقضا */}
      <QuickPriceModal product={priceTarget} onClose={() => setPriceTarget(null)} />

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
