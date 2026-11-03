'use client';

/**
 * تغییر قیمت گروهی (خواسته مالک ۴-۱۱) — لیست سادهٔ آگهی‌های فعال خودم:
 * عنوان + قیمت حداقل خرید + موجودی؛ طراحی‌شده برای آپدیت سریع همه در یک صفحه.
 *  • دسکتاپ: گرید لیستی با ردیف‌های هم‌تراز
 *  • موبایل: کارت‌های جمع‌وجور با دو اینپوت کنار هم
 *  • فقط ردیف‌های تغییر یافته ذخیره می‌شوند؛ بدون تایید مجدد (وضعیت حفظ می‌شود)
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2, Save } from 'lucide-react';
import { useBulkUpdatePrices, useMyProducts } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { UnitInput } from '@/components/shared/unit-input';
import { priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

/** ردیف ویرایش — مقدار زندهٔ فرم */
interface Row {
  id: number;
  productName: string;
  unit: string;
  /** مقدار اولیهٔ سرور — برای تشخیص تغییر و نمایش قبل/بعد */
  basePrice: number;
  baseStock: number;
  price: string;
  stock: string;
}

export default function BulkPricePage() {
  const { data, isLoading } = useMyProducts();
  const save = useBulkUpdatePrices();
  const { toast } = useToast();

  const [rows, setRows] = useState<Row[] | null>(null);

  // فرم یک‌بار از دیتای سرور پر می‌شود (الگوی controlled-late)
  if (!isLoading && data && rows === null) {
    setRows(
      data.items
        .filter((p) => p.status === 'confirmed' || p.status === 'pending')
        .map((p) => ({
          id: p.id,
          productName: p.productName,
          unit: p.unit,
          basePrice: p.minSalePrice ?? 0,
          baseStock: p.stock,
          price: p.minSalePrice ? p.minSalePrice.toLocaleString('en-US') : '',
          stock: p.stock ? p.stock.toLocaleString('en-US') : '',
        })),
    );
  }

  /** ردیف‌های واقعاً تغییر یافته — فقط همین‌ها ارسال می‌شوند */
  const changed = useMemo(
    () => (rows ?? []).filter((r) => num(r.price) !== r.basePrice || num(r.stock) !== r.baseStock),
    [rows],
  );

  /** قیمت نامعتبر — ۰ (تماس بگیرید) یا ≥ ۱۰۰۰ */
  const badPrice = (r: Row) => {
    const p = num(r.price);
    return p !== 0 && p < 1000;
  };
  const hasBad = (rows ?? []).some(badPrice);

  const patchRow = (id: number, p: Partial<Row>) =>
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...p } : r)) ?? rs);

  const persist = async () => {
    if (changed.length === 0) return;
    if (hasBad) {
      toast({
        description: 'قیمت‌ها را اصلاح کنید — هر قیمت باید حداقل ۱۰۰۰ تومان باشد (یا خالی/۰ = تماس بگیرید).',
        variant: 'destructive',
      });
      return;
    }
    try {
      const r = await save.mutateAsync(
        changed.map((c) => ({ id: c.id, minSalePrice: num(c.price), stock: num(c.stock) })),
      );
      toast({ description: `${toFa(r.updated)} آگهی به‌روزرسانی شد — تغییرات بلافاصله اعمال شد.` });
      // مقادیر پایه تازه شوند تا ردیف‌ها «تغییر یافته» از ذهن بیرون بیایند
      setRows((rs) =>
        rs?.map((r) => {
          const c = changed.find((x) => x.id === r.id);
          return c ? { ...r, basePrice: num(c.price), baseStock: num(c.stock) } : r;
        }) ?? rs,
      );
    } catch (err) {
      toast({
        description: err instanceof Error ? err.message : 'خطا در ذخیره — دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !rows) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          aria-label="بازگشت به محصولات من"
          title="بازگشت"
        >
          <Link href="/panel/products">
            <ArrowRight size={17} />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-base font-extrabold sm:text-lg">تغییر قیمت گروهی</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            قیمت و موجودی آگهی‌ها را سریع به‌روزرسانی کنید — بدون تایید مجدد، بلافاصله اعمال می‌شود.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <PanelCard className="py-10 text-center text-sm text-muted-foreground">
          آگهی فعالی برای ویرایش گروهی ندارید.
        </PanelCard>
      ) : (
        <>
          {/* سربرگ ستون‌ها — فقط دسکتاپ */}
          <div className="hidden grid-cols-[1fr_180px_170px] gap-3 px-4 pb-1 text-[11px] font-bold text-muted-foreground lg:grid">
            <span>عنوان محصول</span>
            <span>قیمت حداقل خرید (تومان)</span>
            <span>موجودی</span>
          </div>

          {/* لیست — دسکتاپ گرید، موبایل کارت */}
          <div className="space-y-2.5">
            {rows.map((r) => {
              const dirty = num(r.price) !== r.basePrice || num(r.stock) !== r.baseStock;
              return (
                <div
                  key={r.id}
                  className={cn(
                    'rounded-lg border bg-card p-3.5 transition-colors lg:grid lg:grid-cols-[1fr_180px_170px] lg:items-center lg:gap-3',
                    dirty ? 'border-primary/45 bg-primary/[0.04]' : 'border-border',
                  )}
                >
                  {/* عنوان + خلاصهٔ قبل */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{r.productName}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      فعلی: <span className="font-num">{r.basePrice > 0 ? priceFa(r.basePrice) : 'تماس بگیرید'}</span> ·{' '}
                      موجودی <span className="font-num">{toFa(r.baseStock)}</span> {r.unit}
                    </p>
                  </div>

                  {/* اینپوت‌ها — موبایل کنار هم، دسکتاپ در ستون خودش */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 lg:mt-0 lg:grid-cols-1">
                    <div>
                      <span className="mb-1 block text-[10px] font-bold text-muted-foreground lg:hidden">
                        قیمت (تومان)
                      </span>
                      <UnitInput
                        kind="price"
                        value={r.price}
                        onValueChange={(v) => patchRow(r.id, { price: v })}
                        unit="تومان"
                        ariaLabel={`قیمت ${r.productName}`}
                        invalid={badPrice(r)}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-[10px] font-bold text-muted-foreground lg:hidden">
                        موجودی
                      </span>
                      <UnitInput
                        kind="plain"
                        value={r.stock}
                        onValueChange={(v) => patchRow(r.id, { stock: v })}
                        unit={r.unit}
                        ariaLabel={`موجودی ${r.productName}`}
                      />
                    </div>
                  </div>

                  {/* نشان تغییر — فقط دسکتاپ */}
                  <span
                    className={cn(
                      'hidden items-center gap-1 text-[11px] font-bold lg:flex',
                      dirty ? 'text-primary' : 'text-transparent',
                    )}
                    aria-hidden={!dirty}
                  >
                    <Check size={13} /> تغییر یافت
                  </span>
                </div>
              );
            })}
          </div>

          {/* نوار ذخیره */}
          <div className="sticky bottom-16 z-10 rounded-lg border bg-card/95 p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur lg:bottom-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] leading-5 text-muted-foreground">
                {changed.length > 0 ? (
                  <>
                    <b className="text-primary">{toFa(changed.length)}</b> آگهی تغییر یافته — قیمت خالی یا ۰ یعنی «تماس بگیرید».
                  </>
                ) : (
                  'قیمت یا موجودی هر ردیف را که تغییر دهید، همین‌جا آمادهٔ ذخیره می‌شود.'
                )}
              </p>
              <Button
                className="h-11 min-w-36 rounded-md px-5 text-sm font-extrabold"
                onClick={() => void persist()}
                disabled={save.isPending || changed.length === 0 || hasBad}
              >
                {save.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> در حال ذخیره…
                  </>
                ) : (
                  <>
                    <Save size={15} /> ذخیره {changed.length > 0 ? `${toFa(changed.length)} تغییر` : 'تغییرات'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
