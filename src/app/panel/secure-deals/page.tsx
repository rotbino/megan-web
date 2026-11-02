'use client';

/**
 * معاملات پرداخت امن — هنوز فعال نیست (خواسته مالک ۲-۱۱ دور سیزدهم:
 * «ما هنوز پرداخت امن نداریم. بهتره در صفحه اش بنویسی صفحه پرداخت امن
 * به زودی فعال می شود»). صفحه و لینکش حفظ می‌شود تا با راه‌اندازی سرویس،
 * همین‌جا معاملات جاری/موفق/مرجوع/لغو رندر شوند.
 */

import { Handshake } from 'lucide-react';
import { PanelEmptyState } from '@/components/panel/panel-parts';

export default function SecureDealsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">معاملات پرداخت امن</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          وجه معامله تا تحویل بار نزد ایمچ محفوظ می‌ماند.
        </p>
      </div>

      <PanelEmptyState
        icon={Handshake}
        title="صفحه پرداخت امن به زودی فعال می‌شود."
        hint="در حال آماده‌سازی سرویس پرداخت امن ایمچ هستیم؛ تا آن زمان معاملات را حضوری یا با توافق مستقیم با طرف مقابل انجام دهید."
      />
    </div>
  );
}
