'use client';

/**
 * تصاویر آگهی‌ها — صفحهٔ «دیتا ایمپورت → تصاویر آگهی‌ها»
 * (خواستهٔ مالک ۱۳-۱۱؛ بازطراحی ۱۹-۱۱؛ بازطراحی کامل ۲۱-۱۱: «دسته‌بندی ساده»؛
 * ۲۲-۱۱: اصلاح دستی برای کاش‌های «پیدا نشد»).
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
 *   ۴. (۲۲-۱۱) اصلاح دستی برای کاش‌های «واترمارک پیدا نشد»: دکمهٔ دانلود تصویر
 *      اصلی + دکمهٔ آپلود نسخهٔ اصلاح‌شده روی «هر» کاش — فایل تازه روی کلید
 *      نسخه‌دار تازه می‌نشیند و replaceInPlace هر دو مهر بررسی و اصلاح را
 *      می‌زند؛ یعنی تیک «اصلاح شد» همان‌جا می‌خورد و از صف خارج می‌شود.
 *   ۵. (۲۰-۱۱) پیست عکس جایگزین: برش با ابزار اسکرین‌شات (Snipaste و…) ←
 *      Ctrl+V داخل پنجرهٔ پیست ← تایید — همان تعویض درجا، بدون رفت‌وبرگشت
 *      به Paint و دیسک.
 *
 *   • کلیک روی تصویر = اندازهٔ اصلی در تب جدید (برای دیدن دقیق واترمارک)
 *   • تصاویر بزرگ‌تر از قبل نمایش داده می‌شوند (خواستهٔ مالک ۲۱-۱۱)
 *   • ?q=<شناسهٔ آگهی> = لینک عمیق «N عکس» از صفحهٔ آگهی‌ها (سازگاری با قدیم)
 *   • ?sort= محصول: زمان ثبت (پیش‌فرض) / آخرین ویرایش — باسکول واترمارک را
 *     جدیداً اضافه کرده؛ تاریخ آگهی فیلتر مهمی است (خواستهٔ مالک ۱۹-۱۱ عصر)
 */

import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  ClipboardPaste,
  Download,
  ExternalLink,
  Images,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Square,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  productFilesApi,
  productImagesApi,
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

/** اصلاح دستی (۲۲-۱۱): محدودیت‌های آپلود — آینهٔ همان قواعد بک‌اند
 * (uploads.service: ۵MB / ۴KB / jpeg-png-webp / عرض ≥ ۲۰۰px) */
const MAX_FILE_MB = 5;
const MIN_FILE_KB = 4;
const ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

/** اصلاح گروهی (خواستهٔ مالک ۲۲-۱۱): «همه باهم» از دید کاربر — یک کلیک؛
 * ولی موتور ۶ تصویر را همزمان می‌فرستد و بعدی‌ها را در صف خودکار نگه
 * می‌دارد. چرا ۶؟ مرورگر روی HTTP/1.1 به‌هرحال حداکثر ~۶ اتصال همزمان به
 * یک مبدأ باز می‌کند و بک‌اند هم برای هر تصویر ~ده‌ها مگابایت رم decode
 * نگه می‌دارد — ۶ یعنی بیشترین سرعتِ ممکن بدون خطر کرش؛ نه ۱ در ثانیه
 * (بسیار کند) نه ۱۰۰ همزمان (خطر اتمام رم بک‌اند). */
