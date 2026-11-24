'use client';

/**
 * درخواست خرید معلق (pending RFQ) — پل بین فرم صفحه اول و ورود/ثبت‌نام.
 *
 * جریان (خواسته مالک ۲۸-۱۰): مهمان فرم صفحه اول را پر می‌کند و «ثبت درخواست
 * خرید» می‌زند → مودال ورود باز می‌شود → داده فرم این‌جا ذخیره می‌شود تا بعد
 * از ورود/ثبت‌نام «بلافاصله» ثبت شود و کاربر به پنل خرید (تب درخواست‌های
 * در انتظار) برود:
 *   • کاربر قبلی → بعد از ورود همان‌جا ثبت می‌شود (AuthModal).
 *   • کاربر جدید → بعد از تکمیل نام/استان/شهر در /register ثبت می‌شود.
 *
 * TTL ۳۰ دقیقه — اگر کاربر مسیر را رها کند داده بی‌جا نمی‌ماند.
 */

import { submitBuyRequest } from '@/lib/mock/api';

const KEY = 'imach:pending-rfq';
const TTL_MS = 30 * 60 * 1000;

export interface PendingRfq {
  subCategoryId: number;
  productType: string;
  amount: number;
  savedAt: number;
}

/** ذخیره درخواست پیش از ورود — فرم صفحه اول */
export function savePendingRfq(data: Omit<PendingRfq, 'savedAt'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    /* حافظه پر/خصوصی — بدون pending ادامه می‌دهیم */
  }
}

/** خواندن معلق معتبر — بدون حذف */
export function takePendingRfq(): PendingRfq | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingRfq;
    if (
      !p ||
      typeof p.subCategoryId !== 'number' ||
      typeof p.amount !== 'number' ||
      typeof p.savedAt !== 'number' ||
      Date.now() - p.savedAt > TTL_MS
    ) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPendingRfq(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export type FlushResult = 'submitted' | 'failed' | 'none';

/**
 * ثبت درخواست معلق اگر هست — بعد از ورود/ثبت‌نام صدا زده می‌شود.
 * 'submitted': ثبت شد (و پاک شد) → هدایت به پنل خرید.
 * 'failed': خطای شبکه — پاک می‌شود تا دوباره‌ثبتی نشود؛ کاربر در پنل
 *           «درخواست‌های من» لیست خالی می‌بیند و از همان‌جا دوباره ثبت می‌کند.
 * 'none': اصلاً درخواستی معلق نبود (ورود عادی).
 */
export async function flushPendingRfq(): Promise<FlushResult> {
  const p = takePendingRfq();
  if (!p) return 'none';
  try {
    await submitBuyRequest({
      subCategoryId: p.subCategoryId,
      productType: p.productType,
      amount: p.amount,
    });
    clearPendingRfq();
    return 'submitted';
  } catch {
    clearPendingRfq();
    return 'failed';
  }
}

/** مقصد پس از ورود/ثبت‌نام — خواسته مالک: بنر «فروشگاه بسازید» مهمان را
 * بعد از ثبت‌نام به بخش محصولات پنل ببرد (نه پنل عمومی). */
const REDIRECT_KEY = 'imach:after-auth-redirect';

export function setAfterAuthRedirect(path: string): void {
  try {
    localStorage.setItem(REDIRECT_KEY, path);
  } catch {
    /* noop */
  }
}

/** خواندن و پاک کردن مقصد پس از ورود — پیش‌فرض fallback */
export function takeAfterAuthRedirect(fallback: string): string {
  try {
    const v = localStorage.getItem(REDIRECT_KEY);
    if (v) localStorage.removeItem(REDIRECT_KEY);
    return v || fallback;
  } catch {
    return fallback;
  }
}

/**
 * مقصد نهایی پس از ورود/ثبت‌نام — ترکیب دو نیت:
 * ۱) درخواست خرید معلق (فرم صفحه اول) → ثبت + پنل خرید.
 * ۲) مقصد ذخیره‌شده (مثل بنر فروشگاه → /panel/products).
 * ۳) هیچ‌کدام → پنل عمومی.
 */
export async function resolveAfterAuthDest(defaultPanel = '/panel'): Promise<string> {
  const flushed = await flushPendingRfq();
  if (flushed !== 'none') return PANEL_RFQ_DEST;
  return takeAfterAuthRedirect(defaultPanel);
}

/** مقصد پس از ورود/ثبت‌نام — با درخواست معلق یا بدون آن */
export const PANEL_RFQ_DEST = '/panel/my-requests?tab=pending';
