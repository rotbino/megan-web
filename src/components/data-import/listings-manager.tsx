'use client';

/**
 * مدیریت آگهی‌ها — صفحهٔ «دیتا ایمپورت → آگهی‌ها» (خواستهٔ مالک ۱۳-۱۱).
 * محیط تسلط بر مخلوط آگهی‌های ایمپورت‌شده از باسکول و آگهی‌های طبیعی:
 *
 *   • فیلترها: منبع (باسکول/خودی)، ورود فروشنده (وارد شده/هرگز)، ویرایش‌شده
 *     توسط خود فروشنده، وضعیت، بدون عکس + جستجو و سورت روی همهٔ مهرهای زمانی.
 *   • هر ردیف: کاور، نام + لینک صفحهٔ عمومی، فروشنده (+ لاگین)، چیپ ویرایش،
 *     قیمت/موجودی + هشدار کهنگی قیمت (همان منطق صفحهٔ آگهی)، تاریخ‌های دقیق
 *     باسکول (ثبت/آپدیت/آپدیت قیمت)، تعداد عکس + پرش به آلبوم تصاویر همان آگهی.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  Images,
  Loader2,
  PencilLine,
  RefreshCcw,
  Search,
  Store,
  UserCheck,
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
import {
  API_BASE,
  importedListingsApi,
  type ImportedListingRow,
  type ImportedListingsParams,
} from '@/lib/importer/client';
import { dateFa, priceFa, stalePriceFa, timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const ANY = '__any__';

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'تاییدشده',
  pending: 'در انتظار تایید',
  rejected: 'رد شده',
  deleted: 'حذف',
};

function imgSrc(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

/** چیپ منبع آگهی — فروشنده‌اش از باسکول آمده یا خودش ثبت‌نام کرده */
function SourceChip({ row }: { row: ImportedListingRow }) {
  if (row.source === 'buskool') {
    return (
      <Badge className="bg-primary-soft font-bold text-primary hover:bg-primary-soft" title={`فروشنده @${row.owner.bUserName} در باسکول`}>
        از باسکول
      </Badge>
    );
  }
  return <Badge variant="outline" className="font-bold text-muted-foreground">ثبت خودی</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const tone =
    status === 'confirmed'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-700'
        : status === 'rejected'
          ? 'bg-red-100 text-red-600'
          : 'bg-secondary text-muted-foreground';
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-bold', tone)}>{label}</span>;
}

// ═══════════════════════════════ صفحه ═══════════════════════════════

