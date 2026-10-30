'use client';

/**
 * بسته‌های اشتراک ایمچ — مدل درآمدی جدید (خواسته مالک):
 *  • بسته رایگانِ همیشگی: ثبت تا ۱۰ محصول + درخواست خرید نامحدود؛ بدون دیدن خریداران.
 *  • بسته‌های پولی (الگوی کارت باسکول): ۲ ماهه ۱۹۹ / ۶ ماهه ۴۹۹ / یک‌ساله ۷۹۹ هزار تومان
 *    — ثبت نامحدود محصول + دسترسی نامحدود به همه خریداران + نشان فروشنده ویژه.
 *  • پرداخت کارت به کارت + فیش → تأیید ادمین → بسته فعال/تمدید می‌شود.
 *  • نردبان (۵۰هزار/ماه از کیف پول) همچنان جدا از اشتراک باقی است.
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
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import { useMyPackage, useMyPackageOrders, useSubmitPackageOrder } from '@/lib/mock/hooks';
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
  MEMBERSHIP_PLANS,
  PAID_PLAN_FEATURES,
} from '@/lib/mock/data';
import { dateFa, priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MembershipPlan, MyPackageOrder } from '@/lib/types';

/** ردیف امکانات بسته رایگان — ✓ دارد یا ✗ ندارد (قابل مقایسه با پولی‌ها) */
const FREE_ROWS: Array<{ label: string; included: boolean }> = [
  { label: `ثبت تا ${toFa(FREE_PACKAGE.features.productCapacity)} محصول`, included: true },
  { label: 'ثبت درخواست خرید (هر تعداد که خواستید)', included: true },
  { label: 'انتشار آگهی در بازار ایمچ', included: true },
  { label: 'دسترسی به شماره تماس خریداران', included: false },
  { label: 'خریداران پیشنهادی (تطبیق با آگهی‌های شما)', included: false },
  { label: 'نشان فروشنده ویژه روی محصولات و پروفایل', included: false },
];

export default function PricingPage() {
  const { toast } = useToast();
  const { data: myPackage } = useMyPackage();
  const { data: orders } = useMyPackageOrders();
  const submitOrder = useSubmitPackageOrder();

  const [buying, setBuying] = useState<MembershipPlan | null>(null);
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    <div className="mx-auto max-w-5xl space-y-4">
      {/* بسته فعال من */}
      <PanelCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'grid size-12 place-items-center rounded-md border',
              myPackage?.isActive
                ? 'border-amber-200 bg-amber-50 text-amber-500'
                : 'border-border bg-secondary text-muted-foreground',
            )}
          >
            {myPackage?.isActive ? <Crown size={22} /> : <ShieldCheck size={22} />}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">بسته فعلی شما</p>
            <p className="mt-0.5 text-base font-extrabold">
              {myPackage?.isActive ? `اشتراک ${planTitle(myPackage.pakageType)}` : 'رایگان (همیشگی)'}
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

      {/* کارت‌های بسته — الگوی باسکول: رایگان + ۲/۶/۱۲ ماهه */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {/* ── رایگان ── */}
        <div className="relative flex flex-col rounded-xl border bg-card p-5">
          <p className="text-center text-sm font-extrabold">{FREE_PACKAGE.title}</p>
          <p className="mt-3 text-center">
            <span className="text-xl font-black text-primary">رایگان</span>
            <span className="ms-1 text-[11px] text-muted-foreground">برای همیشه</span>
          </p>
          <Button asChild variant="outline" size="sm" className="mx-auto mt-4 w-full rounded-md text-xs">
            <Link href="/panel">{myPackage?.isActive ? 'بسته جایگزین رایگان' : 'بسته فعلی شما'}</Link>
          </Button>
          <ul className="mt-5 flex-1 space-y-2.5">
            {FREE_ROWS.map((f) => (
              <li key={f.label} className="flex items-start gap-1.5 text-[11.5px] leading-5">
                {f.included ? (
                  <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <X size={14} className="mt-0.5 shrink-0 text-red-400" />
                )}
                <span className={cn(!f.included && 'text-muted-foreground/80')}>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── پولی‌ها ── */}
        {MEMBERSHIP_PLANS.map((p) => {
          const active = myPackage?.isActive && myPackage.pakageType === p.pakageType;
          return (
            <div
              key={p.key}
              className={cn(
                'relative flex flex-col rounded-xl border p-5',
                p.bestSeller ? 'border-amber-300 shadow-md' : 'bg-card',
              )}
            >
              {p.bestSeller && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  <Sparkles size={11} /> پرفروش‌ترین
                </span>
              )}
              {active && (
                <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  <BadgeCheck size={11} /> فعال شما
                </span>
              )}
              <p className="text-center text-sm font-extrabold">اشتراک {p.title}</p>
              <p className="mt-3 text-center">
                <span className="font-num text-xl font-black">{priceFa(p.amount)}</span>
              </p>
              <p className="mt-1 text-center text-[10px] text-muted-foreground">
                {priceFa(Math.round(p.amount / p.months))} در ماه
              </p>
              <Button
                size="sm"
                className={cn(
                  'mx-auto mt-4 w-full rounded-md text-xs',
                  p.bestSeller && 'bg-amber-500 hover:bg-amber-600',
                )}
                onClick={() => setBuying(p)}
              >
                <CreditCard size={14} className="ms-1" /> انتخاب و پرداخت
              </Button>
              <ul className="mt-5 flex-1 space-y-2.5">
                {PAID_PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11.5px] leading-5">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
                <li className="flex items-start gap-1.5 text-[11.5px] leading-5">
                  <InfinityIcon size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  تمدید خودکار اعتبار با خرید مجدد (امتداد از انقضای فعلی)
                </li>
              </ul>
            </div>
          );
        })}
      </div>

      {/* نردبان — جدا از اشتراک */}
      <PanelCard className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <TrendingUp size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold">نردبان آگهی — جدا از بسته‌های اشتراک</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              نردبان یعنی قرار گرفتن آگهی در صدر محصولات، حتی بالاتر از آگهی‌های ویژه. هزینه آن به‌صورت جداگانه از کیف
              پول پرداخت می‌شود و به اشتراک ربطی ندارد؛ پس از آگهی‌های نردبانی و ویژه، بقیه آگهی‌ها بر اساس جدیدترین
              به‌روزرسانی نمایش داده می‌شوند. این امکان به‌ویژه برای فروشندگانی که تعداد کالای کمی دارند به‌صرفه‌تر و
              مؤثرتر است. برای فعال کردن، از «محصولات من» روی دکمه «نردبان» آگهی مورد نظر بزنید.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
            <Link href="/panel/products">نردبان از محصولات من</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
            <Link href="/panel/wallet">شارژ کیف پول (کارت به کارت)</Link>
          </Button>
        </div>
      </PanelCard>

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
                {/* مبلغ + کارت */}
                <div className="rounded-lg bg-secondary/60 p-3">
                  <p className="text-xs">
                    ۱) مبلغ <b className="text-foreground">{buying && priceFa(buying.amount)}</b> را به کارت زیر
                    واریز کنید:
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

/** ردیف سفارش بسته — وضعیت (در انتظار/تایید/رد) + دلیل رد + فیش */
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
          <p className="text-xs font-bold">اشتراک {o.months === 2 ? 'دو ماهه' : o.months === 6 ? 'شش ماهه' : 'یک‌ساله'}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {priceFa(o.amount)} — ارسال: {dateFa(o.createdAt)}
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
