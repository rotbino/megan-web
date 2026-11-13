'use client';

/**
 * تصاویر آگهی‌ها — صفحهٔ «دیتا ایمپورت → تصاویر آگهی‌ها» (خواستهٔ مالک ۱۳-۱۱).
 * آلبوم اسکن‌پذیر (کارت‌های ~۲۰۰×۲۰۰، ۲۰تایی در هر صفحه) برای یافتن تصاویرِ
 * واترمارک‌دار باسکول + «تعویض درجا»:
 *
 *   گردش‌کار مالک: تصویر را باز می‌کند و ذخیره می‌کند → در Paint واترمارک باسکول
 *   را پاک می‌کند → دکمهٔ «آپلود نسخهٔ اصلاح‌شده» → فایل جدید روی «همان کلید»
 *   (همان نام/مسیر/URL) نوشته می‌شود و تامبنیل هم از روی تصویر تازه در همان
 *   کلید تامبنیل بازساخته می‌شود. نمایش این صفحه با ?v=<آخرین تعویض> کش خودش
 *   را می‌شکند تا نتیجه فوراً دیده شود.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
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
  type ProductImageRow,
  type ProductImagesParams,
} from '@/lib/importer/client';
import { dateFa, timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const ANY = '__any__';
const MAX_FILE_MB = 5;
const MIN_FILE_KB = 4;
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function imgSrc(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

/** cache-buster نمایش — بعد از هر تعویض درجا، URL یکسان کش مرورگر را می‌شکند */
function vSrc(url: string, updatedAt: string): string {
  const v = new Date(updatedAt).getTime();
  if (Number.isNaN(v)) return imgSrc(url);
  return `${imgSrc(url)}${url.includes('?') ? '&' : '?'}v=${v}`;
}

// ═══════════════════════════════ کارت تصویر ═══════════════════════════════

