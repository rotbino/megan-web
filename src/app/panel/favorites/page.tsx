'use client';

/**
 * علاقه‌مندی‌های من (خواسته مالک ۳۰-۱۰) — دو بخش:
 *  • آگهی‌های نشان‌شده (دکمه «ذخیره» صفحه آگهی)
 *  • فروشندگان ذخیره‌شده (دکمه «ذخیره فروشنده» پروفایل)
 */

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, Heart, ImageIcon, Package, Store, Users } from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useMyFavorites, useToggleProductFavorite, useToggleSellerFavorite } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { ProductCard } from '@/components/products/product-card';
import { FavoriteSellerCard } from '@/components/shared/save-seller-button';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

type Tab = 'products' | 'sellers';

export default function FavoritesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useMyFavorites(Boolean(user));
  const toggleProduct = useToggleProductFavorite();
  const toggleSeller = useToggleSellerFavorite();
  const [tab, setTab] = useState<Tab>('products');

  const products = data?.products ?? [];
  const sellers = data?.sellers ?? [];

  const removeSeller = (userName: string) => {
    toggleSeller.mutate(userName, {
      onSuccess: (r) => {
        toast({ description: r.saved ? 'ذخیره شد.' : 'فروشنده از علاقه‌مندی‌ها حذف شد.' });
      },
      onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
    });
  };

  const removeProduct = (productId: number) => {
    toggleProduct.mutate(productId, {
      onSuccess: (r) => {
        toast({ description: r.saved ? 'ذخیره شد.' : 'آگهی از علاقه‌مندی‌ها حذف شد.' });
      },
      onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
    });
  };

  if (user && isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Heart size={18} />
        </span>
        <div>
          <h1 className="text-base font-extrabold">علاقه‌مندی‌های من</h1>
          <p className="text-[11px] text-muted-foreground">
            آگهی‌های نشان‌شده و فروشندگانی که صفحه‌شان را ذخیره کرده‌اید
          </p>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('products')}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
            tab === 'products'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:border-primary/40',
          )}
        >
          <Package size={14} /> آگهی‌های نشان‌شده ({toFa(products.length)})
        </button>
        <button
          type="button"
          onClick={() => setTab('sellers')}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
            tab === 'sellers'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:border-primary/40',
          )}
        >
          <Users size={14} /> فروشندگان ذخیره‌شده ({toFa(sellers.length)})
        </button>
      </div>

      {/* آگهی‌ها */}
      {tab === 'products' ? (
        products.length === 0 ? (
          <PanelEmptyState
            icon={ImageIcon}
            title="هنوز آگهی‌ای نشان نکرده‌اید."
            hint="در صفحه هر آگهی، دکمه «ذخیره آگهی» را بزنید تا اینجا فهرست شود."
            actionLabel="مشاهده آگهی‌ها"
            actionHref="/product-list"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4">
              {products.map((p) => (
                <div key={p.id} className="relative">
                  <ProductCard product={p} />
                  <button
                    type="button"
                    onClick={() => removeProduct(p.id)}
                    aria-label={`حذف «${p.productName}» از علاقه‌مندی‌ها`}
                    className="absolute left-2 top-2 grid size-8 place-items-center rounded-md border border-border bg-card/95 text-muted-foreground shadow-sm transition-colors hover:border-destructive/30 hover:text-destructive"
                    title="حذف از علاقه‌مندی‌ها"
                  >
                    <Bookmark size={14} className="fill-current" />
                  </button>
                </div>
              ))}
            </div>
            <PanelCard className="text-center">
              <p className="text-xs leading-6 text-muted-foreground">
                آگهی‌های نشان‌شده شما با حساب‌تان همراه‌اند — از هر دستگاهی که وارد شوید در دسترس‌اند.
              </p>
            </PanelCard>
          </>
        )
      ) : sellers.length === 0 ? (
        <PanelEmptyState
          icon={Store}
          title="هنوز فروشنده‌ای ذخیره نکرده‌اید."
          hint="در صفحه اختصاصی هر فروشنده، دکمه «ذخیره فروشنده» را بزنید تا اینجا فهرست شود."
          actionLabel="مشاهده فروشندگان"
          actionHref="/product-list"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <FavoriteSellerCard key={s.userName} seller={s} onRemove={removeSeller} />
          ))}
        </div>
      )}

      {/* لینک بازگشت */}
      <div className="pt-2 text-center">
        <Button asChild variant="ghost" size="sm" className="rounded-md text-xs text-muted-foreground">
          <Link href="/panel">بازگشت به ایمچ من</Link>
        </Button>
      </div>
    </div>
  );
}
