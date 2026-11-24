'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Loader2,
  MapPin,
  MessageSquare,
  MoreVertical,
  NotebookPen,
  Phone,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatDialog } from '@/components/products/chat-dialog';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { ProductImage } from '@/components/shared/product-image';
import { RelativeTime } from '@/components/shared/relative-time';
import { PriorityChip, StatusChip } from '@/components/panel/follow/follow-parts';
import { followDueLabel, followPriorityOf, isFollowDueToday, isFollowOverdue } from '@/lib/follow';
import { useAuth } from '@/lib/mock/auth';
import { useBuyRequestContact } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyRequest, FollowItem, Product } from '@/lib/types';

/** حالت‌های شیت عملیات سه‌نقطه — priority = «تغییر اولویت» (خواسته مالک ۷-۱۱) */
export type FollowActionMode = 'menu' | 'status' | 'priority' | 'note' | 'move' | 'delete';

/**
 * ردیف فشردهٔ مورد پیگیری — تک‌صفحهٔ CRM ایمچ (خواسته مالک ۶-۱۱).
 *
 * ساختار: بندانگشتی/آواتار + عنوان + متا + پیش‌نمایش آخرین یادداشت؛
 * نوار اقدام: چیپ وضعیت (کلیک = تغییر سریع) + تماس/چت (جلوی دست) + سه‌نقطه
 * (تغییر وضعیت، یادداشت، انتقال، حذف). کلیک روی خود کارت = مدال جزئیات.
 */
export function FollowItemRow({
  item,
  onOpenDetail,
  onOpenActions,
}: {
  item: FollowItem;
  onOpenDetail: () => void;
  onOpenActions: (mode: FollowActionMode) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label="جزئیات و یادداشت‌ها"
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className="cursor-pointer rounded-lg border bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
    >
      {item.targetType === 'buy_request' ? (
        <RequestRowHead item={item} />
      ) : (
        <ProductRowHead item={item} />
      )}

      {/* پیش‌نمایش آخرین یادداشت — یادآورِ زمینه بدون باز کردن مدال */}
      {item.notes.length > 0 && (
        <p className="mt-2 line-clamp-1 rounded-md bg-secondary/50 px-2.5 py-1.5 text-[11px] leading-5 text-muted-foreground">
          <NotebookPen size={12} className="me-1 inline shrink-0 align-[-2px] text-primary/70" />
          {[...item.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.text}
        </p>
      )}

      {/* نوار اقدام — کلیک روی این نوار مدال را باز نمی‌کند */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onOpenActions('status')}
          title="تغییر وضعیت"
          className="rounded-full outline-none transition-transform hover:scale-[1.03] focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <StatusChip status={item.status} />
        </button>
        {/* اولویت (خواسته مالک ۷-۱۱) — کلیک = شیت «تغییر اولویت»؛ چیپ فقط
            برای بالا/کم نمایش داده می‌شود تا متوسطِ پیش‌فرض نوار را شلوغ نکند */}
        {followPriorityOf(item) !== 2 && (
          <button
            type="button"
            onClick={() => onOpenActions('priority')}
            title="تغییر اولویت"
            className="rounded-full outline-none transition-transform hover:scale-[1.03] focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <PriorityChip priority={item.priority} />
          </button>
        )}
        {/* یادآور «پیگیری بعدی» — عقب‌افتاده (خواستهٔ مالک ۱۱-۱۱ دور ۴) قرمز،
            سررسیدِ امروز کهربایی، آینده خاکستری؛ کلیک = شیت «تغییر اولویت»
            که همین‌جا یادآور هم دارد */}
        {item.nextFollowAt && (
          <button
            type="button"
            onClick={() => onOpenActions('priority')}
            title={followDueLabel(item.nextFollowAt) ?? undefined}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10.5px] font-bold transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              isFollowOverdue(item.nextFollowAt)
                ? 'border-red-200 bg-red-50 text-red-600'
                : isFollowDueToday(item.nextFollowAt)
                  ? 'border-amber-300 bg-amber-100 text-amber-700'
                  : 'border-border bg-secondary/60 text-muted-foreground',
            )}
          >
            <CalendarClock size={11} className="shrink-0" />
            {followDueLabel(item.nextFollowAt)}
          </button>
        )}
        {item.targetType === 'buy_request' ? <RequestActions item={item} /> : <ProductActions item={item} />}
        <button
          type="button"
          onClick={() => onOpenActions('menu')}
          aria-label="عملیات بیشتر"
          title="عملیات بیشتر"
          className="ms-auto grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </article>
  );
}

