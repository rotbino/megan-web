'use client';

/**
 * نظرات فروشندگان (پنل ادمین) — داده‌ی واقعی سمت کاربر که تا حالا معادل
 * مدیریتی نداشت. فهرست نظرها (نویسنده → فروشنده، امتیاز، متن) + آمار
 * (کل/میانگین/۷روز) + فیلتر امتیاز + جستجو + حذف نظر نامعتبر.
 * حذف، کش getSeller فروشنده را در بک‌اند می‌شکند تا میانگین پروفایل
 * همان لحظه اصلاح شود.
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import {
  fetchAdminReviewList,
  deleteAdminReview,
  type AdminReviewRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const RATING_FILTERS = [
  { key: 0, label: 'همه' },
  { key: 5, label: '۵ ★' },
  { key: 4, label: '۴ ★' },
  { key: 3, label: '۳ ★' },
  { key: 2, label: '۲ ★' },
  { key: 1, label: '۱ ★' },
];

const PER_PAGE = 20;

function PersonCell({
  person,
  fallbackLabel,
}: {
  person: AdminReviewRow['author'];
  fallbackLabel: string;
}) {
  const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || fallbackLabel;
  return (
    <div className="flex min-w-0 items-center gap-2">
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
          {name.charAt(0)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-bold">{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{person.userName}</p>
      </div>
    </div>
  );
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState<string | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim() || undefined);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-reviews', q, rating, page],
    queryFn: () =>
      fetchAdminReviewList({
        search: q,
        rating: rating || undefined,
        page,
        perPage: PER_PAGE,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAdminReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  const items = data?.items ?? [];
  const stats = data?.stats;
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold">نظرات فروشندگان</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نظراتی که کاربران روی پروفایل فروشنده‌ها نوشته‌اند — آمار و حذف نظر نامعتبر
          </p>
        </div>
        {stats && (
          <div className="flex gap-2 text-xs">
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.total)}</p>
              <p className="text-muted-foreground">کل نظرات</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="flex items-center justify-center gap-1 text-base font-extrabold">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                {toFa(stats.avg || 0)}
              </p>
              <p className="text-muted-foreground">میانگین</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.last7Days)}</p>
              <p className="text-muted-foreground">۷ روز اخیر</p>
            </div>
          </div>
        )}
      </div>

      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: متن نظر، نام نویسنده/فروشنده…"
            className="pe-9 text-sm"
          />
        </div>
        <div className="flex overflow-hidden rounded-md border text-xs">
          {RATING_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setRating(key); setPage(1); }}
              className={cn(
                'px-3 py-2 font-medium transition-colors',
                rating === key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* جدول */}
      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center gap-2 p-14 text-center text-sm text-muted-foreground">
            <MessageSquare size={30} className="text-muted-foreground/50" />
            نظری یافت نشد.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-start font-medium">نویسنده</th>
                <th className="px-4 py-2.5 text-start font-medium">فروشنده</th>
                <th className="px-4 py-2.5 text-start font-medium">امتیاز</th>
                <th className="px-4 py-2.5 text-start font-medium">متن نظر</th>
                <th className="px-4 py-2.5 text-start font-medium">زمان</th>
                <th className="w-16 px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className={cn('border-b last:border-0', isFetching && 'opacity-60')}>
                  <td className="px-4 py-3">
                    <PersonCell person={row.author} fallbackLabel="کاربر ایمچ" />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/profile/${row.seller.userName}`}
                      target="_blank"
                      className="block min-w-0 hover:text-primary"
                      title="مشاهده پروفایل فروشنده"
                    >
                      <PersonCell person={row.seller} fallbackLabel="فروشنده ایمچ" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-0.5" aria-label={`${row.rating} از ۵`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          className={i < row.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
                        />
                      ))}
                    </span>
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <p className="line-clamp-2 whitespace-pre-line leading-6 text-muted-foreground">{row.text}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <RelativeTime date={row.createdAt} />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm('این نظر حذف شود؟')) remove.mutate(row.id);
                      }}
                      aria-label="حذف نظر"
                    >
                      {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* صفحه‌بندی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" className="size-8 rounded-md" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="صفحه قبل">
            <ChevronRight size={15} />
          </Button>
          <span className="text-xs text-muted-foreground">
            صفحه {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button variant="outline" size="icon" className="size-8 rounded-md" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} aria-label="صفحه بعد">
            <ChevronLeft size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
