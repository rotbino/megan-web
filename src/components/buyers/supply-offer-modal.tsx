'use client';

/**
 * مودال/فرم پیشنهاد تامین (بازطراحی مالک ۱-۱۱؛ ۶-۱۱):
 *  • دکمهٔ ارسال روی کارت «همیشه» فعال است — هر نیاز خرید از ابتدا به یک
 *    دستهٔ آخر (برگ) وصل است؛ دستهٔ کالا از خود کارت می‌آید و بالای مودال
 *    خیلی واضح می‌آید: «پیشنهاد تامین برنج».
 *  • «نوع {دسته}» با مثالِ خود دسته (اختیاری) و «حداقل سفارش» با واحدِ
 *    همان دسته.
 *  • فیلد توضیحات مهم‌ترین فیلد است — متن آزاد + «نمونهٔ پارامتریک» زیر فیلد.
 *  • شرایط تامین ساختاریافته: سوییچ «پرداخت با چک» فقط با روشن‌شدنش
 *    «درصد چک» و «حداکثر سرسید چک» را ظاهر می‌کند؛ سوییچ «ارسال به محل»
 *    فقط «پرداخت‌کنندهٔ حمل» را.
 *  • فرم مینیمال (خواسته مالک ۶-۱۱): سهمیه و قیمتِ ازپیش‌محاسبه حذف شد —
 *    هزینهٔ ارسال گروهی همان لحظهٔ ارسال از کیف پول کسر می‌شود و در پیام
 *    موفقیت اعلام می‌شود؛ اگر موجودی کم باشد، بک‌اند خطای شفاف می‌دهد و
 *    مودال شارژ همین‌جا باز می‌شود.
 *  • تکی: نمونهٔ شخصی؛ گروهی: نمونهٔ عمومی و همه‌کالا (بدون نام خریدار).
 *  • بدنهٔ فرم (SupplyOfferForm) بین مودال تکی و گام سومِ ویزار گروهی
 *    مشترک است تا رفتار و متن‌ها یکی بمانند.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Banknote, ChevronDown, Copy, FileText, Loader2, Plus, Send, Truck, Users } from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useGroupSendSupplyOffer, useSendSupplyOffer } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { ApiError } from '@/lib/api/client';
import { priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  PERIOD_LABELS,
  type BuyerDirectoryItem,
  type Category,
  type Product,
  type SupplyOfferTerms,
} from '@/lib/types';

/** واحد → صفت هر واحدی: کیلوگرم → کیلویی، تن → تنی … (مثل «کیلویی ۵۰ هزار تومان») */
const UNIT_ADJ: Record<string, string> = {
  کیلوگرم: 'کیلویی',
  کیلو: 'کیلویی',
  تن: 'تنی',
  گرم: 'گرمی',
  عدد: 'عددی',
  بسته: 'بسته‌ای',
  کیسه: 'کیسه‌ای',
  لیتر: 'لیتری',
  متر: 'متری',
};

/** قیمت خوانا با حروف: ۵۰۰۰۰ → «۵۰ هزار تومان»، ۳۷۰۰۰۰۰ → «۳ میلیون و ۷۰۰ هزار تومان» */
export function priceWordsFa(toman: number): string {
  if (toman >= 1_000_000) {
    const millions = Math.floor(toman / 1_000_000);
    const rest = toman % 1_000_000;
    return rest > 0
      ? `${toFa(millions)} میلیون و ${priceWordsFa(rest)}`
      : `${toFa(millions)} میلیون تومان`;
  }
  if (toman >= 1000 && toman % 1000 === 0) return `${toFa(toman / 1000)} هزار تومان`;
  return priceFa(toman);
}

/** جملات مشترک نمونه — چیزهایی که هر خریدار عمده قبل از پاسخ می‌پرسد */
const PAYMENT_LINE = '• پرداخت: نقدی هنگام تحویل یا کارت به کارت؛ برای همکاری دوره‌ای، چک نیز قابل قبول است';

