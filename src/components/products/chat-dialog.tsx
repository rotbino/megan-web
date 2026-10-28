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
import { ChatWidget } from '@/components/products/chat-widget';

/**
 * دکمه «چت با فروشنده» کنار شماره تماس در کارت فروشنده صفحه آگهی (مثل باسکول).
 * کلیک → فرم چت داخل مودال باز می‌شود (ChatWidget با bare=true).
 * مهمان: فرم چت خودش مودال ورود را باز می‌کند.
 */
export function ChatDialog({
  productId,
  sellerName,
  productName,
  className,
}: {
  productId: number;
  sellerName: string;
  productName: string;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className={className}>
          <MessageSquareText size={17} />
          چت با فروشنده
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-md p-0" dir="rtl">
        <DialogHeader className="border-b px-4 py-3 text-start">
          <DialogTitle className="flex items-center gap-2 text-start text-base">
            <MessageSquareText size={17} className="text-primary" />
            چت با {sellerName}
          </DialogTitle>
          <DialogDescription className="text-start">
            درباره «{productName}»
          </DialogDescription>
        </DialogHeader>
        <ChatWidget productId={productId} sellerName={sellerName} productName={productName} bare />
      </DialogContent>
    </Dialog>
  );
}
