'use client';

import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PresenceDot } from '@/components/shared/presence-dot';
import { ChatWidget } from '@/components/products/chat-widget';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';

/**
 * دکمه «چت با فروشنده» + مودال فرم چت.
 * دو مسیر: روی آگهی (productId — کنار شماره تماس در کارت فروشنده، مثل باسکول)
 * و از پروفایل فروشنده (sellerUserName — دکمه «ارسال پیام»، مثل باسکول).
 * نشان آنلاین فروشنده در سربرگ مودال.
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={buttonVariant} className={className}>
          <MessageSquareText size={17} />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-md p-0" dir="rtl">
        <DialogHeader className="border-b px-4 py-3 text-start">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-start text-base">
            <MessageSquareText size={17} className="text-primary" />
            <span>چت با {sellerName}</span>
            <PresenceDot online={presence?.online} lastSeenAt={presence?.lastSeenAt ?? undefined} className="ms-auto" />
          </DialogTitle>
          <DialogDescription className="text-start">
            {productId != null && productName ? <>درباره «{productName}»</> : <>گفتگوی مستقیم با فروشنده</>}
          </DialogDescription>
        </DialogHeader>
        <ChatWidget
          productId={productId}
          sellerUserName={sellerUserName}
          sellerId={sellerId}
          sellerName={sellerName}
          productName={productName}
          bare
        />
      </DialogContent>
    </Dialog>
  );
}
