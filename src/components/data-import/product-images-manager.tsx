'use client';

/**
 * تصاویر آگهی‌ها — صفحهٔ «دیتا ایمپورت → تصاویر آگهی‌ها» (خواستهٔ مالک ۱۳-۱۱،
 * بازطراحی ۱۵-۱۱ ردیفی، بازطراحی ۱۶-۱۱ عصر گروهی).
 * هدف: سریع‌ترین اسکن برای یافتن تصاویر واترمارک‌دار باسکول + «تعویض درجا»:
 *
 *   گردش‌کار مالک: تصویر را باز می‌کند و ذخیره می‌کند → در Paint واترمارک باسکول
 *   را پاک می‌کند → دکمهٔ «آپلود نسخهٔ اصلاح‌شده» → فایل جدید روی «همان کلید»
 *   (همان نام/مسیر/URL) نوشته می‌شود و تامبنیل هم از روی تصویر تازه در همان
 *   کلید تامبنیل بازساخته می‌شود. نمایش با ?v=<آخرین تعویض> کش را می‌شکند.
 *
 * بازطراحی ۱۶-۱۱ عصر (خواستهٔ مالک):
 *   • کارت گروهی: هر آگهی یک کارت با «همهٔ» عکس‌هایش کنار هم — چیدمان قبلی هر
 *     عکس را ردیف جدا می‌داد و آگهی چندعکسه چندبار تکرار می‌شد؛ حالا هیچ
 *     عکسی از قلم نمی‌افتد چون کل گالری آگهی یک‌جا دیده می‌شود.
 *   • عکس‌ها بزرگ: ۳۰۰×۳۰۰ (اصل فایل — نه تامبنیل — تا واترمارک واضح باشد).
 *   • صفحه‌بندی بر «آگهی» (نه بر فایل) — عکس‌های یک آگهی بین دو صفحه نمی‌شکافند.
 *   • سورت‌های محصولی: آپدیت/ثبت/شناسه + تعداد عکس + حجم کل گالری.
 *
 * میراث ۱۵-۱۱: سورت پیش‌فرض آخرین آپدیت نزولی؛ ۵۰ رکورد در هر صفحه؛ آدرس یکتا
 * برای هر صفحه (?page=… + فیلترها در URL)؛ فیلتر بازهٔ زمانی + دکمه‌های سریع +
 * ۶ ماه شمسی اخیر.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Images,
  Info,
  Loader2,
  PackageOpen,
  RefreshCcw,
  Replace,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  API_BASE,
  productImagesApi,
  type ProductImageGroupPhoto,
  type ProductImageGroupRow,
  type ProductImagesParams,
} from '@/lib/importer/client';
import { dateFa, timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DateRangeFilter, type DateRangeField } from './date-range-filter';

const ANY = '__any__';
const MAX_FILE_MB = 5;
const MIN_FILE_KB = 4;
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** ۵۰ آگهی در هر صفحه (صفحه‌بندی گروهی بر آگهی — نه بر فایل) */
const PAGE_SIZE = 50;

/** اندازهٔ نمایش هر عکس (خواستهٔ مالک ۱۶-۱۱ عصر: «خیلی بزرگتر، مثلا ۳۰۰×۳۰۰») */
const PHOTO_BOX = 'size-[300px]';

/** سورت‌های گروهی — همه بر آگهی (نه بر فایل) */
const SORT_OPTIONS = [
  { value: 'productUpdated', label: 'مرتب: آخرین آپدیت آگهی' },
  { value: 'productCreated', label: 'مرتب: تاریخ ثبت آگهی' },
  { value: 'productId', label: 'مرتب: شناسهٔ آگهی' },
  { value: 'photoCount', label: 'مرتب: تعداد عکس آگهی' },
  { value: 'size', label: 'مرتب: حجم کل تصاویر آگهی' },
] as const;
const SORT_VALUES = new Set(SORT_OPTIONS.map((o) => o.value as string));

