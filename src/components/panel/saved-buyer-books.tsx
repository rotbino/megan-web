'use client';

/**
 * دفاتر خرید ذخیره‌شده (خواستهٔ مالک ۱۰-۱۱ دور ۵) — تب چهارم پنل خریداران.
 * قرینهٔ «کاتالوگ‌های ذخیره شده» خریدار: فروشنده دفاتر خریدِ خریدارانی که
 * برایش ارزش مشتری بالقوه دارند ذخیره می‌کند و از همین‌جا دفتر را می‌بیند،
 * گفتگو را شروع می‌کند یا حذف می‌کند.
 */

import Link from 'next/link';
import {
  BookMarked,
  CalendarDays,
  ExternalLink,
  MapPin,
  MessageSquareText,
  Package,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelEmptyState } from '@/components/panel/panel-parts';
import { ChatDialog } from '@/components/products/chat-dialog';
import { RelativeTime } from '@/components/shared/relative-time';
import { useMySavedBuyerBooks, useToggleBuyerBookSave } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { dateFa, toFa } from '@/lib/format';
import type { SavedBuyerBookRow } from '@/lib/types';

/** یک دفتر ذخیره‌شده — کارت مشتری بالقوه: هویت + مشاهده + چت + حذف */
function SavedBookCard({ row }: { row: SavedBuyerBookRow }) {
  const { toast } = useToast();
  const toggle = useToggleBuyerBookSave();

  const remove = () => {
    toggle.mutate(row.buyerUserName, {
      onSuccess: () => toast({ description: 'دفتر خرید از لیست حذف شد.' }),
      onError: () =>
        toast({ description: 'حذف موقتاً ممکن نشد؛ دوباره تلاش کنید.', variant: 'destructive' }),
    });
  };

  return (
    <article className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        {row.avatarUrl ? (
          <img
            src={row.avatarUrl}
            alt={row.buyerName}
            className="size-12 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-black text-primary">
            {row.buyerName.trim().charAt(0) || 'خ'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{row.buyerName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
            {row.cityName && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin size={11} className="text-primary/70" />
                {row.cityName}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5">
              <Package size={11} className="text-primary/70" />
              {toFa(row.itemCount)} کالای دوره‌ای
            </span>
            {row.lastActiveAt && (
              <span className="inline-flex items-center gap-0.5" title={`آخرین فعالیت: ${dateFa(row.lastActiveAt)}`}>
                <CalendarDays size={11} className="text-primary/70" />
                فعالیت <RelativeTime date={row.lastActiveAt} />
              </span>
            )}
            <span>ذخیره <RelativeTime date={row.savedAt} /></span>
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-center gap-1.5 border-t border-border/70 pt-3">
        {/* مشاهدهٔ دفتر — لینک مستقیم به صفحهٔ عمومی دفتر خرید */}
        <Button asChild size="sm" className="h-9 rounded-md text-xs">
          <Link href={row.bookId ? `/b/${row.bookId}` : '#'} target="_blank">
            <ExternalLink size={14} />
            مشاهده دفتر خرید
          </Link>
        </Button>

        {/* گفتگو با خریدار — همان چت ایمچ */}
        <ChatDialog
          sellerUserName={row.buyerUserName}
          sellerId={row.buyerId}
          sellerName={row.buyerName}
          sellerAvatarUrl={row.avatarUrl}
          buttonLabel={`گفتگو با ${row.buyerName}`}
          buttonVariant="outline"
          buttonSize="icon"
          directSubtitle={`گفتگو با خریدار ${row.buyerName}`}
          className="size-9 rounded-md"
        />

        {/* حذف از ذخیره‌شده‌ها */}
        <Button
          variant="ghost"
          size="icon"
          onClick={remove}
          disabled={toggle.isPending}
          aria-label={`حذف دفتر خرید ${row.buyerName} از ذخیره‌شده‌ها`}
          title="حذف از ذخیره‌شده‌ها"
          className="size-9 rounded-md text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </article>
  );
}

export function SavedBuyerBooksList() {
  const { data, isLoading } = useMySavedBuyerBooks();
  const items = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <PanelEmptyState
        icon={BookMarked}
        title="هنوز دفتر خریدی ذخیره نکرده‌اید."
        hint="در لیست خریداران دوره‌ای، دفتر خرید هر خریدار را باز کنید و «ذخیره دفتر خرید» را بزنید تا مشتریان بالقوه‌تان این‌جا جمع شوند."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-muted-foreground">
        {toFa(items.length)} دفتر خرید ذخیره‌شده — لیست مشتریان بالقوهٔ شما؛ با هر
        به‌روزشدن دفتر خریدار، همین‌جا هم تازه می‌شود.
      </p>
      {items.map((row) => (
        <SavedBookCard key={row.buyerUserName} row={row} />
      ))}
    </div>
  );
}
