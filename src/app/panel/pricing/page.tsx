'use client';

/**
 * بسته‌های اشتراک ایمچ — کمپین‌محور (بازطراحی ۳۱-۱۰ به درخواست مالک):
 *  • گرید auto-fit — اگر ادمین بسته‌ای را از دید خارج کند، بقیه کارت‌ها
 *    عرض صفحه دسکتاپ را کامل پر می‌کنند.
 *  • کارت خلوتر: قیمت اصلی بالا با فونت بزرگ و رنگ غلیظ (با تخفیف خط‌خورده)،
 *    قیمت نهایی با همان وضوح زیرش، بج درصد بزرگ، بدون «تومان در ماه».
 *  • امکانات هر بسته با فونت بزرگ‌تر (به‌خصوص دسکتاپ).
 *  • نردبان از این صفحه حذف شد — فقط در کیف پول (جدا بودن دو مفهوم).
 *  • پرداخت کارت به کارت + فیش → تأیید ادمین؛ خرید در حین بسته فعال =
 *    رزرو با امتداد از انقضای فعلی (مالکان فعلی محروم نمی‌شوند).
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Check,
  Copy,
  CreditCard,
  Crown,
  Hourglass,
  ImagePlus,
  Infinity as InfinityIcon,
  Lock,
  Megaphone,
  Percent,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  useMembershipPlans,
  useMyPackage,
  useMyPackageOrders,
  useSubmitPackageOrder,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AIMCH_CARD_NUMBER,
  AIMCH_CARD_OWNER,
  FREE_PACKAGE,
  PAID_PLAN_FEATURES,
} from '@/lib/mock/data';
import { dateFa, priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CampaignTier, MembershipPlan, MyPackageOrder, SalesCampaignInfo } from '@/lib/types';

/** ردیف امکانات بسته رایگان — ✓ دارد یا ✗ ندارد (قابل مقایسه با پولی‌ها) */
const FREE_ROWS: Array<{ label: string; included: boolean }> = [
  { label: `ثبت تا ${toFa(FREE_PACKAGE.features.productCapacity)} محصول`, included: true },
  { label: 'ثبت درخواست خرید (هر تعداد که خواستید)', included: true },
  { label: 'انتشار آگهی در بازار ایمچ', included: true },
  { label: 'دسترسی به شماره تماس خریداران', included: false },
  { label: 'خریداران پیشنهادی (تطبیق با آگهی‌های شما)', included: false },
  { label: 'نشان فروشنده ویژه روی محصولات و پروفایل', included: false },
];

/** درصد پیشرفت پله جاری کمپین تعدادی — برای نوار پیشرفت بنر */
function tierProgress(campaign: SalesCampaignInfo): number {
  const t = campaign.currentTier;
  if (!t) return 0;
  if (t.to == null) return 100;
  const size = t.to - t.from + 1;
  if (size <= 0) return 100;
  return Math.min(100, Math.round((t.boughtInTier / size) * 100));
}

/** پله‌های نمایشی بنر — پله‌های تعریف‌شده + پله عمومی «تا پایان کمپین»
 *  (خواسته مالک ۳۱-۱۰: بعد از نفر آخرِ پله‌ها هم تخفیف عمومی ادامه دارد). */
function displayTiers(campaign: SalesCampaignInfo): CampaignTier[] {
  const tiers = [...campaign.tiers];
  const last = tiers[tiers.length - 1];
  if (
    campaign.finalPercent != null &&
    last != null &&
    last.to != null
  ) {
    tiers.push({ from: last.to + 1, to: null, percent: campaign.finalPercent });
  }
  return tiers;
}

