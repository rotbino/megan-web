'use client';

/**
 * کیف پول — پرداخت کارت به کارت (جایگزین درگاه پرداخت، خواسته کاربر):
 * ۱) انتخاب یکی از پکیج‌ها یا «سایر» (مبلغ دلخواه — خواسته مالک ۳۱-۱۰):
 *    پکیج‌ها/درصدها/حداقل شارژ دلخواه همه از تنظیمات پویای ادمین می‌آیند
 *    («تنظیمات کیف شارژ و مصرف شارژ») — هیچ عددی این‌جا hardcode نیست.
 * ۲) واریز مبلغ به کارت + بارگذاری تصویر فیش
 * ۳) ارسال فیش برای ادمین → پس از تایید در پنل ادمین، شارژ اعمال می‌شود
 *
 * ساختار مرتب (خواسته مالک TEST-D6):
 *  • تب «تراکنش‌ها» = فقط اقلام قطعی‌شده (شارژ تاییدشده + نردبان + اصلاح + ارسال گروهی)
 *  • تب «کارت به کارت» = فیش‌های خودم: در انتظار / تاییدشده / ردشده + دلیل رد + راهنمای اقدام
 *  • فیش ردشده هرگز به تراکنش‌ها نمی‌رود؛ کاربر دلیل و کار بعدی را اینجا می‌بیند.
 */

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Coins,
  Copy,
  CreditCard,
  Hourglass,
  ImagePlus,
  PencilRuler,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  useBillingConfig,
  useMyChargeOrders,
  usePanelProfile,
  useSubmitChargeRequest,
  useWalletTransactions,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PanelCard } from '@/components/panel/panel-parts';
import { AIMCH_CARD_NUMBER, AIMCH_CARD_OWNER } from '@/lib/mock/data';
import { dateFa, priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MyChargeOrder, WalletTransaction } from '@/lib/types';

/** درصد شارژ اضافه مبلغ دلخواه — از پله‌های تنظیمات پویا */
function tierPercent(amount: number, tiers: { aboveAmount: number; percent: number }[]): number {
  let percent = 0;
  for (const t of tiers) {
    if (amount > t.aboveAmount) percent = t.percent;
  }
  return percent;
}

