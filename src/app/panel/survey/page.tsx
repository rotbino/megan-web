'use client';

/**
 * نظرسنجی و نیازها — «تحقیقات بازار» ایمچ (بازطراحی ۸-۱۱):
 *
 * به‌جای امتیاز ۵گانه (عالی…خیلی‌بد) که خروجی پژوهشی نداشت، تختهٔ بازخورد:
 *  • فرم ثبت با ۴ دسته: خطا و مشکل / انتقاد / پیشنهاد بهبود / نیاز جدید
 *  • فید عمومی — کاربر نظرات دیگران را می‌بیند، از هم یاد می‌گیرد و تشویق
 *    می‌شود نیاز خودش را بفرستد (نمونه‌های راهنما از «تیم ایمچ» در بذر)
 *  • «من هم همین را دارم» — تعداد موافقت‌ها = سیگنال تقاضای واقعی برای تیم
 *  • مرتب‌سازی جدیدترین / پرموافق‌ترین (اولویت‌بندی نیازها)
 * فرم فقط «دسته + شرح» دارد (خواستهٔ مالک ۸-۱۱): فیلد عنوان حذف شد —
 * هم فرم خلوت‌تر است و هم کاربر برای عنوان مکث نمی‌کند؛ دکمهٔ ارسال با
 * «دسته + شرح» فعال می‌شود و شمارندهٔ نویسه دلیلش را می‌گوید.
 */

import { useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Bug,
  ClipboardList,
  Lightbulb,
  Loader2,
  MessageSquareWarning,
  PackagePlus,
  Send,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { RelativeTime } from '@/components/shared/relative-time';
import { apiFetch } from '@/lib/api/client';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FeedbackCategory } from '@/lib/types';

// ─── فرادادهٔ دسته‌ها (مشترک بین فرم و فید) ─────────────────────────────────

