'use client';

/**
 * تصاویر آگهی‌ها — صفحهٔ «دیتا ایمپورت → تصاویر آگهی‌ها»
 * (خواستهٔ مالک ۱۳-۱۱؛ بازطراحی کامل ۱۹-۱۱: «فقط تصاویر»).
 *
 * مرحلهٔ ۱ شکار واترمارک (خواستهٔ مالک ۱۹-۱۱): به‌جای کارت‌های آگهی، فقط
 * خودِ تصاویر از جدول فایل‌ها می‌آیند — نه عنوان، نه فروشنده، نه هیچ دادهٔ
 * دیگری. زیر هر تصویر: شناسهٔ عددی آگهی در باسکول + دو سوییچ بزرگ
 * «دارد/ندارد» در دو طرف (خواستهٔ مالک ۱۹-۱۱ شب): «دارد» →
 * File.hasWatermark=true (صف حذف) | «ندارد» → false = بررسی‌شده و خروج از
 * لیست باقی‌مانده — لیست کم‌کم خالی می‌شود و بررسی تکراری نمی‌شود؛
 * خاموش‌کردن سوییچ = null = بازگشت به باقی‌مانده (پس‌گرفتن بررسی).
 * تب «باقی‌مانده» فقط بررسی‌نشده‌ها را نشان می‌دهد؛ «بررسی‌شده» =
 * سوییچ «ندارد» روشن‌شده‌ها؛ «اصلاح واترمارک» = واترمارکشان حذف شده.
 *
 * مرحلهٔ ۲ حذف خودکار (خواستهٔ مالک ۱۹-۱۱): دکمهٔ «اصلاح واترمارک» زیر هر
 * تصویر — یک کلیک = کار کامل: پاک می‌کند، به سرور می‌فرستد و جای عکس فعلی
 * آگهی می‌نشیند (کلید نسخه‌دار تازه در آروان) و همان لحظه عکس اصلی و
 * تامبنیلِ همان کاش در همین صفحه دوباره لود می‌شوند تا نتیجه را ببینی
 * (خواستهٔ مالک ۱۹-۱۱ شب ۲). دکمهٔ «اصلاح خودکار همه» در سربرگ هم صف
 * واترمارک‌دارها را دسته‌دسته پردازش می‌کند — الگوریتم همان تمپلیت دوتنهٔ
 * جفت طلایی است که داخل خود بک‌اند اجرا می‌شود (پورت TS ابزار پایتون).
 *
 *   • کلیک روی تصویر = اندازهٔ اصلی در تب جدید (برای دیدن دقیق واترمارک)
 *   • کاش واترمارک‌دار با قاب کهربایی — در شبکهٔ اسکن چشم می‌افتد
 *   • صفحه/فیلتر/سورت در URL (?page=…&wm=…&sort=…) — لینک مستقیم و اشتراک‌گذاری
 */

import { Suspense, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  productFilesApi,
  type ProductFileRow,
  type ProductFilesList,
  type ProductFilesParams,
} from '@/lib/importer/client';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

type WmFilter = 'all' | 'yes' | 'no' | 'fixed';

/** سورت بر تاریخ خودِ آگهی (باسکول) — زمان ثبت (پیش‌فرض) / آخرین ویرایش */
type SortKey = 'productCreated' | 'productUpdated';

const WM_TABS: Array<{ key: WmFilter; label: string }> = [
  // «باقی‌مانده» = فقط بررسی‌نشده‌ها — هر تیک (دارد/ندارد) یعنی خروج از
  // این لیست تا کم‌کم خالی شود و بررسی تکراری نباشد (خواستهٔ مالک ۱۹-۱۱ شب)
  { key: 'all', label: 'باقی‌مانده' },
  { key: 'yes', label: 'واترمارک‌دار' },
  { key: 'no', label: 'بررسی‌شده' },
  { key: 'fixed', label: 'اصلاح واترمارک' },
];

const SORT_TABS: Array<{ key: SortKey; label: string; hint: string }> = [
  { key: 'productCreated', label: 'جدیدترین ثبت', hint: 'تصاویر بر اساس زمان ثبت آگهی در باسکول' },
  { key: 'productUpdated', label: 'جدیدترین ویرایش', hint: 'تصاویر بر اساس آخرین ویرایش آگهی در باسکول' },
];