/** نمونهٔ پارامتریک پیشنهاد تامین — همهٔ قطعات از دیتا (خواستهٔ مالک ۱-۱۱ شب دوم).
 *  جاهای خالی به‌جای براکت، جملهٔ قابل‌ارسال دارند تا اگر کاربر همین را بفرستد
 *  متن ناتمام به نظر نرسد. */
export function buildOfferSample(opts: {
  targets: BuyerDirectoryItem[];
  sellerName: string;
  products?: Product[];
  /** دستهٔ آخرِ هدف — کالای پیشنهاد از ابتدا مشخص است */
  category?: Category | null;
}): string {
  const { targets, sellerName, products, category } = opts;
  if (targets.length === 0) return '';
  const isGroup = targets.length > 1;

  // ─── گروهی: عمومی — بدون نام خریدار؛ با دستهٔ برگ انتخابی کالا روشن است ───
  if (isGroup) {
    // حوزهٔ کاری فروشنده از آگهی‌های تأییدشده‌اش (حداکثر دو کالا)
    const confirmed = products?.filter((p) => p.status === 'confirmed') ?? [];
    const names = [...new Set(confirmed.map((p) => p.subCategoryName || p.categoryName))].slice(0, 2);
    const field = category?.categoryName ?? (names.length ? names.join(' و ') : 'کالای مورد نیاز شما');

    return [
      'سلام؛',
      '',
      `${sellerName} هستم، فروشندهٔ عمدهٔ ${field}.`,
      '',
      '• عرضهٔ مستقیم و بدون واسطه با کیفیت تضمینی',
      '• قیمت رقابتی و شفاف؛ پیش‌فاکتور رسمی با جزئیات کامل صادر می‌کنم',
      '• بسته‌بندی و حداقل سفارش مطابق درخواست شما',
      PAYMENT_LINE,
      '• ارسال: باربری به سراسر کشور؛ هزینهٔ حمل بر اساس حجم سفارش توافقی است',
      '• تخفیف ویژه برای خرید دوره‌ای و مشتریان همیشگی',
      '',
      'کالا و حجم مورد نیاز خود را همین‌جا در چت بنویسید تا قیمت و شرایط دقیق را برایتان بفرستم.',
    ].join('\n');
  }

  // ─── تکی: شخصی‌سازی کامل بر اساس دیتای کارت و آگهی‌های خود فروشنده ───
  const first = targets[0];
  // آگهی تأییدشدهٔ فروشنده در همین نیاز خریدار — اول دستهٔ برگ، بعد دستهٔ پدر
  const confirmed = products?.filter((p) => p.status === 'confirmed');
  const match =
    confirmed?.find((p) => p.subCategoryId === first.categoryId) ??
    confirmed?.find((p) => p.categoryId === first.categoryId);

  // کالا — نام آگهی خود فروشنده (مثل «سیب زمینی آگریا») یا نیاز خریدار
  const goods = match?.productName ?? category?.categoryName ?? first.categoryName;

  // واحد و قیمت واقعی آگهی فروشنده — وگرنه جملهٔ قابل‌ارسال، نه عدد ساختگی
  const unit = match?.unit ?? first.unit;
  const unitAdj = UNIT_ADJ[unit] ?? `هر ${unit}`;
  const price = match?.minSalePrice ?? null;
  const minOrder = match && match.minSaleAmount > 0 ? `${toFa(match.minSaleAmount)} ${match.unit}` : null;
  const periodWord = PERIOD_LABELS[first.period] ?? 'دوره‌ای';

  return [
    `سلام جناب ${first.buyerName}؛`,
    '',
    `${sellerName} هستم، فروشندهٔ عمدهٔ ${goods}.`,
    '',
    `• کالا: ${goods} — با کیفیت تضمینی`,
    price != null
      ? `• قیمت: ${unitAdj} ${priceWordsFa(price)} (برای حجم بالاتر قابل توافق)`
      : '• قیمت: قیمت روز بازار؛ بر اساس حجم و دورهٔ خرید شما اعلام می‌شود',
    `• حداقل سفارش: ${minOrder ?? 'مطابق نیاز شما؛ حجم درخواستی شما کاملاً قابل تامین است'}`,
    PAYMENT_LINE,
    '• ارسال: باربری به سراسر کشور؛ هزینهٔ حمل بر اساس حجم سفارش توافقی است',
    `• تخفیف: برای خرید ${periodWord} شما ۵ درصد تخفیف در نظر می‌گیرم`,
    '• در صورت تمایل، قبل از خرید عمده می‌توانید نمونهٔ کوچک کالا را دریافت کنید',
    '',
    'اگر پیشنهاد مناسب است، همین‌جا در چت پاسخ بدهید تا عکس کالا و جزئیات دقیق‌تر را برایتان بفرستم.',
  ].join('\n');
}

