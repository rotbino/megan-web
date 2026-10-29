'use client';

/**
 * نظرات کاربران درباره فروشنده — عین ساختار باسکول در پروفایل:
 * خلاصه امتیاز (میانگین + ستاره + توزیع ۵..۱) + لیست نظرات + فرم
 * ثبت/ویرایش نظر خودم (لاگین لازم). مهمان‌ها لیست را می‌بینند، برای نوشتن
 * مودال ورود باز می‌شود.
 */

import { useState } from 'react';
import { Loader2, MessageSquarePlus, Star, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { LazyAuthModal } from '@/components/shared/lazy-auth-modal';
import { RatingInput, RatingStars } from '@/components/shared/rating-stars';
import { RelativeTime } from '@/components/shared/relative-time';
import { useAuth } from '@/lib/mock/auth';
import { useAddSellerReview, useSellerReviews } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SellerReviewRow } from '@/lib/mock/api';

/** یک نظر — کارت مؤلف نظر باسکول */
function ReviewCard({ review }: { review: SellerReviewRow }) {
  const name = `${review.author.firstName} ${review.author.lastName}`.trim() || 'کاربر ایمچ';
  return (
    <article className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {review.author.avatarUrl ? (
            <img
              src={review.author.avatarUrl}
              alt={name}
              className="size-9 shrink-0 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {review.author.firstName?.[0] ?? '؟'}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{name}</p>
            <p className="text-[10.5px] text-muted-foreground">
              <RelativeTime date={review.createdAt} /> — شناسه {review.author.userName}
            </p>
          </div>
        </div>
        <RatingStars value={review.rating} size={13} />
      </div>
      <p className="mt-3 whitespace-pre-line text-[13px] leading-6 text-foreground/90">{review.text}</p>
    </article>
  );
}

export function SellerReviews({ userName, sellerName }: { userName: string; sellerName: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [loginOpen, setLoginOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useSellerReviews(userName, page);
  const add = useAddSellerReview();

  const summary = data?.summary;
  const items = data?.items ?? [];
  const myReview = data?.myReview ?? null;

  const openForm = () => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    // ویرایش نظر خودم — پیش‌پر با مقادیر قبلی
    setRating(myReview?.rating ?? 0);
    setText(myReview?.text ?? '');
    setError('');
    setFormOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (rating < 1) {
      setError('امتیاز (ستاره) را انتخاب کنید.');
      return;
    }
    if (text.trim().length < 3) {
      setError('متن نظر خیلی کوتاه است (حداقل ۳ نویسه).');
      return;
    }
    add.mutate(
      { userName, rating, text: text.trim() },
      {
        onSuccess: () => {
          setFormOpen(false);
          toast({ description: myReview ? 'نظر شما به‌روزرسانی شد.' : 'نظر شما ثبت شد — سپاس از بازخورد!' });
        },
        onError: (err: Error) => setError(err.message),
      },
    );
  };

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="reviews-title" className="text-base font-extrabold">نظرات کاربران</h2>
        <Button size="sm" className="h-8 rounded-[10px] px-3 text-[11.5px]" onClick={openForm} disabled={isLoading}>
          {myReview ? <Star size={13} /> : <MessageSquarePlus size={13} />}
          {myReview ? 'ویرایش نظر من' : 'ثبت نظر'}
        </Button>
      </div>

      <div className="space-y-2.5">
        {/* خلاصه امتیاز + توزیع */}
        {isLoading ? (
          <Skeleton className="h-28 rounded-md" />
        ) : summary && summary.count > 0 ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold leading-none text-primary">{toFa(summary.avg)}</span>
              <div className="space-y-1">
                <RatingStars value={summary.avg} size={14} />
                <p className="text-[11px] text-muted-foreground">{toFa(summary.count)} نظر درباره این فروشنده</p>
              </div>
            </div>
            {/* توزیع — میله‌های ۵..۱ مثل باسکول */}
            <div className="flex min-w-40 flex-1 flex-col-reverse gap-1">
              {summary.distribution.map((d) => {
                const pct = summary.count ? Math.round((d.count / summary.count) * 100) : 0;
                return (
                  <div key={d.rating} className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                    <span className="w-3 shrink-0">{toFa(d.rating)}</span>
                    <Star size={10} className="shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-end">{toFa(d.count)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
            هنوز نظری برای {sellerName} ثبت نشده — اولین نفر باشید.
          </p>
        )}

        {/* لیست نظرات */}
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-md" />)}
          </div>
        ) : (
          items.map((r) => <ReviewCard key={r.id} review={r} />)
        )}

        {/* صفحه‌بندی */}
        {data && data.pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-[10px] text-[11px]"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              قبلی
            </Button>
            <span className="text-[11px] text-muted-foreground">
              صفحه {toFa(page)} از {toFa(data.pageCount)}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-[10px] text-[11px]"
              disabled={page >= data.pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              بعدی
            </Button>
          </div>
        )}
      </div>

      {/* فرم ثبت/ویرایش نظر */}
      {formOpen && (
        <form
          onSubmit={submit}
          className="mt-3 space-y-3 rounded-md border bg-card p-4"
          aria-label={myReview ? 'ویرایش نظر من' : 'ثبت نظر جدید'}
        >
          <h3 className="text-sm font-extrabold">
            {myReview ? 'ویرایش نظر من درباره' : 'نظر من درباره'} {sellerName}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">امتیاز شما:</span>
            <RatingInput value={rating} onChange={setRating} />
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="تجربه‌تان از معامله با این فروشنده را بنویسید (کیفیت کالا، خوش‌قولی، پاسخگویی…)"
            rows={4}
            maxLength={1000}
            aria-label="متن نظر"
          />
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" className="rounded-[10px]" disabled={add.isPending}>
              {add.isPending && <Loader2 size={13} className="animate-spin" />}
              {myReview ? 'ذخیره تغییرات' : 'ثبت نظر'}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-[10px]" onClick={() => setFormOpen(false)}>
              انصراف
            </Button>
            <span className={cn('ms-auto text-[10.5px] text-muted-foreground')}>{toFa(text.length)}/{toFa(1000)}</span>
          </div>
        </form>
      )}

      {loginOpen && (
        <LazyAuthModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLoggedIn={() => {
            setLoginOpen(false);
            setFormOpen(true);
          }}
        />
      )}
    </section>
  );
}
