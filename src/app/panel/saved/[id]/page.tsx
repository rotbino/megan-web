'use client';

/**
 * جزئیات پروندهٔ پیگیری — CRM کوچک ایمچ (خواسته مالک ۶-۱۱):
 * فیلتر وضعیت‌های قیف با تعداد + کارت هر مورد (درخواست خرید یا آگیی فروش) با
 * تغییر وضعیت درجا، یادداشت‌های زمان‌دار، حذف و لینک به خود آگهی/درخواست.
 */

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Store,
  Trash2,
} from 'lucide-react';
import {
  useAddFollowNote,
  useDeleteFollowFolder,
  useFollowFolderItems,
  useFollowFolders,
  useRemoveFollowItem,
  useRenameFollowFolder,
  useSetFollowStatus,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { FollowLabel, NotesList, NoteComposer, StatusChip, StatusChipsRow } from '@/components/panel/follow/follow-parts';
import { ProductImage } from '@/components/shared/product-image';
import { RelativeTime } from '@/components/shared/relative-time';
import { FOLLOW_STATUSES, FOLLOW_STATUS_MAP } from '@/lib/follow';
import { dateFa, parseServerDate, priceFa, stockFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyRequest, FollowItem, FollowStatus, Product } from '@/lib/types';

export default function FollowFolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const folderId = id;
  const { data: folders } = useFollowFolders();
  const { data: items, isLoading } = useFollowFolderItems(folderId);
  const { toast } = useToast();

  const [filter, setFilter] = useState<FollowStatus | 'all'>('all');
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');

  const renameFolder = useRenameFollowFolder();
  const folder = folders?.find((f) => f.id === folderId);

  const counts = useMemo(() => {
    const c: Partial<Record<FollowStatus, number>> = {};
    (items ?? []).forEach((i) => {
      c[i.status] = (c[i.status] ?? 0) + 1;
    });
    return c;
  }, [items]);

  const shown = filter === 'all' ? (items ?? []) : (items ?? []).filter((i) => i.status === filter);

  const fail = (err: unknown) =>
    toast({
      description: err instanceof Error ? err.message : 'خطای غیرمنتظره — دوباره تلاش کنید.',
      variant: 'destructive',
    });

  const submitRename = () => {
    const name = renameText.trim();
    if (!name || renameFolder.isPending) return;
    renameFolder.mutate(
      { folderId, name },
      {
        onSuccess: () => {
          toast({ description: 'نام پرونده تغییر کرد.' });
          setRenaming(false);
        },
        onError: fail,
      },
    );
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }
  if (!folder && !items) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/panel/saved" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowRight size={14} /> پیگیری‌ها
        </Link>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-md text-xs text-muted-foreground"
          onClick={() => {
            setRenameText(folder?.name ?? '');
            setRenaming(true);
          }}
        >
          <Pencil size={13} /> تغییر نام
        </Button>
      </div>

      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base font-extrabold sm:text-lg">{folder?.name ?? 'پروندهٔ پیگیری'}</h1>
          <p className="text-xs text-muted-foreground">
            <b>{toFa(items?.length ?? 0)}</b> مورد در پیگیری
          </p>
        </div>

        {/* فیلتر وضعیت‌های قیف با تعداد */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
              filter === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            همه {toFa(items?.length ?? 0)}
          </button>
          {FOLLOW_STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setFilter(s.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
                filter === s.key ? 'border-primary bg-primary text-primary-foreground' : cn(s.tone, 'hover:brightness-95'),
              )}
            >
              {s.label} {toFa(counts[s.key] ?? 0)}
            </button>
          ))}
        </div>
      </PanelCard>

      {shown.length === 0 ? (
        items != null && items.length === 0 ? (
          <PanelEmptyState
            icon={Package}
            title="این پرونده هنوز خالی است."
            hint="از صفحهٔ «خریداران» یا آگهی‌ها، دکمهٔ «ذخیره» را بزنید و این پرونده را انتخاب کنید."
            actionLabel="مشاهده درخواست‌های خرید"
            actionHref="/panel/buyers"
          />
        ) : (
          <PanelCard className="py-10 text-center text-sm text-muted-foreground">
            موردی با وضعیت «{filter !== 'all' ? FOLLOW_STATUS_MAP[filter].label : ''}» در این پرونده نیست.
          </PanelCard>
        )
      ) : (
        <div className="space-y-3">
          {shown.map((item) => (
            <FollowItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* مودال تغییر نام */}
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">تغییر نام پرونده</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitRename()}
            className="rounded-md"
            placeholder="نام جدید پرونده"
            maxLength={60}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-md" onClick={() => setRenaming(false)}>
              انصراف
            </Button>
            <Button className="rounded-md" disabled={renameFolder.isPending || !renameText.trim()} onClick={submitRename}>
              {renameFolder.isPending ? <Loader2 size={15} className="animate-spin" /> : 'ذخیره'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** کارت یک مورد پیگیری — درخواست خرید (دید فروشنده) یا آگهی فروش (دید خریدار) */
function FollowItemCard({ item }: { item: FollowItem }) {
  const { toast } = useToast();
  const setStatus = useSetFollowStatus();
  const addNote = useAddFollowNote();
  const removeItem = useRemoveFollowItem();

  const fail = (err: unknown) =>
    toast({
      description: err instanceof Error ? err.message : 'خطای غیرمنتظره — دوباره تلاش کنید.',
      variant: 'destructive',
    });

  const changeStatus = (status: FollowStatus) => {
    if (setStatus.isPending) return;
    setStatus.mutate({ itemId: item.id, status }, {
      onSuccess: () => toast({ description: 'وضعیت به‌روزرسانی شد.' }),
      onError: fail,
    });
  };

  const submitNote = (text: string) => {
    if (addNote.isPending) return;
    addNote.mutate({ itemId: item.id, text }, {
      onSuccess: () => toast({ description: 'یادداشت ثبت شد.' }),
      onError: fail,
    });
  };

  const remove = () => {
    if (removeItem.isPending) return;
    removeItem.mutate(item.id, {
      onSuccess: () => toast({ description: 'از پیگیری‌ها حذف شد.' }),
      onError: fail,
    });
  };

  const busy = setStatus.isPending || addNote.isPending || removeItem.isPending;

  return (
    <article className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {item.targetType === 'buy_request' ? (
        <BuyRequestTarget item={item} />
      ) : (
        <ProductTarget item={item} />
      )}

      {/* تغییر وضعیت درجا */}
      <div className="mt-3 border-t border-dashed pt-3">
        <FollowLabel>وضعیت</FollowLabel>
        <StatusChipsRow value={item.status} onChange={changeStatus} disabled={busy} />
      </div>

      {/* یادداشت‌ها */}
      <div className="mt-3">
        <FollowLabel>یادداشت‌ها</FollowLabel>
        <NotesList notes={item.notes} />
        <div className="mt-2">
          <NoteComposer onSubmit={submitNote} disabled={busy} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed pt-3">
        <span className="text-[10px] text-muted-foreground">ذخیره در {dateFa(parseServerDate(item.createdAt))}</span>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-md text-xs text-red-500 hover:bg-red-50"
          disabled={busy}
          onClick={remove}
        >
          {removeItem.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} حذف از پیگیری
        </Button>
      </div>
    </article>
  );
}

/** سربرگ مورد از نوع درخواست خرید — دید فروشنده */
function BuyRequestTarget({ item }: { item: FollowItem }) {
  const r = item.target as BuyRequest;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-sm font-extrabold">
          {r.firstName} {r.lastName}
          {r.isVerified && <BadgeCheck size={15} className="text-sky-500" />}
        </p>
        <StatusChip status={item.status} />
      </div>
      <p className="mt-2 text-sm leading-6">
        {toFa(r.requirementAmount.toLocaleString('en-US'))} {r.unit} {r.subcategoryName}
        {r.name ? (
          <>
            {' '}از نوع <span className="font-bold">{r.name}</span>
          </>
        ) : ''}{' '}
        هستم
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays size={13} /> <RelativeTime date={r.createdAt} />
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={13} /> {r.city}
        </span>
        <Link href="/panel/buyers" className="flex items-center gap-1 font-bold text-primary hover:underline">
          مشاهده در خریداران
        </Link>
      </div>
    </div>
  );
}

/** سربرگ مورد از نوع آگهی فروش — دید خریدار */
function ProductTarget({ item }: { item: FollowItem }) {
  const p = item.target as Product;
  const href = `/product-view/${p.slug}/${p.categoryName}/${p.id}`;
  return (
    <div className="flex items-start gap-3">
      <Link href={href} className="shrink-0" aria-label={p.productName}>
        <ProductImage
          photos={p.photos}
          thumbs={p.photoThumbs}
          alt={p.productName}
          className="size-20 rounded-md object-cover"
          iconSize={26}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className="line-clamp-1 text-sm font-extrabold hover:text-primary">
            {p.productName}
          </Link>
          <StatusChip status={item.status} />
        </div>
        <p className="mt-1.5 text-xs font-bold text-primary">
          {p.minSalePrice ? priceFa(p.minSalePrice) : 'تماس بگیرید'}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Store size={13} /> {p.seller.firstName} {p.seller.lastName}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={13} /> {p.provinceName}، {p.cityName.trim()}
          </span>
          <span className="flex items-center gap-1 font-num">
            <Package size={13} /> {stockFa(p.stock, p.unit)}
          </span>
          <Link href={href} className="font-bold text-primary hover:underline">
            مشاهده آگهی
          </Link>
        </div>
      </div>
    </div>
  );
}
