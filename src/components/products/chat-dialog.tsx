'use client';

import { MessageSquareText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PresenceDot } from '@/components/shared/presence-dot';
import { ChatWidget } from '@/components/products/chat-widget';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';
import { cn } from '@/lib/utils';

/**
 * دکمه «چت با فروشنده» + مودال چت اپ‌گونه:
 *  • موبایل: تمام‌صفحه (۱۰۰dvh) — عین صفحه چت؛ هدر (آواتار+نام+آنلاین+بستن)،
 *    لیست پیام‌ها و کیبورد پایین‌چسب.
 *  • دسکتاپ: شیت بزرگ چسبیده به پایین صفحه (۸۵vh، حداکثر ۶۷۲px، گوشه‌های
 *    بالا گرد) که از پایین بالا می‌آید — الگوی مدال‌های چت وب‌سایت‌ها؛
 *    تاریخچه بلند دیده می‌شود، نه یک جعبه معلق کوچک.
 * دو مسیر: روی آگهی (productId — کنار شماره تماس در کارت فروشنده، مثل باسکول)
 * و از پروفایل فروشنده (sellerUserName — دکمه «ارسال پیام»، مثل باسکول).
 * مهمان: فرم چت خودش مودال ورود را باز می‌کند.
 */
export function ChatDialog({
  productId,
  sellerUserName,
  sellerId,
  sellerName,
  productName,
  className,
  buttonLabel = 'چت با فروشنده',
  buttonVariant = 'outline',
}: {
  productId?: number;
  sellerUserName?: string;
  sellerId?: string;
  sellerName: string;
  productName?: string;
  className?: string;
  buttonLabel?: string;
  buttonVariant?: 'outline' | 'default';
}) {
  const { data: presenceItems } = usePresenceStatus({
    ...(sellerId ? { ids: [sellerId] } : {}),
    ...(sellerUserName ? { userNames: [sellerUserName] } : {}),
  });
  const presence = findPresence(presenceItems, {
    ...(sellerId ? { id: sellerId } : {}),
    ...(sellerUserName ? { userName: sellerUserName } : {}),
  });
  const initial = sellerName.trim().charAt(0) || '؟';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={buttonVariant} className={className}>
          <MessageSquareText size={17} />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className={cn(
          // موبایل: تمام‌صفحه — مثل صفحه چت (۱۰۰dvh زیر نوار آدرس مرورگر)
          'top-0 left-0 flex h-[100dvh] w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0',
          'max-w-none sm:max-w-none',
          // دسکتاپ: شیت پایینی — بزرگ، از پایین بالا می‌آید، چسبیده به پایین
          'nav-desktop:bottom-0 nav-desktop:left-1/2 nav-desktop:top-auto nav-desktop:h-[85vh] nav-desktop:max-w-2xl nav-desktop:-translate-x-1/2 nav-desktop:translate-y-0 nav-desktop:rounded-b-none nav-desktop:rounded-t-2xl nav-desktop:border nav-desktop:shadow-2xl',
          // انیمیشن شیت — بالا آمدن از پایین (نه zoom معلق)
          'duration-300 data-[state=closed]:slide-out-to-bottom data-[state=closed]:zoom-out-100 data-[state=open]:slide-in-from-bottom data-[state=open]:zoom-in-100',
        )}
      >
        {/* سربرگ چت — عین صفحه پیام‌ها: آواتار + نام + آنلاین + زمینه گفتگو */}
        <div className="flex shrink-0 items-center gap-3 border-b bg-card px-3 py-2.5 nav-desktop:px-4">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
            {initial}
            <PresenceDot
              online={presence?.online}
              showLabel={false}
              size="sm"
              className="absolute -bottom-0.5 -start-0.5"
            />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="flex min-w-0 items-center gap-2 text-start text-sm font-extrabold">
              <span className="truncate">چت با {sellerName}</span>
              <PresenceDot
                online={presence?.online}
                lastSeenAt={presence?.lastSeenAt ?? undefined}
                className="shrink-0"
              />
            </DialogTitle>
            <DialogDescription className="truncate text-start text-[11px] leading-5">
              {productId != null && productName
                ? <>درباره «{productName}»</>
                : <>گفتگوی مستقیم با فروشنده</>}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="بستن چت"
              title="بستن چت"
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={20} />
            </button>
          </DialogClose>
        </div>

        {/* بدنه چت — کل ارتفاع باقی‌مانده را می‌گیرد (لیست + کیبورد پایین‌چسب) */}
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatWidget
            productId={productId}
            sellerUserName={sellerUserName}
            sellerId={sellerId}
            sellerName={sellerName}
            productName={productName}
            bare
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
