'use client';

/**
 * فهرست خریداران ایمچ (خواسته مالک ۳۱-۱۰) — صفحه عمومی با فیلتر مثل لیست آگهی‌ها:
 *  • فیلترها: دسته (جستجو در درخت) + استان + شهر
 *  • دو تب: «خریداران» و «درخواست‌های خرید» همین دسته (بدون درخواست → تب مخفی)
 *  • کارت خریدار: نقش (عمده/خرده)، دسته‌ها + بازهٔ حجم، استان/شهر، فعالیت — بی نام و تماس
 *  • «پیشنهاد تامین»: فقط فروشندگان دارندهٔ بستهٔ فعال — تکی با سهمیهٔ روزانه؛
 *    «ارسال گروهی» پولی است (هر گیرنده از کیف پول).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Loader2,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import {
  useBuyerDirectory,
  useBuyRequests,
  useCategoryTree,
  useCities,
  useMyOfferQuota,
  useProvinces,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthModal } from '@/components/shared/auth-modal';
import { SupplyOfferModal } from '@/components/buyers/supply-offer-modal';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BuyerDirectoryItem, BuyerDirectoryPage, Category } from '@/lib/types';

const PER_PAGE = 12;

function flattenLeaves(
  tree: Category[],
  parents: string[] = [],
): { cat: Category; path: string }[] {
  const out: { cat: Category; path: string }[] = [];
  for (const c of tree) {
    if (c.children?.length) out.push(...flattenLeaves(c.children, [...parents, c.categoryName]));
    else out.push({ cat: c, path: [...parents, c.categoryName].join(' ‹ ') });
  }
  return out;
}

export function BuyersView({ initialData }: { initialData?: BuyerDirectoryPage }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // فیلترها
  const [catQuery, setCatQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [reqPage, setReqPage] = useState(1);
  const [tab, setTab] = useState<'buyers' | 'requests'>('buyers');

  // انتخاب گروهی + مودال‌ها
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [offerTargets, setOfferTargets] = useState<BuyerDirectoryItem[] | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const { data: tree = [] } = useCategoryTree();
  const { data: provinces = [] } = useProvinces();
  const { data: cities = [] } = useCities(provinceId ?? undefined);

  const leaves = useMemo(() => flattenLeaves(tree), [tree]);
  const catResults = useMemo(() => {
    const q = catQuery.trim();
    if (!q) return [];
    return leaves
      .filter((l) => l.cat.categoryName.includes(q) || l.path.includes(q))
      .slice(0, 8);
  }, [leaves, catQuery]);

  const dirQuery = {
    categoryId: categoryId ?? undefined,
    provinceId: provinceId ?? undefined,
    cityId: cityId ?? undefined,
    page,
    perPage: PER_PAGE,
  };
  const directory = useBuyerDirectory(dirQuery);
  const data = directory.data ?? initialData;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  // تب دوم — درخواست‌های خرید همین دسته
  const reqData = useBuyRequests(
    { categoryId: categoryId ?? undefined, provinceId: provinceId ?? undefined, page: reqPage },
  );
  const showRequestsTab = data?.buyRequestCount == null || data.buyRequestCount > 0;

  // سهمیه — فقط برای کاربر واردشده (دارندهٔ بسته معنا دارد)
  const quotaQuery = useMyOfferQuota(Boolean(user));
  const quota = quotaQuery.data ?? null;
  const isFeatured = quota?.isFeatured ?? false;

  const pickCategory = (leaf: { cat: Category }) => {
    setCategoryId(leaf.cat.id);
    setCategoryLabel(leaf.cat.categoryName);
    setCatQuery('');
    setPage(1);
    setReqPage(1);
  };

  const resetFilters = () => {
    setCategoryId(null);
    setCategoryLabel(null);
    setProvinceId(null);
    setCityId(null);
    setPage(1);
    setReqPage(1);
  };

  const toggleSelect = (b: BuyerDirectoryItem) => {
    setSelection((s) => {
      const next = new Set(s);
      if (next.has(b.id)) next.delete(b.id);
      else if (next.size < (quota?.groupSend.maxBatch ?? 50)) next.add(b.id);
      else {
        toast({
          description: `حداکثر ${toFa(quota?.groupSend.maxBatch ?? 50)} خریدار در هر ارسال گروهی.`,
          variant: 'destructive',
        });
      }
      return next;
    });
  };

  const selectedItems = items.filter((b) => selection.has(b.id));

  const startOffer = (b: BuyerDirectoryItem | null) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!isFeatured) {
      toast({
        description: 'ارسال پیشنهاد تامین مخصوص فروشندگان دارندهٔ بستهٔ اشتراک فعال است.',
        variant: 'destructive',
      });
      return;
    }
    setOfferTargets(b ? [b] : selectedItems);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 lg:px-6">
      {/* فیلترها */}
      <div className="mt-4 rounded-xl border bg-card p-3 sm:p-4">
        <div className="grid gap-2.5 sm:grid-cols-3">
          {/* دسته — جستجو در درخت */}
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={categoryId && !catQuery ? '' : catQuery}
              onChange={(e) => setCatQuery(e.target.value)}
              placeholder={categoryLabel ?? 'همه دسته‌ها'}
              className="h-10 rounded-md pe-3 ps-9 text-xs"
              aria-label="فیلتر دسته خریداران"
              dir="rtl"
            />
            {categoryId && !catQuery && (
              <button
                type="button"
                onClick={() => {
                  setCategoryId(null);
                  setCategoryLabel(null);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-secondary/70"
              >
                حذف فیلتر
              </button>
            )}
            {catResults.length > 0 && (
              <ul className="absolute inset-x-0 top-11 z-20 max-h-64 overflow-auto rounded-lg border bg-card p-1 shadow-lg">
                {catResults.map(({ cat, path }) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => pickCategory({ cat })}
                      className="flex w-full flex-col rounded-md px-2.5 py-2 text-start transition-colors hover:bg-accent"
                    >
                      <span className="text-xs font-bold">{cat.categoryName}</span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground">{path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* استان */}
          <select
            value={provinceId ?? ''}
            onChange={(e) => {
              setProvinceId(e.target.value ? Number(e.target.value) : null);
              setCityId(null);
              setPage(1);
            }}
            className="h-10 rounded-md border border-input bg-card px-2.5 text-xs"
            aria-label="استان"
          >
            <option value="">همه استان‌ها</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* شهر */}
          <select
            value={cityId ?? ''}
            onChange={(e) => {
              setCityId(e.target.value ? Number(e.target.value) : null);
              setPage(1);
            }}
            disabled={!provinceId}
            className="h-10 rounded-md border border-input bg-card px-2.5 text-xs disabled:opacity-50"
            aria-label="شهر"
          >
            <option value="">همه شهرها</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* نوار سهمیهٔ فروشندهٔ ویژه */}
        {user && quota && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-[11px]">
            {isFeatured ? (
              <span>
                <ShieldCheck size={13} className="ms-0.5 inline text-emerald-600" /> سهمیهٔ پیشنهاد تامین امروز:{' '}
                <b>{toFa(quota.left)}</b> از <b>{toFa(quota.dailyLimit)}</b>
              </span>
            ) : (
              <span className="text-muted-foreground">
                ارسال پیشنهاد تامین به خریداران، ویژهٔ دارندگان بستهٔ اشتراک است —{' '}
                <Link href="/panel/pricing" className="font-bold text-primary underline">
                  مشاهدهٔ بسته‌ها
                </Link>
              </span>
            )}
            {isFeatured && (
              <span className="text-muted-foreground">
                ارسال گروهی: {toFa(quota.groupSend.perRecipientPrice.toLocaleString('fa-IR'))} تومان به‌ازای هر خریدار
              </span>
            )}
          </div>
        )}
      </div>

      {/* تب‌ها */}
      <div className="mt-4 flex items-center gap-1.5 border-b pb-2">
        <button
          type="button"
          onClick={() => setTab('buyers')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
            tab === 'buyers' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/70',
          )}
        >
          <Users size={14} /> خریداران {total > 0 && `(${toFa(total)})`}
        </button>
        {showRequestsTab && (
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
              tab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/70',
            )}
          >
            <ClipboardList size={14} /> درخواست‌های خرید
            {data?.buyRequestCount != null && data.buyRequestCount > 0 && ` (${toFa(data.buyRequestCount)})`}
          </button>
        )}
      </div>

      {/* ── تب خریداران ── */}
      {tab === 'buyers' && (
        <>
          {directory.isLoading && !data ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed p-10 text-center">
              <Users size={30} className="mx-auto text-muted-foreground/60" />
              <p className="mt-3 text-sm font-bold">هنوز خریداری در این فیلتر ثبت نشده است.</p>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                اگر خودتان هم می‌خرید، «دفتر خرید من» را تکمیل کنید تا فروشندگان شما را پیدا کنند —{' '}
                <Link href="/panel/buyer-book" className="font-bold text-primary underline">
                  دفتر خرید من
                </Link>
              </p>
            </div>
          ) : (
            <>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {items.map((b) => (
                  <li key={b.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-extrabold',
                            b.role === 'عمده‌خریدار' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700',
                          )}
                        >
                          {b.role}
                        </span>
                        {b.activeRecently && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <span className="size-1.5 rounded-full bg-emerald-500" /> فعال در ۷ روز اخیر
                          </span>
                        )}
                      </div>
                      {/* انتخاب گروهی — فقط فروشندهٔ ویژه */}
                      {isFeatured && (
                        <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={selection.has(b.id)}
                            onChange={() => toggleSelect(b)}
                            className="size-4 accent-primary"
                            aria-label="انتخاب برای ارسال گروهی"
                          />
                          انتخاب
                        </label>
                      )}
                    </div>

                    {/* دسته‌ها + بازهٔ حجم */}
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {b.categories.map((c) => (
                        <li key={c.id} className="rounded-md bg-secondary px-2 py-1 text-[10.5px] leading-4">
                          <b>{c.name}</b>
                          <span className="text-muted-foreground"> — {c.range}</span>
                        </li>
                      ))}
                      {b.moreCategories > 0 && (
                        <li className="rounded-md bg-secondary/60 px-2 py-1 text-[10.5px] text-muted-foreground">
                          +{toFa(b.moreCategories)} دستهٔ دیگر
                        </li>
                      )}
                    </ul>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin size={12} />
                        {[b.province, b.city].filter(Boolean).join('، ') || 'مکان ثبت‌نشده'}
                        <span className="mx-1">·</span>
                        {b.activeRecently ? '' : `آخرین فعالیت: ${dateFa(b.lastActiveAt)}`}
                      </p>
                      <Button size="sm" className="h-8 rounded-md px-3 text-[11px]" onClick={() => startOffer(b)}>
                        <Send size={12} /> پیشنهاد تامین
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* صفحه‌بندی */}
              {pageCount > 1 && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronRight size={15} /> قبلی
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    صفحهٔ {toFa(page)} از {toFa(pageCount)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    بعدی <ChevronLeft size={15} />
                  </Button>
                </div>
              )}
            </>
          )}

          {/* نوار ارسال گروهی — چسبان پایین وقتی انتخابی هست */}
          {isFeatured && selection.size > 0 && (
            <div className="sticky bottom-20 z-30 mt-4 rounded-xl border-2 border-primary/30 bg-card p-3 shadow-lg sm:bottom-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] leading-5">
                  <b>{toFa(selection.size)}</b> خریدار انتخاب شد — هزینه:{' '}
                  <b className="text-primary">
                    {toFa((selection.size * (quota?.groupSend.perRecipientPrice ?? 0)).toLocaleString('fa-IR'))}
                  </b>{' '}
                  تومان از کیف پول
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-md" onClick={() => startOffer(null)}>
                    <Send size={13} /> ارسال گروهی پیشنهاد
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-md" onClick={() => setSelection(new Set())}>
                    لغو انتخاب
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── تب درخواست‌های خرید ── */}
      {tab === 'requests' && (
        <div className="mt-4">
          {reqData.isLoading && !reqData.data ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : (reqData.data?.items?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <ClipboardList size={30} className="mx-auto text-muted-foreground/60" />
              <p className="mt-3 text-sm font-bold">درخواست خریدی در این فیلتر نیست.</p>
              <Link href="/buyAd-requests" className="mt-2 inline-block text-xs font-bold text-primary underline">
                مشاهدهٔ همهٔ درخواست‌های خرید
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-2.5">
                {(reqData.data?.items ?? []).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold">
                        {r.name ? `${r.subcategoryName} (${r.name})` : r.subcategoryName}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {toFa(r.requirementAmount.toLocaleString('fa-IR'))} {r.unit} · {r.city} · {dateFa(r.createdAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-8 shrink-0 rounded-md px-3 text-[11px]">
                      <Link href="/buyAd-requests">مشاهده</Link>
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-center">
                <Link href="/buyAd-requests" className="text-xs font-bold text-primary underline">
                  مشاهدهٔ همهٔ درخواست‌ها و جستجو
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* مودال‌ها — key: هر مجموعهٔ هدف، فرم تازه با متن خالی */}
      <SupplyOfferModal
        key={offerTargets ? offerTargets.map((t) => t.id).join(',') : 'closed'}
        open={offerTargets !== null}
        onClose={() => setOfferTargets(null)}
        targets={offerTargets ?? []}
        quota={quota}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLoggedIn={() => {
          setAuthOpen(false);
          void quotaQuery.refetch();
        }}
      />
    </div>
  );
}
