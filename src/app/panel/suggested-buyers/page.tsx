'use client';

/**
 * خریداران پیشنهادی — سرویس relatedByAdd باسکول:
 * خریداران مرتبط با آگهی‌های فروشنده بر اساس دسته + نوع کالا + حجم خرید/فروش؛
 * سورت با امتیاز تطابق. سه سطح: نوع کالا ← همان محصول ← دسته نزدیک.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Crown, Info, Lock } from 'lucide-react';
import { useMyPackage, useSuggestedBuyers } from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { PanelCard, PanelPromoCards } from '@/components/panel/panel-parts';
import { BuyerCard } from '@/components/panel/buyer-card';
import { MarkUserSheet, type MarkTarget } from '@/components/shared/mark-user-sheet';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SuggestedBuyer } from '@/lib/types';

const TIER_LABEL: Record<SuggestedBuyer['tier'], string> = {
  exact: 'نوع کالای شما',
  'same-product': 'همان محصول شما',
  'near-category': 'دسته نزدیک',
};

export default function SuggestedBuyersPage() {
  const { data: buyers, isLoading } = useSuggestedBuyers();
  // گیت بسته (خواسته مالک): خریداران پیشنهادی ویژه بسته فعال است
  const { data: myPackage } = useMyPackage();
  // نشان کردن — مودال CRM (خواسته مالک ۱-۱۱ دور هفتم)
  const [markTarget, setMarkTarget] = useState<MarkTarget | null>(null);

  const groups = useMemo(() => {
    const g: Record<SuggestedBuyer['tier'], SuggestedBuyer[]> = { exact: [], 'same-product': [], 'near-category': [] };
    (buyers ?? []).forEach((b) => g[b.tier].push(b));
    return g;
  }, [buyers]);

  const openMark = (buyer: SuggestedBuyer) => {
    setMarkTarget({
      targetUserId: buyer.buyRequest.myuserId,
      targetName: `${buyer.buyRequest.firstName} ${buyer.buyRequest.lastName}`.trim(),
      isVerified: buyer.buyRequest.isVerified,
      defaultListName: buyer.buyRequest.subcategoryName, // الگوی باسکول
    });
  };

  const section = (tier: SuggestedBuyer['tier'], title: string, hint: string) => {
    const items = groups[tier];
    if (items.length === 0) return null;
    return (
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-extrabold">{title}</h2>
          <span className="text-[11px] text-muted-foreground">{toFa(items.length)} خریدار</span>
        </div>
        <p className="mb-3 text-[11px] leading-5 text-muted-foreground">{hint}</p>
        <div className="grid gap-3 xl:grid-cols-2">
          {items.map((b) => (
            <BuyerCard
              key={b.buyRequest.id}
              request={b.buyRequest}
              onToggleSave={() => openMark(b)}
              matchBadge={{ score: b.matchScore, label: TIER_LABEL[b.tier] }}
              relatedHint={`مرتبط با: ${b.relatedProduct}`}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PanelPromoCards variant="compact" />

      {/* گیت بسته — رایگان = قفل */}
      {myPackage && !myPackage.features.canSeeBuyers ? (
        <PanelCard className="py-10 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-50 text-amber-500">
            <Lock size={24} />
          </span>
          <p className="mt-3 text-sm font-extrabold">خریداران پیشنهادی ویژه بسته‌های اشتراک است</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
            خریدارانی که با محصولات و حجم فروش شما تطبیق دارند — با فعال کردن بسته، فهرست کامل آن‌ها (تطابق کامل،
            همان محصول، دسته نزدیک) باز می‌شود.
          </p>
          <Button asChild size="sm" className="mt-4 rounded-md">
            <Link href="/panel/pricing">
              <Crown size={14} className="ms-1" /> مشاهده و خرید بسته‌ها
            </Link>
          </Button>
        </PanelCard>
      ) : (
        <>
          <PanelCard>
            <h1 className="text-base font-extrabold sm:text-lg">خریداران پیشنهادی</h1>
            <p className="mt-2 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
              <Info size={15} className="mt-0.5 shrink-0 text-sky-500" />
              خریدارانی که با محصولات شما (دسته و نوع کالا) و حجم فروشتان تطبیق دارند — مثلاً اگر «پسته اکبری» می‌فروشید،
              اول خریداران اکبریِ هم‌حجم شما، بعد بقیه خریداران پسته و در پایان خشکبار و کشاورزی مرتبط نمایش داده می‌شوند.
            </p>
          </PanelCard>

          {isLoading ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn('h-44 animate-pulse rounded-lg border bg-card')} />
              ))}
            </div>
          ) : (buyers ?? []).length === 0 ? (
            <PanelCard className="py-10 text-center text-sm text-muted-foreground">
              خریدار مرتبطی برای محصولات شما پیدا نشد.
            </PanelCard>
          ) : (
            <div className="space-y-6">
              {section('exact', 'تطابق کامل — نوع کالا', 'خریدارانی که دقیقاً نوع کالای آگهی شما را با حجم متناسب می‌خواهند.')}
              {section('same-product', 'همان محصول شما', 'خریداران همان محصول با هر نوع و حجمی.')}
              {section('near-category', 'دسته‌های نزدیک', 'خریداران محصولات هم‌خانواده — فرصت پیشنهاد کالای جایگزین.')}
            </div>
          )}
        </>
      )}

      {/* مودال CRM نشان‌کردن خریدار پیشنهادی */}
      {markTarget && (
        <MarkUserSheet open={!!markTarget} onClose={() => setMarkTarget(null)} target={markTarget} />
      )}
    </div>
  );
}