function ImageCard({
  row,
  replacing,
  onPickFile,
}: {
  row: ProductImageRow;
  replacing: boolean;
  onPickFile: (id: string) => void;
}) {
  const display = vSrc(row.thumbUrl ?? row.url, row.updatedAt);
  const main = vSrc(row.url, row.updatedAt);
  const productHref = row.product
    ? `/product-view/${row.product.slug}/-/${row.product.id}`
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/40">
      {/* تصویر — کلیک = بازکردن اصل برای ذخیره/ویرایش */}
      <div className="relative aspect-square bg-white">
        <a
          href={main}
          target="_blank"
          rel="noreferrer"
          title="بازکردن تصویر اصلی (ذخیره کنید، در پینت واترمارک باسکول را پاک کنید و با دکمهٔ پایین آپلود کنید)"
          className="block h-full w-full"
        >
          <img
            src={display}
            alt={row.product?.name ?? row.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </a>

        {/* نشان منبع */}
        {row.source === 'buskool' ? (
          <Badge className="absolute start-1.5 top-1.5 bg-primary-soft px-1.5 py-0 text-[9px] font-bold text-primary hover:bg-primary-soft">
            باسکول
          </Badge>
        ) : (
          <Badge variant="outline" className="absolute start-1.5 top-1.5 px-1.5 py-0 text-[9px] font-bold text-muted-foreground">
            خودی
          </Badge>
        )}

        {/* نشان تعویض */}
        {row.replacedAt ? (
          <span
            className="absolute end-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white"
            title={`تعویض‌شده: ${dateFa(row.replacedAt)} (${timeAgoFa(row.replacedAt)})`}
          >
            <BadgeCheck size={9} /> اصلاح‌شده
          </span>
        ) : null}

        {/* لایهٔ آپلود */}
        {replacing ? (
          <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-1.5 text-primary">
              <Loader2 size={22} className="animate-spin" />
              <p className="text-[10px] font-bold">در حال جایگزینی…</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* اطلاعات و عملیات */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 border-t p-2">
        <div className="min-w-0">
          {productHref ? (
            <a
              href={productHref}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-[11.5px] font-bold hover:text-primary hover:underline"
              title={row.product?.name}
            >
              {row.product?.name}
            </a>
          ) : (
            <p className="truncate text-[11.5px] font-bold text-muted-foreground" title="آگهِ این عکس حذف شده است">
              آگهی حذف‌شده
            </p>
          )}
          <p className="truncate text-[10px] text-muted-foreground" dir="ltr">
            #{toFa(row.product?.id ?? 0)} • {row.owner ? `${row.owner.name || `@${row.owner.userName}`}` : '—'}
          </p>
          <p className="truncate text-[9.5px] text-muted-foreground/80">
            {row.width && row.height ? `${toFa(row.width)}×${toFa(row.height)}` : ''} • {toFa(Math.round(row.size / 1024))}KB
            {row.replacedAt ? ` • ${timeAgoFa(row.replacedAt)}` : ''}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-7 flex-1 gap-1 rounded-md px-2 text-[10.5px] font-bold"
            disabled={replacing}
            onClick={() => onPickFile(row.id)}
            title="فایل اصلاح‌شده (بدون واترمارک باسکول) را انتخاب کنید — همان نام و مسیر جایگزین می‌شود"
          >
            {replacing ? <Loader2 size={11} className="animate-spin" /> : <Replace size={11} />}
            آپلود نسخهٔ اصلاح‌شده
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
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════ صفحه ═══════════════════════════════

/** لینک عمقی ?q= (از جدول آگهی‌ها) نیاز به Suspense دارد (الگوی buy-requests) */
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

  // لینک از صفحهٔ آگهی‌ها: ?q=<شناسهٔ آگهی>
  const initialQ = useSearchParams().get('q') ?? '';

  // ── فیلترها ──
  const [search, setSearch] = useState(initialQ);
  const [debounced, setDebounced] = useState(initialQ.trim());
  const [source, setSource] = useState<string>('all');
  const [replaced, setReplaced] = useState<string>(ANY);
  const [sort, setSort] = useState<string>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 20; // ۲۰تایی — اسکن سریع چشم (خواستهٔ مالک)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const params: ProductImagesParams = useMemo(
    () => ({
      ...(debounced ? { q: debounced } : {}),
      ...(source !== 'all' ? { source: source as ProductImagesParams['source'] } : {}),
      ...(replaced !== ANY ? { replaced: replaced as 'yes' | 'no' } : {}),
      sort: sort as ProductImagesParams['sort'],
      page,
      pageSize,
    }),
    [debounced, source, replaced, sort, page],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['product-images', params],
    queryFn: () => productImagesApi.list(params),
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
      void queryClient.invalidateQueries({ queryKey: ['product-images'] });
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
    setSource('all');
    setReplaced(ANY);
    setSort('newest');
    setPage(1);
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
              {data ? `${toFa(data.total)} تصویر مطابق فیلترها` : 'یافتن واترمارک باسکول و تعویض درجا'}
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
          <b>گردش‌کار پاک‌کردن واترمارک باسکول:</b> روی تصویر کلیک کنید و اصلی را ذخیره کنید → در Paint واترمارک باسکول را
          پاک کنید → «آپلود نسخهٔ اصلاح‌شده» را بزنید. فایل جدید <b>در همان نام و همان مسیر</b> جایگزین می‌شود (URL عوض
          نمی‌شود) و <b>تامبنیل هم دقیقاً به همین شکل</b> از روی تصویر تازه بازساخته می‌شود. واترمارک آیمچِ داخل پیکسل‌ها
          حفظ می‌شود و دوباره روی آن نمی‌نشیند.
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
            <SelectTrigger className="h-8 w-[140px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>وضعیت اصلاح: همه</SelectItem>
              <SelectItem value="no">هنوز اصلاح نشده</SelectItem>
              <SelectItem value="yes">اصلاح‌شده</SelectItem>
            </SelectContent>
          </Select>

          <span className="mx-1 h-5 w-px bg-border" aria-hidden />

          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[130px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">جدیدترین اول</SelectItem>
              <SelectItem value="oldest">قدیمی‌ترین اول</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" variant="ghost" className="h-8 rounded-[10px] px-2.5 text-[11px] text-muted-foreground" onClick={resetFilters}>
            پاک‌کردن فیلترها
          </Button>
        </div>
      </div>

      {/* آلبوم */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border bg-card py-16 text-center">
          <Images size={30} className="text-muted-foreground/40" />
          <p className="mt-2 text-sm font-bold">تصویری مطابق فیلترها پیدا نشد</p>
          <p className="mt-1 text-[11px] text-muted-foreground">فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {rows.map((row) => (
            <ImageCard
              key={row.id}
              row={row}
              replacing={uploadingId === row.id}
              onPickFile={onPickFile}
            />
          ))}
        </div>
      )}

      {/* صفحه‌بندی — ۲۰تایی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" className="h-8 rounded-md" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronRight size={14} /> قبلی
          </Button>
          <span className="text-[11.5px] text-muted-foreground">
            صفحهٔ {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button size="sm" variant="outline" className="h-8 rounded-md" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
            بعدی <ChevronLeft size={14} />
          </Button>
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