/** بنر کمپین فعال — عنوان + شعار + درصد + پایان + پیشرفت تعدادی (خواسته مالک ۳۱-۱۰) */
function CampaignBanner({ campaign }: { campaign: SalesCampaignInfo }) {
  const daysLeft = campaign.endsAt
    ? Math.max(0, Math.ceil((new Date(campaign.endsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <section
      aria-label="کمپین فروش فعال"
      className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-l from-red-50 via-amber-50/70 to-red-50 p-5 sm:p-6"
    >
      {/* لهجه دکور */}
      <span className="pointer-events-none absolute -left-8 -top-10 size-36 rounded-full bg-red-500/10 blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-12 -right-6 size-32 rounded-full bg-amber-400/15 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-md">
          <Megaphone size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-red-700 sm:text-lg">{campaign.title}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[12px] font-extrabold text-white shadow-sm">
              <Percent size={12} strokeWidth={2.6} /> {toFa(campaign.discountPercent)}٪ تخفیف
            </span>
            {daysLeft !== null && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                {daysLeft > 0 ? `تنها ${toFa(daysLeft)} روز مانده` : 'آخرین روز!'}
              </span>
            )}
          </div>
          {campaign.description && (
            <p className="mt-2 max-w-2xl text-xs leading-6 text-red-900/75 sm:text-[13px]">
              {campaign.description}
            </p>
          )}

          {/* کمپین تعدادی — گزارش زنده: چند نفر خریدن + چند جا مانده (خواسته مالک ۳۱-۱۰) */}
          {campaign.type === 'quantity' && campaign.currentTier && (
            <div className="mt-3 max-w-xl">
              {campaign.currentTier.to != null ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12.5px] font-extrabold text-red-800">
                    <span className="flex items-center gap-1.5">
                      <Users size={15} className="text-red-600" />
                      {toFa(campaign.purchaseCount)} نفر خریدند
                    </span>
                    <span>
                      تخفیف {toFa(campaign.currentTier.percent)}٪ فقط برای{' '}
                      <span className="text-red-600">{toFa(campaign.currentTier.spotsLeft ?? 0)} نفر دیگر</span>
                      مانده
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all"
                      style={{ width: `${tierProgress(campaign)}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-red-800">
                  <Users size={15} className="text-red-600" />
                  {toFa(campaign.purchaseCount)} نفر خریدند — از نفر{' '}
                  {toFa(campaign.currentTier.from)} به بعد تا پایان کمپین:{' '}
                  <span className="text-red-600">{toFa(campaign.currentTier.percent)}٪ تخفیف</span>
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {displayTiers(campaign).map((t, i) => (
                  <span
                    key={i}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-bold',
                      campaign.currentTier && t.from === campaign.currentTier.from
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-red-700/80 ring-1 ring-red-200',
                    )}
                  >
                    {t.to == null
                      ? `بعد از نفر ${toFa(t.from - 1)}: ${toFa(t.percent)}٪ تا پایان کمپین`
                      : `نفر ${toFa(t.from)}${t.from === t.to ? '' : ` تا ${toFa(t.to)}`}: ${toFa(t.percent)}٪`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  const { toast } = useToast();
  const { data: planData, isLoading: plansLoading } = useMembershipPlans();
  const { data: myPackage } = useMyPackage();
  const { data: orders } = useMyPackageOrders();
  const submitOrder = useSubmitPackageOrder();

  const [buying, setBuying] = useState<MembershipPlan | null>(null);
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const plans = planData?.plans ?? [];
  const campaign = planData?.campaign ?? null;

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
    if (!buying || !receipt) {
      toast({ description: 'ابتدا تصویر فیش واریزی را بارگذاری کنید.' });
      return;
    }
    try {
      await submitOrder.mutateAsync({ planKey: buying.key, receiptDataUrl: receipt.url });
      setSent(true);
      setReceipt(null);
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : 'خطا در ارسال فیش — دوباره تلاش کنید.' });
    }
  };

  const closeDialog = () => {
    setBuying(null);
    setReceipt(null);
    setSent(false);
  };

  const planTitle = (t: number) => (t === 1 ? 'دو ماهه' : t === 2 ? 'شش ماهه' : 'یک‌ساله');

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* بنر کمپین فعال — بالای بسته‌ها (خواسته مالک ۳۱-۱۰) */}
      {campaign && campaign.discountPercent > 0 && <CampaignBanner campaign={campaign} />}

      {/* بسته فعال من */}
      <PanelCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'grid size-12 place-items-center rounded-md border',
              myPackage?.isActive
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-border bg-secondary text-muted-foreground',
            )}
          >
            {myPackage?.isActive ? <Crown size={22} /> : <ShieldCheck size={22} />}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">بسته فعلی شما</p>
            <p className="mt-0.5 text-base font-extrabold">
              {myPackage?.isActive
                ? `اشتراک ${myPackage.planTitle ?? planTitle(myPackage.pakageType)}`
                : 'رایگان (همیشگی)'}
            </p>
          </div>
        </div>
        <div className="text-left text-[11px] leading-5 text-muted-foreground">
          {myPackage?.isActive ? (
            <>
              اعتبار: <b className="text-foreground">{toFa(myPackage.daysLeft ?? 0)} روز</b>
              {myPackage.expiresAt && <span className="block">تا {dateFa(myPackage.expiresAt)}</span>}
            </>
          ) : (
            <>
              ثبت تا <b className="text-foreground">{toFa(FREE_PACKAGE.features.productCapacity)} محصول</b> — بدون دسترسی به خریداران
            </>
          )}
          {!!myPackage?.pendingCount && (
            <span className="mt-1 flex items-center gap-1 text-amber-600">
              <Hourglass size={12} /> {toFa(myPackage.pendingCount)} فیش در انتظار بررسی
            </span>
          )}
        </div>
      </PanelCard>

      {/* کارت‌های بسته — رایگان + پولی‌ها (از جدول Plan ادمین).
          گرید auto-fit: با حذف/مخفی شدن هر بسته، بقیه کارت‌ها عرض صفحه را
          کامل پر می‌کنند (خواسته مالک ۳۱-۱۰). */}
      {plansLoading ? (
        <div className="h-40 animate-pulse rounded-xl border bg-card" />
      ) : (
        <div
          className="grid items-stretch gap-4 lg:gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))' }}
        >
          {/* ── رایگان ── */}
          <div className="relative flex flex-col rounded-xl border bg-card p-6">
            <p className="text-center text-[15px] font-extrabold">{FREE_PACKAGE.title}</p>
            <p className="mt-4 text-center">
              <span className="font-num text-[26px] font-black text-primary">رایگان</span>
              <span className="ms-1.5 text-xs text-muted-foreground">برای همیشه</span>
            </p>
            <Button asChild variant="outline" size="sm" className="mx-auto mt-5 w-full rounded-md text-xs">
              <Link href="/panel">{myPackage?.isActive ? 'بسته جایگزین رایگان' : 'بسته فعلی شما'}</Link>
            </Button>
            <ul className="mt-6 flex-1 space-y-3 border-t pt-5">
              {FREE_ROWS.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-[12.5px] leading-6 lg:text-[13.5px]">
                  {f.included ? (
                    <Check size={16} className="mt-1 shrink-0 text-emerald-600" />
                  ) : (
                    <X size={16} className="mt-1 shrink-0 text-red-400" />
                  )}
                  <span className={cn(!f.included && 'text-muted-foreground/80')}>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── پولی‌ها — قیمت اصلی (بالا/غلیظ/خط‌خورده) + قیمت نهایی (خواسته مالک ۳۱-۱۰) ── */}
          {plans.map((p) => {
            const active = myPackage?.isActive && myPackage.pakageType === p.pakageType;
            const percent = p.discountPercent ?? 0;
            const finalAmount = p.finalAmount ?? p.amount;
            const features = p.features?.length ? p.features : PAID_PLAN_FEATURES;
            return (
              <div
                key={p.key}
                className={cn(
                  'relative flex flex-col rounded-xl border p-6',
                  p.bestSeller ? 'border-amber-300 shadow-md' : 'bg-card',
                )}
              >
                {p.bestSeller && (
                  <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white">
                    <Sparkles size={12} /> پرفروش‌ترین
                  </span>
                )}
                {active && (
                  <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white">
                    <BadgeCheck size={12} /> فعال شما
                  </span>
                )}
                <p className="text-center text-[15px] font-extrabold">اشتراک {p.title}</p>

                {/* بلوک قیمت — بج درصد بزرگ + قیمت اصلی خط‌خورده + قیمت نهایی */}
                <div className="mt-4 flex flex-col items-center gap-1.5">
                  {percent > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-[17px] font-black text-white shadow-sm">
                      <Percent size={16} strokeWidth={2.8} /> {toFa(percent)}٪ تخفیف
                    </span>
                  )}
                  <p className="mt-1 flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        'font-num text-[24px] font-black leading-none sm:text-[27px]',
                        percent > 0 && 'text-neutral-800 line-through decoration-red-600 decoration-[3px]',
                      )}
                    >
                      {toFa(p.amount)}
                    </span>
                    <span className="text-xs text-muted-foreground">تومان</span>
                  </p>
                  {percent > 0 && (
                    <p className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-num text-[26px] font-black leading-none text-emerald-600 sm:text-[30px]">
                        {toFa(finalAmount)}
                      </span>
                      <span className="text-xs font-bold text-emerald-700/80">تومان</span>
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  className={cn(
                    'mx-auto mt-5 w-full rounded-md text-xs',
                    p.bestSeller && 'bg-amber-500 hover:bg-amber-600',
                  )}
                  onClick={() => setBuying(p)}
                >
                  <CreditCard size={14} className="ms-1" /> انتخاب و پرداخت
                </Button>
                <ul className="mt-6 flex-1 space-y-3 border-t pt-5">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12.5px] leading-6 lg:text-[13.5px]">
                      <Check size={16} className="mt-1 shrink-0 text-emerald-600" />
                      {f}
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-[12.5px] leading-6 lg:text-[13.5px]">
                    <InfinityIcon size={16} className="mt-1 shrink-0 text-emerald-600" />
                    تمدید خودکار اعتبار با خرید مجدد (امتداد از انقضای فعلی)
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* سفارش‌های من */}
      <PanelCard>
        <p className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <ReceiptText size={16} className="text-primary" /> سفارش‌های بسته من
        </p>
        {!orders || orders.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            هنوز سفارش بسته‌ای ثبت نکرده‌اید — با دکمه «انتخاب و پرداخت» بالا شروع کنید.
          </p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <PackageOrderRow key={o.id} o={o} />
            ))}
          </ul>
        )}
      </PanelCard>

      {/* دیالوگ خرید کارت به کارت */}
      <Dialog open={Boolean(buying)} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="rounded-lg sm:max-w-md">
          {sent ? (
            <>
              <DialogHeader>
                <DialogTitle>فیش شما ارسال شد</DialogTitle>
                <DialogDescription>
                  فیش خرید بسته {buying?.title} ثبت شد و پس از بررسی و تأیید ادمین، بسته روی حساب شما فعال
                  می‌شود. وضعیت را در «سفارش‌های بسته من» دنبال کنید.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" className="rounded-md" onClick={closeDialog}>
                  بستن
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>خرید اشتراک {buying?.title} — کارت به کارت</DialogTitle>
                <DialogDescription>
                  مبلغ را کارت به کارت کنید و تصویر فیش را بفرستید؛ پس از تأیید ادمین بسته فعال می‌شود.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {/* رزرو — دارندگان بسته فعال از جشنواره محروم نمی‌شوند (خواسته مالک ۳۱-۱۰) */}
                {myPackage?.isActive && myPackage.expiresAt && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
                    <b>خرید شما به‌عنوان رزرو ثبت می‌شود:</b> چون الان بسته فعال دارید، اعتبار این خرید از تاریخ
                    انقضای فعلی ({dateFa(myPackage.expiresAt)}) شروع و به آن اضافه می‌شود — هیچ روزی از اعتبار شما هدر
                    نمی‌رود.
                  </p>
                )}

                {/* مبلغ + کارت */}
                <div className="rounded-lg bg-secondary/60 p-3">
                  <p className="text-xs leading-6">
                    ۱) مبلغ{' '}
                    <b className="font-num text-[15px] font-black text-foreground">
                      {buying && toFa(buying.finalAmount ?? buying.amount)} تومان
                    </b>{' '}
                    را به کارت زیر واریز کنید:
                    {buying && (buying.discountPercent ?? 0) > 0 && (
                      <span className="ms-1 text-[10.5px] text-red-600">
                        (با {toFa(buying.discountPercent ?? 0)}٪ تخفیف{' '}
                        <span className="line-through">{toFa(buying.amount)}</span>)
                      </span>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border bg-card p-2.5">
                    <span dir="ltr" className="flex-1 text-center text-sm font-extrabold tracking-widest">
                      {AIMCH_CARD_NUMBER.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}
                    </span>
                    <Button size="sm" variant="outline" className="rounded-md" onClick={() => void copyCard()}>
                      <Copy size={13} /> کپی
                    </Button>
                  </div>
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">به نام: {AIMCH_CARD_OWNER}</p>
                  <p className="mt-2 text-xs">۲) تصویر فیش رسید واریزی را بارگذاری کنید:</p>
                </div>

                {/* بارگذاری فیش */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-5 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
                  aria-label="بارگذاری فیش واریزی"
                >
                  {receipt ? (
                    <>
                      <img src={receipt.url} alt="فیش واریزی" className="max-h-24 rounded-md border" />
                      <span className="mt-1.5 max-w-full truncate text-[10px] text-muted-foreground">{receipt.name}</span>
                      <span className="text-[10px] text-primary">برای تغییر، کلیک کنید</span>
                    </>
                  ) : (
                    <>
                      <span className="grid size-10 place-items-center rounded-full bg-white text-primary shadow-sm">
                        <ImagePlus size={18} />
                      </span>
                      <span className="mt-1.5 text-xs font-bold">انتخاب تصویر فیش</span>
                      <span className="text-[10px] text-muted-foreground">jpeg/jpg/png/webp — حداکثر ۵ مگابایت</span>
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

              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" className="rounded-md" onClick={closeDialog}>
                  انصراف
                </Button>
                <Button
                  size="sm"
                  className="rounded-md"
                  disabled={!receipt || submitOrder.isPending}
                  onClick={() => void sendReceipt()}
                >
                  {submitOrder.isPending ? 'در حال ارسال…' : 'ارسال فیش برای تایید ادمین'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** ردیف سفارش بسته — وضعیت (در انتظار/تایید/رد) + دلیل رد + فیش + تخفیف کمپین */
function PackageOrderRow({ o }: { o: MyPackageOrder }) {
  return (
    <li
      className={cn(
        'rounded-lg border p-3',
        o.status === 'pending'
          ? 'border-amber-200 bg-amber-50/40'
          : o.status === 'rejected'
            ? 'border-red-200 bg-red-50/40'
            : 'border-emerald-200 bg-emerald-50/40',
      )}
    >
      <div className="flex items-center gap-3">
        {o.receipt ? (
          <a href={o.receipt.url} target="_blank" rel="noreferrer" className="shrink-0" aria-label="مشاهده فیش">
            <img
              src={o.receipt.thumbUrl || o.receipt.url}
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
          <p className="text-xs font-bold">اشتراک {o.months === 2 ? 'دو ماهه' : o.months === 6 ? 'شش ماهه' : o.months === 12 ? 'یک‌ساله' : `${toFa(o.months)} ماهه`}</p>
          <p className="mt-0.5 text-[10px] leading-5 text-muted-foreground">
            {priceFa(o.amount)}
            {(o.discountPercent ?? 0) > 0 && o.baseAmount ? (
              <span className="ms-1 text-red-600">
                (با {toFa(o.discountPercent ?? 0)}٪ تخفیف <span className="line-through">{priceFa(o.baseAmount)}</span>
                {o.campaignTitle ? ` — ${o.campaignTitle}` : ''})
              </span>
            ) : null}
            {' '}— ارسال: {dateFa(o.createdAt)}
            {o.status === 'approved' && o.expiresAt && <span> — اعتبار تا {dateFa(o.expiresAt)}</span>}
          </p>
        </div>
        <OrderStatusChip status={o.status} />
      </div>
      {o.status === 'pending' && (
        <p className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-[10px] leading-5 text-amber-800">
          <Lock size={11} className="shrink-0" /> فیش شما در صف بررسی است؛ پس از تایید ادمین بسته فعال می‌شود.
        </p>
      )}
      {o.status === 'rejected' && (
        <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-[10px] leading-5 text-red-800">
          <span className="font-extrabold">دلیل رد: </span>
          {o.rejectionReason || 'با پشتیبانی هماهنگ کنید.'}
        </p>
      )}
    </li>
  );
}

function OrderStatusChip({ status }: { status: MyPackageOrder['status'] }) {
  const map = {
    pending: { icon: Hourglass, text: 'در انتظار تایید', cls: 'bg-amber-100 text-amber-700' },
    approved: { icon: Check, text: 'تایید شد', cls: 'bg-emerald-100 text-emerald-700' },
    rejected: { icon: XCircle, text: 'رد شد', cls: 'bg-red-100 text-red-700' },
  } as const;
  const { icon: Icon, text, cls } = map[status];
  return (
    <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold', cls)}>
      <Icon size={12} /> {text}
    </span>
  );
}