const BULK_CONCURRENCY = 6;

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

  // ── اصلاح گروهی (خواستهٔ مالک ۲۲-۱۱): دکمهٔ بالای فرم = کلیک خودکارِ
  //    «اصلاح» همهٔ تصاویر دسته؛ استخر ۶تایی با صف خودکار و قابل توقف ──
  const [pool, setPool] = useState<{ total: number; done: number } | null>(null);
  const poolAbortRef = useRef(false);
  const poolActiveRef = useRef(false);
  /** مشغول‌ها (اصلاح یا آپلود هر کاش) — ref تا استخر گروهی بدون stale-closure چک کند */
  const busyRef = useRef<Set<string>>(new Set());
  /** تازه‌ترین ردیف‌ها — چکِ زندهٔ «همین لحظه اصلاح شده؟» داخل worker استخر */
  const rowsRef = useRef<ProductFileRow[]>([]);
  rowsRef.current = rows;

  // ── اصلاح دستی (خواستهٔ مالک ۲۲-۱۱): وقتی خودکار می‌گوید «پیدا نشد» ولی
  //    تصویر واقعاً واترمارک دارد — دانلود ← پاک‌کردن در Paint ← آپلود.
  //    فایل تازه روی کلید نسخه‌دار تازه می‌نشیند و replaceInPlace هر دو مهر
  //    «بررسی‌شده + اصلاح‌شده» را می‌زند ⇒ تیک سبز همان‌جا می‌خورد. ──
  const [uploadingIds, setUploadingIds] = useState<ReadonlySet<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetIdRef = useRef<string | null>(null);

  /** اصلاح یک تصویر — نتیجه را برمی‌گرداند تا استخر گروهی بشمارد؛
   *  silent = بدون توست (حالت گروهی؛ خطاها در پنجرهٔ «بررسی شد» دیده می‌شوند) */
  const fixOne = async (
    row: ProductFileRow,
    opts?: { silent?: boolean },
  ): Promise<'removed' | 'not_found' | 'error' | 'skipped'> => {
    if (busyRef.current.has(row.id) || row.fixedAt) return 'skipped';
    busyRef.current.add(row.id);
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
        return 'removed';
      } else if (r.status === 'not_found') {
        setFailedIds((f) => ({ ...f, [row.id]: 'not_found' }));
        if (!opts?.silent) {
          toast({
            description: `واترمارک در تصویر #${row.relatedId ? toFaPlain(row.relatedId) : '—'} خودکار پیدا نشد — با دکمهٔ پیست همان کاش را دستی اصلاح کنید (برش ← Ctrl+V).`,
            variant: 'destructive',
          });
        }
        return 'not_found';
      } else {
        setFailedIds((f) => ({ ...f, [row.id]: 'error' }));
        if (!opts?.silent) {
          toast({ description: 'تعویض انجام نشد (فایل کلید ذخیره‌سازی ندارد).', variant: 'destructive' });
        }
        return 'error';
      }
    } catch (e) {
      setFailedIds((f) => ({ ...f, [row.id]: 'error' }));
      if (!opts?.silent) {
        toast({ description: (e as Error).message || 'اصلاح ناموفق بود.', variant: 'destructive' });
      }
      return 'error';
    } finally {
      busyRef.current.delete(row.id);
      setApplyingIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  };

  // ── دانلود تصویر اصلی (۲۲-۱۱): اول تلاش برای دانلود واقعی (blob)؛ اگر
  //    استوریج CORS ندهد، در تب جدید باز می‌شود تا از آنجا ذخیره شود ──
  const downloadOriginal = async (row: ProductFileRow) => {
    try {
      const res = await fetch(row.url);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const ext = row.url.split('?')[0].split('.').pop() ?? 'jpg';
      const a = document.createElement('a');
      a.href = href;
      a.download = `product-${row.relatedId ?? row.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30_000);
    } catch {
      window.open(row.url, '_blank', 'noopener');
    }
  };

  // ── آپلود نسخهٔ اصلاح‌شدهٔ دستی (۲۲-۱۱) — موازی و مستقل مثل اصلاح خودکار؛
  //    همان الگوی fixOne: کاش همان‌جا تصویر تازه (کلید نسخه‌دار ⇒ کش می‌شکند)
  //    را می‌گیرد و از باقی‌مانده خارج می‌شود؛ invalidate نمی‌زنیم تا کاش
  //    جایش نپرد و آمار دستی تعدیل شود ──
  const uploadManual = async (row: ProductFileRow, file: File) => {
    if (busyRef.current.has(row.id)) return;
    busyRef.current.add(row.id);
    setUploadingIds((s) => new Set(s).add(row.id));
    try {
      // همان اندپوینت اثبات‌شدهٔ «تعویض درجا» — مهر بررسی و اصلاح هر دو
      // را می‌زند (تعویض‌شده = بررسی‌شده + اصلاح‌شده، ۲۱-۱۱)
      const r = await productImagesApi.replace(row.id, file);
      const snapshots = queryClient.getQueriesData<ProductFilesList>({ queryKey: ['product-files'] });
      for (const [key, value] of snapshots) {
        if (!value) continue;
        const wasQueue = row.hasWatermark === true;
        queryClient.setQueryData<ProductFilesList>(key, {
          ...value,
          rows: value.rows.map((rr) =>
            rr.id === row.id
              ? {
                  ...rr,
                  url: r.url,
                  thumbUrl: r.thumbUrl,
                  size: r.size,
                  hasWatermark: false,
                  reviewedAt: r.replacedAt,
                  fixedAt: r.replacedAt,
                }
              : rr,
          ),
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
      setFailedIds((f) => {
        if (!(row.id in f)) return f;
        const next = { ...f };
        delete next[row.id];
        return next;
      });
      toast({
        description: 'نسخهٔ دستی شما جایگزین شد — تیک «اصلاح شد» خورد و از صف بررسی خارج شد.',
      });
    } catch (e) {
      toast({ description: (e as Error).message || 'آپلود ناموفق بود.', variant: 'destructive' });
    } finally {
      busyRef.current.delete(row.id);
      setUploadingIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  };

  const onPickFile = (id: string) => {
    targetIdRef.current = id;
    fileInputRef.current?.click();
  };

  const onFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = targetIdRef.current;
    // مقدار را ریست کنیم تا انتخاب همان فایل دوباره هم event بدهد
    e.target.value = '';
    if (!file || !id) return;
    if (!(ACCEPTED_MIME as readonly string[]).includes(file.type)) {
      toast({ title: 'فقط jpeg / png / webp پذیرفته می‌شود', variant: 'destructive' });
      return;
    }
    if (file.size < MIN_FILE_KB * 1024) {
      toast({ title: `حجم فایل باید حداقل ${toFa(MIN_FILE_KB)} کیلوبایت باشد`, variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({ title: `حجم فایل نباید از ${toFa(MAX_FILE_MB)} مگابایت بیشتر باشد`, variant: 'destructive' });
      return;
    }
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    void uploadManual(row, file);
  };

  // ── پیست عکس جایگزین (خواستهٔ مالک ۲۰-۱۱): برش با ابزار اسکرین‌شات
  //    (Snipaste و…) → Ctrl+V داخل پنجرهٔ پیست → تایید؛ همان تعویض درجای
  //    اثبات‌شده — بدون رفت‌وبرگشت به Paint و دیسک ──
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTargetId, setPasteTargetId] = useState<string | null>(null);
  const [pasteFile, setPasteFile] = useState<File | null>(null);
  const [pastePreviewUrl, setPastePreviewUrl] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const pastePreviewRef = useRef<string | null>(null);

  const resetPasteState = () => {
    if (pastePreviewRef.current) {
      URL.revokeObjectURL(pastePreviewRef.current);
      pastePreviewRef.current = null;
    }
    setPastePreviewUrl(null);
    setPasteFile(null);
    setPasteError(null);
  };
  const openPaste = (id: string) => {
    resetPasteState();
    setPasteTargetId(id);
    setPasteOpen(true);
  };
  const closePaste = () => {
    resetPasteState();
    setPasteTargetId(null);
    setPasteOpen(false);
  };

  /** گوش‌دادن به Ctrl+V فقط وقتی پنجرهٔ پیست باز است — تصویر کلیپ‌بورد را
   *  می‌گیرد، با همان قواعد بک‌اند اعتبارسنجی و پیش‌نمایش می‌کند */
  useEffect(() => {
    if (!pasteOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const dt = e.clipboardData;
      if (!dt) return;
      e.preventDefault();
      const file =
        Array.from(dt.files).find((f) => f.type.startsWith('image/')) ??
        Array.from(dt.items)
          .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
          .map((it) => it.getAsFile())
          .find((f): f is File => !!f) ??
        null;
      if (!file) {
        setPasteFile(null);
        setPasteError('تصویری در حافظه نیست — اول در ابزار برش، عکس را کپی (Ctrl+C) کنید.');
        return;
      }
      if (!(ACCEPTED_MIME as readonly string[]).includes(file.type)) {
        setPasteFile(null);
        setPasteError(`قالب «${file.type || 'نامشخص'}» پذیرفته نمی‌شود — فقط jpeg / png / webp.`);
        return;
      }
      if (file.size < MIN_FILE_KB * 1024) {
        setPasteFile(null);
        setPasteError(`حجم تصویر باید حداقل ${toFa(MIN_FILE_KB)} کیلوبایت باشد.`);
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setPasteFile(null);
        setPasteError(`حجم تصویر بیشتر از ${toFa(MAX_FILE_MB)} مگابایت است — برش کوچک‌تری بگیرید.`);
        return;
      }
      setPasteFile(file);
      setPasteError(null);
      if (pastePreviewRef.current) URL.revokeObjectURL(pastePreviewRef.current);
      const url = URL.createObjectURL(file);
      pastePreviewRef.current = url;
      setPastePreviewUrl(url);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [pasteOpen]);

  /** تایید پیست — همان uploadManual اثبات‌شده: تعویض درجا + مهر بررسی/اصلاح */
  const confirmPaste = () => {
    const id = pasteTargetId;
    const file = pasteFile;
    if (!id || !file) return;
    const row = rowsRef.current.find((r) => r.id === id);
    closePaste();
    if (!row) {
      toast({ description: 'این تصویر دیگر در دسته نیست — لیست تازه شد.', variant: 'destructive' });
      void refetch();
      return;
    }
    void uploadManual(row, file);
  };

  // ── استخر اصلاح گروهی (خواستهٔ مالک ۲۲-۱۱): یک کلیک بالای فرم = کلیک
  //    خودکارِ دکمهٔ اصلاحِ همهٔ تصاویر دسته — ۶ همزمان (سقف اتصال مرورگر)،
  //    بعدی‌ها در صف خودکار؛ پیشرفت روی دکمه؛ کلیک دوباره = توقف صف
  //    (در جریان‌ها تمام می‌شوند)؛ در پایان یک توست خلاصه ──
  const runPool = async (targets: ProductFileRow[]) => {
    if (poolActiveRef.current) return;
    const list = targets.filter((r) => !r.fixedAt);
    if (!list.length) return;
    poolAbortRef.current = false;
    poolActiveRef.current = true;
    setPool({ total: list.length, done: 0 });
    let next = 0;
    let ok = 0;
    let nf = 0;
    let err = 0;
    const worker = async () => {
      for (;;) {
        if (poolAbortRef.current) return;
        const i = next++;
        if (i >= list.length) return;
        const snap = list[i]!;
        // وضعیت زنده: شاید همان لحظه دستی جایگزین/اصلاح شده — رد شو
        const fresh = rowsRef.current.find((r) => r.id === snap.id) ?? snap;
        if (fresh.fixedAt || busyRef.current.has(fresh.id)) {
          setPool((p) => (p ? { ...p, done: p.done + 1 } : p));
          continue;
        }
        const outcome = await fixOne(fresh, { silent: true });
        if (outcome === 'removed') ok += 1;
        else if (outcome === 'not_found') nf += 1;
        else if (outcome === 'error') err += 1;
        setPool((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(BULK_CONCURRENCY, list.length) }, () => worker()),
    );
    poolActiveRef.current = false;
    setPool(null);
    if (!poolAbortRef.current) {
      toast({
        description:
          `اصلاح گروهی تمام شد — ${toFa(ok)} تصویر تمیز شد` +
          (nf > 0
            ? `، ${toFa(nf)} واترمارک پیدا نشد (با «بررسی شد» پنجرهٔ دستی‌شان باز می‌شود)`
            : '') +
          (err > 0 ? `، ${toFa(err)} خطا` : '') +
          '.',
      });
    }
  };

  // ── «بررسی شد» (خواستهٔ مالک ۲۱-۱۱): مهر گروهی روی همهٔ دستهٔ فعلی —
  //    هرگز دوباره لود نمی‌شوند؛ دستهٔ بعدی جای آن‌ها را می‌گیرد ──
  const [confirming, setConfirming] = useState(false);

  // ── مدال بزرگ خطاها (خواستهٔ مالک ۲۲-۱۱): «بررسی شد» اگر تصویرِ خطاخورده
  //    در دسته مانده باشد اول این پنجره را باز می‌کند — همان‌جا تلاش مجدد یا
  //    دانلود/ویرایش/آپلود دستی؛ در پایان «بررسی شد» نهایی دسته را می‌بندد ──
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIds, setModalIds] = useState<string[]>([]);
  const confirmBatch = async () => {
    if (confirming || applyingIds.size > 0 || uploadingIds.size > 0 || pool) return;
    const ids = rows.map((r) => r.id);
    if (!ids.length) return;
    setConfirming(true);
    try {
      const r = await productFilesApi.reviewBatch(ids);
      toast({
        description: `این دسته بررسی شد (${toFa(r.updated)} تصویر) — دستهٔ بعدیِ نیازمند بررسی لود می‌شود.`,
      });
      setFailedIds({});
      setModalOpen(false);
      setModalIds([]);
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
  /** اصلاح خودکار + آپلود دستی در جریان — «بررسی شد» تا پایانشان قفل است */
  const inFlight = applyingIds.size + uploadingIds.size;
  /** اصلاح‌نشده‌های این دسته — هدف «اصلاح گروهی» */
  const unfixedCount = rows.filter((r) => !r.fixedAt).length;
  /** خطاهای زندهٔ دسته — «بررسی شد» با وجودشان اول پنجرهٔ خطاها را باز می‌کند */
  const failedRows = rows.filter((r) => !r.fixedAt && failedIds[r.id]);

  /** «بررسی شد» (۲۲-۱۱): اگر خطا مانده → اول پنجرهٔ بزرگ خطاها؛ وگرنه بستن مستقیم */
  const onRequestReview = () => {
    if (confirming || inFlight > 0 || pool) return;
    if (failedRows.length > 0) {
      setModalIds(failedRows.map((r) => r.id));
      setModalOpen(true);
      return;
    }
    void confirmBatch();
  };

  /** کاش‌های پنجرهٔ خطاها — وضعیت زنده از کش: با اصلاح (دستی یا خودکار)
   *  همان لحظه سبز و تیک‌دار می‌شوند و از شمارندهٔ «هنوز خطا دارد» کم می‌شوند */
  const modalTiles = modalIds
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is ProductFileRow => !!r);
  const modalUnfixed = modalTiles.filter((r) => !r.fixedAt);
  /** کاش هدفِ پنجرهٔ پیست — وضعیت زنده از کش */
  const pasteTarget = rows.find((r) => r.id === pasteTargetId) ?? null;

  return (
    <div className="mx-auto max-w-[1700px] space-y-4">
      {/* اینپوت فایل مخفی — اصلاح دستی: دانلود ← ویرایش در Paint ← آپلود */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChosen}
        aria-label="انتخاب فایل تصویر اصلاح‌شدهٔ دستی"
      />
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
          {/* اصلاح گروهی (خواستهٔ مالک ۲۲-۱۱): یک کلیک = کلیک خودکار «اصلاح»
              همهٔ تصاویر دسته — استخر ۶تایی با صف خودکار؛ حین کار = توقف */}
          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-[10px] px-3 text-[11.5px] font-extrabold"
            disabled={isLoading || confirming || (!pool && unfixedCount === 0)}
            onClick={() => (pool ? (poolAbortRef.current = true) : void runPool(rows))}
            title="دکمهٔ اصلاحِ همهٔ تصاویر این دسته را یک‌جا می‌زند — ۶ تصویر همزمان اصلاح می‌شود و بعدی‌ها خودکار در صف می‌روند؛ حین کار همین دکمه صف را متوقف می‌کند"
          >
            {pool ? (
              <>
                <Square size={13} /> توقف — {toFa(pool.done)} از {toFa(pool.total)}
              </>
            ) : (
              <>
                <Zap size={13} /> اصلاح گروهی ({toFa(unfixedCount)})
              </>
            )}
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

      {/* راهنمای گردش‌کار — ساده */}
      <div className="rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-[11.5px] leading-6">
        <b>گردش‌کار:</b> ۱) با <b>اصلاح گروهی</b> بالای صفحه همهٔ تصاویر این دسته را یک‌جا بزنید — ۶ تصویر همزمان اصلاح می‌شود و بقیه خودکار پشت‌سرهم می‌آیند (دکمه‌های تکی هم مثل قبل مستقل کار می‌کنند)؛
        ۲) اگر خودکار پیدا نکرد یا لکه‌ای جا ماند: با ابزار برش (Snipaste و…) ناحیهٔ تمیز را کپی کنید و با دکمهٔ <b>پیست</b> همان کاش جایگزین کنید (یا <b>دانلود</b>/<b>آپلود</b> فایل)؛
        ۳) <b>بررسی شد</b> را بزنید — اگر تصویر خطاخورده‌ای مانده باشد، پنجرهٔ بزرگ خطاها باز می‌شود: همان‌جا تلاش مجدد یا اصلاح دستی کنید و در پایان دسته را ببندید تا <b>دستهٔ بعدی</b> بیاید؛ آن‌قدر ادامه دهید تا هیچ تصویری نیازمند بررسی نماند.
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
            const uploading = uploadingIds.has(f.id);
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
                  {/* چرخندهٔ اصلاح/آپلود همزمان روی خود کاش */}
                  {(applying || uploading) && (
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
                    {/* «پیدا نشد» — مسیر دستی همان کاش (خواستهٔ مالک ۲۲-۱۱) */}
                  {fail === 'not_found' && !f.fixedAt ? (
                    <p className="rounded-md bg-amber-50 px-1.5 py-1 text-center text-[9.5px] font-bold leading-4 text-amber-700">
                      خودکار پیدا نشد — پیست، دانلود یا آپلود دستی
                    </p>
                  ) : null}
                  {/* ردیف عملیات: اصلاح خودکار + دانلود + آپلود + پیست — هر کدام مستقل.
                      موبایل: دکمهٔ اصلی تمام‌عرض ردیف اول، آیکون‌ها ردیف دوم (کاش‌ها باریک‌اند) */}
                  <div className="flex flex-wrap items-center gap-1">
                    {!f.fixedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'h-8 min-w-0 basis-full gap-1 rounded-[9px] px-2 text-[11px] font-extrabold sm:basis-0 sm:flex-1',
                          fail && 'border-amber-400/70 text-amber-700 hover:text-amber-800',
                        )}
                        disabled={applying || uploading || confirming}
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
                      <p className="flex h-8 min-w-0 basis-full items-center justify-center gap-1 rounded-[9px] bg-emerald-50 px-2 text-[10.5px] font-extrabold text-emerald-700 sm:basis-0 sm:flex-1">
                        <BadgeCheck size={12} /> اصلاح شد
                      </p>
                    )}
                    <div className="flex w-full items-center justify-center gap-1 sm:w-auto sm:justify-start">
                      {/* دانلود تصویر اصلی برای ویرایش دستی (۲۲-۱۱) */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'size-8 shrink-0 rounded-[9px] p-0',
                          fail && 'border-amber-400/70 text-amber-700 hover:text-amber-800',
                        )}
                        title="دانلود تصویر اصلی — برای ویرایش و آپلود مجدد"
                        aria-label="دانلود تصویر اصلی"
                        onClick={() => void downloadOriginal(f)}
                      >
                        <Download size={13} />
                      </Button>
                      {/* آپلود نسخهٔ اصلاح‌شدهٔ دستی (۲۲-۱۱) — همان کاش جایگزین می‌شود */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'size-8 shrink-0 rounded-[9px] p-0',
                          fail && 'border-amber-400/70 text-amber-700 hover:text-amber-800',
                        )}
                        disabled={applying || uploading || confirming}
                        title="آپلود فایل اصلاح‌شدهٔ دستی — همین تصویر جایگزین می‌شود، تیک «اصلاح شد» می‌خورد و از صف خارج می‌شود"
                        aria-label="آپلود نسخهٔ اصلاح‌شده"
                        onClick={() => onPickFile(f.id)}
                      >
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      </Button>
                      {/* پیست عکس از حافظه (۲۰-۱۱): برش با ابزار اسکرین‌شات ← Ctrl+V */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'size-8 shrink-0 rounded-[9px] p-0',
                          fail && 'border-amber-400/70 text-amber-700 hover:text-amber-800',
                        )}
                        disabled={applying || uploading || confirming}
                        title="پیست عکس از حافظه — با ابزار برش (Snipaste و…) ناحیهٔ تمیز را بزنید، بعد این‌جا Ctrl+V؛ سریع‌ترین راه اصلاح دستی"
                        aria-label="پیست عکس جایگزین از حافظه"
                        onClick={() => openPaste(f.id)}
                      >
                        <ClipboardPaste size={13} />
                      </Button>
                    </div>
                  </div>
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
                {inFlight > 0
                  ? `${toFa(inFlight)} اصلاح در جریان…`
                  : `${toFa(rows.length)} تصویر در این دسته`}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-5 text-muted-foreground">
                {inFlight > 0
                  ? 'صبر کنید تا اصلاح‌ها و آپلودهای در جریان تمام شود.'
                  : failedRows.length > 0
                    ? `${toFa(failedRows.length)} تصویر خطا خورده — با «بررسی شد» پنجرهٔ اصلاح دستی‌شان باز می‌شود.`
                    : remaining > rows.length
                      ? `بعد از این دسته ${toFa(Math.max(0, remaining - rows.length))} تصویر دیگر مانده است.`
                      : 'این آخرین دسته است — با بستنش کار تمام می‌شود.'}
              </p>
            </div>
            <Button
              size="lg"
              className="h-10 shrink-0 gap-2 rounded-[10px] px-5 text-[13px] font-extrabold"
              disabled={inFlight > 0 || confirming}
              onClick={() => onRequestReview()}
              title="همهٔ این دسته بررسی شدند و دیگر هرگز لود نمی‌شوند — اگر خطاخورده‌ای مانده باشد، اول پنجرهٔ بزرگ خطاها برای اصلاح دستی باز می‌شود"
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

      {/* ── مدال بزرگ خطاها (خواستهٔ مالک ۲۲-۱۱) ── «بررسی شد» با وجودِ
          خطاخورده، اول این پنجره را باز می‌کند: هر کاش «دوباره اصلاح»
          خودکار + «دانلود ← ویرایش در Paint ← آپلود» دستی؛ وضعیت زنده است
          و سبز می‌شود؛ دکمهٔ پایین = همان «بررسی شد» نهایی: کل دسته (با
          خطاخورده‌ها) مهر می‌خورد و دستهٔ بعدی می‌آید ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[1200px] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b bg-amber-50/60 px-5 py-4 text-right sm:text-right">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
              <ShieldAlert size={18} className="shrink-0 text-amber-600" />
              {toFa(modalTiles.length)} تصویر خطا خورد — اصلاح دستی
            </DialogTitle>
            <DialogDescription className="text-[11.5px] leading-6">
              خودکار در این تصاویر واترمارک را پیدا نکرد یا خطا داد. هر کدام را که خواستید همین‌جا دستی اصلاح کنید:{' '}
              <b>پیست</b> (برش با ابزار اسکرین‌شات ← Ctrl+V) یا <b>دانلود</b> ← ویرایش ← <b>آپلود</b>؛ یا «دوباره اصلاح» بزنید. در پایان، «بررسی شد» را بزنید تا
              خطاخورده‌ها هم مهر بخورند و دستهٔ بعدی بیاید.
            </DialogDescription>
            {modalUnfixed.length > 1 && (
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-[9px] border-amber-400/70 px-3 text-[11px] font-extrabold text-amber-700 hover:text-amber-800"
                  disabled={!!pool || confirming}
                  onClick={() => (pool ? (poolAbortRef.current = true) : void runPool(modalUnfixed))}
                  title="همهٔ خطاخورده‌های این پنجره را دوباره به اصلاح خودکار می‌فرستد — ۶ تصویر همزمان؛ حین کار همین دکمه صف را متوقف می‌کند"
                >
                  {pool ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> در جریان — {toFa(pool.done)} از {toFa(pool.total)} (توقف)
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={12} /> تلاش مجدد همهٔ خطاها ({toFa(modalUnfixed.length)})
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogHeader>

          {/* گرید خطاها — اسکرول داخلی؛ تصاویر درشت تا واترمارک واضح دیده شود */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {modalTiles.map((f) => {
                const applying = applyingIds.has(f.id);
                const uploading = uploadingIds.has(f.id);
                const fail = failedIds[f.id];
                return (
                  <figure
                    key={f.id}
                    className={cn(
                      'overflow-hidden rounded-lg border bg-card',
                      f.fixedAt
                        ? 'border-emerald-400/80 ring-2 ring-emerald-300/50'
                        : 'border-amber-400/80 ring-2 ring-amber-300/50',
                    )}
                  >
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      title="اندازهٔ اصلی در تب جدید — برای دیدن دقیق واترمارک"
                      className="group relative block aspect-square bg-secondary"
                    >
                      <img
                        src={f.thumbUrl ?? f.url}
                        alt={`تصویر فایل ${f.id}`}
                        loading="lazy"
                        className="size-full object-contain"
                      />
                      {f.fixedAt && (
                        <span
                          className="absolute start-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-emerald-600/85 text-white"
                          title="اصلاح شد"
                        >
                          <BadgeCheck size={15} />
                        </span>
                      )}
                      {(applying || uploading) && (
                        <span className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-[1px]">
                          <Loader2 size={26} className="animate-spin text-primary" />
                        </span>
                      )}
                      <span className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-md bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <ExternalLink size={13} />
                      </span>
                    </a>
                    <figcaption className="space-y-1.5 px-2.5 py-2">
                      <p
                        className="truncate text-center font-mono text-[11.5px] font-extrabold tabular-nums text-foreground"
                        title={`File ID: ${f.id}`}
                      >
                        #{f.relatedId ? toFaPlain(f.relatedId) : '—'}
                      </p>
                      {f.fixedAt ? (
                        <p className="flex h-8 items-center justify-center gap-1 rounded-[9px] bg-emerald-50 px-2 text-[10.5px] font-extrabold text-emerald-700">
                          <BadgeCheck size={12} /> اصلاح شد
                        </p>
                      ) : (
                        <>
                          <p className="rounded-md bg-amber-50 px-1.5 py-1 text-center text-[9.5px] font-bold leading-4 text-amber-700">
                            {fail === 'not_found'
                              ? 'خودکار پیدا نکرد — پیست یا دانلود/آپلود دستی'
                              : 'خطا — دوباره تلاش یا اصلاح دستی'}
                          </p>
                          <div className="flex flex-wrap items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 min-w-0 basis-full gap-1 rounded-[9px] border-amber-400/70 px-2 text-[11px] font-extrabold text-amber-700 hover:text-amber-800 sm:basis-0 sm:flex-1"
                              disabled={applying || uploading || confirming || !!pool}
                              onClick={() => void fixOne(f)}
                              title="یک‌بار دیگر اصلاح خودکار را روی همین تصویر امتحان کنید"
                            >
                              {applying ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RefreshCcw size={12} />
                              )}{' '}
                              دوباره اصلاح
                            </Button>
                            <div className="flex w-full items-center justify-center gap-1 sm:w-auto sm:justify-start">
                              <Button
                                size="sm"
                                variant="outline"
                                className="size-8 shrink-0 rounded-[9px] border-amber-400/70 p-0 text-amber-700 hover:text-amber-800"
                                title="دانلود تصویر اصلی — برای ویرایش و آپلود مجدد"
                                aria-label="دانلود تصویر اصلی"
                                onClick={() => void downloadOriginal(f)}
                              >
                                <Download size={13} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="size-8 shrink-0 rounded-[9px] border-amber-400/70 p-0 text-amber-700 hover:text-amber-800"
                                disabled={applying || uploading || confirming || !!pool}
                                title="آپلود فایل اصلاح‌شدهٔ دستی — همین تصویر جایگزین می‌شود، تیک «اصلاح شد» می‌خورد و از صف خارج می‌شود"
                                aria-label="آپلود نسخهٔ اصلاح‌شده"
                                onClick={() => onPickFile(f.id)}
                              >
                                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="size-8 shrink-0 rounded-[9px] border-amber-400/70 p-0 text-amber-700 hover:text-amber-800"
                                disabled={applying || uploading || confirming || !!pool}
                                title="پیست عکس از حافظه — با ابزار برش (Snipaste و…) ناحیهٔ تمیز را بزنید، بعد این‌جا Ctrl+V"
                                aria-label="پیست عکس جایگزین از حافظه"
                                onClick={() => openPaste(f.id)}
                              >
                                <ClipboardPaste size={13} />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>

          {/* پایین مدال: شمارندهٔ زنده + «بررسی شد» نهایی = بستن کل دسته */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card px-5 py-3.5">
            <div className="min-w-0">
              <p className="text-xs font-extrabold tabular-nums">
                {modalUnfixed.length > 0
                  ? `${toFa(modalUnfixed.length)} تصویر هنوز خطا دارد`
                  : 'همهٔ خطاها اصلاح شد — عالی!'}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-5 text-muted-foreground">
                {modalUnfixed.length > 0
                  ? 'می‌توانید همین‌طور هم دسته را ببندید — خطاخورده‌ها هم مهر بررسی می‌خورند و از صف خارج می‌شوند.'
                  : 'حالا دسته را ببندید تا دستهٔ بعدیِ نیازمند بررسی جای آن را بگیرد.'}
              </p>
            </div>
            <Button
              size="lg"
              className="h-10 shrink-0 gap-2 rounded-[10px] px-5 text-[13px] font-extrabold"
              disabled={inFlight > 0 || confirming || !!pool}
              onClick={() => void confirmBatch()}
              title="مهر گروهی بررسی روی کل این دسته (شامل خطاخورده‌ها) — دستهٔ بعدی جای آن را می‌گیرد"
            >
              {confirming ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> در حال ثبت…
                </>
              ) : (
                <>
                  <BadgeCheck size={16} /> بررسی شد — بستن این دسته ({toFa(rows.length)} تصویر)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── پیست عکس جایگزین (خواستهٔ مالک ۲۰-۱۱) ── برش با ابزار اسکرین‌شات
          (Snipaste و…) ← Ctrl+V همین‌جا ← تایید: همان تعویض درجای اثبات‌شده،
          مهر بررسی + اصلاح، تیک سبز همان کاش — بدون رفت‌وبرگشت به Paint ── */}
      <Dialog open={pasteOpen} onOpenChange={(o) => (o ? setPasteOpen(true) : closePaste())}>
        <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[780px] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4 text-right sm:text-right">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
              <ClipboardPaste size={18} className="shrink-0 text-primary" />
              پیست عکس جایگزین
              {pasteTarget?.relatedId ? (
                <span className="font-mono text-muted-foreground">#{toFaPlain(pasteTarget.relatedId)}</span>
              ) : null}
            </DialogTitle>
            <DialogDescription className="text-[11.5px] leading-6">
              با ابزار برش (Snipaste، اسکرین‌شات ویندوز و…) ناحیهٔ تمیزشده را بزنید تا در حافظه کپی شود؛ بعد این‌جا{' '}
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">Ctrl+V</kbd> بزنید و
              «آپلود و جایگزینی» را بزنید — همین تصویر با نسخهٔ شما عوض می‌شود و تیک «اصلاح شد» می‌خورد.
            </DialogDescription>
          </DialogHeader>

          {/* مقایسهٔ کنار‌به‌کنار: تصویر فعلی ↔ ناحیهٔ پیست */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <figure className="overflow-hidden rounded-lg border bg-card">
                <a
                  href={pasteTarget?.url}
                  target="_blank"
                  rel="noreferrer"
                  title="اندازهٔ اصلی در تب جدید"
                  className="block aspect-square bg-secondary"
                >
                  {/* فقط وقتی هدف هست رندر شود — src خالی هنگام بسته‌شدن، خطای کنسول می‌دهد */}
                  {pasteTarget ? (
                    <img
                      src={pasteTarget.thumbUrl ?? pasteTarget.url}
                      alt="تصویر فعلی"
                      className="size-full object-contain"
                    />
                  ) : null}
                </a>
                <figcaption className="px-2.5 py-1.5 text-center text-[10.5px] font-bold text-muted-foreground">
                  تصویر فعلی
                </figcaption>
              </figure>
              <div className="flex flex-col gap-2">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-lg border-2 border-dashed bg-secondary/50 p-2">
                  {pastePreviewUrl ? (
                    <img src={pastePreviewUrl} alt="تصویر پیست‌شده" className="size-full object-contain" />
                  ) : (
                    <div className="grid place-items-center gap-2 text-center text-muted-foreground">
                      <ClipboardPaste size={30} className="opacity-60" />
                      <p className="text-[11.5px] font-bold">اینجا Ctrl+V بزنید</p>
                      <p className="max-w-[230px] text-[10.5px] leading-5">
                        عکس برش‌خورده از حافظهٔ کامپیوتر همین‌جا می‌چسبد و پیش‌نمایشش را می‌بینید
                      </p>
                    </div>
                  )}
                </div>
                {pasteError ? (
                  <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-center text-[10.5px] font-bold text-destructive">
                    {pasteError}
                  </p>
                ) : null}
                {pasteFile ? (
                  <p className="text-center text-[10.5px] font-bold text-emerald-600">
                    آمادهٔ جایگزینی — {toFa(Math.round(pasteFile.size / 1024))} کیلوبایت
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* پایین پنجره: راهنما + تایید */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card px-5 py-3.5">
            <p className="text-[10.5px] leading-5 text-muted-foreground">
              می‌توانید چند بار پیست کنید — هر پیست تازه جای قبلی را می‌گیرد.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-[10px] px-4 text-[12px] font-extrabold"
                onClick={closePaste}
              >
                انصراف
              </Button>
              <Button
                className="h-9 gap-2 rounded-[10px] px-4 text-[12px] font-extrabold"
                disabled={!pasteFile}
                onClick={confirmPaste}
                title="همین تصویر جایگزین می‌شود، تیک «اصلاح شد» می‌خورد و از صف خارج می‌شود"
              >
                <Upload size={14} /> آپلود و جایگزینی
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
