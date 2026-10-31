'use client';

/**
 * دفتر خرید من (خواسته مالک ۳۱-۱۰) — کاربر دسته‌های کالایی که «می‌خرد» را از
 * درخت انتخاب می‌کند + بازهٔ حجم خرید ماهانهٔ هر کدام. نتیجه: در فهرست
 * «خریداران» سایت دیده می‌شود — فقط نقش/دسته/استان‌وشهر/بازهٔ حجم؛ نه نام و
 * نه شماره تماس (حریم خصوصی). این دفتر هیچ ربطی به تبلیغ و ترویج آگهی ندارد.
 *
 * عملیات فوق‌ساده: جستجوی دسته → کلیک → چیپ می‌شود؛ هر چیپ فقط دو عدد و واحد.
 * حداکثر ۱۵ دسته.
 */

import { useMemo, useState } from 'react';
import { BookOpenText, Check, Loader2, PlusCircle, Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useCategoryTree, useMyBuyerBook, useSaveMyBuyerBook } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { PanelCard } from '@/components/panel/panel-parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

/** ردیف محلی فرم — قبل از ذخیره */
interface Row {
  categoryId: number;
  name: string;
  path: string;
  volumeMin: string; // ورودی کاربر (ارقام فارسی/انگلیسی)
  volumeMax: string; // خالی/۰ = بدون سقف
  unit: string;
}

const MAX_ROWS = 15;

/** برگ‌های درخت + مسیر اجداد — برای جستجوی سریع و نمایش بدون ابهام */
function flattenLeaves(
  tree: Category[],
  parents: string[] = [],
): { cat: Category; path: string }[] {
  const out: { cat: Category; path: string }[] = [];
  for (const c of tree) {
    if (c.children?.length) {
      out.push(...flattenLeaves(c.children, [...parents, c.categoryName]));
    } else {
      out.push({ cat: c, path: [...parents, c.categoryName].join(' ‹ ') });
    }
  }
  return out;
}

