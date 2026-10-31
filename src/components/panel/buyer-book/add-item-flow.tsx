'use client';

/**
 * افزودن کالا به دفتر خرید — دو گام، دقیقاً مثل انتخاب دسته در ثبت درخواست خرید:
 * ۱) جستجو یا حرکت در درخت دسته‌ها؛ فقط شاخه‌های آخر (برگ‌ها) قابل تیک‌زدن‌اند.
 *    انتخاب‌ها به‌صورت چیپ‌های قابل حذف بالای لیست دیده می‌شوند.
 * ۲) برای هر کالا فقط «حداقل خرید» (واحد از خود دسته، ثابت) و «دوره خرید»
 *    مشخص می‌شود و ثبت نهایی انجام می‌شود.
 * موبایل: بات‌شیت پایین‌رونده / دسکتاپ: مودال مرکزی — الگوی انتخاب دسته ایمچ.
 */

import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useCategoryTree } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';
import { RootCategoryIcon } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import type { Category, PurchasePeriod } from '@/lib/types';
import { AmountInput, PeriodPicker } from './form-parts';

export interface NewBookItemInput {
  categoryId: number;
  minAmount: number;
  period: PurchasePeriod;
}

interface LeafInfo {
  cat: Category;
  rootName: string;
  parentName: string;
}

/** چک‌باکس دایره‌ای برگ — فقط نمایشی (بدون state) */
function Tick({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <span
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
        disabled && 'opacity-40',
      )}
      aria-hidden
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

