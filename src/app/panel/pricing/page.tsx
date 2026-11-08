'use client';

/**
 * بسته‌های اشتراک ایمچ — دو حالت (خواستهٔ مالک ۸-۱۱):
 *  • دارندهٔ بستهٔ فعال: بستهٔ خریداری‌شده دیگر بین کارت‌ها گم نمی‌شود —
 *    فقط کارت بزرگ «بستهٔ فعلی شما» دیده می‌شود (دونات روزهای باقی‌مانده
 *    + امکانات) و زیرش آکاردئون جمع‌شوندهٔ «خرید بسته رزرو» قرار دارد که
 *    با باز شدنش گرید بسته‌ها برای خرید رزرو ظاهر می‌شود؛ بنر کمپین هم
 *    (مثل «تخفیف خوش آمد گویی») زیر همین آکاردئون است — دارندهٔ بسته بالای
 *    صفحه هیچ محتوای تبلیغاتی نمی‌بیند (دور ۲۸).
 *  • بدون بسته: همان گرید کمپین‌محور (بازطراحی ۳۱-۱۰) — رایگان + پولی‌ها.
 *  • پرداخت کارت به کارت + فیش → تأیید ادمین؛ خرید در حین بسته فعال =
 *    رزرو با امتداد از انقضای فعلی (مالکان فعلی محروم نمی‌شوند).
 *  • نردبان از این صفحه حذف شده — فقط در کیف پول (جدا بودن دو مفهوم).
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
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
import { VipDonut } from '@/components/panel/vip-donut';
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
import type { CampaignTier, MembershipPlan, MyPackage, MyPackageOrder, SalesCampaignInfo } from '@/lib/types';

/** ردیف امکانات بسته رایگان — ✓ دارد یا ✗ ندارد (قابل مقایسه با پولی‌ها) */
const FREE_ROWS: Array<{ label: string; included: boolean }> = [
  { label: `ثبت تا ${toFa(FREE_PACKAGE.features.productCapacity)} محصول`, included: true },
  { label: 'ثبت درخواست خرید (هر تعداد که خواستید)', included: true },
  { label: 'انتشار آگهی در بازار ایمچ', included: true },
  { label: `تماس روزانه با تا ${toFa(FREE_PACKAGE.features.dailyCallLimit)} کاربر`, included: true },
  { label: 'دسترسی به شماره تماس خریداران', included: false },
  { label: 'خریداران مرتب‌شده بر اساس تطابق با آگهی‌های شما', included: false },
  { label: 'نشان فروشنده ویژه روی محصولات و پروفایل', included: false },
];

/** عنوان فارسی مدت بسته از pakageType */
const planTitle = (t: number) => (t === 1 ? 'دو ماهه' : t === 2 ? 'شش ماهه' : 'یک‌ساله');

/** ردیف‌های امکانات یک پلن — از ادمین؛ سهمیهٔ تماس روزانه همیشه دیده می‌شود
 *  حتی اگر ردیف‌های ادمین قدیمی باشند (خواستهٔ مالک ۱-۱۱) */
function planFeatureRows(p: MembershipPlan): string[] {
  const features = p.features?.length ? [...p.features] : [...PAID_PLAN_FEATURES];
  const hasCallRow = features.some((f) => f.startsWith('تماس روزانه'));
  return hasCallRow ? features : [...features, 'تماس روزانه با تا ۳۰ کاربر ایمچ'];
}

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
                        : 'bg-card text-red-700/80 ring-1 ring-red-200',
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

/** کارت بستهٔ پولی — دو حالت: خرید عادی و رزرو (دارندهٔ بستهٔ فعال، خواستهٔ مالک ۸-۱۱).
 *  قیمت اصلی بالا با فونت بزرگ و رنگ غلیظ (با تخفیف خط‌خورده)، قیمت نهایی با
 *  همان وضوح زیرش، بج درصد بزرگ (خواسته مالک ۳۱-۱۰). */
