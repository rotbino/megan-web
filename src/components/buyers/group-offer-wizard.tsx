'use client';

/**
 * ویزار ارسال گروهی پیشنهاد تامین (بازطراحی مالک ۱-۱۱ — به‌جای چک‌باکس روی
 * کارت‌ها، یک دکمهٔ «پیشنهاد تامین گروهی» بالای لیست این ویزار را باز می‌کند):
 *  • گام ۱ — انتخاب دسته‌بندی تا دستهٔ آخر (برگ): عین ویزار ثبت محصول —
 *    جستجوی سریع + سه ستون آبشاری دسکتاپ / پیمایش سطح‌به‌سطح موبایل.
 *    هر نیاز ثبت‌شده به یک دستهٔ آخر وصل است؛ پیشنهاد هم دقیقاً برای همان
 *    دسته می‌رود.
 *  • گام ۲ — انتخاب خریدارانِ همان دسته. خواسته مالک ۶-۱۱: قیمتِ
 *    ازپیش‌محاسبه و سقف/سهمیه حذف شد — مبلغ همان لحظهٔ ارسال از کیف پول
 *    کسر و در پیام موفقیت اعلام می‌شود؛ انتخاب‌ها بین صفحه‌ها حفظ می‌شوند.
 *  • گام ۳ — فرم پیشنهاد (همان فرم مشترک تکی).
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, CheckCheck, ChevronLeft, ChevronRight, Send, Users, X } from 'lucide-react';
import { useBuyerDirectory } from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { CategoryCascade } from '@/components/panel/product-form/category-cascade';
import { SupplyOfferForm } from '@/components/buyers/supply-offer-modal';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  PERIOD_LABELS,
  type BuyerDirectoryItem,
  type Category,
  type Product,
} from '@/lib/types';

const STEP_TITLES_FULL = ['دسته‌بندی کالا', 'انتخاب خریداران', 'پیشنهاد تامین'] as const;
const STEP_TITLES_FIXED = ['انتخاب خریداران', 'پیشنهاد تامین'] as const;

export function GroupOfferWizard({
  open,
  onClose,
  onSent,
  products,
  category,
}: {
  open: boolean;
  onClose: () => void;
  onSent?: (buyerIds: string[]) => void;
  /** آگهی‌های خود فروشنده — برای نمونهٔ پارامتریک */
  products?: Product[];
  /** دستهٔ ازپیش‌معلوم (صفحهٔ «خریداران این کالا» — خواسته مالک ۴-۱۱):
   *  کالا مشخص است و گام انتخاب دسته‌بندی کلاً حذف می‌شود */
  category?: Category | null;
}) {
  // حالت دستهٔ ثابت — دوگامی؛ صفحهٔ خریداران کالا از اینجا می‌آید
  const fixed = Boolean(category);
  const STEP_TITLES = fixed ? STEP_TITLES_FIXED : STEP_TITLES_FULL;
  const [step, setStep] = useState<1 | 2 | 3>(fixed ? 2 : 1);
  const [leaf, setLeaf] = useState<Category | null>(category ?? null);
  const [path, setPath] = useState<Category[]>(category ? [category] : []);
  // انتخاب‌ها — Map تا بین صفحه‌های گام ۲ حفظ شود
  const [picked, setPicked] = useState<Map<string, BuyerDirectoryItem>>(new Map());

  // بستن ویزار = ریست کامل
  const close = () => {
    setStep(fixed ? 2 : 1);
    setLeaf(category ?? null);
    setPath(category ? [category] : []);
    setPicked(new Map());
    onClose();
  };

  // Esc — بستن
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  if (!open) return null;

  // گیت کالا (خواسته مالک ۴-۱۱) — فروشنده باید کالای همین دسته را در
  // محصولات خودش داشته باشد؛ اگر ندارد، همین‌جای گام ۱ پیام روشن می‌گیرد
  const hasLeafProduct =
    !leaf ||
    (products ?? []).some(
      (p) => (p.status === 'confirmed' || p.status === 'pending') && p.subCategoryId === leaf.id,
    );

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ارسال گروهی پیشنهاد تامین"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
        {/* سربرگ + استپر */}
        <div className="border-b bg-secondary/40 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <Users size={17} className="text-primary" />
              ارسال گروهی پیشنهاد تامین
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="بستن"
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={17} />
            </button>
          </div>
          {/* استپر سه‌گامی */}
          <ol className="mt-3 flex items-center gap-1.5" aria-label="مراحل">
            {STEP_TITLES.map((t, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const done = step > n;
              const active = step === n;
              return (
                <li key={t} className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold transition-colors',
                      done
                        ? 'bg-emerald-500 text-white'
                        : active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {done ? <Check size={13} /> : toFa(n)}
                  </span>
                  <span
                    className={cn(
                      'truncate text-[11px] leading-4',
                      active ? 'font-bold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {t}
                  </span>
                  {n < 3 && <span aria-hidden className="h-px flex-1 bg-border" />}
                </li>
              );
            })}
          </ol>
        </div>

        {/* بدنهٔ گام‌ها */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {step === 1 && (
            <div>
              <StepCategory
                leaf={leaf}
                onChange={(v) => {
                  setLeaf(v.leaf);
                  setPath(v.path);
                }}
              />
              {/* گیت کالا — دستهٔ انتخاب‌شده را ندارید: پیام + مسیر ثبت محصول */}
              {leaf && !hasLeafProduct && (
                <div className="mt-3 rounded-lg border border-dashed border-primary/40 bg-primary/[0.03] p-3.5 text-center">
                  <p className="text-xs font-extrabold leading-6">
                    برای ارسال پیشنهاد تامین {leaf.categoryName} باید این کالا را در لیست محصولات خود داشته باشید.
                  </p>
                  <Button asChild size="sm" className="mt-2.5 rounded-md">
                    <Link href="/panel/products/new">ثبت محصول</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
          {step === 2 && leaf && (
            <StepPickBuyers leaf={leaf} picked={picked} onPick={setPicked} />
          )}
          {step === 3 && leaf && (
            <div>
              <p className="mb-3 rounded-lg bg-primary/5 px-3 py-2 text-[11px] leading-5 text-foreground/80">
                پیشنهاد تامین <b>{leaf.categoryName}</b> برای{' '}
                <b>{toFa(picked.size)}</b> خریدار ارسال می‌شود.
              </p>
              <SupplyOfferForm
                targets={[...picked.values()]}
                products={products}
                category={leaf}
                onSent={onSent}
                onCancel={close}
              />
            </div>
          )}
        </div>

        {/* پانویس ناوبری گام‌ها (گام ۳ دکمه‌های خودش را دارد) */}
        {step < 3 && (
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3 sm:px-5">
            <ButtonStep
              variant="back"
              onClick={() =>
                step === 1 || (fixed && step === 2)
                  ? close()
                  : setStep((s) => (s - 1) as 1 | 2)
              }
            >
              {step === 1 || (fixed && step === 2) ? (
                <>
                  <X size={15} /> انصراف
                </>
              ) : (
                <>
                  <ChevronRight size={15} /> مرحلهٔ قبل
                </>
              )}
            </ButtonStep>
            {step === 1 ? (
              <ButtonStep variant="next" disabled={!leaf || !hasLeafProduct} onClick={() => setStep(2)}>
                مرحلهٔ بعد: انتخاب خریداران <ChevronLeft size={15} />
              </ButtonStep>
            ) : (
              <ButtonStep variant="next" disabled={picked.size === 0} onClick={() => setStep(3)}>
                مرحلهٔ بعد: پیشنهاد تامین <ChevronLeft size={15} />
              </ButtonStep>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** دکمهٔ گام — یکدست برای قبل/بعد */
function ButtonStep({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: 'back' | 'next';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-colors',
        variant === 'next'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45'
          : 'border border-input bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/** گام ۱ — انتخاب دسته تا برگ (عین ویزار ثبت محصول) */
function StepCategory({
  leaf,
  onChange,
}: {
  leaf: Category | null;
  onChange: (v: { path: Category[]; leaf: Category | null }) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
        دستهٔ آخر کالا را انتخاب کنید (مثلاً کشاورزی / صیفی / سیب زمینی) — پیشنهاد شما
        فقط برای خریدارانِ همین دسته ارسال می‌شود.
      </p>
      <CategoryCascade value={{ path: leaf ? [leaf] : [], leaf }} onChange={onChange} />
    </div>
  );
}

/** گام ۲ — خریداران همان دسته؛ مبلغ و سقف حذف شد (خواسته مالک ۶-۱۱:
 *  هزینه لحظهٔ ارسال حساب می‌شود — نمایش ازپیش‌محاسبه لازم نیست) */
function StepPickBuyers({
  leaf,
  picked,
  onPick,
}: {
  leaf: Category;
  picked: Map<string, BuyerDirectoryItem>;
  onPick: (m: Map<string, BuyerDirectoryItem>) => void;
}) {
  const [page, setPage] = useState(1);
  const dir = useBuyerDirectory({ categoryId: leaf.id, page, perPage: 48 });
  const items = dir.data?.items ?? [];
  const total = dir.data?.total ?? 0;

  const toggle = (b: BuyerDirectoryItem) => {
    const next = new Map(picked);
    if (next.has(b.id)) next.delete(b.id);
    else next.set(b.id, b);
    onPick(next);
  };

  const allShownPicked = useMemo(
    () => items.length > 0 && items.every((b) => picked.has(b.id)),
    [items, picked],
  );

  const toggleAllShown = () => {
    const next = new Map(picked);
    if (allShownPicked) {
      for (const b of items) next.delete(b.id);
    } else {
      for (const b of items) next.set(b.id, b);
    }
    onPick(next);
  };

  return (
    <div>
      {/* خلاصهٔ دسته */}
      <div className="mb-3 rounded-lg border border-dashed bg-secondary/40 px-3 py-2.5 text-[11px] leading-5">
        <p>
          خریداران <b>{leaf.categoryName}</b> —{' '}
          {dir.isLoading ? 'در حال بارگذاری…' : <b>{toFa(total)}</b>}
          {total > items.length && (
            <span className="text-muted-foreground"> (صفحهٔ {toFa(page)})</span>
          )}
        </p>
      </div>

      {/* انتخاب همهٔ همین صفحه */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={toggleAllShown}
          className="mb-2 flex w-full items-center justify-between rounded-md bg-secondary/60 px-3 py-2 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-secondary"
        >
          <span className="flex items-center gap-1.5">
            <CheckCheck size={14} />
            {allShownPicked ? 'لغو انتخاب همین صفحه' : 'انتخاب همهٔ همین صفحه'}
          </span>
          <span className="font-num">
            {toFa(items.filter((b) => picked.has(b.id)).length)} / {toFa(items.length)}
          </span>
        </button>
      )}

      {/* لیست خریداران */}
      {dir.isLoading && !dir.data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-secondary/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <Users size={26} className="mx-auto text-muted-foreground/50" />
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            هنوز خریداری در «{leaf.categoryName}» ثبت نکرده است.
            <br />
            دستهٔ دیگری را امتحان کنید یا بعداً برگردید.
          </p>
        </div>
      ) : (
        <ul className={cn('space-y-2 transition-opacity', dir.isFetching && 'opacity-60')}>
          {items.map((b) => {
            const on = picked.has(b.id);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => toggle(b)}
                  aria-pressed={on}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md border p-3 text-start transition-colors',
                    on ? 'border-primary/50 bg-primary/5' : 'bg-card hover:border-foreground/25',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded border transition-colors',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                    )}
                  >
                    {on && <Check size={13} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 text-[13px] font-bold">
                      {b.buyerName}
                      <span className="font-normal text-muted-foreground">
                        خریدار {toFa(b.minAmount)} {b.unit} {b.categoryName} —{' '}
                        {PERIOD_LABELS[b.period] ?? 'ماهیانه'}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {[b.province, b.city].filter(Boolean).join(' - ') || 'موقعیت نامشخص'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* صفحه‌بندی داخل گام */}
      {total > items.length && (
        <div className="mt-3 flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 rounded-md border border-input bg-card px-3 py-1.5 font-bold text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            <ChevronRight size={14} /> قبلی
          </button>
          <span className="text-muted-foreground">
            صفحهٔ {toFa(page)} از {toFa(Math.ceil(total / 48))}
          </span>
          <button
            type="button"
            disabled={page >= Math.ceil(total / 48)}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 rounded-md border border-input bg-card px-3 py-1.5 font-bold text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40"
          >
            بعدی <ChevronLeft size={14} />
          </button>
        </div>
      )}

      {picked.size > 0 && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-primary">
          <Send size={12} />
          {toFa(picked.size)} خریدار انتخاب شد
        </p>
      )}
    </div>
  );
}