export function AddItemFlow({
  open,
  onClose,
  existingIds,
  existingCount,
  limit,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  existingIds: Set<number>;
  existingCount: number;
  limit: number;
  onSubmit: (inputs: NewBookItemInput[]) => Promise<unknown>;
}) {
  const { data: tree = [] } = useCategoryTree();
  const { toast } = useToast();

  const [step, setStep] = useState<'select' | 'details'>('select');
  const [q, setQ] = useState('');
  const [stack, setStack] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Record<number, Category>>({});
  const [drafts, setDrafts] = useState<Record<number, { amount: string; period: PurchasePeriod }>>({});
  const [submitting, setSubmitting] = useState(false);

  // برگ‌های تخت برای جستجو — با نام دسته ریشه و پدر
  const leaves = useMemo(() => {
    const out: LeafInfo[] = [];
    const walk = (nodes: Category[], root: string, parent: string) => {
      nodes.forEach((n) => {
        if (n.children?.length) walk(n.children, root || n.categoryName, n.categoryName);
        else out.push({ cat: n, rootName: root || n.categoryName, parentName: parent || n.categoryName });
      });
    };
    walk(tree, '', '');
    return out;
  }, [tree]);

  const searchMode = q.trim().length > 0;
  const searchResults = useMemo(() => {
    const needle = q.trim();
    if (!needle) return [];
    return leaves
      .filter((l) => l.cat.categoryName.includes(needle) || l.parentName.includes(needle) || l.rootName.includes(needle))
      .slice(0, 30);
  }, [leaves, q]);

  const level = stack[stack.length - 1];
  const levelItems = level ? level.children ?? [] : tree;
  const selectedList = Object.values(selected);
  const title =
    step === 'details'
      ? 'حداقل خرید و دوره'
      : searchMode
        ? 'جستجوی کالا'
        : level
          ? level.categoryName
          : 'انتخاب کالا';

  const close = () => {
    onClose();
    setStep('select');
    setQ('');
    setStack([]);
    setSelected({});
    setDrafts({});
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('select');
      return;
    }
    if (searchMode) {
      setQ('');
      return;
    }
    setStack((st) => st.slice(0, -1));
  };
  const canBack = step === 'details' || searchMode || stack.length > 0;

  const toggleLeaf = (cat: Category) => {
    if (existingIds.has(cat.id)) return;
    setSelected((prev) => {
      const next = { ...prev };
      if (next[cat.id]) delete next[cat.id];
      else next[cat.id] = cat;
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      if (next[cat.id]) delete next[cat.id];
      else next[cat.id] = { amount: '', period: 'monthly' };
      return next;
    });
  };

  const goDetails = () => {
    if (existingCount + selectedList.length > limit) {
      toast({ description: `دفتر خرید حداکثر ${toFa(limit)} کالا می‌تواند داشته باشد.` });
      return;
    }
    setStep('details');
  };

  const allValid = selectedList.every((c) => Number(drafts[c.id]?.amount) > 0);

  const submit = async () => {
    const inputs: NewBookItemInput[] = selectedList.map((c) => ({
      categoryId: c.id,
      minAmount: Number(drafts[c.id].amount),
      period: drafts[c.id].period,
    }));
    setSubmitting(true);
    try {
      await onSubmit(inputs);
      close();
    } catch {
      // خطا نمایش داده می‌شود؛ کاربر می‌تواند دوباره تلاش کند
    } finally {
      setSubmitting(false);
    }
  };

  // ─── بدنه مشترک (بات‌شیت موبایل و مودال دسکتاپ) ─────────────────────
  const flow = (
    <div className="flex min-h-0 flex-1 flex-col">
      {step === 'select' ? (
        <>
          {/* جستجو */}
          <div className="shrink-0 border-b border-border/70 p-3">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجوی کالا؛ مثلاً پسته"
                aria-label="جستجوی کالا"
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ps-9"
              />
              <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground" />
            </div>
          </div>

          {/* چیپ‌های انتخاب‌شده */}
          {selectedList.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/70 px-3 py-2">
              {selectedList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleLeaf(c)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15"
                >
                  {c.categoryName}
                  <X size={11} />
                </button>
              ))}
            </div>
          )}

          {/* لیست — جستجو یا سطح جاری درخت */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {searchMode ? (
              searchResults.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">کالایی با این نام پیدا نشد.</p>
              ) : (
                <ul>
                  {searchResults.map(({ cat, rootName, parentName }) => {
                    const inBook = existingIds.has(cat.id);
                    const checked = Boolean(selected[cat.id]);
                    return (
                      <li key={cat.id}>
                        <button
                          type="button"
                          onClick={() => toggleLeaf(cat)}
                          disabled={inBook}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-sm transition-colors',
                            inBook ? 'cursor-default opacity-55' : 'hover:bg-accent',
                          )}
                        >
                          <Tick checked={checked} disabled={inBook} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{cat.categoryName}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">{rootName} / {parentName}</span>
                          </span>
                          {inBook && (
                            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              در دفتر هست
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : (
              <ul>
                {levelItems.map((c) => {
                  const isLeaf = !c.children?.length;
                  const inBook = existingIds.has(c.id);
                  const checked = Boolean(selected[c.id]);
                  if (isLeaf) {
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => toggleLeaf(c)}
                          disabled={inBook}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-sm transition-colors',
                            inBook ? 'cursor-default opacity-55' : 'hover:bg-accent',
                          )}
                        >
                          <Tick checked={checked} disabled={inBook} />
                          <span className="min-w-0 flex-1 truncate font-medium">{c.categoryName}</span>
                          {inBook ? (
                            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              در دفتر هست
                            </span>
                          ) : (
                            <span className="shrink-0 text-[11px] text-muted-foreground">{c.unit}</span>
                          )}
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setStack((st) => [...st, c])}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <span className="line-clamp-1">{c.categoryName}</span>
                        <ChevronLeft size={16} className="shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* پانوشت گام انتخاب */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 p-3">
            <span className="text-xs text-muted-foreground">
              {selectedList.length > 0 ? `${toFa(selectedList.length)} کالا انتخاب شد` : 'شاخه‌های آخر قابل انتخاب‌اند'}
            </span>
            <Button size="sm" className="rounded-md" disabled={selectedList.length === 0} onClick={goDetails}>
              ادامه
              <ChevronLeft size={14} />
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* گام جزئیات — حداقل خرید و دوره هر کالا */}
          <div className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto px-4">
            {selectedList.map((c) => {
              const draft = drafts[c.id];
              const leaf = leaves.find((l) => l.cat.id === c.id);
              const rootName = leaf?.rootName ?? c.categoryName;
              const parentName = leaf?.parentName ?? c.categoryName;
              return (
                <div key={c.id} className="flex gap-3 py-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <RootCategoryIcon rootName={rootName} size={18} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div>
                      <p className="text-sm font-bold">{c.categoryName}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {rootName} / {parentName} — واحد: {c.unit}
                      </p>
                    </div>
                    <AmountInput
                      value={draft?.amount ?? ''}
                      onChange={(v) => setDrafts((prev) => ({ ...prev, [c.id]: { ...prev[c.id], amount: v } }))}
                      unit={c.unit}
                      placeholder={`مثلاً ${toFa(c.min || 100)}`}
                    />
                    <PeriodPicker
                      value={draft?.period ?? 'monthly'}
                      onChange={(p) => setDrafts((prev) => ({ ...prev, [c.id]: { ...prev[c.id], period: p } }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* پانوشت ثبت نهایی */}
          <div className="shrink-0 border-t border-border/70 p-3">
            <Button size="lg" className="w-full rounded-md" disabled={!allValid || submitting} onClick={submit}>
              {submitting && <Loader2 size={17} className="animate-spin" />}
              {submitting ? 'در حال ثبت…' : 'ثبت در دفتر خرید'}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* موبایل — بات‌شیت */}
      <BottomSheet open={open} onClose={close} onBack={canBack ? handleBack : undefined} title={title}>
        <div className="flex h-[68vh] flex-col">{flow}</div>
      </BottomSheet>

      {/* دسکتاپ — مودال مرکزی */}
      {open && (
        <div
          className="animate-sheet-fade fixed inset-0 z-[60] hidden items-center justify-center p-4 nav-desktop:flex"
          role="dialog"
          aria-modal="true"
          aria-label="افزودن کالا به دفتر خرید"
        >
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative flex max-h-[76vh] w-full max-w-md flex-col rounded-xl bg-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-3 py-3">
              {canBack ? (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="بازگشت"
                  className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent"
                >
                  <ChevronRight size={20} />
                </button>
              ) : (
                <span className="size-8" aria-hidden />
              )}
              <h2 className="min-w-0 truncate px-2 text-base font-bold">{title}</h2>
              <button
                type="button"
                onClick={close}
                aria-label="بستن"
                className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent"
              >
                <X size={20} />
              </button>
            </div>
            {flow}
          </div>
        </div>
      )}
    </>
  );
}
