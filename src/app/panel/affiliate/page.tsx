'use client';

/**
 * صفحه بازاریابی (افلیت) — اگر قرارداد پذیرفته نشده باشد گیت قرارداد
 * نشان داده می‌شود؛ در غیر این صورت پنل بازاریاب.
 * لینک این صفحه در فوتر سایت و منوی «ایمچ من» پنل قرار دارد.
 */

import { Megaphone, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelCard } from '@/components/panel/panel-parts';
import { AffiliateGate } from '@/components/affiliate/affiliate-gate';
import { AffiliatePanel } from '@/components/affiliate/affiliate-panel';
import { useAffiliateOverview } from '@/lib/affiliate-hooks';
import { toFa } from '@/lib/format';

export default function AffiliatePage() {
  const { data, isLoading } = useAffiliateOverview();

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <PanelCard className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
            <Megaphone size={22} />
          </span>
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-72 rounded-md" />
          </div>
        </PanelCard>
        <PanelCard className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
        </PanelCard>
      </div>
    );
  }

  if (!data.profile) return <AffiliateGate settings={data.settings} />;
  return (
    <>
      <AffiliatePanel overview={data} />
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Share2 size={12} />
        سهم شما از شرایط قراردادِ زمان پذیرش ({toFa(data.profile.level1Percent)}٪) محاسبه می‌شود — نه از تنظیمات فعلی برنامه.
      </p>
    </>
  );
}
