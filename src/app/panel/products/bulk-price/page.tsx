'use client';

/**
 * تغییر قیمت گروهی (خواسته مالک ۴-۱۱) — لیست آگهی‌های فعال خودم برای
 * آپدیت سریع همه در یک صفحه:
 *  • دسکتاپ: عین اکسل — ردیف‌های زیر هم، سه اینپوت کنار هم در همان ردیف
 *    (قیمت / موجودی / حداقل سفارش) تا کاربر سریع پایین برود و تایپ کند
 *  • موبایل: کارت‌های جمع‌وجور با سه اینپوت (دو تا کنار هم + حداقل سفارش)
 *  • فقط ردیف‌های تغییر یافته ذخیره می‌شوند؛ بدون تایید مجدد (وضعیت حفظ می‌شود)
 *  • مینیمال (خواسته مالک ۴-۱۱): بدون جمله‌های توضیحی — فرم سبک و خلوت
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2, Save } from 'lucide-react';
import { useBulkUpdatePrices, useMyProducts } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { UnitInput } from '@/components/shared/unit-input';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

/** ردیف ویرایش — مقدار زندهٔ فرم */
interface Row {
  id: number;
  productName: string;
  unit: string;
  /** مقدار اولیهٔ سرور — برای تشخیص تغییر */
  basePrice: number;
  baseStock: number;
  baseMinOrder: number;
  baseValidity: number;
  price: string;
  stock: string;
  minOrder: string;
  /** اعتبار قیمت به روز (۷-۱۱ دور هفدهم) — «اگر در ویرایش کالا وارد نکرده
   *  بود از همین‌جا بگیرد»: هر ردیف مقدار خودش را دارد؛ پیش‌فرض ۳ روز */
  validity: string;
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
          baseMinOrder: p.minSaleAmount ?? 0,
          baseValidity: p.priceValidityDays ?? 3,
          price: p.minSalePrice ? p.minSalePrice.toLocaleString('en-US') : '',
          stock: p.stock ? p.stock.toLocaleString('en-US') : '',
          minOrder: p.minSaleAmount ? p.minSaleAmount.toLocaleString('en-US') : '',
          validity: String(p.priceValidityDays ?? 3),
        })),
    );
  }

  /** اعتبارِ واردشدهٔ معتبر — ۰/خالی یعنی «دست نخورده» و همان قبلی می‌ماند */
  const validityOf = (r: Row) => {
    const v = num(r.validity);
    return v >= 1 ? Math.min(v, 365) : r.baseValidity;
  };

  /** ردیف‌های واقعاً تغییر یافته — فقط همین‌ها ارسال می‌شوند */
  const changed = useMemo(
    () =>
      (rows ?? []).filter(
        (r) =>
          num(r.price) !== r.basePrice ||
          num(r.stock) !== r.baseStock ||
          num(r.minOrder) !== r.baseMinOrder ||
          validityOf(r) !== r.baseValidity,
      ),
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
        changed.map((c) => ({
          id: c.id,
          minSalePrice: num(c.price),
          stock: num(c.stock),
          minSaleAmount: num(c.minOrder),
          priceValidityDays: validityOf(c),
        })),
      );
      toast({ description: `${toFa(r.updated)} آگهی به‌روزرسانی شد.` });
      // مقادیر پایه تازه شوند تا ردیف‌ها «تغییر یافته» از ذهن بیرون بیایند
      setRows((rs) =>
        rs?.map((r) => {
          const c = changed.find((x) => x.id === r.id);
          return c
            ? { ...r, basePrice: num(c.price), baseStock: num(c.stock), baseMinOrder: num(c.minOrder), baseValidity: validityOf(c) }
            : r;
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
        <h1 className="text-base font-extrabold sm:text-lg">تغییر قیمت گروهی</h1>
      </div>

      {rows.length === 0 ? (
        <PanelCard className="py-10 text-center text-sm text-muted-foreground">
          آگهی فعالی برای ویرایش گروهی ندارید.
        </PanelCard>
      ) : (
        <>
          {/* سربرگ ستون‌ها — فقط دسکتاپ (عین اکسل)؛ ستون اعتبار (۷-۱۱ دور هفدهم) */}
          <div className="hidden grid-cols-[minmax(0,1fr)_150px_140px_140px_120px_84px] gap-3 px-3 pb-1 text-[11px] font-bold text-muted-foreground lg:grid">
            <span>عنوان محصول</span>
            <span>قیمت (تومان)</span>
            <span>موجودی</span>
            <span>حداقل سفارش</span>
            <span>اعتبار قیمت</span>
            <span />
          </div>

          {/* ردیف‌ها — دسکتاپ: هر چهار اینپوت در همان ردیف کنار هم (عین اکسل) */}
          <div className="space-y-2">
            {rows.map((r) => {
              const dirty =
                num(r.price) !== r.basePrice ||
                num(r.stock) !== r.baseStock ||
                num(r.minOrder) !== r.baseMinOrder ||
                validityOf(r) !== r.baseValidity;
              return (
                <div
                  key={r.id}
                  className={cn(
                    'rounded-lg border bg-card p-3 transition-colors lg:grid lg:grid-cols-[minmax(0,1fr)_150px_140px_140px_120px_84px] lg:items-center lg:gap-3 lg:p-2.5',
                    dirty ? 'border-primary/45 bg-primary/[0.04]' : 'border-border',
                  )}
                >
                  {/* عنوان */}
                  <p className="truncate px-0.5 text-sm font-bold lg:py-1">{r.productName}</p>

                  {/* اینپوت‌ها — دسکتاپ: هر اینپوت مستقیم در ستون خودش (display:contents)؛
                      موبایل: دو‌تا کنار هم در دو ردیف */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 lg:mt-0 lg:contents">
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
                    <div>
                      <span className="mb-1 block text-[10px] font-bold text-muted-foreground lg:hidden">
                        حداقل سفارش
                      </span>
                      <UnitInput
                        kind="plain"
                        value={r.minOrder}
                        onValueChange={(v) => patchRow(r.id, { minOrder: v })}
                        unit={r.unit}
                        ariaLabel={`حداقل سفارش ${r.productName}`}
                      />
                    </div>
                    {/* اعتبار قیمت (۷-۱۱ دور هفدهم) — عدد روز؛ خالی/۰ = همان قبلی */}
                    <div>
                      <span className="mb-1 block text-[10px] font-bold text-muted-foreground lg:hidden">
                        اعتبار قیمت (روز)
                      </span>
                      <UnitInput
                        kind="plain"
                        value={r.validity}
                        onValueChange={(v) => patchRow(r.id, { validity: v })}
                        unit="روز"
                        ariaLabel={`اعتبار قیمت ${r.productName}`}
                      />
                    </div>
                  </div>

                  {/* نشان تغییر — فقط دسکتاپ */}
                  <span
                    className={cn(
                      'hidden items-center justify-center gap-1 text-[11px] font-bold lg:flex',
                      dirty ? 'text-primary' : 'text-transparent',
                    )}
                    aria-hidden={!dirty}
                  >
                    <Check size={13} /> تغییر
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
                    <b className="text-primary">{toFa(changed.length)}</b> آگهی تغییر یافته
                  </>
                ) : (
                  'اعتبار قیمت: پنجره‌ای که بعد از آن، بدون آپدیت، آگهی «قیمت منقضی شده» می‌گیرد (پیش‌فرض ۳ روز).'
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
