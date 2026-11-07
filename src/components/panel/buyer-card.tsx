'use client';

/**
 * کارت خریدار پنل — عین ساختار باسکول:
 * نام + امتیاز + نشان «خریدار»، جمله «… هستم»، تاریخ + شهر،
 * دکمه‌های ذخیره در پیگیری / تماس با خریدار / چت با خریدار و توصیه معامله حضوری.
 *  • گیت‌های تماس/چت (خواستهٔ مالک ۷-۱۱): تماس و چت فقط برای فروشنده‌ای که
 *    کالای خود را برای فروش ثبت کرده — صفحه با contactGate مودال «ثبت کالا
 *    لازم است» (و برای تماس، مودال بسته) را باز می‌کند؛ بک‌اند هم همین را
 *    با کد PRODUCT_REGISTRATION_REQUIRED تکرار می‌کند.
 */

import { useState } from 'react';
import { BadgeCheck, CalendarDays, Loader2, MapPin, MessageSquare, Phone, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SaveFollowButton } from '@/components/panel/follow/save-follow-button';
import { useBuyRequestContact } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api/client';
import { toFa } from '@/lib/format';
import { RelativeTime } from '@/components/shared/relative-time';
import { cn } from '@/lib/utils';
import type { BuyRequest } from '@/lib/types';

/** امتیاز نمایشی قطعی بر اساس شناسه (۳.۷ تا ۵.۰) */
export function ratingOf(id: number): string {
  return ((id % 14) / 10 + 3.7).toFixed(1);
}

export function BuyerCard({
  request,
  matchBadge,
  relatedHint,
  contactGate,
}: {
  request: BuyRequest;
  matchBadge?: { score: number; label: string };
  relatedHint?: string;
  /** دروازهٔ مشترک تماس/چت — صفحه تشخیص می‌دهد کالا/بسته کم است یا اجازه هست؛
   *  undefined یعنی گیت سمت صفحه نیست (رفتار قدیمی) */
  contactGate?: (needPackageToo: boolean) => boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const contact = useBuyRequestContact();
  const rating = ratingOf(request.id);

  const reveal = async () => {
    if (phone) return;
    try {
      const data = await contact.mutateAsync(request.id);
      setPhone(data.isSelf ? 'درخواست شماست' : data.phone);
      setRevealed(true);
    } catch (err) {
      // پیام گیت‌های بک‌اند (ثبت کالا / بسته / سهمیه) شفاف دیده شود — مودالِ
      // سمت صفحه معمولاً جلوی رسیدن به این‌جا را می‌گیرد؛ این فقط تور ایمنی است
      const msg = err instanceof ApiError ? err.message : undefined;
      if (msg) toast({ description: msg, variant: 'destructive' });
    }
  };

  const onCall = () => {
    if (contactGate && !contactGate(true)) return; // کالا اول، بعد بسته
    void reveal();
  };

  const onChat = () => {
    if (contactGate && !contactGate(false)) return; // چت فقط گیت ثبت کالا دارد
    router.push('/panel/messages');
  };

  return (
    <article className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-sm font-extrabold">
          {request.firstName} {request.lastName}
          {request.isVerified && <BadgeCheck size={15} className="text-sky-500" />}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
          <Star size={11} className="fill-amber-400 text-amber-400" />
          {toFa(rating)}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">خریدار</span>
        {matchBadge && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold',
              matchBadge.score >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600',
            )}
          >
            دقت تطابق ٪{toFa(matchBadge.score)} — {matchBadge.label}
          </span>
        )}
      </div>

      <p className="mt-2.5 text-sm leading-6">
        {toFa(request.requirementAmount.toLocaleString('en-US'))} {request.unit} {request.subcategoryName}
        {request.name ? (
          <>
            {' '}
            از نوع <span className="font-bold">{request.name}</span>
          </>
        ) : ''}{' '}
        هستم
      </p>
      {relatedHint && <p className="mt-1 text-[11px] text-muted-foreground">{relatedHint}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays size={13} /> <RelativeTime date={request.createdAt} />
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={13} /> {request.city}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <SaveFollowButton
          targetType="buy_request"
          targetId={request.id}
          suggestedFolderName={request.subcategoryName}
        />
        <Button type="button" size="sm" className="rounded-md text-xs" onClick={onCall} disabled={contact.isPending}>
          {contact.isPending ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
          {phone ? toFa(phone) : 'تماس با خریدار'}
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-md text-xs" onClick={onChat}>
          <MessageSquare size={14} /> چت با خریدار
        </Button>
      </div>

      <p className="mt-3 border-t border-dashed pt-2.5 text-[10px] text-muted-foreground">
        توصیه ایمچ همواره به انجام معاملات حضوری است.
      </p>
    </article>
  );
}

/** بنر «ارسال پیامک تبلیغاتی گروهی» — بین کارت‌ها (عین باسکول) */
export function BulkSmsBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-extrabold text-primary">ارسال پیامک تبلیغاتی گروهی</p>
        <p className="mt-1 text-xs text-muted-foreground">برای خریـدران محصول شمـا</p>
      </div>
      <Button className="rounded-md" size="sm">
        ارسال پیامک
      </Button>
    </div>
  );
}