/** فیلد هدف بازهٔ زمانی — روی تاریخ‌های خودِ آگهی (باسکول) */
const DATE_FIELDS: DateRangeField[] = [
  { value: 'updated', label: 'تاریخ آپدیت آگهی' },
  { value: 'created', label: 'تاریخ ثبت آگهی' },
];

function imgSrc(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

/** cache-buster نمایش — بعد از هر تعویض درجا، URL یکسان کش مرورگر را می‌شکند */
function vSrc(url: string, updatedAt: string): string {
  const v = new Date(updatedAt).getTime();
  if (Number.isNaN(v)) return imgSrc(url);
  return `${imgSrc(url)}${url.includes('?') ? '&' : '?'}v=${v}`;
}

// ═══════════════════════════════ سلول عکس (۳۰۰×۳۰۰) ═══════════════════════════════

/**
 * یک عکس از گالری آگهی — اصل فایل (نه تامبنیل) در جعبهٔ ۳۰۰×۳۰۰ تا واترمارک
 * باسکول واضح دیده شود؛ کلیک = بازکردن اصل برای ذخیره/ویرایش؛ دکمه‌های
 * آپلود/دانلود زیر عکس، همیشه دم‌دست (موبایل بدون hover هم).
 */
function PhotoCell({
  photo,
  replacing,
  onPickFile,
}: {
  photo: ProductImageGroupPhoto;
  replacing: boolean;
  onPickFile: (id: string) => void;
}) {
  // اصل فایل — تامبنیل ۳۷۵px برای جعبهٔ ۳۰۰px کیفیت کافی برای شکار واترمارک ندارد
  const main = vSrc(photo.url, photo.updatedAt);

  return (
    <figure className="w-[300px] shrink-0">
      <a
        href={main}
        target="_blank"
        rel="noreferrer"
        title="بازکردن تصویر اصلی (ذخیره کنید، در پینت واترمارک باسکول را پاک کنید و با دکمهٔ آپلود زیرش جایگزین کنید)"
        className={cn(
          'relative block overflow-hidden rounded-md border bg-white',
          PHOTO_BOX,
          photo.replacedAt && 'border-emerald-300',
        )}
      >
        <img
          src={main}
          alt={photo.name}
          className="h-full w-full object-contain"
          loading="lazy"
        />
        {photo.replacedAt ? (
          <span
            className="absolute start-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white"
            title={`تعویض‌شده: ${dateFa(photo.replacedAt)} (${timeAgoFa(photo.replacedAt)})`}
          >
            <BadgeCheck size={9} /> اصلاح‌شده
          </span>
        ) : null}
        {/* لایهٔ آپلود */}
        {replacing ? (
          <span className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-[1px]">
            <Loader2 size={26} className="animate-spin text-primary" />
          </span>
        ) : null}
      </a>
      {/* مشخصات + عملیات زیر عکس — بدون هیچ بج باسکول روی عکس */}
      <figcaption className="mt-1 flex items-center justify-between gap-1">
        <p className="truncate text-[10px] text-muted-foreground">
          {photo.width && photo.height ? `${toFa(photo.width)}×${toFa(photo.height)}` : ''}
          {photo.width && photo.height ? ' • ' : ''}
          {toFa(Math.round(photo.size / 1024))}KB
        </p>
        <span className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            className="h-7 gap-1 rounded-md px-2 text-[10.5px] font-bold"
            disabled={replacing}
            onClick={() => onPickFile(photo.id)}
            title="فایل اصلاح‌شده (بدون واترمارک باسکول) را انتخاب کنید — همان نام و مسیر جایگزین می‌شود"
          >
            {replacing ? <Loader2 size={10} className="animate-spin" /> : <Replace size={10} />}
            آپلود اصلاح‌شده
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="size-7 shrink-0 rounded-md p-0"
            asChild
            title="ذخیرهٔ تصویر اصلی برای ویرایش"
          >
            <a href={main} target="_blank" rel="noreferrer" download>
              <Download size={12} />
            </a>
          </Button>
        </span>
      </figcaption>
    </figure>
  );
}

// ═══════════════════════════════ کارت آگهی (گروهی) ═══════════════════════════════

/** یک آگهی = یک کارت: سربرگ مشخصات + همهٔ عکس‌های گالری کنار هم */
function ProductCard({
  row,
  uploadingId,
  onPickFile,
}: {
  row: ProductImageGroupRow;
  uploadingId: string | null;
  onPickFile: (id: string) => void;
}) {
  const { product, owner } = row;
  const productHref = `/product-view/${product.slug}/-/${product.id}`;
  const anyReplaced = row.photos.some((p) => p.replacedAt);
  const allReplaced = row.photos.length > 0 && row.photos.every((p) => p.replacedAt);

  return (
    <div className="space-y-2.5 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40">
      {/* سربرگ: مشخصات آگهی — یک نگاه، همهٔ اطلاعات */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
        <a
          href={productHref}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] font-bold hover:text-primary hover:underline"
          title={product.name}
        >
          {product.name}
        </a>
        <span className="text-muted-foreground" dir="ltr">
          #{toFa(product.id)}
        </span>
        {anyReplaced ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white',
              allReplaced ? 'bg-emerald-500/90' : 'bg-emerald-500/60',
            )}
            title={allReplaced ? 'همهٔ عکس‌های این آگهی اصلاح شده‌اند' : 'حداقل یک عکس این آگهی اصلاح شده است'}
          >
            <BadgeCheck size={9} /> {allReplaced ? 'کامل اصلاح‌شده' : 'اصلاح‌شده دارد'}
          </span>
        ) : null}
        <span className="mx-0.5 h-3.5 w-px bg-border" aria-hidden />
        <span className="truncate text-muted-foreground">
          {owner ? (owner.name || `@${owner.userName}`) : '—'}
        </span>
        <span className="text-muted-foreground/70">•</span>
        <span className="truncate text-muted-foreground" title={`ثبت: ${dateFa(product.createdAt)} — آپدیت: ${dateFa(product.updatedAt)}`}>
          ثبت {dateFa(product.createdAt)} • آپدیت {dateFa(product.updatedAt)} ({timeAgoFa(product.updatedAt)})
        </span>
        <span className="text-muted-foreground/70">•</span>
        <span className="shrink-0 font-bold text-primary">
          {toFa(row.photoCount)} عکس
        </span>
        <span className="text-muted-foreground/70">•</span>
        <span className="shrink-0 text-muted-foreground">{toFa(Math.round(row.totalSize / 1024))}KB</span>
      </div>

      {/* همهٔ عکس‌های گالری این آگهی — ۳۰۰×۳۰۰، هیچ‌کدام از قلم نمی‌افتد */}
      <div className="flex flex-wrap gap-2.5">
        {row.photos.map((photo) => (
          <PhotoCell
            key={photo.id}
            photo={photo}
            replacing={uploadingId === photo.id}
            onPickFile={onPickFile}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════ صفحه ═══════════════════════════════

/** فیلترها و صفحه‌بندی در URL — نیاز به Suspense دارد (الگوی buy-requests) */
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetIdRef = useRef<string | null>(null);

  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── وضعیت — مقدار اولیه از URL (لینک مستقیم/اشتراک) ──
  // سورت‌های legacy فایلی (createdAt/updatedAt/newest/oldest) → productUpdated
  const initSort = () => {
    const v = sp.get('sort') ?? 'productUpdated';
    return SORT_VALUES.has(v) ? v : 'productUpdated';
  };
  const [search, setSearch] = useState(() => sp.get('q') ?? '');
  const [debounced, setDebounced] = useState(() => (sp.get('q') ?? '').trim());
  const [source, setSource] = useState<string>(() => sp.get('src') ?? 'all');
  const [replaced, setReplaced] = useState<string>(() => sp.get('rep') ?? ANY);
  const [sort, setSort] = useState<string>(initSort);
  const [dir, setDir] = useState<'asc' | 'desc'>(() => (sp.get('dir') === 'asc' ? 'asc' : 'desc'));
  const [dateField, setDateField] = useState<string>(() => (sp.get('fld') === 'created' ? 'created' : 'updated'));
  const [from, setFrom] = useState<string | null>(() => sp.get('from'));
  const [to, setTo] = useState<string | null>(() => sp.get('to'));
  const [page, setPage] = useState(() => Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1));
  const [jumpTo, setJumpTo] = useState('');

  // debounce جستجو → q
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── هر صفحه آدرس یکتا (خواستهٔ مالک ۱۵-۱۱): نوشتن وضعیت در URL ──
  useEffect(() => {
    const qs = new URLSearchParams();
    if (debounced) qs.set('q', debounced);
    if (source !== 'all') qs.set('src', source);
    if (replaced !== ANY) qs.set('rep', replaced);
    if (sort !== 'productUpdated') qs.set('sort', sort);
    if (dir !== 'desc') qs.set('dir', dir);
    if (dateField !== 'updated') qs.set('fld', dateField);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (page > 1) qs.set('page', String(page));
    router.replace(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, debounced, source, replaced, sort, dir, dateField, from, to, page]);

  // ── خواندن از URL — ویرایش دستی آدرس/دکمه‌های back-forward ──
  useEffect(() => {
    const nextQ = sp.get('q') ?? '';
    const nextP = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const nextSortRaw = sp.get('sort') ?? 'productUpdated';
    const nextSort = SORT_VALUES.has(nextSortRaw) ? nextSortRaw : 'productUpdated';
    const nextDir = sp.get('dir') === 'asc' ? 'asc' : 'desc';
    const nextSrc = sp.get('src') ?? 'all';
    const nextRep = sp.get('rep') ?? ANY;
    const nextFld = sp.get('fld') === 'created' ? 'created' : 'updated';
    const nextFrom = sp.get('from');
    const nextTo = sp.get('to');
    setPage((cur) => (cur !== nextP ? nextP : cur));
    setSort((cur) => (cur !== nextSort ? nextSort : cur));
    setDir((cur) => (cur !== nextDir ? nextDir : cur));
    setSource((cur) => (cur !== nextSrc ? nextSrc : cur));
    setReplaced((cur) => (cur !== nextRep ? nextRep : cur));
    setDateField((cur) => (cur !== nextFld ? nextFld : cur));
    setFrom((cur) => (cur !== nextFrom ? nextFrom : cur));
    setTo((cur) => (cur !== nextTo ? nextTo : cur));
    setDebounced((cur) => (cur !== nextQ.trim() ? nextQ.trim() : cur));
    setSearch((cur) => (cur !== nextQ ? nextQ : cur));
  }, [sp]);

  // ── پارامترهای API (گروهی — صفحه‌بندی بر آگهی) ──
  const params: ProductImagesParams = useMemo(
    () => ({
      ...(debounced ? { q: debounced } : {}),
      ...(source !== 'all' ? { source: source as ProductImagesParams['source'] } : {}),
      ...(replaced !== ANY ? { replaced: replaced as 'yes' | 'no' } : {}),
      sort: sort as ProductImagesParams['sort'],
      dir,
      ...(from || to
        ? dateField === 'updated'
          ? { updatedFrom: from ?? undefined, updatedTo: to ?? undefined }
          : { createdFrom: from ?? undefined, createdTo: to ?? undefined }
        : {}),
      page,
      pageSize: PAGE_SIZE,
    }),
    [debounced, source, replaced, sort, dir, dateField, from, to, page],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['product-images-grouped', params],
    queryFn: () => productImagesApi.listGrouped(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const pageCount = data?.pageCount ?? 1;

  // ── تعویض درجا ──
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const replaceMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => productImagesApi.replace(id, file),
    onMutate: ({ id }) => setUploadingId(id),
    onSuccess: () => {
      toast({
        title: 'تصویر جایگزین شد',
        description: 'همان نام و همان مسیر — تصویر اصلی و تامبنیل هر دو بازنویسی شدند.',
      });
      void queryClient.invalidateQueries({ queryKey: ['product-images-grouped'] });
    },
    onError: (err) => {
      toast({
        title: 'جایگزینی ناموفق بود',
        description: err instanceof Error ? err.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    },
    onSettled: () => setUploadingId(null),
  });

  const onPickFile = (id: string) => {
    targetIdRef.current = id;
    fileInputRef.current?.click();
  };

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = targetIdRef.current;
    // مقدار را ریست کنیم تا انتخاب همان فایل دوباره هم event بدهد
    e.target.value = '';
    if (!file || !id) return;
    if (!ACCEPTED.includes(file.type)) {
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
    replaceMutation.mutate({ id, file });
  };

  const resetFilters = () => {
    setSearch('');
    setDebounced('');
    setSource('all');
    setReplaced(ANY);
    setSort('productUpdated');
    setDir('desc');
    setDateField('updated');
    setFrom(null);
    setTo(null);
    setPage(1);
  };

  const jump = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(jumpTo, 10);
    if (!Number.isNaN(n) && n >= 1) setPage(Math.min(n, pageCount));
    setJumpTo('');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* ورودی فایل مخفی — تعویض درجا */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChosen}
        aria-label="انتخاب فایل تصویر اصلاح‌شده"
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
              {data ? `${toFa(data.total)} آگهی مطابق فیلترها — همهٔ عکس‌های هر آگهی یک‌جا` : 'یافتن واترمارک باسکول و تعویض درجا'}
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

      {/* راهنمای گردش‌کار */}
      <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-[11.5px] leading-6">
        <Info size={15} className="mt-0.5 shrink-0 text-primary" />
        <p>
          <b>گردش‌کار پاک‌کردن واترمارک باسکول:</b> هر کارت یک آگهی است با <b>همهٔ عکس‌هایش</b> — عکسی از قلم نمی‌افتد.
          روی هر عکس کلیک کنید و اصلی را ذخیره کنید → در Paint واترمارک باسکول را پاک کنید → «آپلود اصلاح‌شده» زیر همان
          عکس را بزنید. فایل جدید <b>در همان نام و همان مسیر</b> جایگزین می‌شود (URL عوض نمی‌شود) و <b>تامبنیل هم دقیقاً
          به همین شکل</b> از روی تصویر تازه بازساخته می‌شود. واترمارک آیمچِ داخل پیکسل‌ها حفظ می‌شود و دوباره روی آن نمی‌نشیند.
        </p>
      </div>

      {/* کارت‌های آماری */}
      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'کل تصاویر', value: summary.total, hint: 'گالری همهٔ آگهی‌ها' },
            { label: 'از باسکول', value: summary.buskool, hint: 'کاندیدای بررسی واترمارک', accent: true },
            { label: 'اصلاح‌شده', value: summary.replaced, hint: 'تعویض‌شده توسط ادمین', ok: true },
            { label: 'باقی‌ماندهٔ کار', value: summary.buskoolRemaining, hint: 'باسکولی‌های هنوز بررسی/اصلاح‌نشده' },
          ].map((c) => (
            <div
              key={c.label}
              className={cn(
                'rounded-lg border bg-card p-2.5',
                c.accent && 'border-primary/30 bg-primary/5',
                c.ok && 'border-emerald-300/60 bg-emerald-50/40',
              )}
              title={c.hint}
            >
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
              <p
                className={cn(
                  'mt-0.5 text-base font-extrabold tabular-nums',
                  c.accent && 'text-primary',
                  c.ok && 'text-emerald-600',
                )}
              >
                {toFa(c.value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* فیلترها */}
      <div className="space-y-2.5 rounded-lg border bg-card p-3">
        <div className="relative">
          <Search size={15} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: نام آگهی، شناسهٔ آگهی، نام/شماره/یوزرنیم فروشنده…"
            className="h-9 rounded-md pe-9"
            maxLength={60}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[125px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همهٔ منابع</SelectItem>
              <SelectItem value="buskool">از باسکول</SelectItem>
              <SelectItem value="native">خودی</SelectItem>
            </SelectContent>
          </Select>

          <Select value={replaced} onValueChange={(v) => { setReplaced(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[165px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>وضعیت اصلاح: همه</SelectItem>
              <SelectItem value="no">عکس اصلاح‌نشده دارد</SelectItem>
              <SelectItem value="yes">عکس اصلاح‌شده دارد</SelectItem>
            </SelectContent>
          </Select>

          <span className="mx-1 h-5 w-px bg-border" aria-hidden />

          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[185px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-[10px] px-2.5 text-[11px]"
            onClick={() => { setDir(dir === 'desc' ? 'asc' : 'desc'); setPage(1); }}
            title={dir === 'desc' ? 'نزولی (جدید→قدیم) — کلیک: صعودی' : 'صعودی (قدیم→جدید) — کلیک: نزولی'}
          >
            {dir === 'desc' ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            {dir === 'desc' ? 'نزولی' : 'صعودی'}
          </Button>

          <Button size="sm" variant="ghost" className="h-8 rounded-[10px] px-2.5 text-[11px] text-muted-foreground" onClick={resetFilters}>
            پاک‌کردن فیلترها
          </Button>
        </div>
      </div>

      {/* فیلتر بازهٔ زمانی + دکمه‌های سریع + ماه‌های شمسی */}
      <DateRangeFilter
        fields={DATE_FIELDS}
        field={dateField}
        onFieldChange={(v) => { setDateField(v); setPage(1); }}
        from={from}
        to={to}
        onChange={(r) => { setFrom(r.from); setTo(r.to); setPage(1); }}
        months={6}
      />

      {/* آلبوم گروهی — هر آگهی یک کارت با همهٔ عکس‌هایش (۳۰۰×۳۰۰) */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border bg-card py-16 text-center">
          <Images size={30} className="text-muted-foreground/40" />
          <p className="mt-2 text-sm font-bold">آگهی‌ای مطابق فیلترها پیدا نشد</p>
          <p className="mt-1 text-[11px] text-muted-foreground">فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <ProductCard
              key={row.product.id}
              row={row}
              uploadingId={uploadingId}
              onPickFile={onPickFile}
            />
          ))}
        </div>
      )}

      {/* صفحه‌بندی — بر آگهی؛ هر صفحه آدرس یکتا (?page=…) */}
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant="outline" className="h-8 rounded-md" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronRight size={14} /> قبلی
          </Button>
          <span className="text-[11.5px] text-muted-foreground">
            صفحهٔ {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button size="sm" variant="outline" className="h-8 rounded-md" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
            بعدی <ChevronLeft size={14} />
          </Button>
          <form onSubmit={jump} className="flex items-center gap-1">
            <Input
              value={jumpTo}
              onChange={(e) => setJumpTo(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="شمارهٔ صفحه"
              className="h-8 w-24 rounded-md text-[11.5px]"
              aria-label="پرش به شمارهٔ صفحه"
            />
            <Button size="sm" variant="outline" className="h-8 rounded-md text-[11px]" type="submit">
              برو
            </Button>
          </form>
        </div>
      )}

      {/* لینک بازگشت به آگهی‌ها */}
      <p className="flex items-center justify-center gap-1.5 text-center text-[10.5px] text-muted-foreground">
        <PackageOpen size={12} className="shrink-0" />
        برای دیدن وضعیت خودِ آگهی‌ها (منبع، ورود فروشنده، ویرایش) به صفحهٔ{' '}
        <Link href="/data-import/products" className="font-bold text-primary hover:underline">
          آگهی‌ها
        </Link>{' '}
        بروید.
      </p>
    </div>
  );
}
