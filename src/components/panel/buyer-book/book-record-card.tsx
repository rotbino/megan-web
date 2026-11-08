'use client';

/**
 * رکورد کارت دفتر خرید — تمام‌عرض با نوار اقدام پایین کارت (خواستهٔ مالک ۸-۱۱):
 *  • سربرگ: کاشی آیکون دسته + نام + چیپ دوره + چیپ وضعیت بازبینی
 *    (تایید شده/در انتظار تایید/رد شده) + مسیر + حداقل خرید.
 *  • دلایل رد — فقط ردشده، زیر شرح.
 *  • نوار اقدام: دکمهٔ مهم «پیشنهادها» (پیشنهادهای تامین همین کالا — کوتاه‌شده
 *    از «پیشنهادهای تامین این کالا») + ویرایش + سه‌نقطه (حذف) کنار هم؛
 *    کلیک‌شدن کل بدنه حذف شد — مقصد حالا دکمهٔ مشخص خودش است.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Inbox, MoreVertical, PencilLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toFa, unitHintFa } from '@/lib/format';
import { RootCategoryIcon } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { PERIOD_LABELS, type BuyerBookItem } from '@/lib/types';

const STATUS_STYLE: Record<BuyerBookItem['status'], { label: string; cls: string }> = {
  confirmed: { label: 'تایید شده', cls: 'bg-emerald-50 text-emerald-600' },
  pending: { label: 'در انتظار تایید', cls: 'bg-amber-50 text-amber-600' },
  rejected: { label: 'رد شده', cls: 'bg-red-50 text-red-600' },
};

export function BookRecordCard({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: BuyerBookItem;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hint = unitHintFa(item.minAmount, item.unit);
  const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;

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
    <article
      className={cn(
        'rounded-lg border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40',
        deleting && 'pointer-events-none opacity-50',
      )}
    >
      {/* شرح کالا */}
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <RootCategoryIcon rootName={item.rootName} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold">{item.name}</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {PERIOD_LABELS[item.period]}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', status.cls)}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {[item.rootName, item.parentName].filter(Boolean).join(' / ')}
          </p>
          <p className="mt-2 text-[13px] leading-6">
            حداقل خرید: <b className="font-extrabold">{toFa(item.minAmount)}</b> {item.unit}
            {hint && <span className="text-muted-foreground"> ({hint})</span>}
          </p>
          {item.status === 'rejected' && item.rejectionReasons.length > 0 && (
            <div className="mt-2.5 rounded-md border border-red-100 bg-red-50/60 p-2.5">
              <p className="text-[11px] font-bold text-red-600">دلایل رد شدن:</p>
              <ul className="mt-1 list-disc space-y-0.5 pe-4 text-[11px] leading-5 text-red-700/90">
                {item.rejectionReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* نوار اقدام — پیشنهادها (مهم) + ویرایش + سه‌نقطه، کنار هم (خواستهٔ مالک ۸-۱۱) */}
      <div className="flex items-center gap-2 border-t border-border/60 p-3">
        <Button asChild size="sm" className="rounded-md text-xs">
          <Link href={`/panel/received-offers?category=${item.categoryId}`}>
            <Inbox size={14} className="ms-0.5" />
            پیشنهادها
          </Link>
        </Button>
        <div className="ms-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-md"
            aria-label={`ویرایش ${item.name}`}
            title="ویرایش"
            onClick={onEdit}
          >
            <PencilLine size={15} />
          </Button>
          <div className="relative" ref={menuRef}>
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
              <div
                role="menu"
                className="absolute end-0 top-[calc(100%+6px)] z-30 w-40 rounded-md border bg-card p-1 shadow-lg"
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
                  حذف از دفتر خرید
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
