'use client';

/**
 * تصاویر آگهی‌ها — صفحهٔ «دیتا ایمپورت → تصاویر آگهی‌ها»
 * (خواستهٔ مالک ۱۳-۱۱؛ بازطراحی ۱۹-۱۱؛ بازطراحی کامل ۲۱-۱۱: «دسته‌بندی ساده»).
 *
 * صفحهٔ سادهٔ مرور دسته‌ای (خواستهٔ مالک ۲۱-۱۱) — بدون تب، بدون صفحه‌بندی و
 * بدون هیچ فیلد دیتابیسی جدید؛ فقط همان فیلد «بررسی‌شده» (watermarkReviewedAt):
 *
 *   ۱. هر بار یک «دسته» از تصاویرِ نیازمند بررسی لود می‌شود (پیش‌فرض ۵۰؛
 *      ۱۰/۲۰/۵۰/۱۰۰ یا هر عدد دلخواه در اینپوت — سقف ۱۲۰).
 *   ۲. دکمهٔ «اصلاح واترمارک» زیر هر تصویر مستقل کار می‌کند — ده‌ها اصلاح
 *      همزمان؛ صفحه قفل نمی‌شود و هر کاش چرخندهٔ خودش را دارد. نتیجهٔ موفق
 *      همان‌جا با تصویر تمیزِ تازه (کلید نسخه‌دار) + تیک سبز «اصلاح شد» دیده
 *      می‌شود (خواستهٔ مالک ۱۹-۱۱ شب ۲ حفظ شد).
 *   ۳. دکمهٔ «بررسی شد» پایین صفحه = مهر گروهی بررسی روی «همهٔ» دستهٔ فعلی:
 *      یعنی این N تصویر بررسی شدند و هر کدام لازم بود اصلاح شدند — دیگر
 *      هرگز در این صفحه لود نمی‌شوند و دستهٔ بعدی جای آن‌ها را می‌گیرد.
 *      این چرخه آن‌قدر تکرار می‌شود که هیچ تصویری نیازمند بررسی نماند.
 *
 *   • کلیک روی تصویر = اندازهٔ اصلی در تب جدید (برای دیدن دقیق واترمارک)
 *   • تصاویر بزرگ‌تر از قبل نمایش داده می‌شوند (خواستهٔ مالک ۲۱-۱۱)
 *   • ?q=<شناسهٔ آگهی> = لینک عمیق «N عکس» از صفحهٔ آگهی‌ها (سازگاری با قدیم)
 *   • ?sort= محصول: زمان ثبت (پیش‌فرض) / آخرین ویرایش — باسکول واترمارک را
 *     جدیداً اضافه کرده؛ تاریخ آگهی فیلتر مهمی است (خواستهٔ مالک ۱۹-۱۱ عصر)
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  ExternalLink,
  Images,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  productFilesApi,
  type ProductFileRow,
  type ProductFilesList,
  type ProductFilesParams,
} from '@/lib/importer/client';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/** سورت بر تاریخ خودِ آگهی (باسکول) — زمان ثبت (پیش‌فرض) / آخرین ویرایش */
type SortKey = 'productCreated' | 'productUpdated';

const SORT_TABS: Array<{ key: SortKey; label: string; hint: string }> = [
  { key: 'productCreated', label: 'زمان ثبت', hint: 'تصاویر بر اساس زمان ثبت آگهی در باسکول' },
  { key: 'productUpdated', label: 'آخرین ویرایش', hint: 'تصاویر بر اساس آخرین ویرایش آگهی در باسکول' },
];

/** اندازهٔ دسته (خواستهٔ مالک ۲۱-۱۱): پیش‌فرض ۵۰ + گزینه‌های آماده + دلخواه */
const DEFAULT_SIZE = 50;
const SIZE_PRESETS = [10, 20, 50, 100];
const SIZE_MAX = 120; // سقف بک‌اند (DTO)
const LS_SIZE_KEY = 'pi:batch-size';

function isSortKey(v: string | null): v is SortKey {
  return v === 'productCreated' || v === 'productUpdated';
}

function clampSize(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SIZE;
  return Math.min(SIZE_MAX, Math.max(1, Math.round(v)));
}

/** رقم‌های رشتهٔ عددی → فارسی، بدون جداکنندهٔ هزارگان (شناسهٔ باسکول: 333430 → ۳۳۳۴۳۰) */
function toFaPlain(digits: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return digits.replace(/\d/g, (d) => fa[Number(d)]);
}

