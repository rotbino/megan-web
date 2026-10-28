'use client';

/**
 * امتیاز فروشنده در کارت آگهی — ستاره‌ها + «N نظر» از سرویس نظرات
 * (خلاصه سبک: perPage=1 فقط برای summary). لینک به بخش نظرات پروفایل.
 */

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RatingStars } from '@/components/shared/rating-stars';
import { getSellerReviews } from '@/lib/mock/api';

export function SellerRatingBadge({ userName }: { userName: string }) {
  const { data } = useQuery({
    queryKey: ['seller-rating', userName] as const,
    queryFn: () => getSellerReviews(userName, 1, 1),
    enabled: Boolean(userName),
    staleTime: 120_000,
    retry: 1,
  });

  const summary = data?.summary;
  if (!summary || summary.count === 0) return null;

  return (
    <Link
      href={`/profile/${userName}#reviews`}
      className="mt-1 inline-flex items-center rounded-full transition-opacity hover:opacity-80"
      aria-label={`امتیاز فروشنده از ${summary.count} نظر — مشاهده نظرات`}
    >
      <RatingStars value={summary.avg} size={13} showValue count={summary.count} />
    </Link>
  );
}
