'use client';

/**
 * مودال پرداخت نردبان — مشترک «محصولات من» و صفحهٔ «آمار آگهی»
 * (خواسته مالک ۳-۱۱: ردیف «اعمال نردبان» در روش‌های افزایش بازدید).
 *
 * ۱ تا ۴ ماه × قیمت ماهانه؛ پرداخت واقعی از کیف پول (wallet/ladderProduct).
 * الگوی همیشگی ۱-۱۱: موجودی ناکافی → مودال شارژ کارت‌به‌کارت.
 */

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NeedPackageModal } from '@/components/shared/need-package-modal';
import { useLadderProduct } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { LADDER_MAX_MONTHS, LADDER_MONTHLY_PRICE, ladderMonthsLabel } from '@/lib/mock/data';
import { priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

export function LadderPayDialog({
  product,
  balance,
  onClose,
}: {
  /** آگهی هدف — null یعنی بسته */
  product: { id: number; productName: string } | null;
  /** موجودی کیف پول کاربر */
  balance: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const ladder = useLadderProduct();
  // تعداد ماه نردبان — پیش‌فرض ۱، تا ۴ ماه (خواسته مالک ۳۱-۱۰)؛ با بستن ریست
  const [ladderMonths, setLadderMonths] = useState(1);
  // الگوی همیشگی ۱-۱۱: موجودی ناکافی برای نردبان → مودال شارژ
  const [needWalletMsg, setNeedWalletMsg] = useState<string | null>(null);

  // ریست انتخاب ماه هنگام بستن — الگوی «تنظیم state حین رندر» (بدون effect)
  const [wasOpen, setWasOpen] = useState(Boolean(product));
  if (Boolean(product) !== wasOpen) {
    setWasOpen(Boolean(product));
    if (!product) setLadderMonths(1);
  }

  const ladderCost = LADDER_MONTHLY_PRICE * ladderMonths;
  const canPayLadder = balance >= ladderCost;

  return (
    <>
      <Dialog
        open={Boolean(product)}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-start">پرداخت هزینه نردبان</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* انتخاب مدت نردبان — چیپ‌های ۱ تا ۴ ماه */}
            <div>
              <p className="mb-2 text-xs font-bold">مدت نردبان را انتخاب کنید:</p>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="مدت نردبان">
                {Array.from({ length: LADDER_MAX_MONTHS }, (_, i) => i + 1).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={ladderMonths === m}
                    onClick={() => setLadderMonths(m)}
                    className={cn(
                      'flex flex-col items-center rounded-lg border-2 px-2 py-2.5 text-center transition-colors',
                      ladderMonths === m
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40',
                    )}
                  >
                    <span className="text-xs font-extrabold">{ladderMonthsLabel(m)}</span>
                    <span className="mt-1 font-num text-[10px] text-muted-foreground">
                      {priceFa(LADDER_MONTHLY_PRICE * m)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                هر ماه نردبان {priceFa(LADDER_MONTHLY_PRICE)} تومان — پیش‌فرض یک ماه، حداکثر چهار ماه
              </p>
            </div>

            <div className="rounded-md bg-secondary/70 p-3">
              <p className="text-xs text-muted-foreground">هزینه نردبان {ladderMonthsLabel(ladderMonths)} این محصول</p>
              <p className="font-num mt-1 text-base font-extrabold">{priceFa(ladderCost)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {product?.productName} — {ladderMonthsLabel(ladderMonths)} ({toFa(ladderMonths * 30)} روز)
              </p>
            </div>

            <p className="rounded-md bg-primary/5 p-3 text-[11px] leading-5 text-primary">
              نردبان هر محصول {priceFa(LADDER_MONTHLY_PRICE)} تومان در ماه است و هزینه آن از شارژ کیف پول شما کسر می‌شود؛
              برای نردبان {ladderMonthsLabel(ladderMonths)} حداقل {priceFa(ladderCost)} شارژ لازم است.
            </p>

            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet size={14} /> موجودی کیف پول
              </span>
              <span className="font-num text-sm font-extrabold">{priceFa(balance)}</span>
            </div>

            {canPayLadder ? (
              <Button
                className="w-full rounded-md"
                disabled={ladder.isPending}
                onClick={() =>
                  ladder.mutate(
                    { productId: product!.id, months: ladderMonths },
                    {
                      onSuccess: () => {
                        toast({
                          description: `نردبان «${product?.productName}» برای ${ladderMonthsLabel(ladderMonths)} فعال شد — ${priceFa(ladderCost)} از کیف پول کسر شد.`,
                        });
                        onClose();
                      },
                      onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
                    },
                  )
                }
              >
                {ladder.isPending ? 'در حال پرداخت…' : 'پرداخت از کیف پول'}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-700">
                  موجودی کیف پول برای نردبان {ladderMonthsLabel(ladderMonths)} کافی نیست — برای این گزینه{' '}
                  {priceFa(ladderCost)} شارژ لازم دارید.
                </p>
                <Button
                  className="w-full rounded-md"
                  onClick={() => {
                    // الگوی همیشگی: پیام داخل مودال شارژ؛ دیالوگ نردبان بسته می‌شود تا تداخل نکنند
                    setNeedWalletMsg(
                      `موجودی کیف پول شما برای نردبان ${ladderMonthsLabel(ladderMonths)} «${product?.productName}» کافی نیست — ${priceFa(ladderCost)} شارژ لازم دارید (موجودی فعلی: ${priceFa(balance)}).`,
                    );
                    onClose();
                  }}
                >
                  <Wallet size={15} /> شارژ کیف پول و پرداخت
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* الگوی همیشگی ۱-۱۱: کمبود شارژ نردبان → مودال شارژ */}
      {needWalletMsg && (
        <NeedPackageModal
          open
          onClose={() => setNeedWalletMsg(null)}
          kind="wallet"
          message={needWalletMsg}
          ctaLabel="شارژ کیف پول (کارت به کارت)"
        />
      )}
    </>
  );
}