/** شبکهٔ کاشی — تصاویر بزرگ‌تر از قبل (خواستهٔ مالک ۲۱-۱۱): سایدبار بسته
 *  شود و عرض کامل صفحه با همین ستون‌ها کاش‌های درشت می‌دهد */
const GRID_CLS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5';

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

  // ── URL = منبع حقیقت (?n=…&sort=…&q=…)؛ page/wm قدیمی نادیده گرفته می‌شوند
  const size = (() => {
    const raw = parseInt(sp.get('n') ?? '', 10);
    return Number.isFinite(raw) && raw >= 1 ? clampSize(raw) : DEFAULT_SIZE;
  })();
  const sort: SortKey = isSortKey(sp.get('sort')) ? (sp.get('sort') as SortKey) : 'productCreated';
  const q = parseInt(sp.get('q') ?? '', 10);
  const productId = Number.isFinite(q) && q > 0 ? q : null;

  /** تغییر پارامترها — URL تازه ساخته و جایگزین می‌شود (بدون اسکرول) */
  const navigate = (next: { size?: number; sort?: SortKey; productId?: number | null }) => {
    const s = next.size !== undefined ? clampSize(next.size) : size;
    const so = next.sort ?? sort;
    const pid = next.productId !== undefined ? next.productId : productId;
    if (next.size !== undefined) {
      try {
        localStorage.setItem(LS_SIZE_KEY, String(s));
      } catch {
        /* حالت خصوصی */
      }
    }
    const qs = new URLSearchParams();
    if (s !== DEFAULT_SIZE) qs.set('n', String(s));
    if (so !== 'productCreated') qs.set('sort', so);
    if (pid != null) qs.set('q', String(pid));
    router.replace(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // ── یک‌بار در ابتدای نصب: پاک‌سازی پارامترهای قدیمی (page/wm) + بازگرداندن
  //    اندازهٔ دستهٔ ذخیره‌شده وقتی n در URL نیست
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const hasLegacy = sp.get('page') != null || sp.get('wm') != null;
    let restore: number | null = null;
    if (!sp.get('n')) {
      try {
        const raw = parseInt(localStorage.getItem(LS_SIZE_KEY) ?? '', 10);
        if (Number.isFinite(raw) && raw >= 1 && raw <= SIZE_MAX && raw !== DEFAULT_SIZE) restore = raw;
      } catch {
        /* حالت خصوصی */
      }
    } else {
      try {
        localStorage.setItem(LS_SIZE_KEY, String(size));
      } catch {
        /* حالت خصوصی */
      }
    }
    if (!hasLegacy && restore == null) return;
    const qs = new URLSearchParams();
    const s = restore ?? size;
    if (s !== DEFAULT_SIZE) qs.set('n', String(s));
    if (sort !== 'productCreated') qs.set('sort', sort);
    if (productId != null) qs.set('q', String(productId));
    router.replace(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, []);

  const params: ProductFilesParams = {
    ...(productId != null ? { productId } : {}),
    sort,
    page: 1,
    pageSize: size,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['product-files', params],
    queryFn: () => productFilesApi.list(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const remaining = summary?.total ?? 0;

  // ── اصلاح موازی (خواستهٔ مالک ۲۱-۱۱): هر دکمه مستقل — ده‌ها اصلاح همزمان؛
  //    صفحه قفل نمی‌شود، هر کاش چرخندهٔ خودش را دارد ──
  const [applyingIds, setApplyingIds] = useState<ReadonlySet<string>>(new Set());
  /** کاش‌های «پیدا نشد / خطا» — راهنمای کهربایی تا دوباره اصلاح یا بررسی شوند */
  const [failedIds, setFailedIds] = useState<Record<string, 'not_found' | 'error'>>({});

  const fixOne = async (row: ProductFileRow) => {
    if (applyingIds.has(row.id) || row.fixedAt) return;
    setApplyingIds((s) => new Set(s).add(row.id));
    setFailedIds((f) => {
      if (!(row.id in f)) return f;
      const next = { ...f };
      delete next[row.id];
      return next;
    });
    try {
      const r = await productFilesApi.wmApply(row.id);
      if (r.status === 'removed' && r.file) {
        // کاش همان‌جا تصویر تازه (اصلی + تامبنیل) را نشان بدهد — URL نسخه‌دار
        // تازه کش مرورگر/CDN را فوری می‌شکند؛ قاب سبز + تیک «اصلاح شد».
        // invalidate نمی‌زنیم تا کاش جایش نپرد؛ آمار دستی تعدیل می‌شود.
        const snapshots = queryClient.getQueriesData<ProductFilesList>({ queryKey: ['product-files'] });
        for (const [key, value] of snapshots) {
          if (!value) continue;
          const wasQueue = row.hasWatermark === true;
          queryClient.setQueryData<ProductFilesList>(key, {
            ...value,
            rows: value.rows.map((rr) => (rr.id === row.id ? { ...rr, ...r.file! } : rr)),
            summary: value.summary
              ? {
                  ...value.summary,
                  total: Math.max(0, value.summary.total - 1),
                  watermarked: Math.max(0, value.summary.watermarked - (wasQueue ? 1 : 0)),
                  fixed: value.summary.fixed + 1,
                }
              : value.summary,
          });
        }
      } else if (r.status === 'not_found') {
        setFailedIds((f) => ({ ...f, [row.id]: 'not_found' }));
        toast({
          description: `واترمارک باسکول در تصویر #${row.relatedId ? toFaPlain(row.relatedId) : '—'} پیدا نشد — دستی بررسیش کنید.`,
          variant: 'destructive',
        });
      } else {
        setFailedIds((f) => ({ ...f, [row.id]: 'error' }));
        toast({ description: 'تعویض انجام نشد (فایل کلید ذخیره‌سازی ندارد).', variant: 'destructive' });
      }
    } catch (e) {
      setFailedIds((f) => ({ ...f, [row.id]: 'error' }));
      toast({ description: (e as Error).message || 'اصلاح ناموفق بود.', variant: 'destructive' });
    } finally {
      setApplyingIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  };

  // ── «بررسی شد» (خواستهٔ مالک ۲۱-۱۱): مهر گروهی روی همهٔ دستهٔ فعلی —
  //    هرگز دوباره لود نمی‌شوند؛ دستهٔ بعدی جای آن‌ها را می‌گیرد ──
  const [confirming, setConfirming] = useState(false);
  const confirmBatch = async () => {
    if (confirming || applyingIds.size > 0) return;
    const ids = rows.map((r) => r.id);
    if (!ids.length) return;
    setConfirming(true);
    try {
      const r = await productFilesApi.reviewBatch(ids);
      toast({
        description: `این دسته بررسی شد (${toFa(r.updated)} تصویر) — دستهٔ بعدیِ نیازمند بررسی لود می‌شود.`,
      });
      setFailedIds({});
      await refetch();
    } catch (e) {
      toast({ description: (e as Error).message || 'ثبت بررسی ناموفق بود.', variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

  // ── اینپوت اندازهٔ دلخواه — Enter یا blur اعمال می‌کند
  const [customSize, setCustomSize] = useState('');
  const commitCustomSize = () => {
    const v = parseInt(customSize, 10);
    if (Number.isFinite(v) && v >= 1 && v <= SIZE_MAX) {
      navigate({ size: v });
      setCustomSize('');
    } else {
      setCustomSize('');
    }
  };

  const allDone = !isLoading && !isFetching && rows.length === 0;

  return (
    <div className="mx-auto max-w-[1700px] space-y-4">
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
                ? productId != null
                  ? `${toFa(data.total)} تصویر نیازمند بررسی در این آگهی`
                  : `${toFa(data.total)} تصویر نیازمند بررسی — واترمارک‌دارها را اصلاح کنید و دسته را ببندید`
                : 'شکار و پاک‌سازی واترمارک باسکول — دسته‌به‌دسته'}
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

      {/* راهنمای گردش‌کار — سه جمله، ساده */}
      <div className="rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-[11.5px] leading-6">
        <b>گردش‌کار:</b> ۱) تصاویر واترمارک‌دار را با «اصلاح واترمارک» تمیز کنید — هر چند تا که خواستید{' '}
        <b>همزمان</b> بزنید؛ ۲) پایین صفحه «بررسی شد» را بزنید تا کل این دسته برای همیشه بسته شود و{' '}
        <b>دستهٔ بعدی</b> جای آن را بگیرد؛ ۳) آن‌قدر ادامه دهید تا دیگر هیچ تصویری نیازمند بررسی نماند.
      </div>

      {/* نوار وضعیت + انتخاب اندازهٔ دسته + سورت — بدون تب و بدون صفحه‌بندی */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-lg border bg-card px-3.5 py-2.5">
        {summary ? (
          <>
            <span className="text-[11.5px] font-bold tabular-nums">
              نیازمند بررسی: <b className="text-primary">{toFa(summary.total)}</b>
            </span>
            <span className="text-[11.5px] font-bold tabular-nums text-emerald-600">
              اصلاح‌شده: {toFa(summary.fixed)}
            </span>
          </>
        ) : null}

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />

        {/* اندازهٔ دسته (خواستهٔ مالک ۲۱-۱۱): ۱۰/۲۰/۵۰/۱۰۰ + دلخواه */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground">تعداد در دسته</span>
          <div className="flex items-center gap-0.5 rounded-full border bg-background p-0.5" role="radiogroup" aria-label="تعداد تصویر در هر دسته">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={size === p}
                onClick={() => navigate({ size: p })}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-extrabold tabular-nums transition-colors',
                  size === p
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {toFa(p)}
              </button>
            ))}
            <Input
              type="number"
              min={1}
              max={SIZE_MAX}
              inputMode="numeric"
              value={customSize || (SIZE_PRESETS.includes(size) ? '' : String(size))}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCustomSize();
              }}
              onBlur={commitCustomSize}
              placeholder="دلخواه"
              aria-label="تعداد دلخواه تصویر در هر دسته"
              className="h-7 w-[74px] rounded-full border-border/60 bg-background px-2.5 text-center text-[11px] font-extrabold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* سورت بر تاریخ خودِ آگهی (باسکول) */}
        <div
          className="ms-auto flex shrink-0 items-center gap-0.5 rounded-full border bg-background p-0.5"
          role="radiogroup"
          aria-label="مرتب‌سازی تصاویر"
        >
          <span className="px-1.5 text-[10px] font-bold text-muted-foreground">سورت</span>
          {SORT_TABS.map(({ key, label, hint }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={sort === key}
              title={hint}
              onClick={() => navigate({ sort: key })}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
                sort === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* لینک عمیق «N عکس» از صفحهٔ آگهی‌ها — چیپ قابل حذف */}
        {productId != null && (
          <button
            type="button"
            onClick={() => navigate({ productId: null })}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15"
            title="فقط تصاویر این آگهی — کلیک = حذف فیلتر"
          >
            فقط آگهی #{toFa(productId)} ✕
          </button>
        )}
      </div>

      {/* شبکهٔ تصاویر — بزرگ‌تر از قبل؛ تصویر کامل و بدون برش تا واترمارک گوشه‌ها دیده شود */}
      {isLoading ? (
        <div className={GRID_CLS}>
          {Array.from({ length: Math.min(size, 20) }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border bg-card py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <BadgeCheck size={26} />
          </span>
          <p className="mt-3 text-sm font-extrabold">
            {productId != null ? 'این آگهی تصویر نیازمند بررسی ندارد' : 'همه‌چیز بررسی شد — عالی!'}
          </p>
          <p className="mt-1 max-w-md text-[11.5px] leading-6 text-muted-foreground">
            {productId != null
              ? 'تصاویر این آگهی یا بررسی شده‌اند یا اصلاح شده‌اند.'
              : 'هیچ تصویری نیازمند بررسی نمانده است. تصاویر جدیدِ ایمپورت‌شده همان لحظهٔ ورود بررسی/پاک‌سازی می‌شوند و اگر چیزی جا مانده باشد، این‌جا ظاهر می‌شود.'}
            {summary && summary.fixed > 0 ? ` تاکنون ${toFa(summary.fixed)} تصویر اصلاح شده است.` : ''}
          </p>
        </div>
      ) : (
        <div className={GRID_CLS}>
          {rows.map((f) => {
            const applying = applyingIds.has(f.id);
            const fail = failedIds[f.id];
            return (
              <figure
                key={f.id}
                className={cn(
                  'overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md',
                  f.hasWatermark === true && 'border-amber-400/80 ring-2 ring-amber-300/50',
                  // اصلاح‌شده = قاب سبز — تیک «اصلاح شد» (خواستهٔ مالک ۲۱-۱۱)
                  f.fixedAt && 'border-emerald-400/80 ring-2 ring-emerald-300/50',
                  // پیدا نشد/خطا = راهنمای کهربایی برای بررسی دستی
                  !f.fixedAt && fail && 'border-amber-400/80 ring-2 ring-amber-300/50',
                )}
              >
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  title="اندازهٔ اصلی در تب جدید — برای دیدن دقیق واترمارک"
                  className="group relative block aspect-square bg-secondary"
                >
                  {/* کامل و بدون برش (object-contain) — واترمارک گوشه‌ها قطع نشود */}
                  <img
                    src={f.thumbUrl ?? f.url}
                    alt={`تصویر فایل ${f.id}`}
                    loading="lazy"
                    className="size-full object-contain"
                  />
                  {/* نشان «اصلاح شده» — تیک سبز گوشهٔ تصویر */}
                  {f.fixedAt && (
                    <span
                      className="absolute start-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-emerald-600/85 text-white"
                      title={`واترمارک این تصویر در ${new Date(f.fixedAt).toLocaleDateString('fa-IR')} اصلاح شد`}
                    >
                      <BadgeCheck size={15} />
                    </span>
                  )}
                  {/* چرخندهٔ اصلاح همزمان روی خود کاش */}
                  {applying && (
                    <span className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-[1px]">
                      <Loader2 size={26} className="animate-spin text-primary" />
                    </span>
                  )}
                  <span className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ExternalLink size={13} />
                  </span>
                </a>
                <figcaption className="space-y-1.5 px-2.5 py-2">
                  {/* شناسهٔ عددی آگهی در باسکول — همان شماره‌ای که آگهی در باسکول دارد */}
                  <p
                    className="truncate text-center font-mono text-[11.5px] font-extrabold tabular-nums text-foreground"
                    title={`File ID: ${f.id}`}
                  >
                    #{f.relatedId ? toFaPlain(f.relatedId) : '—'}
                  </p>
                  {/* «اصلاح واترمارک» — مستقل و موازی؛ دکمه‌های بقیه آزاد می‌مانند */}
                  {!f.fixedAt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        'h-8 w-full gap-1 rounded-[9px] px-2 text-[11px] font-extrabold',
                        fail && 'border-amber-400/70 text-amber-700 hover:text-amber-800',
                      )}
                      disabled={applying || confirming}
                      onClick={() => void fixOne(f)}
                      title="واترمارک باسکول را پاک می‌کند و تصویر تمیز را جایگزین عکس فعلی آگهی در سرور می‌کند — می‌توانید همزمان روی ده‌ها تصویر بزنید"
                    >
                      {applying ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> در حال اصلاح…
                        </>
                      ) : fail === 'not_found' ? (
                        <>
                          <ShieldAlert size={12} /> دوباره اصلاح
                        </>
                      ) : (
                        <>
                          <Wand2 size={12} /> اصلاح واترمارک
                        </>
                      )}
                    </Button>
                  ) : (
                    <p className="flex items-center justify-center gap-1 rounded-[9px] bg-emerald-50 px-2 py-1.5 text-[10.5px] font-extrabold text-emerald-700">
                      <BadgeCheck size={12} /> اصلاح شد
                    </p>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {/* دکمهٔ «بررسی شد» — به‌جای «صفحهٔ بعد» (خواستهٔ مالک ۲۱-۱۱): مهر گروهی
          بررسی روی همهٔ دستهٔ فعلی؛ چسبان تا همیشه در دسترس باشد */}
      {!allDone && rows.length > 0 && (
        <div className="sticky bottom-4 z-20">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
            <div className="min-w-0">
              <p className="text-xs font-extrabold tabular-nums">
                {applyingIds.size > 0
                  ? `${toFa(applyingIds.size)} اصلاح در جریان…`
                  : `${toFa(rows.length)} تصویر در این دسته`}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-5 text-muted-foreground">
                {applyingIds.size > 0
                  ? 'صبر کنید تا اصلاح‌های در جریان تمام شود.'
                  : remaining > rows.length
                    ? `بعد از این دسته ${toFa(Math.max(0, remaining - rows.length))} تصویر دیگر مانده است.`
                    : 'این آخرین دسته است — با بستنش کار تمام می‌شود.'}
              </p>
            </div>
            <Button
              size="lg"
              className="h-10 shrink-0 gap-2 rounded-[10px] px-5 text-[13px] font-extrabold"
              disabled={applyingIds.size > 0 || confirming}
              onClick={() => void confirmBatch()}
              title="یعنی همهٔ این دسته بررسی شدند و دیگر هرگز لود نمی‌شوند — دستهٔ بعدیِ نیازمند بررسی جای آن‌ها را می‌گیرد"
            >
              {confirming ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> در حال ثبت…
                </>
              ) : (
                <>
                  <BadgeCheck size={16} /> بررسی شد — {toFa(rows.length)} تصویر
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
