'use client';

/**
 * کیف پول / تاریخچه تراکنش‌ها — نمونه ماک (موجودی واقعی حساب: ۰ تومان).
 */

import { Coins, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { usePanelProfile } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { priceFa, dateFa } from '@/lib/format';

const TRANSACTIONS = [
  { id: 1, title: 'شارژ کیف پول', amount: 200_000, at: '2026-10-20 12:04', incoming: true },
  { id: 2, title: 'پرداخت نردبان — پسته اکبری (۳ روز)', amount: 30_000, at: '2026-10-21 09:18', incoming: false },
];

export default function WalletPage() {
  const { data: profile } = usePanelProfile();
  const { toast } = useToast();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PanelCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600">
            <Coins size={22} />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">موجودی کیف پول</p>
            <p className="mt-0.5 text-lg font-extrabold">
              {priceFa(profile?.userInfo.walletBalance ?? 0)} <span className="text-xs font-normal text-muted-foreground">تومان</span>
            </p>
          </div>
        </div>
        <Button className="rounded-md" onClick={() => toast({ description: 'درگاه پرداخت در نسخه بعدی فعال می‌شود. (نمونه)' })}>
          <Plus size={15} /> شارژ کیف پول
        </Button>
      </PanelCard>

      <PanelCard>
        <h1 className="mb-3 text-sm font-extrabold">تاریخچه تراکنش‌ها</h1>
        {TRANSACTIONS.length === 0 ? (
          <PanelEmptyState icon={Coins} title="تراکنشی ثبت نشده است." hint="شارژ و خرج کیف پول اینجا نمایش داده می‌شود." />
        ) : (
          <ul className="divide-y divide-border/70">
            {TRANSACTIONS.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    t.incoming ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}
                >
                  {t.incoming ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{t.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{dateFa(t.at)}</p>
                </div>
                <span className={`shrink-0 text-xs font-extrabold ${t.incoming ? 'text-emerald-600' : 'text-red-500'}`}>
                  {t.incoming ? '+' : '−'} {priceFa(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
