'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useCategoryTree } from '@/lib/mock/hooks';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

/**
 * انتخاب‌گر دسته‌بندی — باکس فرم که مودال دسته‌ها را باز می‌کند.
 * موبایل: بات‌شیت پایین‌رونده سلسله‌مراتبی (الگوی ایمچ) / دسکتاپ: مودال مرکزی.
 * کاربر تا آخرین نودِ دسته کالا پایین می‌رود و برگِ پایانی انتخاب می‌شود.
 */
export function CategoryPicker({
  value,
  onChange,
  placeholder = 'دسته‌بندی محصول را انتخاب کنید.',
}: {
  value: Category | null;
  onChange: (c: Category | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<Category[]>([]);
  const { data: tree = [] } = useCategoryTree();

  const level = stack[stack.length - 1];
  const items = level ? level.children ?? [] : tree;
  const title = level ? level.categoryName : 'همه دسته ها';

  const pick = (c: Category) => {
    if (c.children?.length) {
      setStack((st) => [...st, c]);
      return;
    }
    onChange(c);
    close();
  };

  const close = () => {
    setOpen(false);
    setStack([]);
  };

  const list = (
    <ul>
      {items.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => pick(c)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-accent"
          >
            <span className="line-clamp-1">{c.categoryName}</span>
            {c.children?.length ? (
              <ChevronLeft size={16} className="shrink-0 text-muted-foreground" />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* باکس فرم — ظاهر اینپوت، فقط‌خواندنی */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-start text-sm shadow-xs transition-colors hover:border-foreground/30',
            !value && 'text-muted-foreground',
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <LayoutGrid size={16} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">{value ? value.categoryName : placeholder}</span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="حذف دسته‌بندی انتخاب‌شده"
            className="absolute end-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-destructive"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* موبایل — بات‌شیت سلسله‌مراتبی */}
      <BottomSheet
        open={open}
        onClose={close}
        onBack={stack.length ? () => setStack((st) => st.slice(0, -1)) : undefined}
        title={title}
      >
        {list}
      </BottomSheet>

      {/* دسکتاپ — مودال مرکزی */}
      {open && (
        <div
          className="fixed inset-0 z-[60] hidden items-center justify-center p-4 nav-desktop:flex"
          role="dialog"
          aria-modal="true"
          aria-label="انتخاب دسته‌بندی"
        >
          <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative flex max-h-[70vh] w-full max-w-md flex-col rounded-xl bg-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-3 py-3">
              {stack.length ? (
                <button
                  type="button"
                  onClick={() => setStack((st) => st.slice(0, -1))}
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
            <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-2">{list}</div>
          </div>
        </div>
      )}
    </>
  );
}