/** ارقام فارسی → انگلیسی */
function toEnDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export default function BuyerBookPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: book, isLoading } = useMyBuyerBook();
  const save = useSaveMyBuyerBook();
  const { data: tree = [] } = useCategoryTree();

  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [prevBook, setPrevBook] = useState<typeof book>(undefined);

  // بارگیری اولیه از سرور — الگوی رسمی React (تنظیم حین رندر، بدون effect):
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // فقط بار اول — رفرش‌های بعدی (پس از ذخیره) ویرایش‌های در جریان را بازنویسی نکنند
  if (book && prevBook === undefined) {
    setPrevBook(book);
    setRows(
      book.items.map((it) => ({
        categoryId: it.categoryId,
        name: it.name,
        path: it.name,
        volumeMin: String(it.volumeMin),
        volumeMax: it.volumeMax === 0 ? '' : String(it.volumeMax),
        unit: it.unit,
      })),
    );
  }
  const hydrated = book !== undefined;

  const units = book?.units ?? ['کیلوگرم', 'تن', 'عدد', 'بسته', 'لیتر', 'متر'];
  const leaves = useMemo(() => flattenLeaves(tree), [tree]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return leaves
      .filter(
        (l) =>
          l.cat.categoryName.includes(q) ||
          (l.cat.slug ?? '').includes(q) ||
          l.path.includes(q),
      )
      .slice(0, 8);
  }, [leaves, query]);

  const selectedIds = new Set(rows.map((r) => r.categoryId));

  const addCategory = (leaf: { cat: Category; path: string }) => {
    if (rows.length >= MAX_ROWS) {
      toast({ description: `حداکثر ${toFa(MAX_ROWS)} دسته در دفتر خرید ممکن است.`, variant: 'destructive' });
      return;
    }
    if (selectedIds.has(leaf.cat.id)) {
      toast({ description: 'این دسته قبلاً اضافه شده است.' });
      return;
    }
    // واحد پیش‌فرض از خود دسته (مثل کیلوگرم)؛ نبود → اولین واحد
    const unit = units.includes(leaf.cat.unit) ? leaf.cat.unit : units[0];
    setRows((rs) => [
      ...rs,
      {
        categoryId: leaf.cat.id,
        name: leaf.cat.categoryName,
        path: leaf.path,
        volumeMin: '',
        volumeMax: '',
        unit,
      },
    ]);
    setQuery('');
  };

  const patchRow = (i: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const saveBook = () => {
    for (const r of rows) {
      const min = Math.round(Number(toEnDigits(r.volumeMin).replace(/[^\d]/g, '')));
      if (!Number.isFinite(min) || min < 1) {
        toast({
          description: `حداقل حجم خرید ماهانهٔ «${r.name}» را وارد کنید.`,
          variant: 'destructive',
        });
        return;
      }
      const maxRaw = Math.round(Number(toEnDigits(r.volumeMax).replace(/[^\d]/g, '')));
      if (r.volumeMax.trim() !== '' && (!Number.isFinite(maxRaw) || maxRaw < min)) {
        toast({
          description: `حداکثر حجم «${r.name}» باید بیشتر از حداقل باشد (یا خالی = بدون سقف).`,
          variant: 'destructive',
        });
        return;
      }
    }
    save.mutate(
      rows.map((r) => ({
        categoryId: r.categoryId,
        volumeMin: Math.round(Number(toEnDigits(r.volumeMin).replace(/[^\d]/g, ''))),
        volumeMax:
          r.volumeMax.trim() === ''
            ? 0
            : Math.round(Number(toEnDigits(r.volumeMax).replace(/[^\d]/g, ''))),
        unit: r.unit,
      })),
      {
        onSuccess: () => {
          toast({ description: 'دفتر خرید شما ذخیره شد — از این پس در فهرست خریداران دیده می‌شوید.' });
        },
        onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
      },
    );
  };

  if (!user) {
    return (
      <PanelCard className="p-8 text-center text-sm text-muted-foreground">
        برای استفاده از دفتر خرید، ابتدا وارد حساب خود شوید.
      </PanelCard>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* سرصفحه */}
      <PanelCard className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <BookOpenText size={21} />
          </span>
          <div>
            <h1 className="text-base font-extrabold sm:text-lg">دفتر خرید من</h1>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              دسته‌هایی که به‌طور معمول می‌خرید و حجم ماهانهٔ خریدتان را ثبت کنید تا فروشندگانِ مناسب پیشنهاد
              تامین بفرستند. در فهرست خریداران فقط نقش، دسته‌ها، استان و بازهٔ حجم دیده می‌شود —{' '}
              <b className="text-foreground">نه نام و نه شماره تماس شما.</b>
            </p>
          </div>
        </div>
      </PanelCard>

      {/* افزودن دسته — جستجو در درخت */}
      <PanelCard className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold">افزودن دسته خرید</p>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {toFa(rows.length)} از {toFa(MAX_ROWS)}
          </span>
        </div>
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی کالا — مثل: پسته، برنج، لنگر..."
            className="h-10 rounded-md pe-3 ps-9 text-sm"
            aria-label="جستجوی دسته خرید"
            dir="rtl"
          />
          {results.length > 0 && (
            <ul className="absolute inset-x-0 top-11 z-20 max-h-72 overflow-auto rounded-lg border bg-card p-1 shadow-lg">
              {results.map(({ cat, path }) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => addCategory({ cat, path })}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-start transition-colors hover:bg-accent',
                      selectedIds.has(cat.id) && 'opacity-40',
                    )}
                  >
                    <PlusCircle size={15} className="mt-0.5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold">{cat.categoryName}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{path}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {rows.length === 0 && !isLoading && (
          <p className="rounded-md border border-dashed p-4 text-center text-[11px] leading-5 text-muted-foreground">
            هنوز دسته‌ای اضافه نکرده‌اید — با جستجو بالا، اولین کالای خرید خود را اضافه کنید.
          </p>
        )}
      </PanelCard>

      {/* دسته‌های انتخابی — هر ردیف فقط دو عدد + واحد */}
      {rows.length > 0 && (
        <PanelCard className="space-y-2.5">
          <p className="text-xs font-bold">دسته‌های خرید من</p>
          <ul className="space-y-2.5">
            {rows.map((r, i) => (
              <li key={r.categoryId} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold">{r.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{r.path}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="grid size-8 shrink-0 place-items-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                    aria-label={`حذف ${r.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    خرید ماهانه:
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      value={r.volumeMin ? toFa(r.volumeMin) : ''}
                      onChange={(e) => patchRow(i, { volumeMin: toEnDigits(e.target.value).replace(/[^\d]/g, '').slice(0, 9) })}
                      placeholder="از"
                      className="h-8 w-20 rounded-md text-center text-xs font-num"
                      aria-label={`حداقل حجم ماهانه ${r.name}`}
                    />
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      value={r.volumeMax ? toFa(r.volumeMax) : ''}
                      onChange={(e) => patchRow(i, { volumeMax: toEnDigits(e.target.value).replace(/[^\d]/g, '').slice(0, 9) })}
                      placeholder="تا (خالی = بی‌سقف)"
                      className="h-8 w-32 rounded-md text-center text-xs font-num"
                      aria-label={`حداکثر حجم ماهانه ${r.name}`}
                    />
                  </label>
                  <select
                    value={r.unit}
                    onChange={(e) => patchRow(i, { unit: e.target.value })}
                    className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                    aria-label={`واحد ${r.name}`}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </PanelCard>
      )}

      {/* ذخیره */}
      <Button
        className="w-full rounded-md"
        onClick={saveBook}
        disabled={save.isPending || isLoading || !hydrated}
      >
        {save.isPending ? (
          <>
            <Loader2 size={15} className="animate-spin" /> در حال ذخیره…
          </>
        ) : (
          <>
            <Check size={15} /> ذخیره دفتر خرید
          </>
        )}
      </Button>

      {isLoading && (
        <p className="text-center text-[11px] text-muted-foreground">در حال بارگیری دفتر خرید…</p>
      )}
    </div>
  );
}
