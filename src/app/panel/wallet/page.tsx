'use client';

/**
 * کیف پول — پرداخت کارت به کارت (جایگزین درگاه پرداخت، خواسته کاربر):
 * ۱) انتخاب یکی از ۳ پکیج: ۱۰۰ هزار / ۲۰۰ هزار (۱۰٪ شارژ اضافه) / ۴۰۰ هزار (۲۰٪ شارژ اضافه)
 * ۲) واریز مبلغ به کارت ایمچ + بارگذاری تصویر فیش
 * ۳) ارسال فیش برای ادمین → پس از تایید در پنل ادمین، شارژ اعمال می‌شود
 * + تاریخچه تراکنش‌ها (کارت به کارت‌ها تا تایید «در انتظار تایید» هستند).
 */

import { useRef, useState } from 'react';
import { Coins, Copy, CreditCard, Hourglass, ImagePlus, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react';
import { usePanelProfile, useWalletTransactions, useSubmitChargeRequest } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { AIMCH_CARD_NUMBER, AIMCH_CARD_OWNER, CHARGE_PACKAGES, MIN_CHARGE } from '@/lib/mock/data';
import { dateFa, priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ChargePackage } from '@/lib/types';

export default function WalletPage() {
  const { data: profile } = usePanelProfile();
  const { data: transactions } = useWalletTransactions();
  const submitCharge = useSubmitChargeRequest();
  const { toast } = useToast();

  const [pkgKey, setPkgKey] = useState<ChargePackage['key']>('p200');
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pkg = CHARGE_PACKAGES.find((p) => p.key === pkgKey)!;
  const balance = profile?.userInfo.walletBalance ?? 0;

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(AIMCH_CARD_NUMBER.replace(/-/g, ''));
      toast({ description: 'شماره کارت کپی شد.' });
    } catch {
      toast({ description: `شماره کارت: ${AIMCH_CARD_NUMBER}` });
    }
  };

  const pickReceipt = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|jpg|png|webp)/.test(file.type)) {
      toast({ description: 'فیش باید تصویر (jpeg، jpg، png یا webp) باشد.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ description: 'حجم فیش باید کمتر از ۵ مگابایت باشد.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReceipt({ url: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  };

  const sendReceipt = async () => {
    if (!receipt) {
      toast({ description: 'ابتدا تصویر فیش واریزی را بارگذاری کنید.' });
      return;
    }
    try {
      await submitCharge.mutateAsync({ packageKey: pkgKey, receiptDataUrl: receipt.url });
      setSent(true);
      setReceipt(null);
    } catch {
      toast({ description: 'خطا در ارسال فیش — دوباره تلاش کنید.' });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* موجودی */}
      <PanelCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600">
            <Coins size={22} />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">موجودی کیف پول</p>
            <p className="mt-0.5 text-lg font-extrabold">
              {priceFa(balance)}
            </p>
          </div>
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">
          حداقل شارژ کیف پول {priceFa(MIN_CHARGE)} است — برابر هزینه نردبان یک‌ماهه هر محصول.
        </p>
      </PanelCard>

      {/* شارژ کارت به کارت */}
      <PanelCard className="space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-base font-extrabold sm:text-lg">
            <CreditCard size={19} className="text-primary" /> شارژ کیف پول — کارت به کارت
          </h1>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            یکی از پکیج‌های شارژ را انتخاب کنید، مبلغ را کارت به کارت کنید و تصویر فیش را برای ما بفرستید؛
            پس از تایید ادمین، شارژ به کیف پول شما اعمال می‌شود.
          </p>
        </div>

        {/* پکیج‌ها */}
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="پکیج‌های شارژ">
          {CHARGE_PACKAGES.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={pkgKey === p.key}
              onClick={() => {
                setPkgKey(p.key);
                setSent(false);
              }}
              className={cn(
                'relative flex flex-col items-center rounded-lg border-2 p-4 text-center transition-colors',
                pkgKey === p.key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
              )}
            >
              {p.bonusPercent > 0 && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {toFa(p.bonusPercent)}٪ شارژ اضافه
                </span>
              )}
              <span className="text-sm font-extrabold">{priceFa(p.amount)}</span>
              <span className="mt-1 text-[11px] text-muted-foreground">پرداخت کارت به کارت</span>
              <span
                className={cn(
                  'mt-2 rounded-full px-2.5 py-1 text-[11px] font-bold',
                  p.bonusPercent > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-secondary text-muted-foreground',
                )}
              >
                {p.bonusPercent > 0 ? `شارژ ${priceFa(p.charge)}` : 'بدون شارژ اضافه'}
              </span>
            </button>
          ))}
        </div>

        {sent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-extrabold text-emerald-700">فیش شما با موفقیت ارسال شد.</p>
            <p className="mt-1.5 text-xs leading-6 text-emerald-700/90">
              پس از بررسی و تایید توسط ادمین ایمچ، {priceFa(pkg.charge)} به کیف پول شما اضافه می‌شود.
              وضعیت تراکنش تا آن زمان «در انتظار تایید» است.
            </p>
            <Button variant="outline" size="sm" className="mt-3 rounded-md" onClick={() => setSent(false)}>
              شارژ مجدد
            </Button>
          </div>
        ) : (
          <>
            {/* راهنمای واریز */}
            <div className="rounded-lg bg-secondary/60 p-4">
              <p className="text-xs font-bold">مراحل شارژ:</p>
              <ol className="mt-2 space-y-2 text-[11px] leading-5 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <StepNo n={1} />
                  <span>
                    مبلغ <span className="font-bold text-foreground">{priceFa(pkg.amount)}</span> را به کارت ایمچ واریز کنید:
                  </span>
                </li>
              </ol>
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
                <span dir="ltr" className="flex-1 text-center text-base font-extrabold tracking-widest">
                  {AIMCH_CARD_NUMBER.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}
                </span>
                <Button size="sm" variant="outline" className="rounded-md" onClick={() => void copyCard()}>
                  <Copy size={14} /> کپی شماره کارت
                </Button>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">به نام: {AIMCH_CARD_OWNER}</p>
              <ol className="mt-2 space-y-2 text-[11px] leading-5 text-muted-foreground" start={2}>
                <li className="flex items-start gap-2">
                  <StepNo n={2} />
                  <span>تصویر فیش رسید واریزی را در کادر پایین بارگذاری کنید.</span>
                </li>
                <li className="flex items-start gap-2">
                  <StepNo n={3} />
                  <span>
                    فیش برای ادمین ارسال می‌شود؛ پس از تایید،{' '}
                    <span className="font-bold text-foreground">
                      {priceFa(pkg.charge)}
                      {pkg.bonusPercent > 0 && ` (${toFa(pkg.bonusPercent)}٪ شارژ اضافه)`}
                    </span>{' '}
                    به کیف پول شما اضافه می‌شود.
                  </span>
                </li>
              </ol>
            </div>

            {/* بارگذاری فیش */}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
                aria-label="بارگذاری فیش واریزی"
              >
                {receipt ? (
                  <>
                    {/* پیش‌نمایش فیش بارگذاری‌شده */}
                    <img src={receipt.url} alt="فیش واریزی" className="max-h-28 rounded-md border" />
                    <span className="mt-2 max-w-full truncate text-[11px] text-muted-foreground">{receipt.name}</span>
                    <span className="mt-0.5 text-[10px] text-primary">برای تغییر، کلیک کنید</span>
                  </>
                ) : (
                  <>
                    <span className="grid size-12 place-items-center rounded-full bg-white text-primary shadow-sm">
                      <ImagePlus size={22} />
                    </span>
                    <span className="mt-2 flex items-center gap-1.5 text-xs font-bold">
                      <ReceiptText size={14} /> تصویر فیش را اینجا رها کنید
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">یا کلیک کنید — jpeg/jpg/png/webp، حداکثر ۵ مگابایت</span>
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  pickReceipt(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            <Button className="w-full rounded-md" onClick={() => void sendReceipt()} disabled={submitCharge.isPending}>
              {submitCharge.isPending ? 'در حال ارسال فیش…' : 'ارسال فیش برای تایید ادمین'}
            </Button>
          </>
        )}
      </PanelCard>

      {/* تاریخچه تراکنش‌ها */}
      <PanelCard>
        <h2 className="mb-3 text-sm font-extrabold">تاریخچه تراکنش‌ها</h2>
        {!transactions || transactions.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            هیچ تراکنشی انجام نداده‌اید.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    t.pendingAdmin ? 'bg-amber-50 text-amber-600' : t.incoming ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}
                >
                  {t.pendingAdmin ? <Hourglass size={16} /> : t.incoming ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{t.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {dateFa(t.at)}
                    {t.pendingAdmin && ' — در انتظار تایید ادمین'}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-xs font-extrabold',
                    t.pendingAdmin ? 'text-amber-600' : t.incoming ? 'text-emerald-600' : 'text-red-500',
                  )}
                >
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

function StepNo({ n }: { n: number }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">
      {toFa(n)}
    </span>
  );
}
