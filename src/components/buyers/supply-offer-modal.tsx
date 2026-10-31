'use client';

/**
 * مودال پیشنهاد تامین (خواسته مالک ۳۱-۱۰ / اصلاح ۱-۱۱) — فرم فوق‌ساده:
 *  • تکی: رایگان تا سقف روزانهٔ سطح بسته (سهمیه نمایش داده می‌شود)؛ متن
 *    شخصی است — نام خریدار و فروشنده، کالا و واحد از کارت/آگهی‌های خود
 *    فروشنده برداشته می‌شود؛ اگر فروشنده در همین دسته آگهی تأییدشده با قیمت
 *    داشته باشد، نام همان کالا و قیمت واقعی‌اش می‌آید.
 *  • گروهی: هر گیرنده از کیف پول کسر می‌شود (هزینه شفاف قبل از ارسال)؛
 *    پیام عمومی است — بدون نام خریدار و بدون کالای خاص (خواستهٔ مالک ۱-۱۱).
 *    فروشنده متن را ویرایش می‌کند و می‌فرستد.
 */

import { useState } from 'react';
import { Loader2, Send, Users } from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useGroupSendSupplyOffer, useSendSupplyOffer } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { priceFa, toFa } from '@/lib/format';
import type { BuyerDirectoryItem, OfferQuota, Product } from '@/lib/types';

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

/** پیش‌نویس متن پیشنهاد — همهٔ قطعات از دیتا (خواسته مالک ۱-۱۱) */
export function buildOfferDraft(opts: {
  targets: BuyerDirectoryItem[];
  sellerName: string;
  products?: Product[];
}): string {
  const { targets, sellerName, products } = opts;
  if (targets.length === 0) return '';
  const isGroup = targets.length > 1;
  const first = targets[0];

  // گروهی: پیام عمومی — بدون نام خریدار و بدون کالای خاص (خواستهٔ مالک ۱-۱۱:
  // پیام به‌صورت همگانی خوانده می‌شود، پس پلیس‌هولدر عمومی‌تر باید باشد)
  if (isGroup) {
    return [
      `سلام، ${sellerName} هستم،`,
      'فروشنده عمده کالای مورد نیاز شما، با بهترین قیمت و کیفیت.',
      'در صورتی که علاقه‌مند هستید توی چت پیام بدید تا تصاویر و اطلاعات بیشتر و قیمت‌های دقیق‌تر در اختیارتان قرار بدیم.',
      'همچنین می‌توانیم برای جنابعالی در صورت خرید دوره‌ای، تخفیف ۵ درصدی در نظر بگیریم.',
    ].join(' ');
  }

  // تکی: شخصی‌سازی کامل بر اساس دیتای کارت و آگهی‌های خود فروشنده
  // آگهی تأییدشدهٔ فروشنده در همین نیاز خریدار — اول دستهٔ برگ، بعد دستهٔ پدر
  const confirmed = products?.filter((p) => p.status !== 'pending' && p.status !== 'rejected');
  const match =
    confirmed?.find((p) => p.subCategoryId === first.categoryId) ??
    confirmed?.find((p) => p.categoryId === first.categoryId);

  // کالا — نام آگهی خود فروشنده (مثل «سیب زمینی آگریا») یا نیاز خریدار
  const goods = match?.productName ?? first.categoryName;

  // واحد و قیمت واقعی آگهی فروشنده — وگرنه واحد نیاز خریدار بدون قیمت ساختگی
  const unit = match?.unit ?? first.unit;
  const unitAdj = UNIT_ADJ[unit] ?? `هر ${unit}`;
  const price = match?.minSalePrice ?? null;

  const greeting = `سلام، جناب ${first.buyerName}. ${sellerName} هستم،`;
  const priceClause =
    price != null ? `با بهترین قیمت و کیفیت از قرار ${unitAdj} ${priceWordsFa(price)}` : 'با بهترین قیمت و کیفیت';

  return [
    `${greeting} فروشنده عمده ${goods}،`,
    `${priceClause}. در صورتی که علاقه‌مند هستید توی چت پیام بدید تا تصاویر و اطلاعات بیشتر و قیمت‌های دقیق‌تر در اختیارتان قرار بدیم.`,
    'همچنین می‌توانیم برای جنابعالی در صورت خرید دوره‌ای، تخفیف ۵ درصدی در نظر بگیریم.',
  ].join(' ');
}

export function SupplyOfferModal({
  open,
  onClose,
  targets,
  quota,
  products,
}: {
  open: boolean;
  onClose: () => void;
  /** یک هدف = تکی؛ بیشتر = گروهی */
  targets: BuyerDirectoryItem[];
  quota: OfferQuota | null;
  /** آگهی‌های خود فروشنده — برای پیش‌نویس دقیق کالا/قیمت */
  products?: Product[];
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const sendOne = useSendSupplyOffer();
  const sendGroup = useGroupSendSupplyOffer();
  // الگوی همیشگی ۱-۱۱: کمبود موجودی → مودال «شارژ کیف پول» (بستن + شارژ)
  const [needWallet, setNeedWallet] = useState(false);

  // پیش‌نویس داینامیک — فقط بار اول (پدر با key هر بار هدف تازه می‌سازد؛
  // کاربر بعد از باز شدن مودال صاحب متن است و ویرایشش حفظ می‌شود)
  const [drafted, setDrafted] = useState(false);
  if (open && targets.length > 0 && !drafted) {
    setDrafted(true);
    const sellerName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'فروشنده ایمچ';
    setMessage(buildOfferDraft({ targets, sellerName, products }));
  }

  const close = () => {
    setMessage('');
    setDrafted(false);
    onClose();
  };

  if (!open || targets.length === 0) return null;

  const isGroup = targets.length > 1;
  const perRecipient = quota?.groupSend.perRecipientPrice ?? 0;
  const fee = isGroup ? targets.length * perRecipient : 0;
  const balance = quota?.walletBalance ?? 0;
  const pending = sendOne.isPending || sendGroup.isPending;

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
        <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-2xl">
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
            placeholder="متن پیشنهاد خود را بنویسید…"
            className="mt-3 w-full resize-none rounded-lg border border-input bg-card p-3 text-xs leading-6 outline-none transition-colors focus:border-primary"
            aria-label="متن پیشنهاد تامین"
          />
          <p className="mt-1 text-left text-[10px] text-muted-foreground">{toFa(message.length)} / {toFa(1500)}</p>
  
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
