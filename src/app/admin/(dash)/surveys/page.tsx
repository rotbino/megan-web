'use client';

/**
 * بازخوردهای نظرسنجی کاربران (پنل ادمین) — خروجی «تحقیقات بازار»:
 *
 * فهرست نیازها/مشکلات/انتقادها با دسته، نویسنده، تعداد موافقت
 * («من هم همین را دارم» = سیگنال تقاضا) + آمار دسته‌ای و مجموع
 * موافقت‌ها. فیلتر دسته + جستجوی کاربر + حذف بازخورد نامعتبر.
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bug,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  Loader2,
  MessageSquareWarning,
  PackagePlus,
  Search,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  fetchAdminSurveyList,
  deleteAdminSurveyResponse,
  type AdminSurveyRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const CATEGORIES: { key: string; label: string; icon: LucideIcon; cls: string }[] = [
  { key: 'bug', label: 'خطا و مشکل', icon: Bug, cls: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'critique', label: 'انتقاد', icon: MessageSquareWarning, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'improvement', label: 'پیشنهاد بهبود', icon: Lightbulb, cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'feature', label: 'نیاز جدید', icon: PackagePlus, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const catOf = (key: string) => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[1];

const PER_PAGE = 20;

function initials(row: AdminSurveyRow): string {
  const n = `${row.user.firstName ?? ''} ${row.user.lastName ?? ''}`.trim();
  return n ? n.charAt(0) : '؟';
}

export default function AdminSurveysPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim() || undefined);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-surveys', q, category, page],
    queryFn: () =>
      fetchAdminSurveyList({
        search: q,
        category: category || undefined,
        page,
        perPage: PER_PAGE,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAdminSurveyResponse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
    },
  });

  const items = data?.items ?? [];
  const stats = data?.stats;
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold">بازخوردهای نظرسنجی</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نیازها، مشکلات و پیشنهادهای کاربران — خروجی تحقیقات بازار ایمچ
          </p>
        </div>
        {stats && (
          <div className="flex gap-2 text-xs">
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.total)}</p>
              <p className="text-muted-foreground">کل بازخورد</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="flex items-center justify-center gap-1 text-base font-extrabold">
                <ThumbsUp size={13} className="text-primary" />
                {toFa(stats.totalUpvotes)}
              </p>
              <p className="text-muted-foreground">مجموع موافقت‌ها</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.last7Days)}</p>
              <p className="text-muted-foreground">۷ روز اخیر</p>
            </div>
          </div>
        )}
      </div>

      {/* آمار دسته‌ای */}
      {stats && stats.total > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.byCategory.map(({ category: c, count }) => {
            const meta = catOf(c);
            const CatIcon = meta.icon;
            return (
              <div key={c} className={cn('flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold', meta.cls)}>
                <CatIcon size={13} />
                {meta.label}
                <span className="rounded-full bg-white/60 px-1.5 font-num">{toFa(count)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: نام، موبایل، یوزرنیم یا متن بازخورد…"
            className="pe-9 text-sm"
          />
        </div>
        <div className="flex overflow-hidden rounded-md border text-xs">
          {[{ key: '', label: 'همه' }, ...CATEGORIES].map(({ key, label }) => (
            <button
              key={key || 'all'}
              type="button"
              onClick={() => { setCategory(key); setPage(1); }}
              className={cn(
                'px-3 py-2 font-medium transition-colors',
                category === key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent',
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
            <ClipboardList size={30} className="text-muted-foreground/50" />
            بازخوردی یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-start font-medium">کاربر</th>
                  <th className="px-4 py-2.5 text-start font-medium">دسته</th>
                  <th className="px-4 py-2.5 text-start font-medium">بازخورد</th>
                  <th className="px-4 py-2.5 text-start font-medium">موافقت‌ها</th>
                  <th className="px-4 py-2.5 text-start font-medium">زمان</th>
                  <th className="w-16 px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const meta = catOf(row.category);
                  const CatIcon = meta.icon;
                  return (
                    <tr key={row.id} className={cn('border-b last:border-0', isFetching && 'opacity-60')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {row.user.avatarUrl ? (
                            <img src={row.user.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                              {row.isStaff ? <ShieldCheck size={15} /> : initials(row)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-bold">
                              {row.isStaff ? 'تیم ایمچ' : `${row.user.firstName ?? ''} ${row.user.lastName ?? ''}`.trim() || 'بی‌نام'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {toFa(row.user.phone)} · {row.user.userName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold', meta.cls)}>
                          <CatIcon size={12} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <p className="line-clamp-1 font-bold">{row.title}</p>
                        <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs leading-5 text-muted-foreground">{row.body}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-1 font-num text-xs font-bold',
                          row.upvoteCount > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
                        )}>
                          <ThumbsUp size={11} />
                          {toFa(row.upvoteCount)}
                        </span>
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
                            if (confirm('این بازخورد حذف شود؟')) remove.mutate(row.id);
                          }}
                          aria-label="حذف بازخورد"
                        >
                          {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