export function ListingsManager() {
  // ── فیلترها ──
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [source, setSource] = useState<string>('all');
  const [ownerLogin, setOwnerLogin] = useState<string>(ANY);
  const [edited, setEdited] = useState<string>(ANY);
  const [status, setStatus] = useState<string>('all');
  const [hasPhotos, setHasPhotos] = useState<string>(ANY);
  const [sort, setSort] = useState<string>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const params: ImportedListingsParams = useMemo(
    () => ({
      ...(debounced ? { q: debounced } : {}),
      ...(source !== 'all' ? { source: source as ImportedListingsParams['source'] } : {}),
      ...(ownerLogin !== ANY ? { ownerLogin: ownerLogin as 'ever' | 'never' } : {}),
      ...(edited !== ANY ? { edited: edited as 'yes' | 'no' } : {}),
      ...(status !== 'all' ? { status: status as ImportedListingsParams['status'] } : {}),
      ...(hasPhotos !== ANY ? { hasPhotos: hasPhotos as 'yes' | 'no' } : {}),
      sort: sort as ImportedListingsParams['sort'],
      dir,
      page,
      pageSize,
    }),
    [debounced, source, ownerLogin, edited, status, hasPhotos, sort, dir, page],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['imported-listings', params],
    queryFn: () => importedListingsApi.list(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const pageCount = data?.pageCount ?? 1;

  const resetFilters = () => {
    setSearch('');
    setSource('all');
    setOwnerLogin(ANY);
    setEdited(ANY);
    setStatus('all');
    setHasPhotos(ANY);
    setSort('createdAt');
    setDir('desc');
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Boxes size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">آگهی‌ها</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} آگهی مطابق فیلترها` : 'تسلط بر آگهی‌های ایمپورت‌شده و طبیعی'}
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

      {/* کارت‌های آماری */}
      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'کل آگهی‌ها', value: summary.total, hint: 'همهٔ آگهی‌ها' },
            { label: 'از باسکول', value: summary.buskool, hint: 'ایمپورت‌شده' },
            { label: 'ثبت خودی', value: summary.native, hint: 'فروشنده خودش ثبت کرده' },
            { label: 'فروشنده وارد شده', value: summary.ownerLoggedIn, hint: 'دعوت‌ها جواب داده', accent: true },
            { label: 'ویرایش توسط فروشنده', value: summary.editedByUser, hint: 'خودش دستی تغییرش داده' },
            { label: 'بدون عکس', value: summary.withoutPhotos, hint: summary.pending ? `+ ${toFa(summary.pending)} در انتظار تایید` : 'کاندیدای عکس‌گذاری' },
          ].map((c) => (
            <div
              key={c.label}
              className={cn(
                'rounded-lg border bg-card p-2.5',
                c.accent && 'border-emerald-300/60 bg-emerald-50/40',
              )}
              title={c.hint}
            >
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
              <p className={cn('mt-0.5 text-base font-extrabold tabular-nums', c.accent && 'text-emerald-600')}>
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
            placeholder="جستجو: نام آگهی، شناسه، نام/شماره/یوزرنیم فروشنده…"
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
              <SelectItem value="native">ثبت خودی</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ownerLogin} onValueChange={(v) => { setOwnerLogin(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[140px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>فروشنده: همه</SelectItem>
              <SelectItem value="ever">فروشنده وارد شده</SelectItem>
              <SelectItem value="never">فروشنده هرگز وارد نشده</SelectItem>
            </SelectContent>
          </Select>

          <Select value={edited} onValueChange={(v) => { setEdited(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[145px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>ویرایش فروشنده: همه</SelectItem>
              <SelectItem value="yes">ویرایش‌شده توسط خودش</SelectItem>
              <SelectItem value="no">دست‌نخورده</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[130px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">وضعیت: همه</SelectItem>
              <SelectItem value="confirmed">تاییدشده</SelectItem>
              <SelectItem value="pending">در انتظار تایید</SelectItem>
              <SelectItem value="rejected">رد شده</SelectItem>
              <SelectItem value="deleted">حذف</SelectItem>
            </SelectContent>
          </Select>

          <Select value={hasPhotos} onValueChange={(v) => { setHasPhotos(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[115px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>عکس: همه</SelectItem>
              <SelectItem value="yes">دارای عکس</SelectItem>
              <SelectItem value="no">بدون عکس</SelectItem>
            </SelectContent>
          </Select>

          <span className="mx-1 h-5 w-px bg-border" aria-hidden />

          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[150px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">مرتب: تاریخ ثبت</SelectItem>
              <SelectItem value="updatedAt">مرتب: آخرین آپدیت</SelectItem>
              <SelectItem value="priceUpdatedAt">مرتب: آپدیت قیمت</SelectItem>
              <SelectItem value="views">مرتب: بازدید</SelectItem>
              <SelectItem value="name">مرتب: نام</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-[10px] px-2.5 text-[11px]"
            onClick={() => setDir(dir === 'desc' ? 'asc' : 'desc')}
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

      {/* جدول */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border bg-card py-16 text-center">
          <Boxes size={30} className="text-muted-foreground/40" />
          <p className="mt-2 text-sm font-bold">آگهی‌ای مطابق فیلترها پیدا نشد</p>
          <p className="mt-1 text-[11px] text-muted-foreground">فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                <th className="w-14 p-2 font-bold">کاور</th>
                <th className="p-2 text-start font-bold">آگهی</th>
                <th className="hidden p-2 text-start font-bold md:table-cell">منبع</th>
                <th className="p-2 text-start font-bold">فروشنده</th>
                <th className="hidden p-2 text-start font-bold lg:table-cell">ویرایش</th>
                <th className="hidden p-2 text-start font-bold sm:table-cell">قیمت / موجودی</th>
                <th className="hidden p-2 text-start font-bold xl:table-cell">تاریخ‌ها (باسکول)</th>
                <th className="p-2 text-start font-bold">عکس‌ها</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const stale = stalePriceFa(row.priceUpdatedAt ?? row.updatedAt);
                return (
                  <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-secondary/30">
                    <td className="p-2 align-middle">
                      {row.photoThumb ? (
                        <img
                          src={imgSrc(row.photoThumb)}
                          alt=""
                          className="size-11 rounded-md border object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid size-11 place-items-center rounded-md border bg-secondary/50 text-muted-foreground/50">
                          <ImageOff size={15} />
                        </span>
                      )}
                    </td>
                    <td className="min-w-44 p-2">
                      <p className="flex items-center gap-1.5 font-bold">
                        <span className="truncate">{row.productName}</span>
                        <StatusBadge status={row.status} />
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                        {toFa(row.id)} • {row.subCategoryName ?? row.categoryName ?? '—'} • {row.cityName ?? row.provinceName ?? '—'}
                      </p>
                      <a
                        href={`/product-view/${row.slug}/${row.categoryName ?? '-'}/${row.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-primary hover:underline"
                      >
                        <ExternalLink size={10} /> صفحهٔ عمومی
                      </a>
                    </td>
                    <td className="hidden p-2 align-middle md:table-cell"><SourceChip row={row} /></td>
                    <td className="min-w-40 p-2">
                      <p className="truncate font-bold">
                        {`${row.owner.firstName} ${row.owner.lastName}`.trim() || `@${row.owner.userName}`}
                      </p>
                      <p className="truncate text-[10.5px] text-muted-foreground" dir="ltr">
                        @{row.owner.userName} • {row.owner.phone}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10.5px]">
                        {row.owner.lastLoginAt ? (
                          <span className="font-bold text-emerald-600" title={dateFa(row.owner.lastLoginAt)}>
                            <UserCheck size={11} className="inline" /> وارد شده ({timeAgoFa(row.owner.lastLoginAt)})
                          </span>
                        ) : (
                          <span className="text-muted-foreground">هرگز وارد نشده</span>
                        )}
                      </p>
                    </td>
                    <td className="hidden p-2 align-middle lg:table-cell">
                      {row.edited ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600"
                          title={row.lastEditedAt ? `آخرین ویرایش: ${dateFa(row.lastEditedAt)}` : undefined}
                        >
                          <PencilLine size={10} />
                          ویرایش‌شده{row.lastEditedAt ? ` (${timeAgoFa(row.lastEditedAt)})` : ''}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden p-2 align-middle sm:table-cell">
                      <p className="font-bold tabular-nums">
                        {row.minSalePrice > 0 ? `${priceFa(row.minSalePrice)} / ${row.unit}` : 'تماس بگیرید'}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground tabular-nums">
                        موجودی: {toFa(row.stock)} {row.unit}
                      </p>
                      {stale ? <p className="text-[10px] font-bold text-red-600">{stale}</p> : null}
                    </td>
                    <td className="hidden p-2 align-middle text-[10.5px] leading-5 text-muted-foreground tabular-nums xl:table-cell">
                      <p>ثبت: {dateFa(row.createdAt)}</p>
                      <p>آپدیت: {dateFa(row.updatedAt)}</p>
                      <p className={cn(row.priceUpdatedAt && stale && 'font-bold text-red-600')}>
                        قیمت: {row.priceUpdatedAt ? dateFa(row.priceUpdatedAt) : '—'}
                      </p>
                    </td>
                    <td className="p-2 align-middle">
                      <Link
                        href={`/data-import/product-images?q=${row.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-bold text-foreground transition-colors hover:bg-secondary/70"
                        title="دیدن تصاویر این آگهی در آلبوم"
                      >
                        <Images size={11} />
                        {toFa(row.photoCount)} عکس
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* صفحه‌بندی */}
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

      {/* راهنمای پایین */}
      <p className="flex items-center justify-center gap-1.5 text-center text-[10.5px] leading-5 text-muted-foreground">
        <Store size={12} className="shrink-0" />
        «ویرایش‌شده» یعنی فروشنده خودش بعد از ایمپورت از پنلش آگهی را تغییر داده است؛ مهرهای زمانیِ آگهی‌های باسکولی عین باسکول حفظ می‌شوند.
      </p>
    </div>
  );
}
