'use client';

/**
 * سرنخ‌های فروش — تک‌صفحهٔ CRM دید فروشنده (خواستهٔ مالک ۸-۱۱ دور ۲۸).
 * سرنخ‌های فروش از درخواست‌های خرید فوری/دوره‌ای ساخته می‌شوند و کاملاً
 * مستقل از سرنخ‌های خرید زندگی می‌کنند — پرونده‌ها و همه‌چیز جدا؛ چون
 * «کارخانه‌ای رب می‌فروشد و گوجه می‌خرد». پیاده‌سازی مشترک:
 * components/panel/follow/leads-crm.tsx (خواهرِ /panel/saved)
 */

import { LeadsCrm } from '@/components/panel/follow/leads-crm';

export default function SellLeadsPage() {
  return <LeadsCrm kind="sell" basePath="/panel/sell-leads" />;
}
