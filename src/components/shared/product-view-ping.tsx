'use client';

import { useEffect } from 'react';
import { anonSessionId } from '@/lib/activity';
import { reportProductView } from '@/lib/mock/api';

/** خزنده‌ها شمرده نمی‌شوند */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|lighthouse|headless|phantom|puppeteer|playwright|pagespeed/i;

/**
 * ثبت بازدید واقعی صفحه آگهی (خواسته مالک ۳۰-۱۰ — زیربنای صفحه «آمار»).
 * هر آگهی حداکثر یک‌بار در هر نشست مرورگر شمرده می‌شود (refresh اسپم نمی‌کند)؛
 * ۳۰ دقیقه بعد از آخرین بازدید همان آگهی، دوباره قابل شمارش است.
 */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export function ProductViewPing({ productId }: { productId: number }) {
  useEffect(() => {
    if (!Number.isFinite(productId) || productId <= 0) return;
    if (BOT_RE.test(navigator.userAgent)) return;

    // الگوی دیوار: یک شمارش در هر ۳۰ دقیقه به‌ازای هر آگهی
    const key = `imach:viewed:${productId}`;
    try {
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < DEDUPE_WINDOW_MS) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* حافظه نشست در دسترس نیست — بدون دی‌داپ شمارش می‌کنیم */
    }

    void reportProductView(productId, anonSessionId()).catch(() => {});
  }, [productId]);

  return null;
}
