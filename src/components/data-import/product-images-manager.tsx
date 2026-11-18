'use client';

/**
 * تصاویر آگهی‌ها — صفحهٔ «دیتا ایمپورت → تصاویر آگهی‌ها»
 * (خواستهٔ مالک ۱۳-۱۱؛ بازطراحی کامل ۱۹-۱۱: «فقط تصاویر»).
 *
 * مرحلهٔ ۱ شکار واترمارک (خواستهٔ مالک ۱۹-۱۱): به‌جای کارت‌های آگهی، فقط
 * خودِ تصاویر از جدول فایل‌ها می‌آیند — نه عنوان، نه فروشنده، نه هیچ دادهٔ
 * دیگری. زیر هر تصویر: شناسهٔ فایل + سوییچ «واترمارک». تیک ادمین یعنی این
 * تصویر واترمارک دارد → File.hasWatermark در دیتابیس ترو می‌شود. با فیلتر
 * «واترمارک‌دار» لیست علامت‌خورده‌ها یک‌جا جدا می‌شود — پایهٔ کار پاک‌سازی
 * (هوش مصنوعی/دستی) در مرحلهٔ بعد.
 *
 *   • کلیک روی تصویر = اندازهٔ اصلی در تب جدید (برای دیدن دقیق واترمارک)
 *   • کاش واترمارک‌دار با قاب کهربایی — در شبکهٔ اسکن چشم می‌افتد
 *   • صفحه/فیلتر/سورت در URL (?page=…&wm=…&sort=…) — لینک مستقیم و اشتراک‌گذاری
 *
 * سورت و چیدمان اسکن (خواستهٔ مالک ۱۹-۱۱ عصر): باسکول ۱-۲ سال پیش
 * واترمارک اضافه کرده — تصاویر بر اساس تاریخ خودِ آگهی (باسکول) مرتب
 * می‌شوند، نه تاریخ فایل (که همگی «زمان ایمپورت»‌اند). پیش‌فرض = زمان
 * ثبت؛ گزینهٔ دوم = آخرین ویرایش (برای بررسی اینکه آیا آگهی‌های
 * ویرایش‌شده هم واترمارک گرفته‌اند یا فقط تازه‌ثبت‌شده‌ها). تصویر کامل
 * و بدون برش (object-contain) تا واترمارک گوشه‌ها دیده شود؛ ۵ کاش در
 * ردیف × ۲ ردیف = ۱۰ تصویر در صفحه — پنجرهٔ اسکن بدون اسکرول عمودی.
 */

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { productFilesApi, type ProductFileRow, type ProductFilesParams } from '@/lib/importer/client';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

type WmFilter = 'all' | 'yes' | 'no';

/** سورت بر تاریخ خودِ آگهی (باسکول) — زمان ثبت (پیش‌فرض) / آخرین ویرایش */
type SortKey = 'productCreated' | 'productUpdated';

const WM_TABS: Array<{ key: WmFilter; label: string }> = [
  { key: 'all', label: 'همهٔ تصاویر' },
  { key: 'yes', label: 'واترمارک‌دار' },
  { key: 'no', label: 'بدون واترمارک' },
];

const SORT_TABS: Array<{ key: SortKey; label: string; hint: string }> = [
  { key: 'productCreated', label: 'جدیدترین ثبت', hint: 'تصاویر بر اساس زمان ثبت آگهی در باسکول' },
  { key: 'productUpdated', label: 'جدیدترین ویرایش', hint: 'تصاویر بر اساس آخرین ویرایش آگهی در باسکول' },
];

function isWmKey(v: string | null): v is WmFilter {
  return v === 'all' || v === 'yes' || v === 'no';
}

function isSortKey(v: string | null): v is SortKey {
  return v === 'productCreated' || v === 'productUpdated';
}

/** پنجرهٔ اسکن: ۵ کاش در ردیف × ۲ ردیف — بدون اسکرول عمودی (۱۹-۱۱ عصر) */
const PAGE_SIZE = 10;
/** شبکهٔ کاشی — دسکتاپ دقیقاً ۵ ستون (شش‌تایی حذف شد تا کاش‌ها بزرگ‌تر باشند) */
const GRID_CLS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

export function ProductImagesManager() {
  return (
    <Suspense>
      <ProductImagesManagerInner />
    </Suspense>
  );
}

