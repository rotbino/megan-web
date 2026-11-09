import Link from 'next/link';
import { MessageSquareText, Star } from 'lucide-react';
import { RatingStars } from '@/components/shared/rating-stars';
import { RelativeTime } from '@/components/shared/relative-time';
import { getSellerReviews } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import type { SellerReviewRow } from '@/lib/mock/api';

/**
 * «نظرات کاربران دربارهٔ این فروشنده و محصول» — ۵ نظر آخر + «مشاهده همهٔ نظرات»
 * (خواسته مالک ۱-۱۱ دور هفتم). سرور-رندر برای سئو (محتوای واقعی نظر در HTML).
 * هنوز نظری نباشد کل بخش حذف می‌شود (قانون حالت خالی).
 */
async function ReviewCard({ review }: { review: SellerReviewRow }) {
  const name = `${review.author.firstName} ${review.author.lastName}`.trim() || 'کاربر ایمچ';
  return (
    <article className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {review.author.avatarUrl ? (
            <img src={review.author.avatarUrl} alt={name} className="size-9 shrink-0 rounded-full object-cover" loading="lazy" />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {review.author.firstName?.[0] ?? '؟'}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{name}</p>
            <p className="text-[10.5px] text-muted-foreground">
              <RelativeTime date={review.createdAt} />
            </p>
          </div>
        </div>
        <RatingStars value={review.rating} size={13} />
      </div>
      <p className="mt-3 whitespace-pre-line text-[13px] leading-6 text-foreground/90">{review.text}</p>
    </article>
  );
}

export async function ProductReviews({
  sellerUserName,
  sellerName,
}: {
  sellerUserName: string;
  sellerName: string;
}) {
  let data: Awaited<ReturnType<typeof getSellerReviews>> | null = null;
  try {
    data = await getSellerReviews(sellerUserName, 1, 5);
  } catch {
    return null; // بک‌اند در دسترس نیست — بخش حذف، صفحه سالم
  }
  // دیتای خالی/ناهم‌شکل → بخش حذف، صفحه سالم (raw.items ?? [] هم در سرویس)
  if (!data?.items || data.items.length === 0) return null;

  return (
    <section aria-labelledby="reviews-preview" className="mx-auto max-w-7xl px-4 lg:px-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="reviews-preview" className="flex items-center gap-1.5 text-base font-extrabold lg:text-lg">
          <MessageSquareText size={17} className="text-primary" />
          نظرات کاربران دربارهٔ {sellerName}
          {data.summary.count > 0 && (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              (<Star size={11} className="fill-amber-400 text-amber-400" />
              {toFa(data.summary.avg)} از {toFa(data.summary.count)} نظر)
            </span>
          )}
        </h2>
        <Link
          href={`/profile/${sellerUserName}#reviews`}
          className="shrink-0 text-xs font-bold text-primary transition-colors hover:text-primary-deep"
        >
          مشاهده همهٔ نظرات
        </Link>
      </div>
      <div className="grid gap-2.5 lg:grid-cols-2">
        {data.items.slice(0, 5).map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
    </section>
  );
}