function PlanCard({
  p,
  reserve = false,
  isCurrent = false,
  onBuy,
}: {
  p: MembershipPlan;
  reserve?: boolean;
  isCurrent?: boolean;
  onBuy: (p: MembershipPlan) => void;
}) {
  const percent = p.discountPercent ?? 0;
  const finalAmount = p.finalAmount ?? p.amount;
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border p-6',
        p.bestSeller ? 'border-amber-300 bg-card shadow-md' : 'bg-card',
      )}
    >
      {p.bestSeller && (
        <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold text-white">
          <Sparkles size={12} /> پرفروش‌ترین
        </span>
      )}
      {reserve && isCurrent && (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white">
          <BadgeCheck size={12} /> همین بسته فعلی
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
        onClick={() => onBuy(p)}
      >
        <CreditCard size={14} className="ms-1" /> {reserve ? 'رزرو این بسته' : 'انتخاب و پرداخت'}
      </Button>
      <ul className="mt-6 flex-1 space-y-3 border-t pt-5">
        {planFeatureRows(p).map((f) => (
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
}

/** کارت بزرگ «بستهٔ فعلی شما» — تنها بستهٔ قابل مشاهده برای دارندهٔ بستهٔ فعال؛
 *  تا وقتی کاربر بسته دارد بستهٔ خریده‌اش بین کارت‌های فروش گم نمی‌شود (خواستهٔ مالک ۸-۱۱). */
function ActivePackageCard({ pkg, plan }: { pkg: MyPackage; plan?: MembershipPlan }) {
  const daysLeft = pkg.daysLeft ?? 0;
  const totalDays = pkg.totalDays ?? null;
  const hasDonut = totalDays != null && totalDays > 0 && daysLeft >= 0;
  const rows = plan ? planFeatureRows(plan) : [...PAID_PLAN_FEATURES];

  return (
    <section className="relative overflow-hidden rounded-xl border border-amber-300/80 bg-card p-5 shadow-md sm:p-6">
      {/* لهجه دکور */}
      <span className="pointer-events-none absolute -left-10 -top-14 size-44 rounded-full bg-amber-400/15 blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-16 -right-8 size-40 rounded-full bg-amber-300/15 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-center justify-between gap-x-5 gap-y-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-amber-400 text-white shadow-md ring-1 ring-amber-500/50">
            <Crown size={26} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                <BadgeCheck size={12} /> بسته فعال شما
              </span>
              {!!pkg.pendingCount && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                  <Hourglass size={12} /> {toFa(pkg.pendingCount)} فیش در انتظار بررسی
                </span>
              )}
            </div>
            <p className="mt-1.5 text-lg font-extrabold sm:text-xl">
              اشتراک {pkg.planTitle ?? planTitle(pkg.pakageType)}
            </p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              {pkg.expiresAt ? (
                <>
                  اعتبار تا <b className="text-foreground">{dateFa(pkg.expiresAt)}</b>
                </>
              ) : (
                <>
                  اعتبار: <b className="text-foreground">{toFa(daysLeft)} روز</b>
                </>
              )}
            </p>
          </div>
        </div>
        {hasDonut ? (
          <VipDonut daysLeft={daysLeft} totalDays={totalDays as number} size={88} />
        ) : (
          <span className="grid shrink-0 place-items-center rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 text-center">
            <b className="font-num text-2xl font-black leading-tight text-red-600">{toFa(daysLeft)}</b>
            <span className="text-[10px] font-bold text-muted-foreground">روز مانده</span>
          </span>
        )}
      </div>

      {/* امکانات بستهٔ فعلی — همان ردیف‌های کارت فروش (یادآوری ارزش بسته) */}
      <ul className="relative mt-5 grid gap-x-6 gap-y-3 border-t pt-5 sm:grid-cols-2">
        {rows.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12.5px] leading-6 lg:text-[13.5px]">
            <Check size={16} className="mt-1 shrink-0 text-emerald-600" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** آکاردئون «خرید بسته رزرو» — تنها مسیر خریدِ دارندهٔ بستهٔ فعال (خواستهٔ مالک ۸-۱۱):
 *  جمع‌شده تا صفحه خلوت بماند؛ با باز شدن، گرید بسته‌ها برای خرید رزرو می‌آید.
 *  دور ۲۸ (خواستهٔ مالک ۸-۱۱): بنر کمپین (مثل «تخفیف خوش آمد گویی») هم
 *  زیر همین اسلایدر پنهان‌شونده می‌نشیند — دارندهٔ بسته دیگر بالای صفحه
 *  محتوای تبلیغاتی نمی‌بیند. */
function ReserveSection({
  plans,
  plansLoading,
  currentType,
  campaign,
  onBuy,
}: {
  plans: MembershipPlan[];
  plansLoading: boolean;
  currentType: number;
  /** بنر کمپین فعال — برای دارندهٔ بسته فقط داخل همین آکاردئون دیده می‌شود */
  campaign: SalesCampaignInfo | null;
  onBuy: (p: MembershipPlan) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!plansLoading && plans.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 p-4 text-start transition-colors hover:bg-secondary/40 sm:p-5"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <CalendarClock size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">خرید بسته رزرو</span>
          <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">
            اعتبار بستهٔ جدید از تاریخ پایان بستهٔ فعلی شروع و به آن اضافه می‌شود
          </span>
        </span>
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-muted-foreground/70 transition-transform duration-300', open && 'rotate-180')}
        />
      </button>

      {/* بازشو — انیمیشن با grid-rows (بدون محاسبهٔ ارتفاع)؛ invisible در حالت
          بسته تا دکمه‌های داخلش در ترتیب تب باقی نمانند */}
      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          open ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t p-4 sm:p-5">
            {/* بنر کمپین — زیر همان اسلایدر (دور ۲۸): خرید رزرو هم از تخفیف کمپین
                بهره می‌برد؛ دارندهٔ بسته فقط همین‌جا آن را می‌بیند */}
            {campaign && campaign.discountPercent > 0 && (
              <div className="mb-4">
                <CampaignBanner campaign={campaign} />
              </div>
            )}
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
              خرید شما به‌عنوان <b>رزرو</b> ثبت می‌شود؛ پس از تأیید ادمین، اعتبار آن به انتهای بستهٔ فعلی
              شما اضافه می‌شود — هیچ روزی هدر نمی‌رود.
            </p>
            {plansLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-secondary/50" />
            ) : (
              <div
                className="grid items-stretch gap-4 lg:gap-5"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))' }}
              >
                {plans.map((p) => (
                  <PlanCard key={p.key} p={p} reserve isCurrent={p.pakageType === currentType} onBuy={onBuy} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  const { toast } = useToast();
  const { data: planData, isLoading: plansLoading } = useMembershipPlans();
  const { data: myPackage, isLoading: myPkgLoading } = useMyPackage();
  const { data: orders } = useMyPackageOrders();
  const submitOrder = useSubmitPackageOrder();

  const [buying, setBuying] = useState<MembershipPlan | null>(null);
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const plans = planData?.plans ?? [];
  const campaign = planData?.campaign ?? null;
  const currentPlan = myPackage?.isActive
    ? plans.find((p) => p.pakageType === myPackage.pakageType)
    : undefined;

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

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* بنر کمپین فقط برای بی‌بسته‌ها بالای صفحه است؛ دارندهٔ بستهٔ فعال آن را
          زیر آکاردئون «خرید بسته رزرو» می‌بیند (خواستهٔ مالک ۸-۱۱ دور ۲۸) */}
      {campaign && campaign.discountPercent > 0 && !myPkgLoading && !myPackage?.isActive && (
        <CampaignBanner campaign={campaign} />
      )}

      {myPkgLoading ? (
        /* اسکلت تا روشن شدن وضعیت بسته — بدون فلاش گرید فروش برای دارندهٔ بسته */
        <div className="space-y-5">
          <div className="h-44 animate-pulse rounded-xl border bg-card" />
          <div className="h-20 animate-pulse rounded-xl border bg-card" />
        </div>
      ) : myPackage?.isActive ? (
        /* ── دارندهٔ بستهٔ فعال (خواستهٔ مالک ۸-۱۱): فقط بستهٔ خودش + آکاردئون رزرو ── */
        <>
          <ActivePackageCard pkg={myPackage} plan={currentPlan} />
          <ReserveSection
            plans={plans}
            plansLoading={plansLoading}
            currentType={myPackage.pakageType}
            campaign={campaign}
            onBuy={setBuying}
          />
        </>
      ) : (
        /* ── بدون بسته: گرید رایگان + پولی‌ها (کمپین‌محور ۳۱-۱۰) ── */
        <>
          <PanelCard className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
                <ShieldCheck size={22} />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">بسته فعلی شما</p>
                <p className="mt-0.5 text-base font-extrabold">رایگان (همیشگی)</p>
              </div>
            </div>
            <div className="text-left text-[11px] leading-5 text-muted-foreground">
              ثبت تا <b className="text-foreground">{toFa(FREE_PACKAGE.features.productCapacity)} محصول</b> — بدون
              دسترسی به خریداران
              {!!myPackage?.pendingCount && (
                <span className="mt-1 flex items-center gap-1 text-amber-600">
                  <Hourglass size={12} /> {toFa(myPackage.pendingCount)} فیش در انتظار بررسی
                </span>
              )}
            </div>
          </PanelCard>

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
                  <Link href="/panel">بسته فعلی شما</Link>
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

              {/* ── پولی‌ها ── */}
              {plans.map((p) => (
                <PlanCard key={p.key} p={p} onBuy={setBuying} />
              ))}
            </div>
          )}
        </>
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

      {/* دیالوگ خرید/رزرو کارت به کارت */}
      <Dialog open={Boolean(buying)} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="rounded-lg sm:max-w-md">
          {sent ? (
            <>
              <DialogHeader>
                <DialogTitle>فیش شما ارسال شد</DialogTitle>
                <DialogDescription>
                  {myPackage?.isActive
                    ? `فیش رزرو بسته ${buying?.title} ثبت شد؛ پس از تأیید ادمین، اعتبار آن از تاریخ پایان بسته فعلی به حساب شما اضافه می‌شود. وضعیت را در «سفارش‌های بسته من» دنبال کنید.`
                    : `فیش خرید بسته ${buying?.title} ثبت شد و پس از بررسی و تأیید ادمین، بسته روی حساب شما فعال می‌شود. وضعیت را در «سفارش‌های بسته من» دنبال کنید.`}
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
                <DialogTitle>
                  {myPackage?.isActive
                    ? `رزرو اشتراک ${buying?.title} — کارت به کارت`
                    : `خرید اشتراک ${buying?.title} — کارت به کارت`}
                </DialogTitle>
                <DialogDescription>
                  {myPackage?.isActive
                    ? 'مبلغ را کارت به کارت کنید و تصویر فیش را بفرستید؛ پس از تأیید ادمین، اعتبار این بسته از پایان بسته فعلی شما شروع می‌شود.'
                    : 'مبلغ را کارت به کارت کنید و تصویر فیش را بفرستید؛ پس از تأیید ادمین بسته فعال می‌شود.'}
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
