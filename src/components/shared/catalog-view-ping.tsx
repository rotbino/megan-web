'use client';

import { useEffect } from 'react';
import { logActivity } from '@/lib/activity';

/**
 * ثبت بازدید کاتالوگ فروشنده (خواستهٔ مالک ۱۸-۱۱) — ردپای «کاتالوگ کدام
 * کاربر را دیده» در ActivityLog (type=catalog_view) می‌نشیند تا برای تطابق
 * و شخصی‌سازی (فید فروشندگان، پیشنهادها) به کار بیاید. عین بقیهٔ pingها:
 * fire-and-forget، خزنده‌ها شمرده نمی‌شوند، یک‌بار در هر جلسهٔ JS.
 */
export function CatalogViewPing({ userName }: { userName: string }) {
  useEffect(() => {
    if (!userName) return;
    logActivity(
      { type: 'catalog_view', catalogUserName: userName },
      `cat:${userName}`,
    );
  }, [userName]);
  return null;
}
