'use client';

/**
 * سرنخ‌های خرید — تک‌صفحهٔ CRM دید خریدار (خواستهٔ مالک ۸-۱۱ دور ۲۸).
 * فقط آگهی‌های فروشِ ذخیره‌شده این‌جا زندگی می‌کنند؛ سرنخ‌های فروش (درخواست‌های
 * خریدِ ذخیره‌شدهٔ فروشنده) صفحهٔ مستقل خودشان را دارند: /panel/sell-leads.
 * پیاده‌سازی مشترک: components/panel/follow/leads-crm.tsx
 */

import { LeadsCrm } from '@/components/panel/follow/leads-crm';

export default function SavedLeadsPage() {
  return <LeadsCrm kind="buy" basePath="/panel/saved" />;
}
