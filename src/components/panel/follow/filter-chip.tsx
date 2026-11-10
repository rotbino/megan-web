'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * چیپ فیلتر دیوار-سبک — تک‌صفحهٔ CRM پیگیری‌ها.
 * موبایل: بات‌شیت از پایین (الگوی مودال‌های ایمچ) / دسکتاپ: پاپ‌اور زیر چیپ.
 * children محتوای گزینه‌هاست (معمولاً FilterOption)؛ خودِ چیپ فقط باز/بسته می‌کند.
 * چیپ فعال (فیلر انتخاب‌شده) به‌جای فلش، ضربدرِ حذف فیلتر نشان می‌دهد.
 */
export function FilterChip({
  icon: Icon,
  label,
  value,
  active = false,
  onClear,
  sheetTitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** برچسب پایه — وقتی فیلتری انتخاب نشده نمایش داده می‌شود */
  label: string;
  /** مقدار انتخاب‌شده — زیر برچسب به‌جای آن می‌آید */
  value?: string | null;
  active?: boolean;
  /** حذف فیلتر — فقط برای فیلترهای واقعی (مرتب‌سازی onClear ندارد) */
  onClear?: () => void;
  sheetTitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // بستن پاپ‌اور دسکتاپ با کلیک بیرون / Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const clearable = active && onClear != null;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border bg-card px-3 text-xs font-medium transition-colors',
          active
            ? 'border-primary/45 bg-primary/10 text-primary'
            : 'border-border text-foreground/85 hover:border-foreground/30',
        )}
      >
        <Icon size={14} className={active ? 'text-primary' : 'text-muted-foreground'} />
        <span className="max-w-36 truncate">{value ?? label}</span>
        {clearable ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`حذف فیلتر ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onClear();
              }
            }}
            className="grid size-4.5 place-items-center rounded-full text-primary/80 transition-colors hover:bg-primary/15 hover:text-primary"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={13} className={active ? 'text-primary/80' : 'text-muted-foreground'} />
        )}
      </button>

      {/* دسکتاپ — پاپ‌اور زیر چیپ */}
      {open && (
        <div className="absolute end-0 top-[calc(100%+6px)] z-40 hidden w-72 max-w-[calc(100vw-2rem)] rounded-md border bg-card p-2 shadow-xl nav-desktop:block">
          <div className="max-h-80 overflow-y-auto overscroll-contain">{children}</div>
        </div>
      )}

      {/* موبایل — بات‌شیت (الگوی مودال‌های ایمچ) */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={sheetTitle}>
        <div className="space-y-1">{children}</div>
      </BottomSheet>
    </div>
  );
}

/**
 * گزینهٔ داخل چیپ — ردیف قابل انتخاب با شمار اختیاری و دکمه‌های جانبی
 * (مدیریت پرونده‌ها: تغییر نام/حذف). div است نه button تا دکمه‌های تودرتوی
 * مجاز HTML بمانند.
 */
export function FilterOption({
  selected,
  onSelect,
  children,
  count,
  trailing,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  count?: number;
  /** کنترل‌های جانبی (آیکون‌های مدیریت) — باید خودشان stopPropagation کنند */
  trailing?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2.5 text-start text-sm transition-colors',
        selected ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-accent',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count != null && (
        <span className={cn('shrink-0 text-[11px]', selected ? 'text-primary/80' : 'text-muted-foreground')}>
          {toFa(count)}
        </span>
      )}
      {trailing}
    </div>
  );
}
