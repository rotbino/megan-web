'use client';

import { useState } from 'react';
import { BadgeCheck, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * دکمه «شماره تماس» فروشنده — عین باسکول: دکمه پررنگ در کارت فروشنده
 * که شماره تماس را آشکار می‌کند.
 */
export function PhoneReveal({
  sellerName,
  children,
}: {
  sellerName: string;
  children?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-md" dir="rtl">
        <DialogHeader className="text-start">
          <DialogTitle className="text-start text-base">شماره تماس {sellerName}</DialogTitle>
          <DialogDescription className="text-start">برای اطلاع از قیمت روز و خرید مستقیم تماس بگیرید.</DialogDescription>
        </DialogHeader>
        {!shown ? (
          <Button className="h-12 w-full rounded-md text-base" onClick={() => setShown(true)}>
            <Phone size={18} />
            نمایش شماره تماس
          </Button>
        ) : (
          <div className="space-y-2 rounded-md border p-4 text-center">
            <p className="flex items-center justify-center gap-2 text-lg font-extrabold text-primary">
              <BadgeCheck size={18} />
              <span dir="ltr" className="font-mono">۰۹۱۲ ۰۰۰ ۰۰۰۰</span>
            </p>
          </div>
        )}
        <div className="flex items-start gap-2 rounded-md bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
          <p>توصیه ایمچ: همواره به انجام معاملات حضوری است.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