/** سربرگ ردیف آگهی فروش — دید خریدار */
function ProductRowHead({ item }: { item: FollowItem }) {
  const p = item.target as Product;
  return (
    <div className="flex items-start gap-3">
      {/* ProductImage با fill رندر می‌شود — والد باید relative با ابعاد باشد */}
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
        <p className="line-clamp-1 text-sm font-bold">{p.productName}</p>
        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
          {p.subCategoryName} · {p.cityName.trim()} · {p.minSalePrice ? priceFa(p.minSalePrice) : 'تماس بگیرید'}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Store size={12} className="shrink-0" />
          <span className="truncate">
            {p.seller.firstName} {p.seller.lastName}
          </span>
          <CalendarDays size={12} className="ms-2 shrink-0" />
          ذخیره <RelativeTime date={item.createdAt} />
        </p>
      </div>
    </div>
  );
}

/** سربرگ ردیف درخواست خرید — دید فروشنده */
function RequestRowHead({ item }: { item: FollowItem }) {
  const r = item.target as BuyRequest;
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
        {(r.firstName || '؟').charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-bold">
          <span className="truncate">
            {r.firstName} {r.lastName}
          </span>
          {r.isVerified && <BadgeCheck size={14} className="shrink-0 text-sky-500" />}
        </p>
        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
          {toFa(r.requirementAmount.toLocaleString('en-US'))} {r.unit} {r.subcategoryName}
          {r.name ? ` (${r.name})` : ''}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{r.city}</span>
          <CalendarDays size={12} className="ms-2 shrink-0" />
          ذخیره <RelativeTime date={item.createdAt} />
        </p>
      </div>
    </div>
  );
}

/** دکمه‌های تماس/چت آگهی — همان زیرساخت صفحهٔ آگهی (PhoneReveal + ChatDialog) */
function ProductActions({ item }: { item: FollowItem }) {
  const p = item.target as Product;
  const sellerName = `${p.seller.firstName} ${p.seller.lastName}`.trim() || 'فروشنده';
  return (
    <>
      <PhoneReveal sellerName={sellerName} productId={p.id}>
        <Button type="button" size="sm" variant="outline" className="text-xs">
          <Phone size={14} /> تماس
        </Button>
      </PhoneReveal>
      <ChatDialog
        productId={p.id}
        sellerUserName={p.seller.userName}
        sellerId={p.myuserId}
        sellerName={sellerName}
        productName={p.productName}
        buttonLabel="چت"
        buttonSize="sm"
        buttonVariant="outline"
        className="text-xs"
      />
    </>
  );
}

/** دکمه‌های تماس/چت درخواست خرید — همان الگوی کارت خریداران پنل؛
 *  شماره با سرویس Lead-gen گرفته می‌شود؛ چت مستقیم اگر userName باشد */
function RequestActions({ item }: { item: FollowItem }) {
  const r = item.target as BuyRequest;
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const contact = useBuyRequestContact();
  const [phone, setPhone] = useState<string | null>(null);

  const reveal = async () => {
    if (phone || contact.isPending) return;
    if (!user) {
      requireAuth('call');
      return;
    }
    try {
      const data = await contact.mutateAsync(r.id);
      setPhone(data.isSelf ? 'درخواست شماست' : data.phone);
    } catch (err) {
      toast({
        description: err instanceof Error ? err.message : 'خطای غیرمنتظره — دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-xs"
        onClick={reveal}
        disabled={contact.isPending}
      >
        {contact.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Phone size={14} />
        )}
        {phone ? <span className="font-num">{toFa(phone)}</span> : 'تماس'}
      </Button>
      {r.userName ? (
        <ChatDialog
          sellerUserName={r.userName}
          sellerId={r.myuserId}
          sellerName={`${r.firstName} ${r.lastName}`.trim() || 'خریدار'}
          buttonLabel="چت"
          directSubtitle="گفتگوی مستقیم با خریدار"
          buttonSize="sm"
          buttonVariant="outline"
          className="text-xs"
        />
      ) : (
        <Button type="button" size="sm" variant="outline" className="text-xs" asChild>
          <Link href="/panel/messages">
            <MessageSquare size={14} /> چت
          </Link>
        </Button>
      )}
    </>
  );
}