function isWmKey(v: string | null): v is WmFilter {
  return v === 'all' || v === 'yes' || v === 'no' || v === 'fixed';
}

function isSortKey(v: string | null): v is SortKey {
  return v === 'productCreated' || v === 'productUpdated';
}

/** رقم‌های رشتهٔ عددی → فارسی، بدون جداکنندهٔ هزارگان (شناسهٔ باسکول: 333430 → ۳۳۳۴۳۰) */
function toFaPlain(digits: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return digits.replace(/\d/g, (d) => fa[Number(d)]);
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

  // ── دو سوییچ «دارد/ندارد» — optimistic؛ خطا = بازگشت + توست ──
  // true = صف حذف | false = بررسی‌شده (خروج از باقی‌مانده) | null = پس‌گرفتن بررسی
  const mark = useMutation({
    mutationFn: ({ id, hasWatermark }: { id: string; hasWatermark: boolean | null }) =>
      productFilesApi.setWatermark(id, hasWatermark),
    onMutate: async ({ id, hasWatermark: next }) => {
      await queryClient.cancelQueries({ queryKey: ['product-files'] });
      const snapshots = queryClient.getQueriesData<ProductFilesList>({ queryKey: ['product-files'] });
      const stamp = new Date().toISOString();
      for (const [key, value] of snapshots) {
        if (!value) continue;
        // گذار قبلی→بعدی: تعدیل کارت‌های آماری + خودِ کاش — «بررسی‌شده»
        // یعنی مهر reviewedAt ست باشد (false خامِ ایمپورت بررسی‌شده نیست)
        const row = value.rows.find((r) => r.id === id);
        const prev: 'yes' | 'no' | null =
          row?.hasWatermark === true ? 'yes' : row?.reviewedAt != null && row?.hasWatermark === false ? 'no' : null;
        const nextKey: 'yes' | 'no' | null = next === true ? 'yes' : next === false ? 'no' : null;
        const sum = value.summary;
        queryClient.setQueryData<ProductFilesList>(key, {
          ...value,
          rows: value.rows.map((r) =>
            r.id === id
              ? {
                  ...r,
                  hasWatermark: next,
                  reviewedAt: next === null ? null : r.reviewedAt ?? stamp,
                }
              : r,
          ),
          summary: sum
            ? {
                ...sum,
                total: sum.total + (prev === null ? -1 : 0) + (nextKey === null ? 1 : 0),
                watermarked: sum.watermarked + (prev === 'yes' ? -1 : 0) + (nextKey === 'yes' ? 1 : 0),
                clean: sum.clean + (prev === 'no' ? -1 : 0) + (nextKey === 'no' ? 1 : 0),
              }
            : sum,
        });
      }
      return { snapshots };
    },
    onError: (err: Error, _v, ctx) => {
      for (const [key, value] of ctx?.snapshots ?? []) queryClient.setQueryData(key, value);
      toast({ description: err.message || 'ثبت سوییچ واترمارک ناموفق بود.', variant: 'destructive' });
    },
    onSuccess: (_r, { hasWatermark }) => {
      toast({
        description:
          hasWatermark === true
            ? 'ثبت شد: واترمارک دارد — در صف حذف قرار گرفت و از باقی‌مانده خارج شد.'
            : hasWatermark === false
              ? 'ثبت شد: بدون واترمارک — از لیست باقی‌مانده خارج شد.'
              : 'بررسی پس گرفته شد — فایل به باقی‌مانده برگشت.',
      });
    },
    // تیک‌خورده از تب فعلی (باقی‌مانده/بررسی‌شده) خارج می‌شود → فچ تازه
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['product-files'] });
    },
  });

  // ── حذف خودکار واترمارک باسکول — «یک کلیک = کار کامل» (خواستهٔ مالک
  //    ۱۹-۱۱ شب ۲): پاک + آپلود به سرور + تعویض عکس فعلی آگهی؛ عکس اصلی و
  //    تامبنیل همان کاش در همین صفحه با URL نسخه‌دار تازه دوباره لود می‌شوند ──
  const [wmApplyingId, setWmApplyingId] = useState<string | null>(null);

  const fixOne = async (row: ProductFileRow) => {
    if (wmApplyingId) return;
    setWmApplyingId(row.id);
    try {
      const r = await productFilesApi.wmApply(row.id);
      if (r.status === 'removed' && r.file) {
        // کاش همان‌جا تصویر تازه (اصلی + تامبنیل) را نشان بدهد — URL نسخه‌دار
        // تازه است و کش مرورگر/CDN فوری می‌شکند؛ قاب سبز + تیک «اصلاح شد».
        // invalidate نمی‌زنیم تا کاش جایش نپرد و نتیجه را همین‌جا ببینی؛
        // آمار هم دستی تعدیل می‌شود (رفتن به صفحه/فیلتر بعدی = دادهٔ تازه).
        const snapshots = queryClient.getQueriesData<ProductFilesList>({ queryKey: ['product-files'] });
        for (const [key, value] of snapshots) {
          if (!value) continue;
          const wasQueue = row.hasWatermark === true;
          const wasReviewed = row.reviewedAt != null && row.hasWatermark === false;
          queryClient.setQueryData<ProductFilesList>(key, {
            ...value,
            rows: value.rows.map((rr) => (rr.id === row.id ? { ...rr, ...r.file! } : rr)),
            summary: value.summary
              ? {
                  ...value.summary,
                  total: value.summary.total - (wasReviewed || wasQueue ? 0 : 1),
                  watermarked: value.summary.watermarked - (wasQueue ? 1 : 0),
                  clean: value.summary.clean - (wasReviewed ? 1 : 0),
                  fixed: value.summary.fixed + 1,
                }
              : value.summary,
          });
        }
        toast({
          description:
            'اصلاح شد — واترمارک پاک شد و تصویر تمیز جایگزین عکس آگهی شد؛ همان کاش همین‌جا نتیجه را نشان می‌دهد.',
        });
      } else if (r.status === 'not_found') {
        toast({
          description: 'واترمارک باسکول در این تصویر پیدا نشد — لطفاً دستی بررسیش کن.',
          variant: 'destructive',
        });
      } else {
        toast({
          description: 'تعویض انجام نشد (فایل کلید ذخیره‌سازی ندارد).',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({ description: (e as Error).message || 'اصلاح ناموفق بود.', variant: 'destructive' });
    } finally {
      setWmApplyingId(null);
    }
  };

  // ── «اصلاح خودکار همه» — حلقهٔ دسته‌ای؛ فایل‌های not_found/خطادار از
  //    دورهای بعدی کنار گذاشته می‌شوند تا حلقه گیر نکند ──
  const [batch, setBatch] = useState<{
    running: boolean;
    processed: number;
    removed: number;
    notFound: number;
    errors: number;
    remaining: number | null;
    done?: boolean;
  } | null>(null);
  const batchRunRef = useRef(false);

  const startBatch = async () => {
    if (batchRunRef.current) return;
    batchRunRef.current = true;
    setBatch({ running: true, processed: 0, removed: 0, notFound: 0, errors: 0, remaining: null });
    const exclude: string[] = [];
    try {
      let stuck = 0;
      while (batchRunRef.current) {
        const r = await productFilesApi.wmBatch(5, exclude.length ? exclude : undefined);
        // فایل‌هایی که بدون تشخیص/خطا ماندند را کنار بگذار (دستکاری DB نمی‌شوند)
        for (const it of r.results) {
          if (it.status !== 'removed') exclude.push(it.id);
        }
        setBatch((b) =>
          b && {
            ...b,
            processed: b.processed + r.results.length,
            removed: b.removed + r.counts.removed,
            notFound: b.notFound + r.counts.notFound,
            errors: b.errors + r.counts.error,
            remaining: r.remaining,
          },
        );
        if (r.remaining <= 0 || r.results.length === 0) break;
        // دو دستهٔ پیاپی بدون هیچ پیشرفت = گیر (همهٔ باقی‌مانده خطادارند) → توقف
        if (r.counts.removed === 0 && r.counts.notFound === 0 && r.counts.error > 0) {
          stuck++;
          if (stuck >= 2) break;
        } else {
          stuck = 0;
        }
      }
      toast({ description: 'پردازش صف تمام شد — لیست به‌روز شد.' });
    } catch (e) {
      toast({ description: (e as Error).message || 'پردازش دسته ناموفق بود.', variant: 'destructive' });
    } finally {
      batchRunRef.current = false;
      setBatch((b) => b && { ...b, running: false, done: true });
      void queryClient.invalidateQueries({ queryKey: ['product-files'] });
    }
  };

  const stopBatch = () => {
    batchRunRef.current = false;
  };

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
                ? `${toFa(data.total)} تصویر${wm !== 'all' ? ' مطابق فیلتر' : ''} — سوییچ «دارد/ندارد» هرکدام بزنی، بررسی‌شده و از لیست خارج می‌شود`
                : 'شکار واترمارک — فقط تصاویر، بدون هیچ دادهٔ دیگر'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading ? <Loader2 size={15} className="animate-spin text-muted-foreground" /> : null}
          {/* «اصلاح خودکار همه» (خواستهٔ مالک ۱۹-۱۱): صفِ واترمارک‌دارها را
              دسته‌دسته پردازش می‌کند — همان الگوریتم، داخل خود بک‌اند */}
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-[10px] px-3 text-[11.5px]"
            disabled={batch?.running}
            onClick={() => void startBatch()}
            title="همهٔ تصاویر علامت‌خوردهٔ «واترمارک دارد» را خودکار اصلاح می‌کند — پیش از تعویض، نتیجهٔ چند مورد را با دکمهٔ زیر تصاویر ببین"
          >
            {batch?.running ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {batch?.running
              ? `در حال اصلاح… ${batch.remaining != null ? toFa(batch.remaining) : ''}`
              : `اصلاح خودکار${summary && summary.watermarked > 0 ? ` (${toFa(summary.watermarked)})` : ''}`}
          </Button>
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

      {/* نوار پیشرفت «اصلاح خودکار» — شمارنده‌های زنده + توقف */}
      {batch ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-bold tabular-nums">
            {batch.running ? (
              <span className="flex items-center gap-1.5 text-primary">
                <Loader2 size={14} className="animate-spin" /> در حال پردازش صف…
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <BadgeCheck size={14} /> پردازش صف تمام شد
              </span>
            )}
            <span>پردازش‌شده: {toFa(batch.processed)}</span>
            <span className="text-emerald-600">حذف‌شده: {toFa(batch.removed)}</span>
            <span className="text-amber-600">پیدا نشد: {toFa(batch.notFound)}</span>
            {batch.errors > 0 ? <span className="text-destructive">خطا: {toFa(batch.errors)}</span> : null}
            <span className="text-muted-foreground">باقی‌ماندهٔ صف: {batch.remaining != null ? toFa(batch.remaining) : '—'}</span>
          </div>
          {batch.running ? (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-[10px] px-3 text-[11px]" onClick={stopBatch}>
              <Square size={12} /> توقف
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-8 rounded-[10px] px-3 text-[11px]" onClick={() => setBatch(null)}>
              بستن
            </Button>
          )}
        </div>
      ) : null}

      {/* کارت‌های آماری + فیلتر — کلیک روی کارت = اعمال همان فیلتر.
          «کل تصاویر» = باقی‌مانده (بدون اصلاح‌شده‌ها) — هم‌راستا با تب «همه» */}
      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              { key: 'all' as WmFilter, label: 'باقی‌مانده', value: summary.total, icon: Images, cls: '' },
              { key: 'yes' as WmFilter, label: 'واترمارک‌دار', value: summary.watermarked, icon: ShieldAlert, cls: 'text-amber-600' },
              { key: 'no' as WmFilter, label: 'بررسی‌شده', value: summary.clean, icon: ShieldCheck, cls: 'text-emerald-600' },
              { key: 'fixed' as WmFilter, label: 'اصلاح واترمارک', value: summary.fixed, icon: BadgeCheck, cls: 'text-emerald-600' },
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
                ? 'هنوز هیچ تصویری در صف حذف نیست — در تب «باقی‌مانده» تیک «دارد» بزنید'
                : wm === 'no'
                  ? 'هنوز چیزی «بررسی‌شده» نیست — تیک «ندارد» یعنی تمیز و خارج از لیست'
                  : wm === 'fixed'
                    ? 'هنوز هیچ تصویری اصلاح نشده — تصاویری که واترمارکشان حذف شود اینجا می‌آیند'
                    : 'همه‌چیز بررسی شده — عالی!'}
          </p>
        </div>
      ) : (
        <div className={GRID_CLS}>
          {rows.map((f) => (
            <figure
              key={f.id}
              className={cn(
                'overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md',
                f.hasWatermark === true && 'border-amber-400/80 ring-2 ring-amber-300/50',
                // اصلاح‌شده = قاب سبز — در تب «اصلاح واترمارک» چشم می‌افتد (۱۹-۱۱)
                f.fixedAt && 'border-emerald-400/80 ring-2 ring-emerald-300/50',
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
                {/* نشان «اصلاح شده» — تیک سبز گوشهٔ تصویر */}
                {f.fixedAt && (
                  <span
                    className="absolute start-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-emerald-600/85 text-white"
                    title={`واترمارک این تصویر در ${new Date(f.fixedAt).toLocaleDateString('fa-IR')} اصلاح شد`}
                  >
                    <BadgeCheck size={13} />
                  </span>
                )}
                <span className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <ExternalLink size={12} />
                </span>
              </a>
              <figcaption className="space-y-1.5 px-2.5 py-2">
                {/* شناسهٔ عددی آگهی در باسکول (خواستهٔ مالک ۱۹-۱۱ شب — به‌جای ObjectId
                    فایل): همان شماره‌ای که آگهی در باسکول دارد؛ ObjectId در تولتیپ می‌ماند */}
                <p
                  className="truncate text-center font-mono text-[11px] font-extrabold tabular-nums text-foreground"
                  title={`File ID: ${f.id}`}
                >
                  #{f.relatedId ? toFaPlain(f.relatedId) : '—'}
                </p>
                {/* دو سوییچ بزرگ «دارد/ندارد» در دو طرف با فاصله (خواستهٔ مالک ۱۹-۱۱
                    شب): کنار هم نگذاشته شد تا کلیک اشتباه رخ ندهد. راست: «دارد»
                    (کهربایی — صف حذف) | چپ: «ندارد» (سبز — تمیز) */}
                <div className="flex items-center justify-between gap-1">
                  <label
                    className="flex cursor-pointer select-none items-center gap-1.5"
                    title="واترمارک دارد — وارد صف حذف می‌شود و از باقی‌مانده خارج می‌شود"
                  >
                    <span className="text-[11px] font-extrabold">دارد</span>
                    <Switch
                      size="lg"
                      checked={f.hasWatermark === true}
                      onCheckedChange={(v) => mark.mutate({ id: f.id, hasWatermark: v ? true : null })}
                      aria-label={`واترمارک دارد: ${f.id}`}
                      className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-muted-foreground/25"
                    />
                  </label>
                  <label
                    className="flex cursor-pointer select-none items-center gap-1.5"
                    title="بررسی شد — واترمارک ندارد؛ از لیست باقی‌مانده خارج می‌شود"
                  >
                    <Switch
                      size="lg"
                      checked={f.hasWatermark === false && f.reviewedAt != null}
                      onCheckedChange={(v) => mark.mutate({ id: f.id, hasWatermark: v ? false : null })}
                      aria-label={`واترمارک ندارد: ${f.id}`}
                      className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted-foreground/25"
                    />
                    <span className="text-[11px] font-extrabold">ندارد</span>
                  </label>
                </div>
                {/* «اصلاح واترمارک» — یک کلیک = کار کامل (خواستهٔ مالک ۱۹-۱۱ شب ۲):
                    پاک + آپلود + تعویض عکس فعلی آگهی؛ همان کاش با تصویر تازه
                    (اصلی + تامبنیل) و قاب سبز همین‌جا نتیجه را نشان می‌دهد */}
                {!f.fixedAt ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-full gap-1 rounded-[9px] px-2 text-[10.5px] font-extrabold"
                    disabled={wmApplyingId != null}
                    onClick={() => void fixOne(f)}
                    title="واترمارک باسکول را پاک می‌کند و تصویر تمیز را جایگزین عکس فعلی آگهی در سرور می‌کند — نتیجه همین‌جا نمایش داده می‌شود"
                  >
                    {wmApplyingId === f.id ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> در حال اصلاح…
                      </>
                    ) : (
                      <>
                        <Wand2 size={12} /> اصلاح واترمارک
                      </>
                    )}
                  </Button>
                ) : null}
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
