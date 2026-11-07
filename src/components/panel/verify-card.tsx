'use client';

/**
 * باکس احراز هویت — مشترک ویو و ویرایش پروفایل (خواسته مالک ۲-۱۱ دور ۱۶:
 * «مثل باکس‌های دیگه با ارتفاع بیشتر و واضحتر نشون بده و جمله بهتری داخلش
 * بنویس») — متن پیشنهادی خود مالک. فقط برای کاربرانِ احرازنشده رندر می‌شود؛
 * کاربر احرازشده چیپ «احراز هویت شده» در کارت هویت دارد (تکرار ممنوع).
 */

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { cn } from '@/lib/utils';

export function VerifyCard({ className }: { className?: string }) {
  return (
    <PanelCard className={cn('flex flex-wrap items-center justify-between gap-4 p-4', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck size={22} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold">احراز هویت</p>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
            خریداران و فروشندگان به کاربران احراز هویت شده بیشتر اعتماد می کنند. در صورتی که می خواهید
            اعتماد کاربران را بیشتر جلب کنید، مدارک احراز هویت خود را ارسال کنید.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="h-10 shrink-0 rounded-md px-4">
        <Link href="/panel/verification">
          <ShieldCheck size={15} /> ارسال مدارک احراز هویت
        </Link>
      </Button>
    </PanelCard>
  );
}
