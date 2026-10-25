'use client';

/**
 * ارتقا عضویت — پلن‌های باسکول‌گونه (رایگان/عادی/ویژه)
 * + نردبان یک‌ماهه (۱۰۰ هزار تومان، کسر از کیف پول) به‌عنوان قابلیت تبلیغاتی ایمچ v1.
 */

import Link from 'next/link';
import { Check, Crown, Medal, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { LADDER_MONTHLY_PRICE, MIN_CHARGE } from '@/lib/mock/data';
import { priceFa } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Plan {
  key: string;
  name: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  price: number;
  period?: string;
  current?: boolean;
  highlight?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'رایگان',
    icon: Medal,
    price: 0,
    current: true,
    features: ['۵ آگهی محصول', 'پروفایل عمومی', 'دریافت پیام خریداران', 'نشان کردن خریداران'],
  },
  {
    key: 'basic',
    name: 'عادی',
    icon: Star,
    price: 290_000,
    period: 'ماهانه',
    features: ['۲۰ آگهی محصول', 'نردبان با ۲۰٪ تخفیف', 'نشان خریداران نامحدود', 'پشتیبانی اولویت‌دار', 'آمار بازدید آگهی‌ها'],
  },
  {
    key: 'special',
    name: 'ویژه',
    icon: Crown,
    price: 690_000,
    period: 'ماهانه',
    highlight: true,
    features: [
      'آگهی نامحدود',
      'نشان فروشنده ویژه روی آگهی‌ها',
      'خریداران پیشنهادی کامل (relatedByAdd)',
      'ارسال پیامک گروهی به خریداران',
      'پشتیبانی اختصاصی',
    ],
  },
] as const satisfies Plan[];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PanelCard>
        <h1 className="text-base font-extrabold sm:text-lg">ارتقا عضویت</h1>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          فروش سریع تر و آسان تر — برای دسترسی به تمام امکانات ویژه ایمچ، حساب کاربری خود را ارتقا دهید.
        </p>
      </PanelCard>

      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((p) => (
          <PanelCard
            key={p.key}
            className={cn(
              'relative flex flex-col',
              'highlight' in p && p.highlight && 'border-primary/50 ring-1 ring-primary/30',
            )}
          >
            {'highlight' in p && p.highlight && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                پیشنهاد ایمچ
              </span>
            )}
            <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
              <p.icon size={20} />
            </span>
            <p className="mt-3 text-sm font-extrabold">{p.name}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {p.price === 0 ? 'رایگان همیشه' : `${priceFa(p.price)} تومان / ${p.period}`}
            </p>
            <ul className="mt-4 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs leading-5">
                  <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
            {p.current ? (
              <Button variant="outline" className="mt-5 w-full rounded-md" disabled>
                پلن فعلی شما
              </Button>
            ) : (
              <Button
                className={cn('mt-5 w-full rounded-md', 'highlight' in p && p.highlight && '')}
                onClick={() => undefined}
                asChild
              >
                <Link href="/panel/wallet">ارتقا عضویت</Link>
              </Button>
            )}
          </PanelCard>
        ))}
      </div>

      <PanelCard className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-muted-foreground">
          نردبان هر محصول برای یک ماه {priceFa(LADDER_MONTHLY_PRICE)} است و هزینه آن از شارژ کیف پول کسر می‌شود —
          بدون نیاز به ارتقا. بنابراین حداقل شارژ کیف پول {priceFa(MIN_CHARGE)} می‌باشد.
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
            <Link href="/panel/wallet">شارژ کیف پول (کارت به کارت)</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
            <Link href="/panel/products">نردبان آگهی از محصولات من</Link>
          </Button>
        </div>
      </PanelCard>
    </div>
  );
}
