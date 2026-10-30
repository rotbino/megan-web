'use client';

import { useState } from 'react';
import { BookmarkPlus, BookmarkCheck, Loader2, Store } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { useIsSellerSaved, useToggleSellerFavorite } from '@/lib/mock/hooks';
import { cn } from '@/lib/utils';

/**
 * دکمه «ذخیره صفحه اختصاصی فروشنده» (خواسته مالک ۳۰-۱۰) — در پروفایل هر
 * فروشنده. مهمان → مودال ورود؛ وضعیت اولیه از isSellerSaved؛ تغییر بهینه.
 */
export function SaveSellerButton({ userName, sellerName }: { userName: string; sellerName: string }) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const { data: saved, isLoading } = useIsSellerSaved(userName, Boolean(user));
  const toggle = useToggleSellerFavorite();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const isSaved = optimistic ?? Boolean(saved);

  const submit = () => {
    if (!requireAuth()) return;
    const next = !isSaved;
    setOptimistic(next);
    toggle.mutate(userName, {
      onSuccess: (r) => {
        setOptimistic(null);
        toast({
          description: r.saved
            ? `صفحه ${sellerName} ذخیره شد — از «علاقه‌مندی‌های من» در پنل قابل دسترسی است.`
            : 'فروشنده از علاقه‌مندی‌ها حذف شد.',
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
      aria-label={isSaved ? 'حذف فروشنده از ذخیره‌شده‌ها' : 'ذخیره صفحه فروشنده'}
      className={cn(
        'inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border text-sm font-bold transition-colors',
        isSaved
          ? 'border-primary/45 bg-primary/10 text-primary'
          : 'border-border bg-card text-foreground/85 hover:border-primary/40',
      )}
      disabled={toggle.isPending || isLoading}
    >
      {toggle.isPending || isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isSaved ? (
        <BookmarkCheck size={16} />
      ) : (
        <BookmarkPlus size={16} />
      )}
      {isSaved ? 'ذخیره شد' : 'ذخیره فروشنده'}
    </button>
  );
}

/** کارت فروشنده ذخیره‌شده — صفحه علاقه‌مندی‌های پنل */
export function FavoriteSellerCard({
  seller,
  onRemove,
}: {
  seller: {
    userName: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
    isPremium: boolean;
    avatarUrl: string | null;
    productCount: number;
    provinceName: string | null;
    cityName: string | null;
  };
  onRemove: (userName: string) => void;
}) {
  const name = `${seller.firstName} ${seller.lastName}`.trim() || 'فروشنده ایمچ';
  const location = [seller.provinceName, seller.cityName].filter(Boolean).join('، ');

  return (
    <article className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-primary/10 text-primary">
          {seller.avatarUrl ? (
             
            <img src={seller.avatarUrl} alt={name} className="size-full object-cover" />
          ) : (
            <Store size={22} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{name}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {location || '—'} · {seller.productCount} آگهی فعال
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 border-t border-dashed pt-3">
        <Link
          href={`/profile/${seller.userName}`}
          className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-deep"
        >
          مشاهده صفحه فروشنده
        </Link>
        <button
          type="button"
          onClick={() => onRemove(seller.userName)}
          className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
        >
          حذف
        </button>
      </div>
    </article>
  );
}
