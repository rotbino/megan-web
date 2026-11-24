'use client';

/**
 * کاتالوگ های ذخیره شده (خواسته مالک ۱۰-۱۱ + بازنگری) — پنل خریدار.
 * دفترچهٔ تلفن کاتالوگ‌ها: «کاتالوگ» یعنی همان صفحهٔ عمومی فروشنده؛
 * هر کاتالوگی که کاربر روی صفحه‌اش ذخیره کرده این‌جاست — از همین لیست
 * می‌تواند کاتالوگ را ببیند، تماس بگیرد یا چت شروع کند و هر وقت خواست
 * حذفش کند.
 */

import Link from 'next/link';
import {
  BookMarked,
  ExternalLink,
  MapPin,
  MessageSquareText,
  Package,
  Phone,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelEmptyState } from '@/components/panel/panel-parts';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { ChatDialog } from '@/components/products/chat-dialog';
import { RelativeTime } from '@/components/shared/relative-time';
import { useMySavedCatalogs, useToggleCatalogSave } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';
import type { SavedCatalogRow } from '@/lib/types';

/** یک کاتالوگ ذخیره‌شده — کارت دفترچهٔ تلفن: هویت + مشاهده + تماس/چت + حذف */
function SavedCatalogCard({ row }: { row: SavedCatalogRow }) {
  const { toast } = useToast();
  const toggle = useToggleCatalogSave();

  const remove = () => {
    toggle.mutate(row.sellerUserName, {
      onSuccess: () => toast({ description: 'کاتالوگ از لیست حذف شد.' }),
      onError: () => toast({ description: 'حذف موقتاً ممکن نشد؛ دوباره تلاش کنید.', variant: 'destructive' }),
    });
  };

  return (
    <article className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        {/* آواتار/نام‌نویسهٔ فروشنده */}
        {row.avatarUrl ? (
          <img
            src={row.avatarUrl}
            alt={row.sellerName}
            className="size-12 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-black text-primary">
            {row.sellerName.trim().charAt(0) || '؟'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{row.sellerName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
            {row.cityName && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin size={11} className="text-primary/70" />
                {row.cityName}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5">
              <Package size={11} className="text-primary/70" />
              {toFa(row.productCount)} محصول
            </span>
            <span>ذخیره <RelativeTime date={row.savedAt} /></span>
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] items-center gap-1.5 border-t border-border/70 pt-3">
        {/* مشاهدهٔ کاتالوگ — لینک مستقیم به صفحهٔ عمومی فروشنده */}
        <Button asChild size="sm" className="h-9 rounded-md text-xs">
          <Link href={`/c/${row.sellerUserName}`} target="_blank">
            <ExternalLink size={14} />
            مشاهده کاتالوگ
          </Link>
        </Button>

        {/* تماس — همان سرویس شمارهٔ ایمچ */}
        <PhoneReveal sellerName={row.sellerName} userName={row.sellerUserName}>
          <Button
            variant="outline"
            size="icon"
            aria-label={`تماس با ${row.sellerName}`}
            title={`تماس با ${row.sellerName}`}
            className="size-9 rounded-md"
          >
            <Phone size={15} />
          </Button>
        </PhoneReveal>

        {/* چت مستقیم — بدون آگهیِ زمینه */}
        <ChatDialog
          sellerUserName={row.sellerUserName}
          sellerId={row.sellerId}
          sellerName={row.sellerName}
          sellerAvatarUrl={row.avatarUrl}
          buttonLabel={`چت با ${row.sellerName}`}
          buttonVariant="outline"
          buttonSize="icon"
          directSubtitle={`گفتگو با ${row.sellerName}`}
          className="size-9 rounded-md"
        />

        {/* حذف از ذخیره‌شده‌ها */}
        <Button
          variant="ghost"
          size="icon"
          onClick={remove}
          disabled={toggle.isPending}
          aria-label={`حذف کاتالوگ ${row.sellerName} از ذخیره‌شده‌ها`}
          title="حذف از ذخیره‌شده‌ها"
          className="size-9 rounded-md text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </article>
  );
}

export default function SavedCatalogsPage() {
  const { data, isLoading } = useMySavedCatalogs();
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">


      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <PanelEmptyState
          icon={BookMarked}
          title="هنوز کاتالوگی ذخیره نکرده‌اید."
          hint="روی کاتالوگهای فروشندگان‌، دکمهٔ «ذخیره کاتالوگ» را بزنید تا از اینجا اضافه شود."
        />
      ) : (
        <div className="space-y-3">
          {items.map((row) => (
            <SavedCatalogCard key={row.sellerUserName} row={row} />
          ))}
        </div>
      )}


    </div>
  );
}
