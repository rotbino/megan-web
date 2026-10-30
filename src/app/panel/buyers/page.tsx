'use client';

/**
 * خریداران — درخواست‌های خرید از دید فروشنده (الگوی buyAd-requests باسکول):
 * کارت‌های ارتقا + فیلتر دسته/جستجو + کارت‌های خریدار با تماس/چت/نشان +
 * بنر پیامک گروهی بین نتایج.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Crown, Lock, Search, SlidersHorizontal, Users } from 'lucide-react';
import { useBuyRequests, useCategoryTree, useMyPackage, useSaveBuyer } from '@/lib/mock/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelCard, PanelPromoCards } from '@/components/panel/panel-parts';
import { BuyerCard, BulkSmsBanner } from '@/components/panel/buyer-card';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';

const PER_BATCH = 10;

export default function PanelBuyersPage() {
  const { data: paged, isLoading } = useBuyRequests({ perPage: 50 });
  const { data: tree } = useCategoryTree();
  const saveBuyer = useSaveBuyer();
  // گیت بسته (خواسته مالک): بسته رایگان خریداران را نمی‌بیند
  const { data: myPackage, isLoading: pkgLoading } = useMyPackage();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [rootCat, setRootCat] = useState('all');
  const [batch, setBatch] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const roots = useMemo(() => tree ?? [], [tree]);

  const filtered = useMemo(() => {
    let items = paged?.items ?? [];
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
  }, [paged, q, rootCat, roots]);

  const visible = filtered.slice(0, batch * PER_BATCH);

  // ── گیت بسته: رایگان = قفل؛ در حال بارگذاری = اسکلتون ──
  if (pkgLoading || !myPackage) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }
  if (!myPackage.features.canSeeBuyers) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-amber-50 text-amber-500">
            <Lock size={28} />
          </span>
          <h1 className="mt-4 flex items-center justify-center gap-2 text-base font-extrabold">
            <Users size={18} className="text-primary" /> دسترسی به خریداران ویژه بسته فعال است
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            با بسته رایگان می‌توانید تا ۱۰ محصول ثبت کنید و هر تعداد درخواست خرید بفرستید؛ اما برای دیدن
            شماره تماس خریداران و خریداران پیشنهادی، یکی از بسته‌های اشتراک ایمچ را فعال کنید.
          </p>
          <div className="mt-4 grid gap-2 text-start text-xs sm:grid-cols-3">
            {['دو ماهه — ۱۹۹ هزار تومان', 'شش ماهه — ۴۹۹ هزار تومان', 'یک‌ساله — ۷۹۹ هزار تومان'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 rounded-md border bg-secondary/50 px-3 py-2">
                <Crown size={13} className="shrink-0 text-amber-500" /> {t}
              </span>
            ))}
          </div>
          <Button asChild className="mt-5 rounded-md">
            <Link href="/panel/pricing">مشاهده و خرید بسته‌ها</Link>
          </Button>
        </PanelCard>
      </div>
    );
  }

  const toggleSave = async (r: (typeof filtered)[number]) => {
    if (savedIds.has(r.id)) return; // حذف از لیست از خود CRM انجام می‌شود
    try {
      await saveBuyer.mutateAsync({
        targetUserId: r.myuserId,
        listName: r.subcategoryName, // لیست به نام دسته کالا — الگوی باسکول («سیب زمینی»)
      });
      setSavedIds((prev) => new Set(prev).add(r.id));
      toast({ description: 'خریدار به لیست نشان شده ها اضافه شد.' });
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : 'نشان کردن ناموفق بود.' });
    }
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
              <BuyerCard request={r} saved={savedIds.has(r.id)} onToggleSave={() => void toggleSave(r)} />
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