function ProductImagesManagerInner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── URL = منبع حقیقت واحد (بدون state آینه‌ای — رفع set-state-in-effect):
  // صفحه/فیلتر/سورت مستقیم از searchParams خوانده می‌شوند و «تغییر» یعنی
  // navigate با کوئری تازه — لینک مستقیم و back-forward ذاتاً کار می‌کند.
  // ?q=<شناسهٔ آگهی> = لینک عمیق «N عکس» از صفحهٔ آگهی‌ها (سازگاری با قدیم)
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const wm: WmFilter = isWmKey(sp.get('wm')) ? (sp.get('wm') as WmFilter) : 'all';
  const sort: SortKey = isSortKey(sp.get('sort')) ? (sp.get('sort') as SortKey) : 'productCreated';
  const q = parseInt(sp.get('q') ?? '', 10);
  const productId = Number.isFinite(q) && q > 0 ? q : null;

  /** تغییر پارامترها — URL تازه ساخته و جایگزین می‌شود (بدون اسکرول) */
  const navigate = (next: { page?: number; wm?: WmFilter; sort?: SortKey; productId?: number | null }) => {
    const w = next.wm ?? wm;
    const s = next.sort ?? sort;
    const p = next.page ?? page;
    const pid = next.productId !== undefined ? next.productId : productId;
    const qs = new URLSearchParams();
    if (w !== 'all') qs.set('wm', w);
    if (s !== 'productCreated') qs.set('sort', s);
    if (pid != null) qs.set('q', String(pid));
    if (p > 1) qs.set('page', String(p));
    router.replace(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // پارامترهای لیست — react-query کلید را ساختاری هش می‌کند؛ نیازی به memo نیست
  const params: ProductFilesParams = {
    ...(wm !== 'all' ? { watermark: wm } : {}),
    ...(productId != null ? { productId } : {}),
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['product-files', params],
    queryFn: () => productFilesApi.list(params),
    placeholderData: keepPreviousData,
  });

  // ── تیک واترمارک — optimistic؛ خطا = بازگشت + توست ──
  const mark = useMutation({
    mutationFn: ({ id, hasWatermark }: { id: string; hasWatermark: boolean }) =>
      productFilesApi.setWatermark(id, hasWatermark),
    onMutate: async ({ id, hasWatermark }) => {
      await queryClient.cancelQueries({ queryKey: ['product-files'] });
      const snapshots = queryClient.getQueriesData<{ rows: ProductFileRow[]; summary: { total: number; watermarked: number; clean: number } }>({ queryKey: ['product-files'] });
      for (const [key, value] of snapshots) {
        if (!value) continue;
        queryClient.setQueryData(key, {
          ...value,
          rows: value.rows.map((r) => (r.id === id ? { ...r, hasWatermark } : r)),
          summary: {
            ...value.summary,
            watermarked: value.summary.watermarked + (hasWatermark ? 1 : -1),
            clean: value.summary.clean + (hasWatermark ? -1 : 1),
          },
        });
      }
      return { snapshots };
    },
    onError: (err: Error, _v, ctx) => {
      for (const [key, value] of ctx?.snapshots ?? []) queryClient.setQueryData(key, value);
      toast({ description: err.message || 'ثبت علامت واترمارک ناموفق بود.', variant: 'destructive' });
    },
    onSuccess: (_r, { hasWatermark }) => {
      toast({ description: hasWatermark ? 'علامت واترمارک ثبت شد.' : 'علامت واترمارک برداشته شد.' });
    },
  });

  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Images size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">تصاویر آگهی‌ها</h1>
            <p className="text-[11px] text-muted-foreground">
              {data
                ? `${toFa(data.total)} تصویر${wm !== 'all' ? ' مطابق فیلتر' : ''} — تیک بزنید یعنی واترمارک دارد`
                : 'شکار واترمارک — فقط تصاویر، بدون هیچ دادهٔ دیگر'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading ? <Loader2 size={15} className="animate-spin text-muted-foreground" /> : null}
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-[10px] px-3 text-[11.5px]"
            onClick={() => void refetch()}
          >
            <RefreshCcw size={13} /> به‌روزرسانی
          </Button>
        </div>
      </div>

      {/* کارت‌های آماری + فیلتر — کلیک روی کارت = اعمال همان فیلتر */}
      {summary ? (
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: 'all' as WmFilter, label: 'کل تصاویر', value: summary.total, icon: Images, cls: '' },
              { key: 'yes' as WmFilter, label: 'واترمارک‌دار', value: summary.watermarked, icon: ShieldAlert, cls: 'text-amber-600' },
              { key: 'no' as WmFilter, label: 'بدون واترمارک', value: summary.clean, icon: ShieldCheck, cls: 'text-emerald-600' },
            ]
          ).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => navigate({ wm: c.key, page: 1 })}
              className={cn(
                'rounded-lg border bg-card p-2.5 text-start transition-colors hover:border-primary/40',
                wm === c.key && 'border-primary/60 bg-primary/[0.04]',
              )}
            >
              <p className={cn('flex items-center gap-1.5 text-[10px] text-muted-foreground', c.cls)}>
                <c.icon size={12} /> {c.label}
              </p>
              <p className={cn('mt-0.5 text-base font-extrabold tabular-nums', c.cls)}>{toFa(c.value)}</p>
            </button>
          ))}
        </div>
      ) : null}

      {/* تب‌های فیلتر واترمارک — فلت با خط زیرین، الگوی پنل؛ + سورت تاریخ آگهی */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border">
        {WM_TABS.map(({ key, label }) => {
          const active = wm === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate({ wm: key, page: 1 })}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative shrink-0 py-2.5 text-xs transition-colors',
                active ? 'font-extrabold text-foreground' : 'font-bold text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              {active && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emphasis" />}
            </button>
          );
        })}
        {/* سورت بر تاریخ خودِ آگهی (باسکول — ۱۹-۱۱ عصر): پیش‌فرض زمان ثبت؛
            تغییر سورت صفحه را به اول برمی‌گرداند */}
        <div
          className="ms-auto flex shrink-0 items-center gap-0.5 rounded-full border bg-card p-0.5"
          role="radiogroup"
          aria-label="مرتب‌سازی تصاویر"
        >
          <span className="px-1.5 text-[10px] font-bold text-muted-foreground">سورت</span>
          {SORT_TABS.map(({ key, label, hint }) => {
            const active = sort === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                title={hint}
                onClick={() => navigate({ sort: key, page: 1 })}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        {/* لینک عمیق «N عکس» از صفحهٔ آگهی‌ها — چیپ قابل حذف */}
        {productId != null && (
          <button
            type="button"
            onClick={() => navigate({ productId: null, page: 1 })}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15"
            title="فقط تصاویر این آگهی — کلیک = حذف فیلتر"
          >
            فقط آگهی #{toFa(productId)} ✕
          </button>
        )}
      </div>

      {/* شبکهٔ تصاویر — ۵ در ردیف؛ تصویر کامل و بدون برش تا واترمارک گوشه‌ها دیده شود */}
      {isLoading ? (
        <div className={GRID_CLS}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border bg-card py-16 text-center">
          <Images size={30} className="text-muted-foreground/40" />
          <p className="mt-2 text-sm font-bold">تصویری مطابق فیلتر پیدا نشد</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {productId != null
              ? 'این آگهی تصویری ندارد یا شناسه اشتباه است'
              : wm === 'yes'
                ? 'هنوز هیچ تصویری علامت واترمارک نخورده — از تب «همهٔ تصاویر» علامت بزنید'
                : 'فیلتر را تغییر دهید یا دوباره تلاش کنید'}
          </p>
        </div>
      ) : (
        <div className={GRID_CLS}>
          {rows.map((f) => (
            <figure
              key={f.id}
              className={cn(
                'overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md',
                f.hasWatermark && 'border-amber-400/80 ring-2 ring-amber-300/50',
              )}
            >
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                title="اندازهٔ اصلی در تب جدید — برای دیدن دقیق واترمارک"
                className="group relative block aspect-square bg-secondary"
              >
                {/* کامل و بدون برش (object-contain) — واترمارک گوشه‌ها قطع نشود؛
                    زوم هاور هم حذف شد چون همان گوشه‌ها را می‌بُرید */}
                <img
                  src={f.thumbUrl ?? f.url}
                  alt={`تصویر فایل ${f.id}`}
                  loading="lazy"
                  className="size-full object-contain"
                />
                <span className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <ExternalLink size={12} />
                </span>
              </a>
              <figcaption className="flex items-center justify-between gap-1 px-2 py-1.5">
                <p
                  className="truncate font-mono text-[9.5px] text-muted-foreground"
                  dir="ltr"
                  title={`File ID: ${f.id}`}
                >
                  {f.id}
                </p>
                <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] font-bold">
                  واترمارک
                  <Switch
                    checked={f.hasWatermark}
                    onCheckedChange={(v) => mark.mutate({ id: f.id, hasWatermark: v })}
                    aria-label={`علامت واترمارک تصویر ${f.id}`}
                    className={cn('data-[state=checked]:bg-amber-500')}
                  />
                </label>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* صفحه‌بندی — ناوبری اصلی پنجرهٔ اسکن (۱۰ تصویر = ۲ ردیف در هر صفحه) */}
      {!isLoading && pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1 rounded-[10px] px-4 text-xs"
            disabled={page <= 1}
            onClick={() => navigate({ page: Math.max(1, page - 1) })}
          >
            <ChevronRight size={15} /> ۱۰ تصویر قبلی
          </Button>
          <p className="text-[11.5px] font-bold tabular-nums text-muted-foreground">
            صفحهٔ {toFa(page)} از {toFa(pageCount)}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1 rounded-[10px] px-4 text-xs"
            disabled={page >= pageCount}
            onClick={() => navigate({ page: Math.min(pageCount, page + 1) })}
          >
            ۱۰ تصویر بعدی <ChevronLeft size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
