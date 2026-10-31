'use client';

/**
 * مودال پیشنهاد تامین (خواسته مالک ۳۱-۱۰) — فرم فوق‌ساده:
 *  • تکی: رایگان تا سقف روزانهٔ سطح بسته (سهمیه نمایش داده می‌شود)
 *  • گروهی: هر گیرنده از کیف پول کسر می‌شود (هزینه شفاف قبل از ارسال)
 * متن پیشنهاد آزاد است — شرایط ویژه/تخفیف را فروشنده داخل متن می‌نویسد.
 */

import { useState } from 'react';
import { Loader2, Send, Users } from 'lucide-react';
import Link from 'next/link';
import { useGroupSendSupplyOffer, useSendSupplyOffer } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { priceFa, toFa } from '@/lib/format';
import type { BuyerDirectoryItem, OfferQuota } from '@/lib/types';

export function SupplyOfferModal({
  open,
  onClose,
  targets,
  quota,
}: {
  open: boolean;
  onClose: () => void;
  /** یک هدف = تکی؛ بیشتر = گروهی */
  targets: BuyerDirectoryItem[];
  quota: OfferQuota | null;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const sendOne = useSendSupplyOffer();
  const sendGroup = useGroupSendSupplyOffer();

  // ریست متن هنگام بستن — بدون effect؛ پدر با key هر بار هدف تازه می‌سازد
  const close = () => {
    setMessage('');
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
    if (isGroup) {
      sendGroup.mutate(
        { buyerIds: targets.map((t) => t.id), message: text },
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
        { buyerId: targets[0].id, message: text },
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
                {targets[0].role}
                {targets[0].city ? ` — ${targets[0].city}` : targets[0].province ? ` — ${targets[0].province}` : ''}
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
                  <Link href="/panel/wallet" className="underline">
                    شارژ کیف پول
                  </Link>
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
          rows={5}
          dir="rtl"
          placeholder={'مثال: سلام، پسته اکبری درجه یک با قیمت عمده داریم؛ برای خرید ماهانه ۵٪ تخفیف می‌گذاریم.'}
          className="mt-3 w-full resize-none rounded-lg border border-input bg-card p-3 text-xs leading-6 outline-none transition-colors focus:border-primary"
          aria-label="متن پیشنهاد تامین"
        />
        <p className="mt-1 text-left text-[10px] text-muted-foreground">{toFa(message.length)} / {toFa(1500)}</p>

        <div className="mt-3 flex gap-2">
          <Button
            className="flex-1 rounded-md"
            onClick={send}
            disabled={pending || (isGroup && fee > balance) || message.trim().length < 5}
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
  );
}
