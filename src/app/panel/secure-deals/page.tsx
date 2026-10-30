'use client';

/**
 * معاملات پرداخت امن — عین MHTML باسکول:
 * چهار تب (جاری/موفق/مرجوع شده/لغو شده) + حالت خالی «قرارداد جاری برای پرداخت امن ندارید.»
 * + دکمه «راهنمای پرداخت امن».
 */

import { useState } from 'react';
import Link from 'next/link';
import { Handshake, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelEmptyState } from '@/components/panel/panel-parts';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

type DealTab = 'current' | 'success' | 'returned' | 'canceled';

const TABS: { key: DealTab; label: string }[] = [
  { key: 'current', label: 'جاری' },
  { key: 'success', label: 'موفق' },
  { key: 'returned', label: 'مرجوع شده' },
  { key: 'canceled', label: 'لغو شده' },
];

export default function SecureDealsPage() {
  const [tab, setTab] = useState<DealTab>('current');

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">معاملات پرداخت امن</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          وجه معامله تا تحویل بار نزد ایمچ محفوظ می‌ماند.
        </p>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'shrink-0 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
              tab === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            {label} ({toFa(0)})
          </button>
        ))}
      </div>

      <PanelEmptyState
        icon={Handshake}
        title={
          tab === 'current'
            ? 'قرارداد جاری برای پرداخت امن ندارید.'
            : tab === 'success'
              ? 'معامله موفقی با پرداخت امن نداشته‌اید.'
              : tab === 'returned'
                ? 'معامله مرجوع‌شده‌ای ندارید.'
                : 'معامله لغو‌شده‌ای ندارید.'
        }
        hint="پس از توافق با طرف مقابل، وجه معامله را از طریق ایمچ پرداخت کنید تا تا تحویل بار نزد ایمچ امانت بماند."
      />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/60 px-4 py-3 text-xs leading-6 text-sky-700">
        <Info size={16} className="shrink-0" />
        با پرداخت امن، تا زمان دریافت بار توسط خریدار، وجه معامله نزد ایمچ محفوظ می‌ماند.
        <Button asChild size="sm" variant="outline" className="ms-auto rounded-md">
          <Link href="/panel/secure-deals/guide">راهنمای پرداخت امن</Link>
        </Button>
      </div>
    </div>
  );
}
