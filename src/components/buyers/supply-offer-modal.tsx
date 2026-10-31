'use client';

/**
 * مودال پیشنهاد تامین (اصلاح مالک ۱-۱۱، شب دوم) — فرم ساده + «نمونهٔ پارامتریک»:
 *  • متن خالی شروع می‌شود و پلیس‌هولدر فقط راهنماست: «جزئیات پیشنهاد تامین خود
 *    را در این بخش به‌صورت روشن برای کاربر وارد کنید…» (خواستهٔ مالک — پیش‌نویس
 *    خودکار حذف شد تا کاربر خودش صاحب متن باشد).
 *  • زیر فیلد، لینک «نمونه پیشنهاد تامین» نمونهٔ کاملی را باز می‌کند که با
 *    دیتای واقعی پر شده است (پارامتریک): نام خریدار/فروشنده، کالا و واحد و
 *    قیمت از آگهی خود فروشنده، حداقل سفارش، و همهٔ آنچه برای خریدار عمده
 *    مهم است — نحوهٔ پرداخت، شرایط حمل، تخفیف خرید دوره‌ای، امکان نمونه‌کالا.
 *    با یک کلیک «استفاده از این نمونه» متن داخل فیلد می‌نشیند؛ کاربر اگر
 *    بخواهد همان را می‌فرستد و اگر نخواهد دست‌کم الگو دارد.
 *  • تکی: نمونهٔ شخصی؛ گروهی: نمونهٔ عمومی و همه‌کالا (بدون نام خریدار).
 */

