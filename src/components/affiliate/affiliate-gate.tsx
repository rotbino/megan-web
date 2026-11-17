'use client';

/**
 * گیت قرارداد بازاریابی — قبل از فعال شدن پنل، کاربر باید قرارداد را
 * بپذیرد. متن قرارداد با تنظیمات فعلی (درصد سهم، سال‌ها، منابع پرداخت)
 * داینامیک ساخته می‌شود؛ با تیک «می‌پذیرم» شرایط همان لحظه snapshot
 * می‌شود و تغییرات آتی ادمین شامل کاربر نمی‌شود.
 */

import { useState } from 'react';
import { Check, Loader2, Megaphone, ScrollText, Share2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { ContractText } from '@/components/affiliate/contract-text';
import { useAcceptAffiliateContract } from '@/lib/affiliate-hooks';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AffiliateSettings } from '@/lib/affiliate';

const STEPS: { icon: React.ComponentType<{ size?: number | string; className?: string }>; title: string; body: string }[] = [
  {
    icon: Share2,
    title: '۱. لینک دعوت بگیرید',
    body: 'پس از پذیرش قرارداد، کد رفرال و لینک اختصاصی شما فعال می‌شود.',
  },
  {
    icon: Megaphone,
    title: '۲. مشتریان را دعوت کنید',
    body: 'لینک را برای مشتریان و همکارانتان بفرستید؛ ثبت‌نام آنها به نام شما ثبت می‌شود.',
  },
  {
    icon: Wallet,
    title: '۳. سهم بگیرید',
    body: 'با تایید هر پرداخت دعوت‌شده‌ها، سهم شما به‌طور خودکار به کیف پول واریز می‌شود.',
  },
];

export function AffiliateGate({ settings }: { settings: AffiliateSettings }) {
  const [checked, setChecked] = useState(false);
  const acceptMutation = useAcceptAffiliateContract();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PanelCard>
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Megaphone size={22} />
          </span>
          <div>
            <h1 className="text-base font-extrabold sm:text-lg">بازاریابی ایمچ (همکاری در فروش)</h1>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              با معرفی ایمچ به مشتریان، از هر پرداخت تاییدشده‌ی آنها سهم بگیرید — بدون سرمایه‌گذاری.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-md border bg-secondary/30 p-3">
              <span className="grid size-9 place-items-center rounded-md bg-card text-primary shadow-sm">
                <Icon size={17} />
              </span>
              <p className="mt-2.5 text-xs font-bold">{title}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <ScrollText size={15} className="text-primary" />
          قرارداد بازاریابی
        </h2>
        <div className="max-h-80 overflow-y-auto rounded-md border bg-secondary/30 p-4">
          <ContractText settings={settings} />
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => setChecked((v) => !v)}
            className="flex w-full items-start gap-2.5 rounded-md border p-3 text-start text-xs leading-6 transition-colors hover:bg-secondary/40"
          >
            <span
              className={cn(
                'mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition-colors',
                checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
              )}
            >
              {checked && <Check size={13} strokeWidth={3} />}
            </span>
            <span>
              <b>قرارداد بازاریابی ایمچ را خواندم و کلیه شرایط آن را می‌پذیرم.</b>
              <span className="mt-0.5 block text-muted-foreground">
                سهم شما ({toFa(settings.level1Percent)}٪ مستقیم{settings.level2Percent > 0 ? ` و تا ${toFa(settings.level1Percent + settings.level2Percent)}٪ با زیرمجموعه` : ''}) و
                مدت {toFa(settings.commissionYears)} سال سهم‌بری، در همین لحظه برای شما ثبت می‌شود.
              </span>
            </span>
          </button>

          <Button
            className="w-full rounded-md"
            size="lg"
            disabled={!checked || acceptMutation.isPending}
            onClick={() => acceptMutation.mutate(undefined)}
          >
            {acceptMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Megaphone size={17} />}
            {acceptMutation.isPending ? 'در حال ثبت…' : 'می‌پذیرم — شروع بازاریابی'}
          </Button>

          <p className="text-center text-[11px] leading-5 text-muted-foreground">
            نقش «بازاریاب» سیستمی است و مستقل از نقش شما در بازار؛ تغییری در حساب فروشندگی/خریداری شما ایجاد نمی‌کند.
          </p>
        </div>
      </PanelCard>
    </div>
  );
}
