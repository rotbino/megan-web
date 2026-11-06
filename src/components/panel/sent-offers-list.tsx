'use client';

/**
 * لیست «پیشنهادات ارسال شده» (خواسته مالک ۶-۱۱) — کامپوننت مشترک:
 *  • تب سوم صفحهٔ «خریداران» پنل (/panel/buyers) همین را رندر می‌کند؛ جای
 *    قبلی (صفحهٔ جدا + آیتم منوی «پیشنهادات تامین») حذف شد تا منو خلوت
 *    شود و پیشنهادهای ارسالی دقیقاً کنار همان خریداران باشند که بهشان
 *    پیشنهاد فرستاده شده — گویاتر و در جای مناسب خودش.
 *  • فروشنده پیشنهادهایی را که فرستاده می‌بیند و دنبال می‌کند:
 *    چه کالاهایی، به چه کسانی، چه زمانی، تکی یا گروهی، چقدر هزینه
 *  • آخرین پیام گفتگوی مرتبط هر پیشنهاد — «بعدش چه شد» (خریدار جواب داد؟)
 *  • لینک مستقیم به گفتگو (?thread=) و پروفایل خریدار
 *  • فیلتر دستهٔ کالا + صفحه‌بندی
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  Package,
  Send,
  Users,
} from 'lucide-react';
import { useMySentOffers } from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelCard } from '@/components/panel/panel-parts';
import { BadgeCheck } from 'lucide-react';
import { dateFa, priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SentOffer } from '@/lib/types';

const PAGE_SIZE = 20;

export function SentOffersList({
  /** حالت خالی — دکمهٔ «دیدن خریداران» به تب خریداران همان صفحه برمی‌گردد */
  onGoBuyers,
}: {
  onGoBuyers?: () => void;
}) {
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMySentOffers({
    categoryId: category !== 'all' ? Number(category) : undefined,
    page,
    perPage: PAGE_SIZE,
  });

  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <div className="space-y-4" role="tabpanel" aria-label="پیشنهادات ارسال شده">
      {/* فیلتر دسته + شمار */}
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-52 rounded-md" aria-label="دستهٔ کالا">
                <Package size={14} className="text-muted-foreground" />
                <SelectValue placeholder="همه کالاها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه کالاها</SelectItem>
                {(data?.categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {isLoading ? '…' : data && data.total > 0 ? `${toFa(data.total)} پیشنهاد ارسالی` : ''}
            </span>
          </div>
        </div>
      </PanelCard>

      {/* لیست */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <PanelCard className="py-12 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Send size={24} />
          </span>
          <p className="mt-3 text-sm font-extrabold">هنوز پیشنهاد تامین نفرستاده‌اید</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
            از تب‌های «درخواست‌های خرید»، مطابق‌ترین خریداران با آگهی‌های خودتان را ببینید و برایشان پیشنهاد
            تامین بفرستید — پاسخ‌ها در «پیام ها» و همین‌جا دنبال می‌شود.
          </p>
          {onGoBuyers && (
            <Button className="mt-4 rounded-md" onClick={onGoBuyers}>
              دیدن خریداران
            </Button>
          )}
        </PanelCard>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((o) => (
              <OfferRow key={o.id} offer={o} />
            ))}
          </ul>

          {pageCount > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-1" aria-label="صفحه‌بندی پیشنهادات">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </Button>
              <span className="text-xs text-muted-foreground">
                صفحهٔ {toFa(page)} از {toFa(pageCount)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                بعدی
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

/** کارت یک پیشنهاد ارسالی — خریدار + کالا + هزینه + آخرین پیام گفتگو */
function OfferRow({ offer }: { offer: SentOffer }) {
  const goods = [offer.categoryName, offer.productType].filter(Boolean).join(' — ');
  return (
    <li className="rounded-lg border bg-card p-4">
      {/* ردیف ۱: خریدار + کالا + نوع ارسال */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-extrabold">
          {offer.buyerName}
          {offer.buyerVerified && <BadgeCheck size={15} className="text-sky-500" />}
        </span>
        {goods && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            {goods}
          </span>
        )}
        <span
          className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
            offer.isGroup ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-600',
          )}
        >
          {offer.isGroup ? <Users size={12} /> : <CheckCircle2 size={12} />}
          {offer.isGroup ? 'ارسال گروهی' : 'ارسال تکی'}
        </span>
        {offer.fee > 0 && (
          <span className="font-num text-[11px] text-muted-foreground">{priceFa(offer.fee)} تومان</span>
        )}
      </div>

      {/* ردیف ۲: متن پیشنهاد — خلاصه */}
      <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">{offer.message}</p>

      {/* ردیف ۳: تاریخ + آخرین پیام گفتگو + اقدام‌ها */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed pt-3">
        <div className="min-w-0 flex-1">
          {offer.lastMessage ? (
            <p className="flex min-w-0 items-center gap-1.5 text-[11px] leading-5">
              <MessageSquare size={13} className={offer.lastMessage.mine ? 'text-muted-foreground' : 'text-primary'} />
              <span className="text-muted-foreground">آخرین پیام:</span>
              <span className={cn('truncate', !offer.lastMessage.mine && 'font-bold text-foreground')}>
                {offer.lastMessage.text.length > 90 ? `${offer.lastMessage.text.slice(0, 90)}…` : offer.lastMessage.text}
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays size={13} /> ارسال: {dateFa(offer.createdAt)}
            </p>
          )}
          {offer.lastMessage && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {offer.lastMessage.mine ? 'آخرین پیام از شما' : 'پاسخ خریدار'} · {dateFa(offer.lastMessage.at)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {offer.threadId && (
            <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
              <Link href={`/panel/messages?thread=${offer.threadId}`}>
                <MessageSquare size={13} /> گفتگو
              </Link>
            </Button>
          )}
          {offer.buyerUserName && (
            <Button asChild size="sm" variant="ghost" className="rounded-md text-xs">
              <Link href={`/profile/${offer.buyerUserName}`}>پروفایل خریدار</Link>
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
