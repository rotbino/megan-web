'use client';

/**
 * کارت خریدار پنل — عین ساختار باسکول:
 * نام + امتیاز + نشان «خریدار»، جمله «… هستم»، تاریخ + شهر،
 * دکمه‌های نشان کردن / تماس با خریدار / چت با خریدار و توصیه معامله حضوری.
 */

import { useState } from 'react';
import { BadgeCheck, CalendarDays, MapPin, MessageSquare, Phone, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toFa, timeAgoFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyRequest } from '@/lib/types';

/** امتیاز نمایشی قطعی بر اساس شناسه (۳.۷ تا ۵.۰) */
export function ratingOf(id: number): string {
  return ((id % 14) / 10 + 3.7).toFixed(1);
}

export function BuyerCard({
  request,
  saved = false,
  onToggleSave,
  matchBadge,
  relatedHint,
}: {
  request: BuyRequest;
  saved?: boolean;
  onToggleSave?: () => void;
  matchBadge?: { score: number; label: string };
  relatedHint?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const rating = ratingOf(request.id);

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
              matchBadge.score >= 85 ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600',
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
          <CalendarDays size={13} /> {timeAgoFa(request.createdAt)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={13} /> {request.city}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={saved ? 'secondary' : 'outline'}
          className="rounded-md text-xs"
          onClick={onToggleSave}
        >
          {saved ? 'نشان شده' : 'نشان کردن'}
        </Button>
        <Button type="button" size="sm" className="rounded-md text-xs" onClick={() => setRevealed(true)}>
          <Phone size={14} /> {revealed ? toFa('09141234567') : 'تماس با خریدار'}
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-md text-xs">
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