const CATEGORIES: { key: FeedbackCategory; label: string; icon: LucideIcon; chip: string; active: string }[] = [
  { key: 'bug', label: 'خطا و مشکل', icon: Bug, chip: 'border-red-200 bg-red-50 text-red-700', active: 'border-red-400 bg-red-50 text-red-700' },
  { key: 'critique', label: 'انتقاد', icon: MessageSquareWarning, chip: 'border-amber-200 bg-amber-50 text-amber-700', active: 'border-amber-400 bg-amber-50 text-amber-700' },
  { key: 'improvement', label: 'پیشنهاد بهبود', icon: Lightbulb, chip: 'border-sky-200 bg-sky-50 text-sky-700', active: 'border-sky-400 bg-sky-50 text-sky-700' },
  { key: 'feature', label: 'نیاز جدید', icon: PackagePlus, chip: 'border-emerald-200 bg-emerald-50 text-emerald-700', active: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
];

const catOf = (key: string) => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[1];

const BODY_MIN = 20, BODY_MAX = 2000;

// ─── انواع API ──────────────────────────────────────────────────────────────

interface FeedbackRow {
  id: string;
  category: FeedbackCategory;
  body: string;
  isStaff: boolean;
  isMine: boolean;
  upvoteCount: number;
  hasUpvoted: boolean;
  author: { firstName: string; lastName: string } | null;
  createdAt: string;
}

interface FeedbackListPage {
  items: FeedbackRow[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

const PER_PAGE = 10;

export default function SurveyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── فرم ──
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [body, setBody] = useState('');

  // ── فیلتر/مرتب‌سازی فید ──
  const [filter, setFilter] = useState<FeedbackCategory | ''>('');
  const [sort, setSort] = useState<'recent' | 'top'>('recent');

  const bodyLen = body.trim().length;
  const canSubmit = !!category && bodyLen >= BODY_MIN;

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<FeedbackRow>('/survey/submit', {
        category: category as FeedbackCategory,
        body: body.trim(),
      }),
    onSuccess: () => {
      setCategory(null);
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['feedback-list'] });
      toast({ description: 'نظر شما ثبت شد و در فید نمایش داده می‌شود.' });
    },
    onError: (err) => {
      toast({ description: err instanceof Error ? err.message : 'ثبت نظر ناموفق بود.' });
    },
  });

  // ── فید (صفحه‌بندی انباشتی — «نمایش بیشتر») ──
  const feed = useInfiniteQuery({
    queryKey: ['feedback-list', filter, sort],
    queryFn: ({ pageParam }) =>
      apiFetch<FeedbackListPage>('/survey/list', {
        ...(filter ? { category: filter } : {}),
        sort,
        page: pageParam,
        perPage: PER_PAGE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
  });

  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const total = feed.data?.pages[0]?.total ?? 0;

  const upvote = useMutation({
    mutationFn: (id: string) => apiFetch<{ id: string; upvoteCount: number; hasUpvoted: boolean }>('/survey/upvote', { id }),
    onSuccess: (data) => {
      // به‌روزرسانی درجای آیتم در همهٔ صفحات کش (بدون رفچ کامل)
      queryClient.setQueryData<{ pages: FeedbackListPage[]; pageParams: number[] }>(
        ['feedback-list', filter, sort],
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              items: p.items.map((it) =>
                it.id === data.id ? { ...it, upvoteCount: data.upvoteCount, hasUpvoted: data.hasUpvoted } : it,
              ),
            })),
          },
      );
    },
    onError: (err) => {
      toast({ description: err instanceof Error ? err.message : 'ثبت موافقت ناموفق بود.' });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch<{ id: string }>('/survey/deleteMine', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-list'] });
      toast({ description: 'نظر شما حذف شد.' });
    },
    onError: (err) => {
      toast({ description: err instanceof Error ? err.message : 'حذف ناموفق بود.' });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">نظرسنجی و نیازها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نیاز، مشکل یا پیشنهاد خود را بنویسید — و ببینید دیگر کاربران چه نیازهایی دارند
        </p>
      </div>

      {/* ── فرم ثبت ── */}
      <PanelCard>
        <p className="text-sm font-extrabold">ثبت نیاز یا نظر جدید</p>

        {/* دسته‌ها */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {CATEGORIES.map(({ key, label, icon: Icon, active }) => (
            <button
              key={key}
              type="button"
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md border px-2 py-2.5 text-xs font-bold transition-all sm:text-sm',
                category === key
                  ? `${active} shadow-sm`
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* شرح — تنها فیلد متنی فرم (عنوان حذف شد — خواستهٔ مالک ۸-۱۱) */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="fb-body" className="text-xs font-bold text-muted-foreground">شرح</label>
            <span
              className={cn('font-num text-[11px]', bodyLen >= BODY_MIN ? 'text-muted-foreground' : 'text-destructive/80')}
            >
              {toFa(bodyLen)}/{toFa(BODY_MIN)} از {toFa(BODY_MAX)}
            </span>
          </div>
          <Textarea
            id="fb-body"
            dir="rtl"
            rows={5}
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder="کجای کار گیر می‌کنید و چه چیزی کمک‌تان می‌کند؟ هرچه دقیق‌تر، رسیدگی سریع‌تر."
            className="resize-none text-sm leading-7"
          />
        </div>

        <Button
          className="mt-4 w-full rounded-md sm:w-auto"
          disabled={!canSubmit || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          ارسال نظر
        </Button>
      </PanelCard>

      {/* ── فیلتر فید ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
              filter === '' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
            )}
          >
            همه
          </button>
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(filter === key ? '' : key)}
              className={cn(
                'flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                filter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex overflow-hidden rounded-md border text-xs">
          {([['recent', 'جدیدترین'], ['top', 'پرموافق‌ترین']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                'px-3 py-1.5 font-medium transition-colors',
                sort === key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── فید ── */}
      {feed.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : feed.isError ? (
        <PanelCard className="text-center text-sm text-muted-foreground">
          <p>بارگذاری بازخوردها ناموفق بود.</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-md" onClick={() => feed.refetch()}>
            تلاش دوباره
          </Button>
        </PanelCard>
      ) : items.length === 0 ? (
        <PanelCard className="grid place-items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <ClipboardList size={30} className="text-muted-foreground/50" />
          هنوز بازخوردی در این دسته نیست — اولین نفر باشید.
        </PanelCard>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {toFa(total)} بازخورد ثبت شده
          </p>
          <div className="space-y-3">
            {items.map((item) => {
              const cat = catOf(item.category);
              const CatIcon = cat.icon;
              return (
                <PanelCard key={item.id} className="space-y-2.5">
                  {/* سربرگ: دسته + نویسنده + زمان */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold', cat.chip)}>
                      <CatIcon size={12} />
                      {cat.label}
                    </span>
                    {item.isStaff ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                        <ShieldCheck size={12} />
                        تیم ایمچ
                      </span>
                    ) : item.isMine ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                        نظر شما
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {item.author ? `${item.author.firstName} ${item.author.lastName}`.trim() || 'کاربر ایمچ' : 'کاربر ایمچ'}
                      </span>
                    )}
                    <span className="ms-auto text-[11px] text-muted-foreground/80">
                      <RelativeTime date={item.createdAt} />
                    </span>
                  </div>

                  {/* متن */}
                  <div>
                    <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </div>

                  {/* اقدامات: موافقت + حذفِ خودم */}
                  <div className="flex items-center gap-2 border-t pt-2.5">
                    <button
                      type="button"
                      onClick={() => upvote.mutate(item.id)}
                      disabled={upvote.isPending && upvote.variables === item.id}
                      title="من هم همین مشکل/نیاز را دارم"
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                        item.hasUpvoted
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                      )}
                    >
                      <ThumbsUp size={13} className={cn(upvote.isPending && upvote.variables === item.id && 'animate-pulse')} />
                      من هم همین را دارم
                      <span className={cn('rounded-full px-1.5 font-num', item.hasUpvoted ? 'bg-primary/15' : 'bg-secondary')}>
                        {toFa(item.upvoteCount)}
                      </span>
                    </button>
                    {item.isMine && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('این نظر حذف شود؟')) remove.mutate(item.id);
                        }}
                        disabled={remove.isPending}
                        aria-label="حذف نظر من"
                        title="حذف نظر من"
                        className="ms-auto grid size-8 place-items-center rounded-full text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        {remove.isPending && remove.variables === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    )}
                  </div>
                </PanelCard>
              );
            })}
          </div>

          {feed.hasNextPage && (
            <Button
              variant="outline"
              className="w-full rounded-md"
              disabled={feed.isFetchingNextPage}
              onClick={() => feed.fetchNextPage()}
            >
              {feed.isFetchingNextPage && <Loader2 size={14} className="animate-spin" />}
              نمایش بازخوردهای بیشتر
            </Button>
          )}
        </>
      )}
    </div>
  );
}
