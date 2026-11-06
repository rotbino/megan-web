'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  CalendarDays,
  FolderInput,
  Link2,
  MapPin,
  Package,
  Store,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { ProductImage } from '@/components/shared/product-image';
import { RelativeTime } from '@/components/shared/relative-time';
import {
  FollowLabel,
  NoteComposer,
  NotesList,
  StatusChip,
  StatusChipsRow,
} from '@/components/panel/follow/follow-parts';
import { useAddFollowNote, useSetFollowStatus } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { FOLLOW_TARGET_LABEL } from '@/lib/follow';
import { priceFa, stockFa, toFa } from '@/lib/format';
import type { BuyRequest, FollowItem, FollowStatus, Product } from '@/lib/types';

/**
 * مدال جزئیات مورد پیگیری — با کلیک روی ردیف باز می‌شود (خواسته مالک ۶-۱۱):
 * اطلاعات کامل هدف + لینک منبع + تغییر وضعیت درجا + تاریخچهٔ یادداشت‌ها.
 * انتقال/حذف به شیت عملیات سپرده می‌شود (onMove/onDelete).
 * موبایل: بات‌شیت / دسکتاپ: مودال مرکزی — الگوی مودال‌های ایمچ.
 */
export function FollowDetailModal({
  item,
  onClose,
  onMove,
  onDelete,
}: {
  item: FollowItem;
  onClose: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const setStatusM = useSetFollowStatus();
  const noteM = useAddFollowNote();

  const fail = (err: unknown) =>
    toast({
      description: err instanceof Error ? err.message : 'خطای غیرمنتظره — دوباره تلاش کنید.',
      variant: 'destructive',
    });

  const changeStatus = (status: FollowStatus) => {
    if (setStatusM.isPending) return;
    setStatusM.mutate({ itemId: item.id, status }, {
      onSuccess: () => toast({ description: 'وضعیت به‌روزرسانی شد.' }),
      onError: fail,
    });
  };

  const addNote = (text: string) => {
    if (noteM.isPending) return;
    noteM.mutate({ itemId: item.id, text }, {
      onSuccess: () => toast({ description: 'یادداشت ثبت شد.' }),
      onError: fail,
    });
  };

  const busy = setStatusM.isPending || noteM.isPending;

  const body = (
    <div className="space-y-4 p-1">
      {/* سربرگ: تصویر/آواتار + عنوان + نوع + وضعیت */}
      {item.targetType === 'buy_request' ? (
        <RequestHead item={item} />
      ) : (
        <ProductHead item={item} />
      )}

      {/* لینک منبع */}
      <SourceLink item={item} />

      {/* وضعیت — تغییر درجا */}
      <div>
        <FollowLabel>وضعیت پیگیری</FollowLabel>
        <StatusChipsRow value={item.status} onChange={changeStatus} disabled={busy} />
      </div>

      {/* یادداشت‌ها */}
      <div>
        <FollowLabel>یادداشت‌ها</FollowLabel>
        <NotesList notes={item.notes} />
        <div className="mt-2">
          <NoteComposer onSubmit={addNote} disabled={busy} />
        </div>
      </div>

      {/* پانویس: انتقال + حذف (شیت عملیات) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed pt-3">
        <Button variant="ghost" size="sm" className="rounded-md text-xs text-primary" onClick={onMove}>
          <FolderInput size={14} /> انتقال به پروندهٔ دیگر
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-md text-xs text-red-500 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 size={14} /> حذف از پیگیری
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* موبایل — بات‌شیت */}
      <BottomSheet open onClose={onClose} title="جزئیات پیگیری">
        {body}
      </BottomSheet>

      {/* دسکتاپ — مودال مرکزی */}
      <div
        className="fixed inset-0 z-[60] hidden items-center justify-center p-4 nav-desktop:flex"
        role="dialog"
        aria-modal="true"
        aria-label="جزئیات پیگیری"
      >
        <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-card p-5 shadow-2xl">
          <h2 className="mb-4 border-b border-border/70 pb-3 text-base font-bold">جزئیات پیگیری</h2>
          {body}
        </div>
      </div>
    </>
  );
}

/** سربرگ آگهی فروش — دید خریدار */
function ProductHead({ item }: { item: FollowItem }) {
  const p = item.target as Product;
  const sellerName = `${p.seller.firstName} ${p.seller.lastName}`.trim() || 'فروشنده';
  return (
    <div className="flex items-start gap-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md">
        <ProductImage
          photos={p.photos}
          thumbs={p.photoThumbs}
          alt={p.productName}
          className="object-cover"
          iconSize={22}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-1 text-sm font-extrabold">{p.productName}</p>
          <StatusChip status={item.status} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{FOLLOW_TARGET_LABEL[item.targetType]}</p>
        <ul className="mt-2 grid gap-1.5 text-xs">
          <li className="flex items-center gap-2">
            <Package size={13} className="shrink-0 text-primary/70" />
            <span className="text-muted-foreground">قیمت:</span>
            <span className="font-bold">{p.minSalePrice ? priceFa(p.minSalePrice) : 'تماس بگیرید'}</span>
          </li>
          <li className="flex items-center gap-2">
            <Package size={13} className="shrink-0 text-primary/70" />
            <span className="text-muted-foreground">موجودی:</span>
            <span className="font-num font-bold">{stockFa(p.stock, p.unit)}</span>
          </li>
          <li className="flex items-center gap-2">
            <Store size={13} className="shrink-0 text-primary/70" />
            <span className="text-muted-foreground">فروشنده:</span>
            <span className="font-bold">{sellerName}</span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin size={13} className="shrink-0 text-primary/70" />
            <span className="font-bold">
              {p.provinceName}، {p.cityName.trim()}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays size={13} className="shrink-0 text-primary/70" />
            <span className="text-muted-foreground">ذخیره:</span>
            <RelativeTime date={item.createdAt} /> پیش
          </li>
        </ul>
      </div>
    </div>
  );
}

/** سربرگ درخواست خرید — دید فروشنده */
function RequestHead({ item }: { item: FollowItem }) {
  const r = item.target as BuyRequest;
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-extrabold text-primary">
        {(r.firstName || '؟').charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-1 text-sm font-extrabold">
            {r.firstName} {r.lastName}
            {r.isVerified && <BadgeCheck size={15} className="text-sky-500" />}
          </p>
          <StatusChip status={item.status} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{FOLLOW_TARGET_LABEL[item.targetType]}</p>
        <ul className="mt-2 grid gap-1.5 text-xs">
          <li className="flex items-center gap-2">
            <Package size={13} className="shrink-0 text-primary/70" />
            <span className="font-bold">
              {toFa(r.requirementAmount.toLocaleString('en-US'))} {r.unit} {r.subcategoryName}
              {r.name ? ` (${r.name})` : ''}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin size={13} className="shrink-0 text-primary/70" />
            <span className="font-bold">{r.city}</span>
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays size={13} className="shrink-0 text-primary/70" />
            <span className="text-muted-foreground">ثبت درخواست:</span>
            <RelativeTime date={r.createdAt} /> پیش
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays size={13} className="shrink-0 text-primary/70" />
            <span className="text-muted-foreground">ذخیره:</span>
            <RelativeTime date={item.createdAt} /> پیش
          </li>
        </ul>
      </div>
    </div>
  );
}

/** لینک به صفحهٔ منبع — آگهی یا فهرست خریداران */
function SourceLink({ item }: { item: FollowItem }) {
  if (item.targetType === 'buy_request') {
    return (
      <Button asChild variant="secondary" size="sm" className="w-full rounded-md text-xs">
        <Link href="/panel/buyers">
          <Link2 size={14} /> مشاهده در فهرست خریداران
        </Link>
      </Button>
    );
  }
  const p = item.target as Product;
  return (
    <Button asChild variant="secondary" size="sm" className="w-full rounded-md text-xs">
      <Link href={`/product-view/${p.slug}/${p.categoryName}/${p.id}`}>
        <Link2 size={14} /> مشاهده آگهی
      </Link>
    </Button>
  );
}
