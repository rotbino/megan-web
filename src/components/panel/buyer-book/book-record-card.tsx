'use client';

/**
 * رکورد کارت دفتر خرید — دیزاین رکوردمحور و تمیز:
 * کاشی آیکون دسته + نام کالا + مسیر + حداقل خرید (واحد ثابت دسته) + چیپ دوره،
 * دکمه ویرایش و دکمه سه‌نقطه با گزینه حذف.
 * بدنهٔ کارت کلیک‌شو است (خواسته مالک ۲-۱۱ دور ۱۵): هر کالا → پیشنهادهای
 * تامینِ همان گروه در /panel/received-offers?category=… — لینک مستقل حذف شد.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Inbox, MoreVertical, PencilLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toFa, unitHintFa } from '@/lib/format';
import { RootCategoryIcon } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { PERIOD_LABELS, type BuyerBookItem } from '@/lib/types';

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
      <div className="flex items-start gap-3 p-4">
        {/* بدنهٔ کلیک‌شو → پیشنهادهای تامین همین گروه کالا (خواسته مالک دور ۱۵) */}
        <Link
          href={`/panel/received-offers?category=${item.categoryId}`}
          className="group flex min-w-0 flex-1 items-start gap-3 text-start"
          aria-label={`پیشنهادهای تامین ${item.name}`}
        >
          {/* کاشی آیکون دسته */}
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <RootCategoryIcon rootName={item.rootName} size={20} />
          </span>

          {/* محتوا */}
          <span className="block min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold transition-colors group-hover:text-primary">{item.name}</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {PERIOD_LABELS[item.period]}
              </span>
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {[item.rootName, item.parentName].filter(Boolean).join(" / ")}
            </span>
            <span className="mt-2 block text-[13px] leading-6">
              حداقل خرید: <b className="font-extrabold">{toFa(item.minAmount)}</b> {item.unit}
              {hint && <span className="text-muted-foreground"> ({hint})</span>}
            </span>
            {/* راهنمای مقصد کلیک — ظریف و همیشه قابل دیدن */}
            <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary">
              <Inbox size={13} />
              پیشنهادهای تامین این کالا
            </span>
          </span>
        </Link>

        {/* اقدامات — ویرایش + سه‌نقطه (حذف)؛ بیرون از لینک تا کلیک‌شان
            ناوبری نشود */}
        <div className="flex shrink-0 items-center gap-1.5">
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
