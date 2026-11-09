'use client';

/**
 * کارت‌های مشترک «پیشنهادهای من» (خواسته مالک ۸-۱۱) — یک چیدمان واحد برای
 * هر دو صفحه، تا تب «پیشنهادهای من» صفحهٔ خریدارانِ هر کالا و تب همان نام
 * پنل خریداران عین هم باشند:
 *  • SupplyOfferCard — پیشنهاد تامین ارسالی به درخواست‌های دوره‌ای: عین
 *    مدال پیشنهاد تامین، «متن و مشخصات» روی کارت می‌آید (نوع کالا، حداقل
 *    خرید با واحد، چک ٪/سرسید، ارسال به محل) + آخرین پیام گفتگو برای
 *    «بعدش چه شد». بج «تکی/گروهی» حذف شد — جز گیج‌کردن کاربر فایده‌ای نداشت.
 *  • UrgentChatCard — گفتگوی خرید فوری (پاسخ‌دهی به درخواست‌های فوری از
 *    طریق چت/تماس): جملهٔ درخواست خریدار + آخرین وضعیت گفتگو.
 *  • موبایل و دسکتاپ هم‌سنجه: ردیف‌های flex-wrap، برچسب‌های ریز، بدون
 *    سرریز در ۳۹۰px (قانون §۲).
 */

import Link from 'next/link';
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  ClipboardList,
  MessageSquare,
  Package,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/shared/relative-time';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SentOffer, UrgentChat } from '@/lib/types';

/** چیپ مشخصهٔ پیشنهاد — ریز و بی‌سروصدا؛ فقط وقتی مقدار دارد رندر می‌شود */
function Term({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-bold text-secondary-foreground">
      {icon}
      {label}
    </span>
  );
}

/** ردیف نتیجهٔ مشترک — پاسخ خریدار / آخرین پیام شما / در انتظار پاسخ */
function Result({
  last,
  fallbackAt,
}: {
  last: { text: string; at: string; mine: boolean } | null;
  fallbackAt?: string;
}) {
  if (last) {
    return (
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] leading-5">
          <MessageSquare
            size={13}
            className={cn('shrink-0', last.mine ? 'text-muted-foreground' : 'text-primary')}
          />
          <span className="shrink-0 text-muted-foreground">{last.mine ? 'آخرین پیام شما:' : 'پاسخ خریدار:'}</span>
          <span className={cn('truncate', !last.mine && 'font-bold text-foreground')}>
            {last.text.length > 90 ? `${last.text.slice(0, 90)}…` : last.text}
          </span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {last.mine ? 'آخرین پیام از شما' : 'پاسخ خریدار'} · {dateFa(last.at)}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CalendarDays size={13} className="shrink-0" />
        در انتظار پاسخ خریدار… · ارسال {fallbackAt ? dateFa(fallbackAt) : ''}
      </p>
    </div>
  );
}

/** اقدام‌های مشترک — گفتگو + پروفایل خریدار */
function Actions({ threadId, buyerUserName }: { threadId?: string | null; buyerUserName?: string | null }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {threadId && (
        <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
          <Link href={`/panel/messages?thread=${threadId}`}>
            <MessageSquare size={13} /> گفتگو
          </Link>
        </Button>
      )}
      {buyerUserName && (
        <Button asChild size="sm" variant="ghost" className="rounded-md text-xs">
          <Link href={`/profile/${buyerUserName}`}>پروفایل خریدار</Link>
        </Button>
      )}
    </div>
  );
}

/** کارت پیشنهاد تامین ارسالی — خریدار + کالا + مشخصات + متن پیشنهاد + نتیجه */
export function SupplyOfferCard({ offer }: { offer: SentOffer }) {
  // مشخصات ساختاریافته — فقط آن‌هایی که واقعاً دارند (چیپ خالی ممنوع)
  const terms: React.ReactNode[] = [];
  if (offer.productType)
    terms.push(<Term key="type" icon={<Package size={11} />} label={`نوع: ${offer.productType}`} />);
  if (offer.minOrderAmount != null && offer.minOrderAmount > 0)
    terms.push(
      <Term
        key="min"
        icon={<Package size={11} />}
        label={`حداقل سفارش: ${toFa(offer.minOrderAmount.toLocaleString('en-US'))} ${offer.unit}`.trim()}
      />,
    );
  if (offer.checkAccepted)
    terms.push(
      <Term
        key="check"
        icon={<Banknote size={11} />}
        label={`چک: ٪${toFa(offer.checkPercent ?? 0)} تا ${toFa(offer.checkMaxDays ?? 0)} روز`}
      />,
    );
  if (offer.deliveryToBuyer)
    terms.push(
      <Term
        key="delivery"
        icon={<Truck size={11} />}
        label={
          offer.shippingCostBy === 'seller' ? 'ارسال به محل (حمل با فروشنده)' : 'ارسال به محل (حمل با مشتری)'
        }
      />,
    );

  return (
    <li className="rounded-lg border bg-card p-3.5 sm:p-4">
      {/* ردیف ۱: خریدار + نشان پیشنهاد تامین + زمان */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm font-extrabold">
          {offer.buyerName}
          {offer.buyerVerified && <BadgeCheck size={15} className="text-primary" />}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
          <Package size={12} className="shrink-0" /> پیشنهاد تامین
        </span>
        {offer.categoryName && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            {offer.categoryName}
          </span>
        )}
        <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">
          <RelativeTime date={offer.lastMessage?.at ?? offer.createdAt} />
        </span>
      </div>

      {/* ردیف ۲: مشخصات پیشنهاد — عین مدال ارسال */}
      {terms.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">{terms}</div>
      )}

      {/* ردیف ۳: متن پیشنهاد — خلاصهٔ دو خطی روی کارت (خواسته مالک ۸-۱۱) */}
      <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">{offer.message}</p>

      {/* ردیف ۴: نتیجه + اقدام‌ها */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed pt-3">
        <Result last={offer.lastMessage} fallbackAt={offer.createdAt} />
        <Actions threadId={offer.threadId} buyerUserName={offer.buyerUserName} />
      </div>
    </li>
  );
}

/** کارت گفتگوی خرید فوری — خریدار + جملهٔ درخواستش + آخرین وضعیت گفتگو */
export function UrgentChatCard({ chat }: { chat: UrgentChat }) {
  const req = chat.request;
  return (
    <li className="rounded-lg border bg-card p-3.5 sm:p-4">
      {/* ردیف ۱: خریدار + نشان خرید فوری + زمان */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm font-extrabold">
          {chat.buyerName}
          {chat.buyerVerified && <BadgeCheck size={15} className="text-primary" />}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-600">
          <ClipboardList size={12} className="shrink-0" /> خرید فوری
        </span>
        <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">
          <RelativeTime date={chat.lastMessage?.at ?? chat.updatedAt} />
        </span>
      </div>

      {/* ردیف ۲: جملهٔ درخواست — باسکولی: خریدار N واحد کالا از نوع X هستم */}
      {req && (
        <p className="mt-1.5 line-clamp-1 text-[11px] leading-6 text-muted-foreground">
          خریدار{' '}
          <span className="font-bold text-foreground">
            {toFa(req.amount.toLocaleString('en-US'))} {req.unit}
          </span>{' '}
          {req.categoryName}
          {req.productType ? ` از نوع ${req.productType}` : ''} هستم
        </p>
      )}

      {/* ردیف ۳: نتیجه + اقدام‌ها */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-dashed pt-2.5">
        <Result last={chat.lastMessage} />
        <Actions threadId={chat.threadId} buyerUserName={chat.buyerUserName} />
      </div>
    </li>
  );
}
