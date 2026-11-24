'use client';

import { useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';

/**
 * بات‌شیت موبایل — قانون کلی طراحی موبایل ایمچ:
 * مودال‌های انتخاب (دسته‌بندی، مرتب‌سازی و ...) از پایین صفحه باز می‌شوند و بالا می‌آیند.
 * هدر شامل دکمه بازگشت (در سطوح زیرین)، عنوان و دکمه بستن است.
 *
 * m-0 روی ظرف fixed (رفع ۱۸-۱۱): ظرف داخل والد‌های space-y-* رندر می‌شود و
 * قاعدهٔ Tailwind v4 (space-y > :not(:last-child)) به آن margin-bottom می‌داد
 * ⇒ شیت ۱۶px از ته صفحه فاصله می‌گرفت؛ m-0 همیشه بر آن برنده می‌شود
 * (:where بدون specificy) — اورلی fixed هرگز نباید margin جریان بگیرد.
 */
export function BottomSheet({
  open,
  onClose,
  onBack,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', esc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] m-0 nav-desktop:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={onClose} />
      {/* pb-[env(safe-area-inset-bottom)]: پنل تا لبهٔ فیزیکی پایین (آیفون/
          نوار ژست) کشیده می‌شود و محتوا بالای ناحیهٔ امن می‌ماند — بدون
          viewport-fit=cover صفر است و بی‌اثر؛ با آن فعال می‌شود */}
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 m-0 flex max-h-[82vh] flex-col rounded-t-2xl bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl">
        <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-3 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="بازگشت"
              className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent"
            >
              <ArrowRight size={20} strokeWidth={2.2} />
            </button>
          ) : (
            <span className="size-8" aria-hidden />
          )}
          <h2 className="min-w-0 truncate px-2 text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-2 pb-6">{children}</div>
      </div>
    </div>
  );
}
