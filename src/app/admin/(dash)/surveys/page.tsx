'use client';

/**
 * نظرسنجی‌های کاربران (پنل ادمین) — ممیزی «معادل ادمین ندارند» را می‌بندد.
 *
 * فهرست پاسخ‌ها (امتیاز پنج‌گانه + یادداشت + کاربر) + آمار بالای صفحه:
 * کل، یادداشت‌دار، ۷روز اخیر، توزیع پنج‌گانه. فیلتر امتیاز/یادداشت‌دار +
 * جستجوی نام/موبایل/یوزرنیم + حذف پاسخ نامعتبر.
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  MessageSquareText,
  Search,
  Trash2,
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

const SCORE_META: Record<string, { label: string; cls: string }> = {
  excellent: { label: 'عالی', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  good: { label: 'خوب', cls: 'bg-lime-50 text-lime-700 border-lime-200' },
  average: { label: 'متوسط', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  bad: { label: 'بد', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  very_bad: { label: 'خیلی بد', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const SCORE_FILTERS = [
  { key: '', label: 'همه' },
  { key: 'excellent', label: 'عالی' },
  { key: 'good', label: 'خوب' },
  { key: 'average', label: 'متوسط' },
  { key: 'bad', label: 'بد' },
  { key: 'very_bad', label: 'خیلی بد' },
];

const PER_PAGE = 20;

function initials(row: AdminSurveyRow): string {
  const n = `${row.user.firstName ?? ''} ${row.user.lastName ?? ''}`.trim();
  return n ? n.charAt(0) : '؟';
}

export default function AdminSurveysPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState<string | undefined>(undefined);
  const [score, setScore] = useState('');
  const [withNote, setWithNote] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim() || undefined);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-surveys', q, score, withNote, page],
    queryFn: () =>
      fetchAdminSurveyList({
        search: q,
        score: score || undefined,
        withNote: withNote ? 'true' : undefined,
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
          <h1 className="text-lg font-extrabold">نظرسنجی‌های کاربران</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            نظر کاربران درباره عملکرد ایمچ — آمار، یادداشت‌ها و حذف پاسخ نامعتبر
          </p>
        </div>
        {stats && (
          <div className="flex gap-2 text-xs">
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.total)}</p>
              <p className="text-muted-foreground">کل پاسخ</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.withNote)}</p>
              <p className="text-muted-foreground">با یادداشت</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-center">
              <p className="text-base font-extrabold">{toFa(stats.last7Days)}</p>
              <p className="text-muted-foreground">۷ روز اخیر</p>
            </div>
          </div>
        )}
      </div>

      {/* توزیع پنج‌گانه */}
      {stats && stats.total > 0 && (
        <div className="flex h-3 overflow-hidden rounded-full border" aria-label="توزیع امتیازها">
          {stats.distribution.map(({ score: s, count }) => {
            const pct = (count / Math.max(1, stats.total)) * 100;
            const cls =
              s === 'excellent' ? 'bg-emerald-500' :
              s === 'good' ? 'bg-lime-500' :
              s === 'average' ? 'bg-amber-500' :
              s === 'bad' ? 'bg-orange-500' : 'bg-red-500';
            return pct > 0 ? (
              <span key={s} className={cls} style={{ width: `${pct}%` }} title={`${SCORE_META[s]?.label}: ${count}`} />
            ) : null;
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
            placeholder="جستجو: نام، موبایل، یوزرنیم…"
            className="pe-9 text-sm"
          />
        </div>
        <div className="flex overflow-hidden rounded-md border text-xs">
          {SCORE_FILTERS.map(({ key, label }) => (
            <button
              key={key || 'all'}
              type="button"
              onClick={() => { setScore(key); setPage(1); }}
              className={cn(
                'px-3 py-2 font-medium transition-colors',
                score === key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant={withNote ? 'default' : 'outline'}
          size="sm"
          className="rounded-md text-xs"
          onClick={() => { setWithNote((v) => !v); setPage(1); }}
        >
          <MessageSquareText size={13} /> فقط یادداشت‌دار
        </Button>
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
            پاسخی یافت نشد.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-start font-medium">کاربر</th>
                <th className="px-4 py-2.5 text-start font-medium">امتیاز</th>
                <th className="px-4 py-2.5 text-start font-medium">یادداشت</th>
                <th className="px-4 py-2.5 text-start font-medium">زمان</th>
                <th className="w-16 px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const meta = SCORE_META[row.score] ?? { label: row.score, cls: 'bg-secondary text-foreground border-border' };
                return (
                  <tr key={row.id} className={cn('border-b last:border-0', isFetching && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {row.user.avatarUrl ? (
                          <img src={row.user.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                            {initials(row)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {`${row.user.firstName ?? ''} ${row.user.lastName ?? ''}`.trim() || 'بی‌نام'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {toFa(row.user.phone)} · {row.user.userName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block rounded-md border px-2.5 py-1 text-xs font-bold', meta.cls)}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3">
                      {row.note ? (
                        <p className="line-clamp-2 whitespace-pre-line leading-6 text-muted-foreground">{row.note}</p>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
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
                          if (confirm('این پاسخ نظرسنجی حذف شود؟')) remove.mutate(row.id);
                        }}
                        aria-label="حذف پاسخ"
                      >
                        {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
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
