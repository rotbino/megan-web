'use client';

/**
 * بسته شارژ تبلیغاتی — مدل درآمدی ایمچ (فقط نردبان، بدون پلن VIP):
 * ۱) شارژ کیف پول کارت به کارت (۳ پکیج با جایزه)
 * ۲) نردبان یک‌ماهه هر محصول (۱۰۰ هزار تومان، کسر از کیف پول)
 */

import Link from 'next/link';
import { ArrowLeft, BadgePercent, Check, Coins, CreditCard, TrendingUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { CHARGE_PACKAGES, LADDER_MONTHLY_PRICE, MIN_CHARGE } from '@/lib/mock/data';
import { priceFa } from '@/lib/format';

const LADDER_STEPS = [
  'از منوی «ایمچ من» صفحه «کیف پول» را انتخاب کنید و یکی از پکیج‌های شارژ را انتخاب کنید.',
  'مبلغ پکیج را به شماره کارت ایمچ کارت به کارت کنید و تصویر فیش را بارگذاری کنید.',
  'پس از تایید ادمین، شارژ به کیف پول شما اضافه می‌شود.',
  'از «محصولات من» روی دکمه «نردبان» آگهی مورد نظر کلیک کنید — هزینه از کیف پول کسر و نردبان یک ماه فعال می‌شود.',
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PanelCard>
        <h1 className="text-base font-extrabold sm:text-lg">بسته شارژ تبلیغاتی</h1>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          ایمچ اشتراک ماهانه یا عضویت ویژه ندارد — تمام امکانات برای همه یکسان است. تنها قابلیت تبلیغاتی،{' '}
          <b>نردبان</b> است: محصول شما برای یک ماه در صدر لیست محصولات همان دسته قرار می‌گیرد. هزینه نردبان{' '}
          {priceFa(LADDER_MONTHLY_PRICE)} است و از شارژ کیف پول کسر می‌شود.
        </p>
      </PanelCard>

      {/* نردبان */}
      <PanelCard className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp size={20} />
          </span>
          <div>
            <p className="text-sm font-extrabold">نردبان یک‌ماهه (۳۰ روز)</p>
            <p className="mt-1 text-lg font-extrabold text-primary">{priceFa(LADDER_MONTHLY_PRICE)}</p>
          </div>
        </div>
        <ul className="space-y-2">
          {[
            'قرارگرفتن آگهی در صدر لیست همان دسته‌بندی',
            'نمایش پیش از سایر آگهی‌ها به خریداران',
            'افزایش بازدید و شانس فروش در طول یک ماه',
            'بدون نیاز به تمدید دستی — فعال‌سازی با یک کلیک',
          ].map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-xs leading-5">
              <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              {f}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="rounded-md text-xs">
            <Link href="/panel/products">نردبان آگهی از محصولات من</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
            <Link href="/help/charge-package">راهنمای بسته شارژ و فواید نردبان</Link>
          </Button>
        </div>
      </PanelCard>

      {/* پکیج‌های شارژ */}
      <div className="grid gap-3 md:grid-cols-3">
        {CHARGE_PACKAGES.map((p) => (
          <PanelCard key={p.key} className="relative flex flex-col">
            {p.bonusPercent > 0 && (
              <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                <BadgePercent size={11} /> {p.bonusPercent}% جایزه
              </span>
            )}
            <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
              <Coins size={20} />
            </span>
            <p className="mt-3 text-sm font-extrabold">پرداخت {priceFa(p.amount)}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              شارژ کیف پول: <b className="text-foreground">{priceFa(p.charge)}</b>
            </p>
            <ul className="mt-4 flex-1 space-y-2">
              {[
                p.bonusPercent > 0 ? `${p.bonusPercent}% شارژ رایگان جایزه` : 'مناسب نردبان یک محصول',
                'پرداخت کارت به کارت با آپلود فیش',
                'کسر هزینه نردبان از همین شارژ',
              ].map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs leading-5">
                  <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-5 w-full rounded-md" size="sm">
              <Link href="/panel/wallet">
                <CreditCard size={14} className="ms-1" /> انتخاب پکیج و پرداخت
              </Link>
            </Button>
          </PanelCard>
        ))}
      </div>

      {/* مراحل */}
      <PanelCard className="space-y-3">
        <p className="text-sm font-extrabold">چگونه نردبان را فعال کنم؟</p>
        <ol className="space-y-2.5">
          {LADDER_STEPS.map((s, i) => (
            <li key={s} className="flex items-start gap-3 text-xs leading-6">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">
                {['۱', '۲', '۳', '۴'][i]}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Upload size={12} className="text-primary" />
          حداقل شارژ {priceFa(MIN_CHARGE)} است — برابر هزینه نردبان یک‌ماهه هر محصول.
        </p>
        <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
          <Link href="/panel/wallet">
            شارژ کیف پول (کارت به کارت) <ArrowLeft size={13} />
          </Link>
        </Button>
      </PanelCard>
    </div>
  );
}