export default function WalletPage() {
  const { data: profile } = usePanelProfile();
  const { data: transactions } = useWalletTransactions();
  const { data: chargeOrders } = useMyChargeOrders();
  const { data: billing } = useBillingConfig();
  const submitCharge = useSubmitChargeRequest();
  const { toast } = useToast();

  const [pkgKey, setPkgKey] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(null);
  const [sent, setSent] = useState<{ amount: number; charge: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // پکیج‌های زنده از تنظیمات ادمین — تا بارگیری، فرم غیرفعال است
  const packages = useMemo(
    () =>
      (billing?.chargePackages ?? []).map((p) => ({
        ...p,
        charge: Math.round(p.amount * (1 + p.bonusPercent / 100)),
      })),
    [billing],
  );

  // انتخاب پیش‌فرض — پکیج میانی (بهترین تعادل)؛ نبود → «سایر».
  // الگوی رسمی React (تنظیم حین رندر، بدون effect) — فقط بار اول
  if (packages.length > 0 && pkgKey === null) {
    setPkgKey(packages[Math.min(1, packages.length - 1)].key);
  }

  const customMin = billing?.customCharge.minAmount ?? 400_000;
  const customMax = billing?.customCharge.maxAmount ?? 100_000_000;
  const customTiers = billing?.customCharge.tiers ?? [];
  const maxBonus = customTiers.reduce((m, t) => Math.max(m, t.percent), 0);

  const isCustom = pkgKey === 'custom';
  const customNum = useMemo(() => {
    const en = customAmount.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const n = Math.round(Number(en.replace(/[^\d]/g, '')));
    return Number.isFinite(n) ? n : 0;
  }, [customAmount]);

  const fixedPkg = packages.find((p) => p.key === pkgKey);

  /** پکیج مؤثر — برای «سایر» از مبلغ واردشده محاسبه می‌شود */
  const pkg: { amount: number; bonusPercent: number; charge: number } | null = isCustom
    ? customNum >= customMin
      ? {
          amount: customNum,
          bonusPercent: tierPercent(customNum, customTiers),
          charge: Math.round(customNum * (1 + tierPercent(customNum, customTiers) / 100)),
        }
      : null
    : fixedPkg
      ? { amount: fixedPkg.amount, bonusPercent: fixedPkg.bonusPercent, charge: fixedPkg.charge }
      : null;

  const balance = profile?.userInfo.walletBalance ?? 0;
  const customError =
    isCustom && customNum > 0 && customNum < customMin
      ? `حداقل مبلغ شارژ دلخواه ${priceFa(customMin)} است.`
      : isCustom && customNum > customMax
        ? `حداکثر مبلغ شارژ دلخواه ${priceFa(customMax)} است.`
        : null;

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
    if (!pkg || !pkgKey) {
      toast({
        description:
          customError ?? 'مبلغ دلخواه را وارد کنید.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await submitCharge.mutateAsync({
        packageKey: pkgKey,
        receiptDataUrl: receipt.url,
        ...(isCustom ? { amount: customNum } : {}),
      });
      setSent({ amount: pkg.amount, charge: pkg.charge });
      setReceipt(null);
      setCustomAmount('');
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : 'خطا در ارسال فیش — دوباره تلاش کنید.', variant: 'destructive' });
    }
  };

  const pendingCount = chargeOrders?.filter((c) => c.status === 'pending').length ?? 0;

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
            <p className="mt-0.5 text-lg font-extrabold">{priceFa(balance)}</p>
          </div>
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">
          پکیج‌ها و درصدهای شارژ توسط مدیریت تعیین می‌شود؛ برای شارژ دلخواه (سایر) حداقل {priceFa(customMin)}
          (برابر گران‌ترین پکیج) است.
        </p>
      </PanelCard>

      {/* شارژ کارت به کارت */}
      <PanelCard className="space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-base font-extrabold sm:text-lg">
            <CreditCard size={19} className="text-primary" /> شارژ کیف پول — کارت به کارت
          </h1>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            یکی از پکیج‌های شارژ را انتخاب کنید یا با «سایر» مبلغ دلخواه خود را وارد کنید؛ مبلغ را کارت به کارت کنید و
            تصویر فیش را برای ما بفرستید. پس از تایید ادمین، شارژ (با احتساب درصد اضافه) به کیف پول شما اعمال می‌شود.
          </p>
        </div>

        {/* پکیج‌ها + سایر — همه از تنظیمات پویای ادمین */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="پکیج‌های شارژ">
          {packages.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={pkgKey === p.key}
              onClick={() => {
                setPkgKey(p.key);
                setSent(null);
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

          {/* سایر — مبلغ دلخواه (خواسته مالک ۳۱-۱۰) */}
          <button
            type="button"
            role="radio"
            aria-checked={isCustom}
            onClick={() => {
              setPkgKey('custom');
              setSent(null);
            }}
            className={cn(
              'relative flex flex-col items-center rounded-lg border-2 p-4 text-center transition-colors',
              isCustom ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
            )}
          >
            {maxBonus > 0 && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                تا {toFa(maxBonus)}٪ شارژ اضافه
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm font-extrabold">
              <PencilRuler size={15} className="text-primary" /> سایر
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">مبلغ دلخواه شما</span>
            <span
              className={cn(
                'mt-2 rounded-full px-2.5 py-1 text-[11px] font-bold',
                isCustom ? 'bg-emerald-50 text-emerald-600' : 'bg-secondary text-muted-foreground',
              )}
            >
              از {priceFa(customMin)}
            </span>
          </button>
        </div>

        {/* مبلغ دلخواه — فقط با «سایر» */}
        {isCustom && (
          <div className="space-y-2.5 rounded-lg border border-dashed border-primary/40 bg-primary/[0.03] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold">مبلغ دلخواه:</span>
              <div className="relative w-44">
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  value={customAmount ? customNum.toLocaleString('fa-IR') : ''}
                  onChange={(e) => {
                    const en = e.target.value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
                    const digits = en.replace(/[^\d]/g, '').slice(0, 11);
                    setCustomAmount(digits);
                  }}
                  placeholder="مثلاً ۵۰۰٬۰۰۰"
                  className="h-9 rounded-md pe-12 text-center font-num"
                  aria-label="مبلغ دلخواه شارژ (تومان)"
                />
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[10px] text-muted-foreground">
                  تومان
                </span>
              </div>
            </div>
            <p className="text-[11px] leading-5 text-muted-foreground">
              {customTiers.length > 0
                ? customTiers
                    .map((t, i) =>
                      i === 0 || t.aboveAmount === 0
                        ? `هر مبلغی → ${toFa(t.percent)}٪ شارژ اضافه`
                        : `بیش از ${priceFa(t.aboveAmount)} → ${toFa(t.percent)}٪ شارژ اضافه`,
                    )
                    .join('؛ ')
                : 'درصد شارژ اضافه پس از تعیین توسط مدیریت نمایش داده می‌شود.'}
            </p>
            {customError ? (
              <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600">{customError}</p>
            ) : pkg ? (
              <p className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] leading-5 text-emerald-700">
                با واریز <b>{priceFa(pkg.amount)}</b> تومان، <b>{priceFa(pkg.charge)}</b> تومان به کیف پول شما شارژ می‌شود
                ({toFa(pkg.bonusPercent)}٪ شارژ اضافه).
              </p>
            ) : (
              <p className="rounded-md bg-secondary px-2.5 py-1.5 text-[11px] text-muted-foreground">
                مبلغ دلخواه خود را وارد کنید تا شارژ اضافه محاسبه شود.
              </p>
            )}
          </div>
        )}

        {sent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-extrabold text-emerald-700">فیش شما با موفقیت ارسال شد.</p>
            <p className="mt-1.5 text-xs leading-6 text-emerald-700/90">
              وضعیت فیش را در تب <span className="font-bold">«کارت به کارت»</span> در پایین همین صفحه دنبال کنید؛
              پس از بررسی و تایید ادمین، {priceFa(sent.charge)} به کیف پول اضافه شده و در تراکنش‌ها ثبت می‌شود.
            </p>
            <Button variant="outline" size="sm" className="mt-3 rounded-md" onClick={() => setSent(null)}>
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
                    مبلغ{' '}
                    <span className="font-bold text-foreground">{pkg ? priceFa(pkg.amount) : '—'}</span> را به کارت زیر واریز کنید:
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
                      {pkg ? priceFa(pkg.charge) : '—'}
                      {pkg && pkg.bonusPercent > 0 && ` (${toFa(pkg.bonusPercent)}٪ شارژ اضافه)`}
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
                      <ReceiptText size={14} /> انتخاب تصویر فیش
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

            <Button className="w-full rounded-md" onClick={() => void sendReceipt()} disabled={submitCharge.isPending || !pkg}>
              {submitCharge.isPending ? 'در حال ارسال فیش…' : 'ارسال فیش برای تایید ادمین'}
            </Button>
          </>
        )}
      </PanelCard>

      {/* نردبان آگهی — تبلیغ جدا از شارژ (خواسته مالک ۳۱-۱۰: این مفهوم فقط
          در کیف پول بماند تا با بسته‌های اشتراک قاطی نشود)؛ قیمت از تنظیمات */}
      <PanelCard className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-600">
            <TrendingUp size={20} />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
              نردبان آگهی
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">
                {priceFa(billing?.ladder.monthlyPrice ?? 50_000)} / ماه — تا {toFa(billing?.ladder.maxMonths ?? 4)} ماه
              </span>
            </p>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              نردبان یعنی قرار گرفتن آگهی در صدر محصولات، حتی بالاتر از آگهی‌های ویژه. هزینه آن جداگانه و از همین کیف
              پول پرداخت می‌شود؛ برای فعال کردن، از «محصولات من» روی دکمه «نردبان» آگهی مورد نظر بزنید. اگر موجودی
              کافی ندارید، ابتدا یکی از پکیج‌های شارژ بالا را فعال کنید.
            </p>
          </div>
        </div>
        <div>
          <Button asChild size="sm" className="rounded-md text-xs">
            <Link href="/panel/products">نردبان آگهی از «محصولات من»</Link>
          </Button>
        </div>
      </PanelCard>

      {/* تاریخچه — دو تب: تراکنش‌های قطعی / فیش‌های کارت به کارت */}
      <PanelCard>
        <Tabs defaultValue="transactions">
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="transactions" className="gap-1.5">
              <ReceiptText size={14} /> تراکنش‌ها
            </TabsTrigger>
            <TabsTrigger value="charges" className="gap-1.5">
              <CreditCard size={14} /> کارت به کارت
              {pendingCount > 0 && (
                <span className="ms-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-700">
                  {toFa(pendingCount)}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── تب تراکنش‌ها: فقط اقلام قطعی‌شده ── */}
          <TabsContent value="transactions">
            {!transactions || transactions.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                هنوز تراکنشی ثبت نشده است — پس از تایید فیش کارت‌به‌کارت یا خرید نردبان، اینجا دیده می‌شود.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {transactions.map((t) => (
                  <TransactionRow key={t.id} t={t} />
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ── تب کارت به کارت: فیش‌های خودم + وضعیت + دلیل رد ── */}
          <TabsContent value="charges">
            {!chargeOrders || chargeOrders.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                فیشی برای بررسی نفرستاده‌اید — با فرم بالا شارژ کارت‌به‌کارت را شروع کنید.
              </p>
            ) : (
              <ul className="space-y-3">
                {chargeOrders.map((c) => (
                  <ChargeOrderRow key={c.id} c={c} />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </PanelCard>
    </div>
  );
}

/** ردیف تراکنش قطعی‌شده — نوع + جهت + مبلغ */
function TransactionRow({ t }: { t: WalletTransaction }) {
  const icon = t.type === 'card' ? CreditCard : t.incoming ? TrendingUp : TrendingDown;
  const Icon = icon;
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          t.incoming ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
        }`}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{t.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {dateFa(t.at)}
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
            {t.type === 'card' ? 'کارت به کارت' : t.type === 'ladder' ? 'نردبان' : t.type === 'offer' ? 'ارسال گروهی پیشنهاد' : 'اصلاح ادمین'}
          </span>
        </p>
      </div>
      <span className={cn('shrink-0 text-xs font-extrabold', t.incoming ? 'text-emerald-600' : 'text-red-500')}>
        {t.incoming ? '+' : '−'} {priceFa(t.amount)}
      </span>
    </li>
  );
}

/** ردیف فیش کارت‌به‌کارت — وضعیت (در انتظار/تایید/رد) + دلیل رد + راهنمای اقدام */
function ChargeOrderRow({ c }: { c: MyChargeOrder }) {
  return (
    <li
      className={cn(
        'rounded-lg border p-3',
        c.status === 'pending' ? 'border-amber-200 bg-amber-50/40' : c.status === 'rejected' ? 'border-red-200 bg-red-50/40' : 'border-emerald-200 bg-emerald-50/40',
      )}
    >
      <div className="flex items-center gap-3">
        {/* بندانگشتی فیش — کلیک = تصویر کامل */}
        {c.receipt ? (
          <a href={c.receipt.url} target="_blank" rel="noreferrer" className="shrink-0" aria-label="مشاهده فیش">
            <img
              src={c.receipt.thumbUrl || c.receipt.url}
              alt="فیش واریزی"
              className="size-14 rounded-md border object-cover transition-opacity hover:opacity-80"
            />
          </a>
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-md border bg-card text-muted-foreground">
            <ReceiptText size={18} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold">
            فیش شارژ {priceFa(c.amount)}
            {c.bonusPercent > 0 && <span className="text-[10px] text-muted-foreground"> ({toFa(c.bonusPercent)}٪ شارژ اضافه)</span>}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            ارسال: {dateFa(c.createdAt)}
            {c.status !== 'pending' && c.reviewedAt && <span> — بررسی: {dateFa(c.reviewedAt)}</span>}
          </p>
        </div>

        <StatusChip status={c.status} />
      </div>

      {/* شرح وضعیت + مبلغ تاییدی */}
      {c.status === 'pending' && (
        <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[10px] leading-5 text-amber-800">
          فیش شما در صف بررسی است؛ پس از تایید ادمین، {priceFa(c.charge)} به کیف پول اضافه شده و در تب «تراکنش‌ها» ثبت می‌شود.
        </p>
      )}
      {c.status === 'approved' && (
        <p className="mt-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[10px] leading-5 text-emerald-800">
          تایید شد — {priceFa(c.charge)} به کیف پول شما اضافه شد و در تراکنش‌ها ثبت شد.
        </p>
      )}

      {/* دلیل رد + راهنمای «حالا چه کنم؟» */}
      {c.status === 'rejected' && (
        <div className="mt-2 space-y-1.5">
          <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[10px] leading-5 text-red-800">
            <span className="font-extrabold">دلیل رد: </span>
            {c.rejectionReason || 'با پشتیبانی هماهنگ کنید.'}
          </p>
          <p className="rounded-md border border-dashed px-2.5 py-1.5 text-[10px] leading-5 text-muted-foreground">
            <span className="font-extrabold text-foreground">حالا چه کار کنید؟ </span>
            صحت شماره کارت، مبلغ واریزی و تصویر فیش را چک کنید و با فرم بالا فیش درست را دوباره بفرستید.
            اگر مطمئنید مبلغ واریز شده است، با پشتیبانی تماس بگیرید تا پیگیری شود.
          </p>
        </div>
      )}
    </li>
  );
}

function StatusChip({ status }: { status: MyChargeOrder['status'] }) {
  const map = {
    pending: { icon: Hourglass, text: 'در انتظار تایید', cls: 'bg-amber-100 text-amber-700' },
    approved: { icon: CheckCircle2, text: 'تایید شد', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { icon: XCircle, text: 'رد شد', cls: 'bg-red-100 text-red-700' },
  } as const;
  const { icon: Icon, text, cls } = map[status];
  return (
    <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold', cls)}>
      <Icon size={12} /> {text}
    </span>
  );
}

function StepNo({ n }: { n: number }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">
      {toFa(n)}
    </span>
  );
}
