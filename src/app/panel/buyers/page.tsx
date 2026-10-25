'use client';

/**
 * خریداران — درخواست‌های خرید از دید فروشنده (الگوی buyAd-requests باسکول):
 * کارت‌های ارتقا + فیلتر دسته/جستجو + کارت‌های خریدار با تماس/چت/نشان +
 * بنر پیامک گروهی بین نتایج.
 */

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useBuyRequests, useCategoryTree } from '@/lib/mock/hooks';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelCard, PanelPromoCards } from '@/components/panel/panel-parts';
import { BuyerCard, BulkSmsBanner } from '@/components/panel/buyer-card';
import { toFa } from '@/lib/format';

const PER_BATCH = 10;

export default function PanelBuyersPage() {
  const { data: requests, isLoading } = useBuyRequests({});
  const { data: tree } = useCategoryTree();
  const [q, setQ] = useState('');
  const [rootCat, setRootCat] = useState('all');
  const [batch, setBatch] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const roots = useMemo(() => tree ?? [], [tree]);

  const filtered = useMemo(() => {
    let items = requests ?? [];
    if (rootCat !== 'all') {
      const root = roots.find((r) => String(r.id) === rootCat);
      if (root) {
        const names = new Set<string>([root.categoryName]);
        (root.children ?? []).forEach((c) => {
          names.add(c.categoryName);
          (c.children ?? []).forEach((l) => names.add(l.categoryName));
        });
        items = items.filter((r) => names.has(r.subcategoryName));
      }
    }
    if (q.trim()) {
      const needle = q.trim();
      items = items.filter(
        (r) =>
          `${r.firstName} ${r.lastName}`.includes(needle) ||
          r.subcategoryName.includes(needle) ||
          (r.name ?? '').includes(needle) ||
          r.city.includes(needle),
      );
    }
    return items;
  }, [requests, q, rootCat, roots]);

  const visible = filtered.slice(0, batch * PER_BATCH);

  const toggleSave = (id: number) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PanelPromoCards variant="compact" />
      <PanelPromoCards />

      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-base font-extrabold sm:text-lg">درخواست های خرید</h1>
          <span className="text-xs text-muted-foreground">{toFa(filtered.length)} درخواست</span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setBatch(1);
              }}
              placeholder="جستجو در خریداران (محصول، نوع کالا، شهر…)"
              className="rounded-md pe-9"
            />
          </div>
          <Select
            value={rootCat}
            onValueChange={(v) => {
              setRootCat(v);
              setBatch(1);
            }}
          >
            <SelectTrigger className="w-full rounded-md" aria-label="دسته‌بندی‌ها">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <SlidersHorizontal size={14} />
              </span>
              <SelectValue placeholder="همه دسته ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته ها</SelectItem>
              {roots.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PanelCard>

      <BulkSmsBanner />

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg border bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <PanelCard className="py-10 text-center text-sm text-muted-foreground">درخواستی مطابق فیلتر شما پیدا نشد.</PanelCard>
      ) : (
        <div className="space-y-3">
          {visible.map((r, i) => (
            <div key={r.id} className="contents">
              <BuyerCard request={r} saved={savedIds.has(r.id)} onToggleSave={() => toggleSave(r.id)} />
              {(i + 1) % 5 === 0 && i + 1 < visible.length && <BulkSmsBanner />}
            </div>
          ))}
          {visible.length < filtered.length && (
            <button
              type="button"
              onClick={() => setBatch((b) => b + 1)}
              className="w-full rounded-md border border-dashed bg-card py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
            >
              درخواست‌های بیشتر
            </button>
          )}
        </div>
      )}
    </div>
  );
}