/** فیلد عددی فشرده با پسوند چسبیده (٪ / روز / واحد دسته) — الگوی UnitInput، کوچک‌شده برای مودال */
export function NumField({
  value,
  onChange,
  suffix,
  ariaLabel,
  placeholder,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  ariaLabel: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <input
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const d = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
          onChange(d ? Number(d).toLocaleString('en-US') : '');
        }}
        className={cn(
          'font-num h-9 w-full rounded-md border border-input bg-card text-center text-sm font-bold tabular-nums outline-none transition-colors focus:border-primary',
          'ps-14 pe-2',
          invalid && 'border-red-400 focus:border-red-400',
        )}
      />
      <span className="font-num pointer-events-none absolute inset-y-0 left-2 flex items-center whitespace-nowrap text-[11px] font-bold text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

/** فرم مشترک پیشنهاد تامین — مودال تکی و گام سوم ویزار گروهی هر دو از این
 *  استفاده می‌کنند تا متن‌ها، اعتبارسنجی و جریان ارسال یکی بماند. */
export function SupplyOfferForm({
  targets,
  products,
  category,
  onSent,
  onCancel,
}: {
  /** یک هدف = تکی؛ بیشتر = گروهی */
  targets: BuyerDirectoryItem[];
  /** آگهی‌های خود فروشنده — برای پرکردن پارامترهای نمونه (کالا/واحد/قیمت) */
  products?: Product[];
  /** دستهٔ آخرِ هدف — نوع/حداقل سفارش از آن */
  category: Category | null;
  /** پس از ارسال موفق — شناسهٔ خریدارانی که پیام گرفتند */
  onSent?: (buyerIds: string[]) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [showSample, setShowSample] = useState(false);
  // ─── شرایط ساختاریافته ───
  const [productType, setProductType] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [checkOn, setCheckOn] = useState(false);
  const [checkPercent, setCheckPercent] = useState('50');
  const [checkDays, setCheckDays] = useState('60');
  const [deliveryOn, setDeliveryOn] = useState(false);
  const [shipBy, setShipBy] = useState<'seller' | 'customer' | null>(null);
  const sendOne = useSendSupplyOffer();
  const sendGroup = useGroupSendSupplyOffer();
  // الگوی همیشگی ۱-۱۱: کمبود موجودی → مودال «شارژ کیف پول» (بستن + شارژ)
  const [needWallet, setNeedWallet] = useState(false);

  // ─── گیت کالا (خواسته مالک ۴-۱۱) ───
  // فروشنده باید همان گروه کالا را در محصولات خودش داشته باشد؛ برای نوعِ
  // واردشده هم همین‌طور — «برای تامین سیب قرمز باید این کالا را داشته باشید»
  const norm = (s: string) => s.replace(/[\u200c\s]+/g, ' ').trim();
  const categoryProducts = useMemo(
    () =>
      !category
        ? []
        : (products ?? []).filter(
            (p) =>
              (p.status === 'confirmed' || p.status === 'pending') && p.subCategoryId === category.id,
          ),
    [products, category],
  );
  const hasCategoryProduct = !category || categoryProducts.length > 0;
  // کل آگهی‌های فعال فروشنده (خواستهٔ مالک ۷-۱۱): هیچ کالایی ثبت نکرده →
  // پیام عمومی «ثبت کالا»؛ کالای دیگری دارد → پیام اختصاصی همین دسته
  const activeProductCount = (products ?? []).filter(
    (p) => p.status === 'confirmed' || p.status === 'pending',
  ).length;
  /** نوع واردشده در محصولات همان دسته هست؟ (آگهیِ فقط‌برگ = هر نوع آن دسته) */
  const typeOk = useMemo(() => {
    if (!category || !productType.trim() || !hasCategoryProduct) return true;
    const t = norm(productType);
    const leaf = norm(category.categoryName);
    return categoryProducts.some((p) => {
      const name = norm(p.productName).replace(leaf, ' ').trim();
      if (!name) return true; // آگهی فقط‌برگ — نوع مشخصی ندارد
      return name.includes(t) || t.includes(name) || norm(p.productName).includes(t);
    });
  }, [category, productType, hasCategoryProduct, categoryProducts]);

  const sellerName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'فروشنده ایمچ';
  // نمونهٔ پارامتریک — هر بار هدف تازه (پدر با key خودش فرم تازه می‌سازد)
  const sample = useMemo(
    () => buildOfferSample({ targets, sellerName, products, category }),
    [targets, sellerName, products, category],
  );

  if (targets.length === 0) return null;

  // ─── گیت کالا: هیچ کالایی ندارید (پیام عمومی مالک ۷-۱۱) یا فقط کالای این
  // دسته را ندارید (پیام اختصاصی همان دسته) — هر دو با مسیر ثبت محصول ───
  if (!hasCategoryProduct) {
    const noProductsAtAll = activeProductCount === 0;
    return (
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/[0.03] p-4 text-center">
        <p className="text-xs font-extrabold leading-6">
          {noProductsAtAll
            ? 'برای ارسال تامین یا تماس یا پیام، باید کالاهای خود را برای فروش ثبت کنید تا خریداران مرتبط به شما نمایش داده شوند.'
            : `برای ارسال پیشنهاد تامین ${category?.categoryName ?? 'این کالا'} باید این کالا را در لیست محصولات خود داشته باشید.`}
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          {noProductsAtAll
            ? 'با ثبت کالا و حداقل سفارش، سیستم تطابق مطابق‌ترین و به‌صرفه‌ترین خریداران را به شما نشان می‌دهد.'
            : 'ابتدا آگهی همین کالا را ثبت کنید تا خریداران بدانند چه چیزی عرضه می‌کنید؛ سپس پیشنهاد بفرستید.'}
        </p>
        <Button asChild size="sm" className="mt-3 rounded-md">
          <Link href="/panel/products/new">
            <Plus size={14} /> ثبت محصول
          </Link>
        </Button>
      </div>
    );
  }

  const isGroup = targets.length > 1;
  const pending = sendOne.isPending || sendGroup.isPending;

  const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

  const useSample = () => {
    if (!sample) return;
    setMessage(sample.slice(0, 1500));
    setShowSample(false);
  };

  /** شرایط ساختاریافته از فرم — با اعتبارسنجی وابستگی سوییچ‌ها (عین بک‌اند) */
  const buildTerms = (): SupplyOfferTerms | null => {
    if (checkOn) {
      const p = num(checkPercent);
      const d = num(checkDays);
      if (p < 10 || p > 100) {
        toast({ description: 'درصد مبلغ با چک باید بین ۱۰ تا ۱۰۰ باشد.', variant: 'destructive' });
        return null;
      }
      if (d < 1 || d > 365) {
        toast({ description: 'حداکثر سرسید چک را بین ۱ تا ۳۶۵ روز وارد کنید.', variant: 'destructive' });
        return null;
      }
    }
    if (deliveryOn && !shipBy) {
      toast({ description: 'پرداخت‌کنندهٔ هزینهٔ حمل را انتخاب کنید (فروشنده یا مشتری).', variant: 'destructive' });
      return null;
    }
    const mo = num(minOrder);
    return {
      categoryId: category?.id,
      productType: productType.trim() || undefined,
      checkAccepted: checkOn || undefined,
      checkPercent: checkOn ? num(checkPercent) : undefined,
      checkMaxDays: checkOn ? num(checkDays) : undefined,
      deliveryToBuyer: deliveryOn || undefined,
      shippingCostBy: deliveryOn ? (shipBy ?? undefined) : undefined,
      minOrderAmount: mo > 0 ? mo : undefined,
    };
  };

  const send = () => {
    const text = message.trim();
    if (text.length < 5) {
      toast({ description: 'متن پیشنهاد را کامل کنید (حداقل ۵ نویسه).', variant: 'destructive' });
      return;
    }
    // گیت نوع کالا (خواسته مالک ۴-۱۱) — نوع واردشده باید در محصولات همین دسته باشد
    if (!typeOk) {
      toast({
        description: `برای پیشنهاد تامین نوع «${productType.trim()}» باید همین کالا را در لیست محصولات خود داشته باشید.`,
        variant: 'destructive',
      });
      return;
    }
    const terms = buildTerms();
    if (!terms) return;
    // موجودی ناکافی؟ — خواسته مالک ۶-۱۱: مبلغ لحظهٔ ارسال در بک‌اند حساب
    // می‌شود؛ خطای بک‌اند → مودال شارژ کیف پول (الگوی همیشگی)
    if (isGroup) {
      sendGroup.mutate(
        { buyerIds: targets.map((t) => t.buyerId), message: text, terms },
        {
          onSuccess: (r) => {
            toast({
              description: `پیشنهاد برای ${toFa(r.sent)} خریدار ارسال شد — ${priceFa(r.fee)} از کیف پول کسر شد.`,
            });
            onSent?.(targets.map((t) => t.buyerId));
            onCancel();
          },
          onError: (err: Error) => {
            if (err instanceof ApiError && err.code === 'WALLET_INSUFFICIENT') {
              setNeedWallet(true);
              return;
            }
            toast({ description: err.message, variant: 'destructive' });
          },
        },
      );
    } else {
      sendOne.mutate(
        { buyerId: targets[0].buyerId, message: text, terms },
        {
          onSuccess: () => {
            toast({
              description: 'پیشنهاد تامین ارسال شد — پاسخ را در «پیام ها» دنبال کنید.',
            });
            onSent?.([targets[0].buyerId]);
            onCancel();
          },
          onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
        },
      );
    }
  };

  return (
    <>
      {/* ─── نوع کالا + حداقل سفارش — از دستهٔ هدف ─── */}
      {category && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div>
            <label htmlFor="offer-product-type" className="mb-1 block text-[11px] font-bold text-muted-foreground">
              نوع {category.categoryName} <span className="font-normal">(اختیاری)</span>
            </label>
            <Input
              id="offer-product-type"
              value={productType}
              onChange={(e) => setProductType(e.target.value.slice(0, 60))}
              placeholder={category.example ? `مثلا : ${category.example}` : 'مثلا : اکبری'}
              className="h-9 rounded-md text-xs"
              maxLength={60}
              aria-invalid={!typeOk || undefined}
            />
            {/* گیت نوع (خواسته مالک ۴-۱۱) — به محض اصلاح/خالی‌کردن، پاک می‌شود */}
            {!typeOk && (
              <p className="mt-1 rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] font-bold leading-5 text-red-600">
                برای پیشنهاد تامین نوع «{productType.trim()}» باید همین کالا را در لیست محصولات خود داشته باشید.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="offer-min-order" className="mb-1 block text-[11px] font-bold text-muted-foreground">
              حداقل سفارش <span className="font-normal">(اختیاری)</span>
            </label>
            <NumField
              value={minOrder}
              onChange={setMinOrder}
              suffix={category.unit}
              ariaLabel="حداقل سفارش"
              placeholder="مثلا : 500"
            />
          </div>
        </div>
      )}

      {/* ─── شرایط تامین — سوییچ‌ها فقط فیلد وابستهٔ خودشان را ظاهر می‌کنند ─── */}
      <div className="mt-3 rounded-lg border bg-secondary/30 p-3">
        <p className="text-[10px] font-bold leading-4 text-muted-foreground">
          شرایط تامین (اختیاری) — با مشخص‌کردن این‌ها، خریدار می‌تواند پیشنهاد شما را
          راحت‌تر با بقیه مقایسه کند.
        </p>

        {/* سوییچ چک */}
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <label htmlFor="offer-check" className="flex items-center gap-1.5 text-xs font-bold">
            <Banknote size={14} className="text-muted-foreground/70" />
            امکان پرداخت با چک
          </label>
          <Switch
            id="offer-check"
            checked={checkOn}
            onCheckedChange={(v) => {
              setCheckOn(v);
              if (v && !checkPercent) setCheckPercent('50');
              if (v && !checkDays) setCheckDays('60');
            }}
            aria-label="امکان پرداخت با چک"
          />
        </div>
        {checkOn && (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border bg-card p-2.5">
            <div>
              <label htmlFor="offer-check-percent" className="mb-1 block text-[10px] font-bold text-muted-foreground">
                درصد مبلغ با چک
              </label>
              <NumField
                value={checkPercent}
                onChange={setCheckPercent}
                suffix="٪"
                ariaLabel="درصد مبلغ با چک"
                invalid={num(checkPercent) < 10 || num(checkPercent) > 100}
              />
            </div>
            <div>
              <label htmlFor="offer-check-days" className="mb-1 block text-[10px] font-bold text-muted-foreground">
                حداکثر سرسید چک
              </label>
              <NumField
                value={checkDays}
                onChange={setCheckDays}
                suffix="روز"
                ariaLabel="حداکثر سرسید چک"
                invalid={num(checkDays) < 1 || num(checkDays) > 365}
              />
            </div>
          </div>
        )}

        {/* سوییچ ارسال به محل */}
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t pt-2.5">
          <label htmlFor="offer-delivery" className="flex items-center gap-1.5 text-xs font-bold">
            <Truck size={14} className="text-muted-foreground/70" />
            ارسال به محل خریدار
          </label>
          <Switch
            id="offer-delivery"
            checked={deliveryOn}
            onCheckedChange={setDeliveryOn}
            aria-label="ارسال به محل خریدار"
          />
        </div>
        {deliveryOn && (
          <div className="mt-2 rounded-md border bg-card p-2.5">
            <span className="mb-1.5 block text-[10px] font-bold text-muted-foreground">
              هزینهٔ حمل با …
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'seller', label: 'فروشنده' },
                  { key: 'customer', label: 'مشتری' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setShipBy(key)}
                  aria-pressed={shipBy === key}
                  className={cn(
                    'rounded-md border px-2 py-2 text-xs font-bold transition-colors',
                    shipBy === key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── متن پیشنهاد — مهم‌ترین فیلد ─── */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 1500))}
        rows={7}
        dir="rtl"
        placeholder={
          'جزئیات پیشنهاد تامین خود را در این بخش به‌صورت روشن برای کاربر وارد کنید؛\nقیمت، حداقل سفارش، نحوهٔ پرداخت، شرایط ارسال و تخفیف را فراموش نکنید.'
        }
        className="mt-3 w-full resize-none rounded-lg border border-input bg-card p-3 text-xs leading-6 outline-none transition-colors focus:border-primary"
        aria-label="متن پیشنهاد تامین"
      />

      {/* زیر فیلد: لینک نمونهٔ پارامتریک + شمارنده */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowSample((v) => !v)}
          aria-expanded={showSample}
          className="flex items-center gap-1 text-[11px] font-bold text-primary transition-colors hover:underline"
        >
          <FileText size={13} />
          نمونه پیشنهاد تامین
          <ChevronDown size={13} className={cn('transition-transform', showSample && 'rotate-180')} />
        </button>
        <span className="text-[10px] text-muted-foreground">{toFa(message.length)} / {toFa(1500)}</span>
      </div>

      {/* نمونهٔ پارامتریک — با اطلاعات شما و این خریدار آماده شده */}
      {showSample && (
        <div className="mt-2 rounded-lg border border-dashed bg-secondary/40 p-3">
          <p className="text-[10px] font-bold leading-5 text-muted-foreground">
            {isGroup
              ? 'نمونهٔ عمومی برای ارسال گروهی — بخوانید و در صورت نیاز ویرایش کنید:'
              : 'نمونه — با اطلاعات شما و این خریدار آماده شده است:'}
          </p>
          <p className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-line text-[11px] leading-6 text-foreground/85">
            {sample}
          </p>
          <Button size="sm" className="mt-2.5 w-full rounded-md" onClick={useSample}>
            <Copy size={13} /> استفاده از این نمونه
          </Button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button className="flex-1 rounded-md" onClick={send} disabled={pending || message.trim().length < 5 || !typeOk}>
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" /> در حال ارسال…
            </>
          ) : isGroup ? (
            <>
              <Send size={15} /> ارسال گروهی
            </>
          ) : (
            <>
              <Send size={15} /> ارسال پیشنهاد
            </>
          )}
        </Button>
        <Button variant="outline" className="rounded-md" onClick={onCancel} disabled={pending}>
          انصراف
        </Button>
      </div>

      {/* الگوی همیشگی ۱-۱۱: موجودی ناکافی → مودال شارژ — خواسته مالک ۶-۱۱:
          مبلغ همان لحظهٔ ارسال حساب می‌شود؛ خطای بک‌اند اینجا می‌آید */}
      <NeedPackageModal
        open={needWallet}
        onClose={() => setNeedWallet(false)}
        kind="wallet"
        message="موجودی کیف پول شما برای این ارسال گروهی کافی نیست — لطفاً ابتدا کیف پول را شارژ کنید."
      />
    </>
  );
}

/** مودال تکی — عنوان خیلی واضح با نام دستهٔ کالا (خواستهٔ مالک ۱-۱۱:
 *  «وقتی مدال باز می‌شود بالایش بنویسد، مثلاً: پیشنهاد تامین برنج») */
export function SupplyOfferModal({
  open,
  onClose,
  onSent,
  targets,
  products,
  category,
}: {
  open: boolean;
  onClose: () => void;
  /** پس از ارسال موفق — شناسهٔ خریدارانی که پیام گرفتند؛ فهرست کارت‌هایشان را از انتخاب درمی‌آورد */
  onSent?: (buyerIds: string[]) => void;
  /** یک هدف = تکی؛ بیشتر = گروهی */
  targets: BuyerDirectoryItem[];
  /** آگهی‌های خود فروشنده — برای پرکردن پارامترهای نمونه (کالا/واحد/قیمت) */
  products?: Product[];
  /** دستهٔ آخرِ هدف — از خود کارت خریدار می‌آید */
  category: Category | null;
}) {
  if (!open || targets.length === 0) return null;

  const isGroup = targets.length > 1;
  const first = targets[0];

  return (
    /* z-[60]: بالای نوار پایین موبایل (z-50) — دکمه‌های ارسال زیر نوار نروند */
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="پیشنهاد تامین"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl border bg-card p-5 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            {isGroup ? <Users size={19} /> : <Send size={18} />}
          </span>
          <div className="min-w-0">
            {/* عنوان واضح با نام دستهٔ کالا — «پیشنهاد تامین برنج» */}
            <h2 className="truncate text-sm font-extrabold">
              {isGroup ? 'ارسال گروهی پیشنهاد تامین' : 'پیشنهاد تامین'}
              {category?.categoryName ? ` ${category.categoryName}` : ''}
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {isGroup ? (
                <>برای {toFa(targets.length)} خریدار</>
              ) : (
                <>
                  {first.buyerName} — خریدار <b className="text-foreground/80">{first.categoryName}</b>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <SupplyOfferForm
            targets={targets}
            products={products}
            category={category}
            onSent={onSent}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
