'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownWideNarrow,
  BellRing,
  Bookmark,
  CalendarCheck,
  Filter,
  Flag,
  FolderPlus,
  LayoutGrid,
  Loader2,
  MapPin,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PanelEmptyState } from '@/components/panel/panel-parts';
import { FilterChip, FilterOption } from '@/components/panel/follow/filter-chip';
import { FollowActionSheet } from '@/components/panel/follow/follow-action-sheet';
import { FollowDetailModal } from '@/components/panel/follow/follow-detail-modal';
import { FollowItemRow, type FollowActionMode } from '@/components/panel/follow/follow-item-row';
import {
  useAllFollowItems,
  useCreateFollowFolder,
  useDeleteFollowFolder,
  useFollowFolders,
  useRenameFollowFolder,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import {
  FOLLOW_PRIORITIES,
  FOLLOW_PRIORITY_MAP,
  FOLLOW_STATUSES,
  FOLLOW_TARGET_LABEL,
  followPriorityOf,
  isFollowDueToday,
} from '@/lib/follow';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyRequest, FollowFolder, FollowItem, FollowPriority, FollowStatus, Product } from '@/lib/types';

/** مرتب‌سازی لیست — «اولویت‌دار» پیش‌فرض است (خواسته مالک ۷-۱۱:
 *  اولویت‌های بالا در لیست بالاتر)؛ بعدِ آن سررسیده‌ها و بعد جدیدترین */
const SORTS = [
  { key: 'priority', label: 'اولویت‌دار' },
  { key: 'newest', label: 'جدیدترین' },
  { key: 'oldest', label: 'قدیمی‌ترین' },
  { key: 'hot', label: 'نزدیک‌ترین به معامله' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];

/** ترتیب داغی — مذاکره داغ‌ترین، بعد تماس‌گرفته، بعد در بررسی؛ نهایی/منصرف آخر */
const HOT_ORDER: Record<FollowStatus, number> = {
  negotiating: 0,
  contacted: 1,
  reviewing: 2,
  closed: 3,
  dropped: 4,
};

/** شهر مورد — آگهی و درخواست نام‌های متفاوت دارند */
function cityOf(item: FollowItem): string {
  return item.targetType === 'buy_request'
    ? (item.target as BuyRequest).city
    : (item.target as Product).cityName.trim();
}

/** ابعاد فیلتر — هر بعد شمار خودش را بدون خودش می‌بیند */
type FilterDim = 'folder' | 'status' | 'city' | 'type' | 'priority' | 'due';
const FILTER_DIMS: readonly FilterDim[] = ['folder', 'status', 'city', 'type', 'priority', 'due'];

/** متن جستجو — نام کاربر / دستهٔ کالا / عنوان کالا (خواسته مالک ۶-۱۱) */
function haystack(item: FollowItem): string {
  if (item.targetType === 'buy_request') {
    const r = item.target as BuyRequest;
    return `${r.firstName} ${r.lastName} ${r.subcategoryName} ${r.name ?? ''}`.toLowerCase();
  }
  const p = item.target as Product;
  return `${p.productName} ${p.subCategoryName} ${p.categoryName} ${p.seller.firstName} ${p.seller.lastName}`.toLowerCase();
}

export default function FollowPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-lg border bg-card" />}>
      <FollowPageInner />
    </Suspense>
  );
}

/**
 * پیگیری‌ها — تک‌صفحهٔ CRM ایمچ (خواسته مالک ۶-۱۱).
 * جستجو + نوار فیلتر دیوار-سبک (پرونده / وضعیت / شهر / نوع / مرتب‌سازی) +
 * ردیف‌های فشرده با تماس و چت جلوی دست؛ جزئیات و یادداشت‌ها در مدال.
 */
function FollowPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderParam = searchParams.get('folder');

  const { data: folders, isLoading: foldersLoading } = useFollowFolders();
  const { data: allItems, isLoading: itemsLoading } = useAllFollowItems();
  const { toast } = useToast();

  // ─── فیلترها و جستجو ───────────────────────────────────────────────────────
  const [q, setQ] = useState('');
  const [folderId, setFolderId] = useState<string | null>(folderParam);
  const [status, setStatus] = useState<FollowStatus | 'all'>('all');
  const [city, setCity] = useState<string>('all');
  const [type, setType] = useState<'all' | 'product' | 'buy_request'>('all');
  // اولویت (خواسته مالک ۷-۱۱) و فیلتر «پیگیری‌های امروز» — یادآورهای سررسیده
  const [priority, setPriority] = useState<FollowPriority | 'all'>('all');
  const [dueToday, setDueToday] = useState(false);
  const [sort, setSort] = useState<SortKey>('priority');

  // ─── مدال جزئیات و شیت عملیات ──────────────────────────────────────────────
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [sheetFor, setSheetFor] = useState<{ id: string; mode: FollowActionMode } | null>(null);

  // ─── مدیریت پرونده‌ها (داخل شیت فیلتر پرونده) ───────────────────────────────
  const [renaming, setRenaming] = useState<FollowFolder | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deleting, setDeleting] = useState<FollowFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const createFolder = useCreateFollowFolder();
  const renameFolder = useRenameFollowFolder();
  const deleteFolder = useDeleteFollowFolder();

  const items = useMemo(() => allItems ?? [], [allItems]);

  /** پروندهٔ URL فقط وقتی معتبر است که واقعاً وجود داشته باشد (بوکمارک قدیمی) */
  const validFolderId = useMemo(
    () => (folders ? (folders.some((f) => f.id === folderId) ? folderId : null) : folderId),
    [folders, folderId],
  );
  const selectedFolder = folders?.find((f) => f.id === validFolderId) ?? null;

  const fail = (err: unknown) =>
    toast({
      description: err instanceof Error ? err.message : 'خطای غیرمنتظره — دوباره تلاش کنید.',
      variant: 'destructive',
    });

  // ─── زنجیرهٔ فیلتر — هر بعد روی نتیجهٔ جستجو؛ شمارِ هر گزینه بدون خودش ───────
  const searched = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => haystack(i).includes(needle));
  }, [items, q]);

  /** تطبیق یک مورد با یک بُعد فیلتر — بُعدِ مورد نظر خودش را از شمار مستثنی می‌کند */
  const matchDim = (i: FollowItem, dim: FilterDim): boolean => {
    switch (dim) {
      case 'folder':
        return !validFolderId || i.folderId === validFolderId;
      case 'status':
        return status === 'all' || i.status === status;
      case 'city':
        return city === 'all' || cityOf(i) === city;
      case 'type':
        return type === 'all' || i.targetType === type;
      case 'priority':
        return priority === 'all' || followPriorityOf(i) === priority;
      case 'due':
        return !dueToday || isFollowDueToday(i.nextFollowAt);
    }
  };

  /** پایهٔ شمار هر بُعد — همهٔ ابعاد جز خودش اعمال شده (الگوی دیوار) */
  const dimBase = useMemo(() => {
    const bases = {} as Record<FilterDim, FollowItem[]>;
    for (const dim of FILTER_DIMS) {
      bases[dim] = searched.filter((i) =>
        FILTER_DIMS.filter((d) => d !== dim).every((d) => matchDim(i, d)),
      );
    }
    return bases;
    // matchDim به stateهای فیلتر وابسته است — همه در deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, validFolderId, status, city, type, priority, dueToday]);

  const statusBase = dimBase.status;
  const cityBase = dimBase.city;

  /** گزینه‌های شهر — فقط شهرهای حاضر در موارد ذخیره‌شده (خواسته مالک ۶-۱۱) */
  const cityOptions = useMemo(() => {
    const m = new Map<string, number>();
    cityBase.forEach((i) => {
      const c = cityOf(i);
      if (c) m.set(c, (m.get(c) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fa'));
  }, [cityBase]);

  const typeCounts = useMemo(
    () =>
      ({
        all: dimBase.type.length,
        product: dimBase.type.filter((i) => i.targetType === 'product').length,
        buy_request: dimBase.type.filter((i) => i.targetType === 'buy_request').length,
      }) as Record<'all' | 'product' | 'buy_request', number>,
    [dimBase.type],
  );

  /** شمار فیلتر اولویت — بالا / متوسط / کم (خواسته مالک ۷-۱۱) */
  const priorityCounts = useMemo(
    () =>
      ({
        all: dimBase.priority.length,
        1: dimBase.priority.filter((i) => followPriorityOf(i) === 1).length,
        2: dimBase.priority.filter((i) => followPriorityOf(i) === 2).length,
        3: dimBase.priority.filter((i) => followPriorityOf(i) === 3).length,
      }) as Record<'all' | FollowPriority, number>,
    [dimBase.priority],
  );

  /** شمار «پیگیری‌های امروز» — یادآورهای سررسیده (خواسته مالک ۷-۱۱:
   *  «به کاربر یادآوری می‌کند که امروز باید چه کاری انجام دهد») */
  const dueTodayCount = useMemo(
    () => dimBase.due.filter((i) => isFollowDueToday(i.nextFollowAt)).length,
    [dimBase.due],
  );

  /** لیست نهایی — همهٔ ابعاد اعمال می‌شوند + مرتب‌سازی */
  const visible = useMemo(() => {
    const list = searched.filter((i) => FILTER_DIMS.every((d) => matchDim(i, d)));
    const prio = (i: FollowItem) => followPriorityOf(i);
    const dueRank = (i: FollowItem) => (isFollowDueToday(i.nextFollowAt) ? 0 : 1);
    return [...list].sort((a, b) => {
      if (sort === 'hot') {
        const d = HOT_ORDER[a.status] - HOT_ORDER[b.status];
        if (d !== 0) return d;
      }
      if (sort === 'priority') {
        // اولویت بالا (۱) بالاتر؛ هم‌اولویت‌ها: سررسیدهٔ امروز اول، بعد جدیدترین
        const d = prio(a) - prio(b);
        if (d !== 0) return d;
        const e = dueRank(a) - dueRank(b);
        if (e !== 0) return e;
      }
      return sort === 'oldest'
        ? a.updatedAt.localeCompare(b.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, validFolderId, status, city, type, priority, dueToday, sort]);

  const statusCounts = useMemo(() => {
    const c: Partial<Record<FollowStatus, number>> = {};
    statusBase.forEach((i) => {
      c[i.status] = (c[i.status] ?? 0) + 1;
    });
    return c;
  }, [statusBase]);

  const loading = foldersLoading || itemsLoading;

  // انتخاب پرونده — URL همگام می‌ماند تا بوکمارک/اشتراک فیلتر ممکن باشد
  const pickFolder = (id: string | null) => {
    setFolderId(id);
    router.replace(id ? `/panel/saved?folder=${id}` : '/panel/saved', { scroll: false });
  };

  const clearAllFilters = () => {
    setQ('');
    pickFolder(null);
    setStatus('all');
    setCity('all');
    setType('all');
    setPriority('all');
    setDueToday(false);
  };

  const submitRename = () => {
    if (!renaming) return;
    const name = renameText.trim();
    if (!name || renameFolder.isPending) return;
    renameFolder.mutate(
      { folderId: renaming.id, name },
      {
        onSuccess: () => {
          toast({ description: 'نام پرونده تغییر کرد.' });
          setRenaming(null);
        },
        onError: fail,
      },
    );
  };

  const submitDelete = () => {
    if (!deleting || deleteFolder.isPending) return;
    deleteFolder.mutate(deleting.id, {
      onSuccess: () => {
        toast({ description: `پروندهٔ «${deleting.name}» حذف شد.` });
        if (folderId === deleting.id) pickFolder(null);
        setDeleting(null);
      },
      onError: fail,
    });
  };

  const submitCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name || createFolder.isPending) return;
    createFolder.mutate(
      { name },
      {
        onSuccess: (f) => {
          setNewFolderName('');
          toast({ description: `پروندهٔ «${f.name}» ساخته شد.` });
        },
        onError: fail,
      },
    );
  };

  const detailItem = detailFor ? (items.find((i) => i.id === detailFor) ?? null) : null;
  const sheetItem = sheetFor ? (items.find((i) => i.id === sheetFor.id) ?? null) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-extrabold sm:text-lg">سرنخ‌ها</h1>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            سرنخ‌های ذخیره‌شده را تماس بگیرید، مذاکره کنید و به مشتری تبدیل کنید.
          </p>
        </div>
        {!loading && (
          <p className="text-xs text-muted-foreground">
            <b className="text-foreground">{toFa(items.length)}</b> مورد در{' '}
            <b className="text-foreground">{toFa(folders?.length ?? 0)}</b> پرونده
          </p>
        )}
      </div>

      {/* پیگیری‌های امروز (خواسته مالک ۷-۱۱) — نوار همیشه‌ visible؛
          «امروز چه کاری باید انجام بدهم» حتی وقتی کاری نیست هم جواب داده
          می‌شود تا کاربر مطمئن باشد چیزی از قلم نیفتاده */}
      {!loading && items.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border p-3 transition-colors',
            dueToday
              ? 'border-amber-300 bg-amber-100'
              : dueTodayCount > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-border bg-card',
          )}
        >
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full',
              dueTodayCount > 0
                ? 'bg-amber-400/20 text-amber-600'
                : 'bg-secondary text-muted-foreground',
            )}
          >
            {dueTodayCount > 0 ? <BellRing size={17} /> : <CalendarCheck size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            {dueTodayCount > 0 ? (
              <p className="text-sm font-bold text-amber-800">
                <span className="font-num">{toFa(dueTodayCount)}</span> سرنخ برای پیگیری امروز دارید
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">امروز سرنخی برای پیگیری ندارید</p>
            )}
          </div>
          {(dueTodayCount > 0 || dueToday) && (
            <button
              type="button"
              onClick={() => setDueToday((v) => !v)}
              aria-pressed={dueToday}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
                dueToday
                  ? 'bg-amber-400 text-white hover:bg-amber-500'
                  : 'border border-amber-300 bg-card text-amber-700 hover:bg-amber-100',
              )}
            >
              {dueToday ? 'نمایش همه' : 'نمایش موارد امروز'}
            </button>
          )}
        </div>
      )}

      {/* جستجو — کاربر / دستهٔ کالا / عنوان کالا (برای لیست‌های طولانی) */}
      {!loading && items.length > 0 && (
        <div className="relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو: نام کاربر، دستهٔ کالا یا عنوان کالا…"
            className="h-11 rounded-md ps-9 pe-9"
            aria-label="جستجو در سرنخ‌ها"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="پاک کردن جستجو"
              className="absolute end-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* نوار فیلتر دیوار-سبک — افقی و اسکرول‌پذیر در موبایل؛ حاشیهٔ منفی
          هم‌اندازهٔ پدینگ main پنل (p-3 / sm:p-4) تا چیپ‌ها لبه‌به‌لکه شوند
          ولی صفحه هرگز سرریز افقی نگیرد (موبایل بی‌نقص — قانون §۲) */}
      {!loading && items.length > 0 && (
        <div className="no-scrollbar -mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 nav-desktop:mx-0 nav-desktop:flex-wrap nav-desktop:overflow-visible nav-desktop:px-0">
          <FilterChip
            icon={Bookmark}
            label="پرونده"
            value={selectedFolder?.name ?? null}
            active={validFolderId != null}
            onClear={() => pickFolder(null)}
            sheetTitle="انتخاب پرونده"
          >
            <FilterOption selected={validFolderId == null} onSelect={() => pickFolder(null)} count={searched.length}>
              همه پرونده‌ها
            </FilterOption>
            {(folders ?? []).map((f) => (
              <FilterOption
                key={f.id}
                selected={validFolderId === f.id}
                onSelect={() => pickFolder(f.id)}
                count={f.itemCount}
                trailing={
                  <span className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`تغییر نام ${f.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenaming(f);
                        setRenameText(f.name);
                      }}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      aria-label={`حذف ${f.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(f);
                      }}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                }
              >
                {f.name}
              </FilterOption>
            ))}
            {/* ساخت پروندهٔ جدید — داخل همان شیت */}
            <div className="mt-1 flex gap-1.5 border-t border-dashed pt-2">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCreateFolder()}
                placeholder="پروندهٔ جدید (مثلاً: پفک)"
                className="h-9 rounded-md text-xs"
                maxLength={60}
              />
              <Button
                size="sm"
                className="rounded-md"
                disabled={!newFolderName.trim() || createFolder.isPending}
                onClick={submitCreateFolder}
              >
                {createFolder.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FolderPlus size={14} />
                )}
                ساخت
              </Button>
            </div>
          </FilterChip>

          <FilterChip
            icon={Filter}
            label="وضعیت"
            value={status !== 'all' ? FOLLOW_STATUSES.find((s) => s.key === status)?.label ?? null : null}
            active={status !== 'all'}
            onClear={() => setStatus('all')}
            sheetTitle="وضعیت سرنخ"
          >
            <FilterOption selected={status === 'all'} onSelect={() => setStatus('all')} count={statusBase.length}>
              همه
            </FilterOption>
            {FOLLOW_STATUSES.map((s) => (
              <FilterOption
                key={s.key}
                selected={status === s.key}
                onSelect={() => setStatus(s.key)}
                count={statusCounts[s.key] ?? 0}
              >
                {s.label}
              </FilterOption>
            ))}
          </FilterChip>

          {/* اولویت (خواسته مالک ۷-۱۱) — بالا / متوسط / کم؛ «تغییر اولویت» هر مورد
              زیر سه‌نقطه و در مودال‌هاست، این فیلتر لیست را با اولویت می‌پالایَد */}
          <FilterChip
            icon={Flag}
            label="اولویت"
            value={priority !== 'all' ? FOLLOW_PRIORITY_MAP[priority].label : null}
            active={priority !== 'all'}
            onClear={() => setPriority('all')}
            sheetTitle="اولویت"
          >
            <FilterOption selected={priority === 'all'} onSelect={() => setPriority('all')} count={priorityCounts.all}>
              همه
            </FilterOption>
            {FOLLOW_PRIORITIES.map((p) => (
              <FilterOption
                key={p.key}
                selected={priority === p.key}
                onSelect={() => setPriority(p.key)}
                count={priorityCounts[p.key]}
              >
                {p.label}
              </FilterOption>
            ))}
          </FilterChip>

          <FilterChip
            icon={MapPin}
            label="شهر"
            value={city !== 'all' ? city : null}
            active={city !== 'all'}
            onClear={() => setCity('all')}
            sheetTitle="شهر"
          >
            <FilterOption selected={city === 'all'} onSelect={() => setCity('all')} count={cityBase.length}>
              همه شهرها
            </FilterOption>
            {cityOptions.map(([name, count]) => (
              <FilterOption key={name} selected={city === name} onSelect={() => setCity(name)} count={count}>
                {name}
              </FilterOption>
            ))}
          </FilterChip>

          <FilterChip
            icon={LayoutGrid}
            label="نوع"
            value={type !== 'all' ? FOLLOW_TARGET_LABEL[type] : null}
            active={type !== 'all'}
            onClear={() => setType('all')}
            sheetTitle="نوع مورد"
          >
            <FilterOption selected={type === 'all'} onSelect={() => setType('all')} count={typeCounts.all}>
              همه
            </FilterOption>
            <FilterOption selected={type === 'product'} onSelect={() => setType('product')} count={typeCounts.product}>
              {FOLLOW_TARGET_LABEL.product}
            </FilterOption>
            <FilterOption
              selected={type === 'buy_request'}
              onSelect={() => setType('buy_request')}
              count={typeCounts.buy_request}
            >
              {FOLLOW_TARGET_LABEL.buy_request}
            </FilterOption>
          </FilterChip>

          <FilterChip
            icon={ArrowDownWideNarrow}
            label="مرتب‌سازی"
            value={SORTS.find((s) => s.key === sort)?.label ?? null}
            active={sort !== 'newest'}
            sheetTitle="مرتب‌سازی"
          >
            {SORTS.map((s) => (
              <FilterOption key={s.key} selected={sort === s.key} onSelect={() => setSort(s.key)}>
                {s.label}
              </FilterOption>
            ))}
          </FilterChip>
        </div>
      )}

      {/* لیست */}
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <PanelEmptyState
          icon={Bookmark}
          title="هنوز سرنخی ندارید."
          hint="روی دکمهٔ «ایجاد سرنخ» در کارت خریداران یا آگهی‌ها بزنید تا سرنخ‌ها با وضعیت تماس و یادداشت، همین‌جا جمع شوند."
          actionLabel="مشاهده درخواست‌های خرید"
          actionHref="/panel/buyers"
        />
      ) : visible.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm font-bold">موردی مطابق جستجو و فیلترها نیست.</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-md" onClick={clearAllFilters}>
            <X size={14} /> حذف جستجو و فیلترها
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => (
            <FollowItemRow
              key={item.id}
              item={item}
              onOpenDetail={() => setDetailFor(item.id)}
              onOpenActions={(mode) => setSheetFor({ id: item.id, mode })}
            />
          ))}
        </div>
      )}

      {/* مدال جزئیات — کلیک روی ردیف */}
      {detailItem && (
        <FollowDetailModal
          item={detailItem}
          onClose={() => setDetailFor(null)}
          onMove={() => {
            setDetailFor(null);
            setSheetFor({ id: detailItem.id, mode: 'move' });
          }}
          onDelete={() => {
            setDetailFor(null);
            setSheetFor({ id: detailItem.id, mode: 'delete' });
          }}
        />
      )}

      {/* شیت عملیات — سه‌نقطه */}
      {sheetItem && sheetFor && (
        <FollowActionSheet item={sheetItem} initialMode={sheetFor.mode} onClose={() => setSheetFor(null)} />
      )}

      {/* مودال تغییر نام پرونده */}
      <Dialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">تغییر نام پرونده</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitRename()}
            className="rounded-md"
            placeholder="نام جدید پرونده"
            maxLength={60}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-md" onClick={() => setRenaming(null)}>
              انصراف
            </Button>
            <Button className="rounded-md" disabled={renameFolder.isPending || !renameText.trim()} onClick={submitRename}>
              {renameFolder.isPending ? <Loader2 size={15} className="animate-spin" /> : 'ذخیره'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال حذف پرونده */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">حذف پرونده</DialogTitle>
            <DialogDescription className="text-start leading-6">
              پروندهٔ «{deleting?.name}» با {toFa(deleting?.itemCount ?? 0)} مورد ذخیره‌شده و همهٔ
              یادداشت‌هایش حذف می‌شود. این کار قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-md" onClick={() => setDeleting(null)}>
              انصراف
            </Button>
            <Button variant="destructive" className="rounded-md" disabled={deleteFolder.isPending} onClick={submitDelete}>
              {deleteFolder.isPending ? <Loader2 size={15} className="animate-spin" /> : 'حذف پرونده'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
