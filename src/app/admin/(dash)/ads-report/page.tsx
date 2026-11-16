'use client';

/**
 * گزارش آگهی‌ها — نمای دسته‌بندی جدید ایمچ (تاکسونومی v2).
 *
 * ساختار الگوبرداری‌شده از صفحهٔ اول پروتوتایپ «تامینان» (ارسالی مالک):
 * دسکتاپ = سایدبار درخت دسته + پنل فیلتر کنار گرید کارت‌ها؛ موبایل = همان‌ها
 * در شیت پایین‌رونده + چیپ‌های فیلتر فعال + ردیف فیلترهای سریع وضعیت.
 *
 * نقش صفحه: ابزار مهاجرت موازی — سایت عمومی همچنان روی دستهٔ باسکول است؛
 * اینجا آگهی‌ها از طریق جدول نگاشت روی درخت ۱۵-ریشه‌ای دیده می‌شوند تا
 * مالک تکمیل را ببیند و بعد سوییچ عمومی را اعلام کند. مسیر باسکول هر
 * آگهی همیشه روی کارت می‌ماند (دو-دسته‌بندی دائمی).
 */

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Anvil,
  BadgeCheck,
  Beef,
  BrickWall,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cog,
  Eye,
  Filter,
  FlaskConical,
  HeartPulse,
  ImageOff,
  Layers,
  MapPin,
  Package,
  Search,
  Shirt,
  Shovel,
  Sofa,
  Sprout,
  TrendingUp,
  Trophy,
  Truck,
  UtensilsCrossed,
  Wrench,
  X,
} from 'lucide-react';
import {
  fetchAdminLocations,
  fetchAdsReport,
  fetchAdsReportTree,
  type AdsReportRow,
  type AdsReportTreeNode,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { priceFa, stockFa, timeAgoFa, toFa } from '@/lib/format';

// ─── ثابت‌های نمایش ───────────────────────────────────────────────────────────

const ROOT_ICONS: Record<string, typeof Sprout> = {
  sprout: Sprout,
  beef: Beef,
  utensils: UtensilsCrossed,
  shovel: Shovel,
  cog: Cog,
  wrench: Wrench,
  package: Package,
  'brick-wall': BrickWall,
  anvil: Anvil,
  flask: FlaskConical,
  truck: Truck,
  shirt: Shirt,
  sofa: Sofa,
  'heart-pulse': HeartPulse,
  trophy: Trophy,
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: 'در انتظار تایید', cls: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400' },
  confirmed: { label: 'تایید شده', cls: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  rejected: { label: 'رد شده', cls: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
  deleted: { label: 'حذف شده', cls: 'bg-gray-200 text-gray-600', dot: 'bg-gray-400' },
};

type StatusKey = 'pending' | 'confirmed' | 'rejected' | 'deleted';

/** برچسب مسیر گرهٔ انتخاب‌شده از روی درخت */
function nodePathLabel(tree: AdsReportTreeNode[] | undefined, key: string): string {
  if (key === 'all') return 'همهٔ آگهی‌ها';
  if (key === 'unmapped') return 'نگاشت‌نشده';
  const walk = (nodes: AdsReportTreeNode[], acc: string[]): string[] | null => {
    for (const n of nodes) {
      const path = [...acc, n.name];
      if (n.key === key) return path;
      if (key.startsWith(`${n.key}.`) && n.children) {
        const deep = walk(n.children, path);
        if (deep) return deep;
      }
    }
    return null;
  };
  return walk(tree ?? [], [])?.join(' ‹ ') ?? key;
}

// ─── صفحه ─────────────────────────────────────────────────────────────────────

/** همهٔ فیلترها + شمارهٔ صفحه در یک state — تغییر فیلتر، صفحه را خودکار به ۱ می‌برد
 *  (الگوی state-تک به‌جای setState-in-effect — بدون ری‌رندر آبشاری) */
interface FilterState {
  nodeKey: string;
  provinceId?: number;
  cityId?: number;
  status?: StatusKey;
  attrs: Record<string, string[]>;
  page: number;
}

export default function AdsReportPage() {
  const [f, setF] = useState<FilterState>({ nodeKey: 'all', attrs: {}, page: 1 });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  /** تغییر فیلترها — page به ۱ برمی‌گردد مگر خودش عوض شود */
  const patch = (p: Partial<FilterState>) =>
    setF((cur) => ({ ...cur, ...p, page: p.page ?? 1 }));
  const setPage = (page: number) => setF((cur) => ({ ...cur, page }));

  const { nodeKey, provinceId, cityId, status, attrs: attrSel, page } = f;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['ads-report-tree'],
    queryFn: fetchAdsReportTree,
    staleTime: 60_000,
  });

  const { data: locations } = useQuery({
    queryKey: ['admin-locations-all'],
    queryFn: () => fetchAdminLocations(),
    staleTime: 10 * 60_000,
  });

  const filters = useMemo(
    () => ({
      nodeKey,
      provinceId,
      cityId,
      status,
      search: debounced || undefined,
      attrs: attrSel,
      page,
      perPage: 24,
    }),
    [nodeKey, provinceId, cityId, status, debounced, attrSel, page],
  );

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['ads-report', filters],
    queryFn: () => fetchAdsReport(filters),
    placeholderData: keepPreviousData,
  });

  const provinces = locations?.provinces ?? [];
  const cities = useMemo(
    () => (locations?.cities ?? []).filter((c) => !provinceId || c.provinceId === provinceId),
    [locations, provinceId],
  );

  const resetFilters = () => {
    patch({
      provinceId: undefined,
      cityId: undefined,
      status: undefined,
      attrs: {},
    });
    setSearch('');
  };

  const toggleAttr = (key: string, label: string) => {
    const cur = attrSel[key] ?? [];
    const next = cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label];
    const attrs = { ...attrSel };
    if (next.length) attrs[key] = next;
    else delete attrs[key];
    patch({ attrs });
  };

  const activeCount =
    (nodeKey !== 'all' ? 1 : 0) +
    (cityId || provinceId ? 1 : 0) +
    (status ? 1 : 0) +
    Object.values(attrSel).reduce((a, v) => a + v.length, 0);

  const counts = report?.counts;

  const sidePanels = (
    <>
      {/* ── درخت دستهٔ جدید ── */}
      <section className="rounded-xl border bg-card" aria-label="درخت دسته‌بندی جدید">
        <header className="flex items-center gap-2 border-b px-3 py-2.5">
          <Layers size={15} className="text-primary" />
          <h2 className="text-[13px] font-bold">دسته‌بندی جدید ایمچ</h2>
          {tree && (
            <span className="ms-auto text-[10px] text-muted-foreground">
              پوشش: {toFa(tree.mapped)} از {toFa(tree.totalProducts)}
            </span>
          )}
        </header>
        <div className="max-h-[420px] overflow-y-auto p-1.5 lg:max-h-[calc(100vh-330px)]">
          {treeLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              <TreeRow
                label="همهٔ آگهی‌ها"
                count={tree?.totalProducts ?? 0}
                active={nodeKey === 'all'}
                onClick={() => patch({ nodeKey: 'all' })}
                bold
              />
              {(tree?.unmapped ?? 0) > 0 && (
                <TreeRow
                  label="نگاشت‌نشده (باسکول)"
                  count={tree!.unmapped}
                  active={nodeKey === 'unmapped'}
                  onClick={() => patch({ nodeKey: 'unmapped' })}
                  danger
                />
              )}
              {(tree?.roots ?? []).map((root) => (
                <TreeNode
                  key={root.key}
                  node={root}
                  selected={nodeKey}
                  onSelect={(k) => {
                    patch({ nodeKey: k });
                    setSheetOpen(false);
                  }}
                />
              ))}
            </>
          )}
        </div>
      </section>

      {/* ── فیلترها ── */}
      <section className="rounded-xl border bg-card" aria-label="فیلترهای گزارش">
        <header className="flex items-center gap-2 border-b px-3 py-2.5">
          <Filter size={15} className="text-primary" />
          <h2 className="text-[13px] font-bold">فیلترها</h2>
          <span className="ms-auto text-[10px] text-muted-foreground">فله و بسته‌بندی، همه با هم</span>
        </header>
        <div className="space-y-4 p-3">
          {/* شهر فروشنده */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[12px] font-bold">
              <MapPin size={13} className="text-muted-foreground" /> شهر فروشنده
            </p>
            <Select
              value={provinceId ? String(provinceId) : 'all'}
              onValueChange={(v) => {
                patch({ provinceId: v === 'all' ? undefined : Number(v), cityId: undefined });
              }}
            >
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue placeholder="همهٔ استان‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">همهٔ استان‌ها</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={cityId ? String(cityId) : 'all'}
              onValueChange={(v) => patch({ cityId: v === 'all' ? undefined : Number(v) })}
              disabled={!provinceId}
            >
              <SelectTrigger className="h-9 text-[12px]">
                <SelectValue placeholder={provinceId ? 'همهٔ شهرها' : 'ابتدا استان را انتخاب کنید'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">همهٔ شهرها</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* وضعیت آگهی */}
          <div className="space-y-1.5">
            <p className="text-[12px] font-bold">وضعیت آگهی</p>
            {(['confirmed', 'pending', 'rejected', 'deleted'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => patch({ status: status === k ? undefined: k })}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                  status === k
                    ? 'bg-primary/10 font-bold text-primary'
                    : 'hover:bg-secondary/60',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className={cn('size-2 rounded-full', STATUS_META[k].dot)} />
                  {STATUS_META[k].label}
                </span>
                <span className="text-[10px] text-muted-foreground">{toFa(counts?.[k] ?? 0)}</span>
              </button>
            ))}
          </div>

          {/* اتریبیوت‌های پایلوت — فقط وقتی گره دارای تعریف است */}
          {(report?.attrs ?? []).map((attr) => (
            <div key={attr.key} className="space-y-1.5">
              <p className="text-[12px] font-bold">
                {attr.label}
                <span className="ms-1.5 text-[10px] font-normal text-muted-foreground">(تطبیق از نام آگهی)</span>
              </p>
              {attr.hint && <p className="text-[10px] leading-5 text-muted-foreground">{attr.hint}</p>}
              <div className="flex flex-wrap gap-1.5">
                {attr.options.map((opt) => {
                  const on = (attrSel[attr.key] ?? []).includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => toggleAttr(attr.key, opt.label)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                        on
                          ? 'border-primary bg-primary/10 font-bold text-primary'
                          : 'bg-background text-foreground/80 hover:bg-secondary/60',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {activeCount > 0 && (
            <Button variant="outline" size="sm" className="w-full text-[11px]" onClick={resetFilters}>
              حذف فیلترها
            </Button>
          )}
        </div>
      </section>
    </>
  );

  return (
    <div className="space-y-4">
      {/* ── سربرگ ── */}
      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-extrabold">گزارش آگهی‌ها</h1>
          {tree && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-secondary-foreground">
              {toFa(tree.totalProducts)} آگهی روی دستهٔ جدید
              {tree.totalProducts > 0 && (
                <span className="font-normal text-muted-foreground">
                  {' '}
                  ({toFa(Math.round((tree.mapped / tree.totalProducts) * 100))}٪ نگاشت‌شده)
                </span>
              )}
            </span>
          )}
        </div>
        <p className="text-[12px] leading-6 text-muted-foreground">
          نمای «دسته‌بندی جدید ایمچ» — سایت عمومی همچنان روی دسته‌بندی باسکول کار می‌کند و این گزارش
          ابزار تکمیل مهاجرت موازی است. مسیر باسکول هر آگهی روی کارت‌ها حفظ می‌شود.
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ── سایدبار دسکتاپ ── */}
        <aside className="hidden flex-col gap-4 lg:sticky lg:top-20 lg:flex">{sidePanels}</aside>

        {/* ── محتوای اصلی ── */}
        <main className="min-w-0 space-y-3">
          {/* نوار ابزار */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 basis-56">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی نام کالا…"
                className="h-10 rounded-xl pr-9 text-[13px]"
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {reportLoading ? '…' : `${toFa(report?.total ?? 0)} نتیجه`}
            </span>

            {/* موبایل: شیت درخت + فیلتر */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 rounded-xl text-[12px] lg:hidden">
                  <Layers size={15} className="text-primary" />
                  دسته‌ها و فیلترها
                  {activeCount > 0 && (
                    <span className="grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {toFa(activeCount)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-0">
                <SheetHeader className="px-4 pt-4 pb-2 text-start">
                  <SheetTitle className="text-[14px]">دسته‌بندی جدید و فیلترها</SheetTitle>
                  <SheetDescription className="text-[11px]">
                    انتخاب دسته، شهر، وضعیت و ویژگی‌های کالا
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-3 px-3 pb-6">{sidePanels}</div>
              </SheetContent>
            </Sheet>
          </div>

          {/* چیپ‌های فیلتر فعال — الگوی تامینان */}
          {(nodeKey !== 'all' || cityId || provinceId || status || Object.keys(attrSel).length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {nodeKey !== 'all' && (
                <ActiveChip label={nodePathLabel(tree?.roots, nodeKey)} onClear={() => patch({ nodeKey: 'all' })} />
              )}
              {(cityId || provinceId) && (
                <ActiveChip
                  label={
                    cityId
                      ? cities.find((c) => c.id === cityId)?.name ?? 'شهر'
                      : provinces.find((p) => p.id === provinceId)?.name ?? 'استان'
                  }
                  onClear={() => patch({ cityId: undefined, provinceId: undefined })}
                />
              )}
              {status && (
                <ActiveChip label={STATUS_META[status].label} onClear={() => patch({ status: undefined })} />
              )}
              {Object.entries(attrSel).map(([key, labels]) =>
                labels.map((l) => (
                  <ActiveChip key={`${key}:${l}`} label={l} onClear={() => toggleAttr(key, l)} />
                )),
              )}
            </div>
          )}

          {/* ردیف فیلتر سریع وضعیت — شمارنده‌دار */}
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <QuickPill
              label="همه"
              count={counts?.all ?? 0}
              active={!status}
              onClick={() => patch({ status: undefined })}
            />
            {(['confirmed', 'pending', 'rejected', 'deleted'] as const).map((k) => (
              <QuickPill
                key={k}
                label={STATUS_META[k].label}
                count={counts?.[k] ?? 0}
                active={status === k}
                onClick={() => patch({ status: status === k ? undefined: k })}
              />
            ))}
          </div>

          {/* گرید کارت‌ها */}
          {reportLoading && !report ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : (report?.items ?? []).length === 0 ? (
            <div className="rounded-xl border bg-card px-6 py-12 text-center">
              <ImageOff size={36} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-[13px] font-bold">آگهی‌ای با این فیلترها نیست</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                فیلترها را بازنشانی کنید یا دستهٔ دیگری را انتخاب کنید.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-[12px]"
                onClick={() => {
                  resetFilters();
                  patch({ nodeKey: 'all' });
                }}
              >
                بازنشانی کامل
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {report!.items.map((row) => (
                <AdCard key={row.id} row={row} />
              ))}
            </div>
          )}

          {/* صفحه‌بندی */}
          {(report?.pageCount ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg"
                disabled={(report?.page ?? 1) <= 1}
                onClick={() => setPage(Math.max(1, page - 1))}
                aria-label="صفحهٔ قبل"
              >
                <ChevronRight size={15} />
              </Button>
              <span className="text-[11px] text-muted-foreground">
                صفحهٔ {toFa(report?.page ?? 1)} از {toFa(report?.pageCount ?? 1)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg"
                disabled={(report?.page ?? 1) >= (report?.pageCount ?? 1)}
                onClick={() => setPage(page + 1)}
                aria-label="صفحهٔ بعد"
              >
                <ChevronLeft size={15} />
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── اجزای کوچک ───────────────────────────────────────────────────────────────

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border bg-card py-1 ps-2.5 pe-1 text-[11px] font-bold">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="grid size-4 shrink-0 place-items-center rounded-full text-primary hover:bg-primary/10"
        aria-label={`حذف فیلتر ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

function QuickPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'bg-card text-foreground/80 hover:bg-secondary/60',
      )}
    >
      {label}
      <span className={cn('text-[10px]', active ? 'text-primary' : 'text-muted-foreground')}>
        {toFa(count)}
      </span>
    </button>
  );
}

function TreeRow({
  label,
  count,
  active,
  onClick,
  bold,
  danger,
  icon,
  depth = 0,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  bold?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
  depth?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingInlineStart: 6 + depth * 14 }}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg py-1.5 pe-2 text-start text-[12px] transition-colors',
        active
          ? 'bg-primary/10 font-bold text-primary'
          : danger
            ? 'text-red-600 hover:bg-red-50'
            : 'hover:bg-secondary/60',
        bold && !active && 'font-bold',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          'shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold',
          active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
        )}
      >
        {toFa(count)}
      </span>
    </button>
  );
}

/** نود درخت با فرزندان بازشونده — گروه فعال خودکار باز است */
function TreeNode({
  node,
  selected,
  onSelect,
  depth = 0,
}: {
  node: AdsReportTreeNode;
  selected: string;
  onSelect: (key: string) => void;
  depth?: number;
}) {
  const inBranch = selected === node.key || selected.startsWith(`${node.key}.`);
  /** باز/بستهٔ دستی به‌صورت override روی حالت مشتق‌شده — بدون setState-in-effect */
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const open = openOverride ?? inBranch;

  const Icon = node.icon ? ROOT_ICONS[node.icon] : undefined;
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center">
        <TreeRow
          label={node.name}
          count={node.count}
          active={selected === node.key}
          onClick={() => onSelect(node.key)}
          icon={
            Icon ? (
              <Icon size={14} className={cn(depth === 0 ? 'text-primary' : 'text-muted-foreground')} />
            ) : undefined
          }
          depth={depth}
        />
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpenOverride(!open)}
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary/60"
            aria-label={open ? `بستن ${node.name}` : `باز کردن ${node.name}`}
            aria-expanded={open}
          >
            <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {open && hasChildren && (
        <div className="ms-3 border-s border-border/70 ps-1">
          {node.children!.map((child) => (
            <TreeNode
              key={child.key}
              node={child}
              selected={selected}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** کارت آگهی — الگوی کارت تامینان: عکس، عنوان دوخطی، خط ویژگی، قیمت، متا */
function AdCard({ row }: { row: AdsReportRow }) {
  const statusMeta = STATUS_META[row.status] ?? STATUS_META.pending;
  const attrPairs = Object.entries(row.resolved_attrs ?? {});

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      {/* عکس */}
      <div className="relative aspect-[4/3] bg-muted">
        {row.photo ? (
          <img src={row.photo} alt={row.product_name} className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground/30">
            <ImageOff size={30} />
          </div>
        )}
        <span className={cn('absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9.5px] font-bold', statusMeta.cls)}>
          {statusMeta.label}
        </span>
        {row.is_ladder && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9.5px] font-bold text-white">
            <TrendingUp size={10} /> نردبان
          </span>
        )}
      </div>

      {/* بدنه */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] font-semibold leading-relaxed">
          {row.product_name}
        </h3>

        {/* مسیر v2 — چیپ یا هشدار نگاشت‌نشده */}
        {row.v2_path ? (
          <p className="truncate text-[10.5px] text-muted-foreground">
            {row.v2_path.map((seg, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1 text-muted-foreground/50">‹</span>}
                {i === row.v2_path!.length - 1 ? (
                  <b className="font-bold text-foreground/70">{seg}</b>
                ) : (
                  seg
                )}
              </span>
            ))}
          </p>
        ) : (
          <span className="w-fit rounded-full bg-red-50 px-2 py-0.5 text-[9.5px] font-bold text-red-600">
            نگاشت‌نشده
          </span>
        )}

        {/* ویژگی‌های استخراج‌شده (پایلوت) */}
        {attrPairs.length > 0 && (
          <p className="truncate text-[10.5px] text-muted-foreground">
            {attrPairs
              .slice(0, 3)
              .map(([k, v]) => (
                <b key={k} className="font-bold text-foreground/70">
                  {v}
                </b>
              ))
              .reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ' · ', el]), [])}
          </p>
        )}

        {/* قیمت + موجودی */}
        <div className="mt-auto space-y-0.5 pt-1">
          <p className="text-[13.5px] font-extrabold">
            {row.min_sale_price > 0 ? (
              <>
                {priceFa(row.min_sale_price)}{' '}
                <small className="text-[10px] font-normal text-muted-foreground">
                  تومان / {row.unit}
                </small>
              </>
            ) : (
              <span className="text-[12px] font-bold text-muted-foreground">تماس بگیرید</span>
            )}
          </p>
          <p className="text-[10.5px] text-muted-foreground">{stockFa(row.stock, row.unit)}</p>
        </div>

        {/* متا: شهر · زمان · فروشنده */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-2 text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} /> {row.city_name}
          </span>
          <span aria-hidden>·</span>
          <span>{timeAgoFa(row.updated_at)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <b className="truncate font-bold text-foreground/70">
              {row.seller.full_name || row.seller.user_name}
            </b>
            {row.seller.is_verified && <BadgeCheck size={11} className="shrink-0 text-sky-600" />}
          </span>
          <span className="ms-auto inline-flex items-center gap-1">
            <Eye size={11} /> {toFa(row.view_count)}
          </span>
        </div>

        {/* مسیر باسکول — همیشه می‌ماند (دو-دسته‌بندی دائمی) */}
        <p className="truncate text-[9.5px] text-muted-foreground/70">
          باسکول: {row.buskol_path} · شناسهٔ {toFa(row.id)}
        </p>
      </div>
    </article>
  );
}