import { useMemo, useState } from 'react';
import { ChevronDown, Copy, FileText, Loader2, Send, Users } from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useGroupSendSupplyOffer, useSendSupplyOffer } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  PERIOD_LABELS,
  type BuyerDirectoryItem,
  type OfferQuota,
  type Product,
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
function priceWordsFa(toman: number): string {
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
 *  متن ناتماد به نظر نرسد. */
export function buildOfferSample(opts: {
  targets: BuyerDirectoryItem[];
  sellerName: string;
  products?: Product[];
}): string {
  const { targets, sellerName, products } = opts;
  if (targets.length === 0) return '';
  const isGroup = targets.length > 1;

  // ─── گروهی: نمونهٔ عمومی — بدون نام خریدار و بدون کالای خاص ───
  if (isGroup) {
    // حوزهٔ کاری فروشنده از آگهی‌های تأییدشده‌اش (حداکثر دو کالا)
    const confirmed = products?.filter((p) => p.status === 'confirmed') ?? [];
    const names = [...new Set(confirmed.map((p) => p.subCategoryName || p.categoryName))].slice(0, 2);
    const field = names.length ? names.join(' و ') : 'کالای مورد نیاز شما';

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
  const goods = match?.productName ?? first.categoryName;

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

export function SupplyOfferModal({
  open,
  onClose,
  onSent,
  targets,
  quota,
  products,
}: {
  open: boolean;
  onClose: () => void;
  /** پس از ارسال موفق — شناسهٔ خریدارانی که پیام گرفتند؛ فهرست کارت‌هایشان را از انتخاب درمی‌آورد */
  onSent?: (buyerIds: string[]) => void;
  /** یک هدف = تکی؛ بیشتر = گروهی */
  targets: BuyerDirectoryItem[];
  quota: OfferQuota | null;
  /** آگهی‌های خود فروشنده — برای پرکردن پارامترهای نمونه (کالا/واحد/قیمت) */
  products?: Product[];
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [showSample, setShowSample] = useState(false);
  const sendOne = useSendSupplyOffer();
  const sendGroup = useGroupSendSupplyOffer();
  // الگوی همیشگی ۱-۱۱: کمبود موجودی → مودال «شارژ کیف پول» (بستن + شارژ)
  const [needWallet, setNeedWallet] = useState(false);

  const sellerName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'فروشنده ایمچ';
  // نمونهٔ پارامتریک — هر بار هدف تازه (پدر با key خودش فرم تازه می‌سازد)
  const sample = useMemo(
    () => buildOfferSample({ targets, sellerName, products }),
    [targets, sellerName, products],
  );

  const close = () => {
    setMessage('');
    setShowSample(false);
    onClose();
  };

  if (!open || targets.length === 0) return null;

  const isGroup = targets.length > 1;
  const perRecipient = quota?.groupSend.perRecipientPrice ?? 0;
  const fee = isGroup ? targets.length * perRecipient : 0;
  const balance = quota?.walletBalance ?? 0;
  const pending = sendOne.isPending || sendGroup.isPending;

  const useSample = () => {
    if (!sample) return;
    setMessage(sample.slice(0, 1500));
    setShowSample(false);
  };

  const send = () => {
    const text = message.trim();
    if (text.length < 5) {
      toast({ description: 'متن پیشنهاد را کامل کنید (حداقل ۵ نویسه).', variant: 'destructive' });
      return;
    }
    // موجودی ناکافی → مودال شارژ (الگوی همیشگی)؛ دکمه غیرفعال نمی‌شود
    if (isGroup && fee > balance) {
      setNeedWallet(true);
      return;
    }
    if (isGroup) {
      sendGroup.mutate(
        { buyerIds: targets.map((t) => t.buyerId), message: text },
        {
          onSuccess: (r) => {
            toast({
              description: `پیشنهاد برای ${toFa(r.sent)} خریدار ارسال شد — ${priceFa(r.fee)} از کیف پول کسر شد.`,
            });
            onSent?.(targets.map((t) => t.buyerId));
            close();
          },
          onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
        },
      );
    } else {
      sendOne.mutate(
        { buyerId: targets[0].buyerId, message: text },
        {
          onSuccess: (r) => {
            toast({
              description: `پیشنهاد تامین ارسال شد — پاسخ را در «پیام ها» دنبال کنید (${toFa(r.quotaLeft)} سهمیه امروز باقی مانده).`,
            });
            onSent?.([targets[0].buyerId]);
            close();
          },
          onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
        },
      );
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="پیشنهاد تامین"
        onClick={(e) => e.target === e.currentTarget && !pending && close()}
      >
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-xl border bg-card p-5 shadow-2xl">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
              {isGroup ? <Users size={19} /> : <Send size={18} />}
            </span>
            <div>
              <h2 className="text-sm font-extrabold">
                {isGroup ? `ارسال گروهی به ${toFa(targets.length)} خریدار` : 'پیشنهاد تامین'}
              </h2>
              {!isGroup && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {targets[0].buyerName} — {targets[0].categoryName}
                  {targets[0].city ? ` (${targets[0].city})` : ''}
                </p>
              )}
            </div>
          </div>

          {/* سهمیه / هزینه — شفاف قبل از ارسال */}
          <div className="mt-3 rounded-lg bg-secondary/70 p-3 text-[11px] leading-5">
            {isGroup ? (
              <>
                <p>
                  هزینه هر گیرنده <b>{priceFa(perRecipient)}</b> از کیف پول — جمع:{' '}
                  <b className="text-primary">{priceFa(fee)}</b> (موجودی: {priceFa(balance)})
                </p>
                {fee > balance && (
                  <p className="mt-1 font-bold text-red-600">
                    موجودی کافی نیست —{' '}
                    <button type="button" className="underline" onClick={() => setNeedWallet(true)}>
                      شارژ کیف پول
                    </button>
                  </p>
                )}
              </>
            ) : quota ? (
              <p>
                سهمیه امروز: <b>{toFa(quota.left)}</b> از <b>{toFa(quota.dailyLimit)}</b> پیشنهاد باقی مانده.
              </p>
            ) : null}
          </div>

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
            <Button
              className="flex-1 rounded-md"
              onClick={send}
              disabled={pending || message.trim().length < 5}
            >
              {pending ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> در حال ارسال…
                </>
              ) : isGroup ? (
                <>
                  <Send size={15} /> ارسال گروهی و پرداخت {priceFa(fee)}
                </>
              ) : (
                <>
                  <Send size={15} /> ارسال پیشنهاد
                </>
              )}
            </Button>
            <Button variant="outline" className="rounded-md" onClick={close} disabled={pending}>
              انصراف
            </Button>
          </div>
        </div>
      </div>

      {/* الگوی همیشگی ۱-۱۱: موجودی ناکافی → مودال شارژ (روی مودال ارسال، همیشه بالا) */}
      <NeedPackageModal
        open={needWallet}
        onClose={() => setNeedWallet(false)}
        kind="wallet"
        message={`موجودی کیف پول شما برای ارسال گروهی به ${toFa(targets.length)} خریدار کافی نیست — ${priceFa(
          fee,
        )} شارژ لازم دارید (موجودی فعلی: ${priceFa(balance)}).`}
      />
    </>
  );
}
