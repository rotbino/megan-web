'use client';

import { useEffect } from 'react';
import { logActivity } from '@/lib/activity';

/** جلوگیری از دوبار شمارش یک جستجو در یک جلسه JS (React Strict Mode / ریمونت) */
const pinged = new Set<string>();

/** خزنده‌ها و ابزارهای خودکار شمرده نمی‌شوند — فقط کاربر واقعی */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|lighthouse|headless|phantom|puppeteer|playwright|pagespeed/i;

/**
 * تشخیص ورودی از گوگل — hostname رفرر روی دامنه‌های گوگل است
 * (google.com / google.fr / images.google.com / …). کوئریِ کاربر در رفرر
 * مدرن نیست؛ عبارتِ صفحه فرود (core) نمایندهٔ آن است.
 */
function isGoogleReferrer(referrer: string): boolean {
  try {
    const { hostname } = new URL(referrer);
    return /(^|\.)google\.[a-z.]{2,7}$/i.test(hostname);
  } catch {
    return false;
  }
}

/**
 * ثبت رویداد واقعی کاربر — بعد از mount صفحه جستجو:
 *  ۱) ورودی از گوگل → POST { q, source:'google' } — جدول واقعی به تفکیک
 *     تاریخ (google-log) +۱ می‌خورد (خواستهٔ مالک: هر ورودی گوگل، عبارت را
 *     یکی بالا ببرد؛ آمار واقعی جدا از اعداد برندینگ).
 *  ۲) ورود داخلی → POST { q } — شمارندهٔ جستجوهای داخلی (مثل قبل).
 *  ۳) ثبت در ActivityLog بک‌اند (پنل ادمین فعالیت‌ها — خواسته مالک ۳۰-۱۰).
 * خطای شبکه هیچ اثری روی UX ندارد؛ رندر هیچ‌وقت منتظر پاسخ نمی‌ماند.
 */
export function SearchPing({ q }: { q: string }) {
  useEffect(() => {
    if (!q || pinged.has(q)) return;
    if (BOT_RE.test(navigator.userAgent)) return;
    pinged.add(q);

    const fromGoogle = isGoogleReferrer(document.referrer);
    void fetch('/api/search-log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q, source: fromGoogle ? 'google' : 'internal' }),
      keepalive: true,
    }).catch(() => {});

    logActivity({ type: 'search', q });
  }, [q]);
  return null;
}
