'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { useMyProductFavoriteIds, useToggleProductFavorite } from '@/lib/mock/hooks';
import { cn } from '@/lib/utils';

/**
 * دکمه «ذخیره» آگهی (نشان کردن محصول موردعلاقه — خواسته مالک ۳۰-۱۰).
 * مهمان → مودال ورود؛ وضعیت اولیه از فهرست نشان‌شده‌های من (یک کوئری مشترک
 * برای همه دکمه‌های صفحه)؛ تغییر بهینه (optimistic) با برگشت در خطا.
 */
export function SaveProductButton({
  productId,
  size = 'sm',
  className,
}: {
  productId: number;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const { data: savedIds } = useMyProductFavoriteIds(Boolean(user));
  const toggle = useToggleProductFavorite();

  const saved = Boolean(user && savedIds?.includes(productId));
  // تغییر بهینه — به productId گره خورده تا با عوض شدن آگهی/فهرست تازه شود
  const [optimistic, setOptimistic] = useState<{ productId: number; saved: boolean } | null>(null);
  const isSaved = optimistic?.productId === productId ? optimistic.saved : saved;

  const submit = () => {
    if (!requireAuth()) return;
    const next = !isSaved;
    setOptimistic({ productId, saved: next });
    toggle.mutate(productId, {
      onSuccess: (r) => {
        setOptimistic(null);
        toast({
          description: r.saved
            ? 'آگهی در «علاقه‌مندی‌های من» ذخیره شد.'
            : 'آگهی از علاقه‌مندی‌ها حذف شد.',
        });
      },
      onError: (err: Error) => {
        setOptimistic(null);
        toast({ description: err.message, variant: 'destructive' });
      },
    });
  };

  return (
    <button
      type="button"
      onClick={submit}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره آگهی'}
      title={isSaved ? 'حذف از ذخیره‌شده‌ها' : 'ذخیره آگهی'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-bold transition-colors',
        size === 'lg' ? 'h-11 w-full text-sm' : 'px-3 py-2 text-xs',
        isSaved
          ? 'border-primary/45 bg-primary/10 text-primary'
          : 'border-border bg-card text-foreground/85 hover:border-primary/40',
        className,
      )}
      disabled={toggle.isPending}
    >
      {toggle.isPending ? (
        <Loader2 size={size === 'lg' ? 17 : 14} className="animate-spin" />
      ) : isSaved ? (
        <BookmarkCheck size={size === 'lg' ? 17 : 14} />
      ) : (
        <Bookmark size={size === 'lg' ? 17 : 14} />
      )}
      {isSaved ? 'ذخیره شد' : 'ذخیره آگهی'}
    </button>
  );
}

/** شناسه‌های ذخیره‌شده — seed اولیه برای useMyProductFavoriteIds در صفحات SSR */
export async function prefetchFavoriteIds(): Promise<void> {
  try {
    await apiFetch('/favorites/getMyProductFavoriteIds', {});
  } catch {
    /* بدون ورود — مهم */
  }
}
