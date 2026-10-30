'use client';

/**
 * ثبت فعالیت کاربر — کلاینت سبک (fire-and-forget) به بک‌اند.
 *
 * سه منبع ثبت (خواسته مالک ۳۰-۱۰):
 *  • search — جستجوی کاربر (صفحه /product-list/search/[q])
 *  • category_view — انتخاب دسته از سایدبار/مگامنو (صفحه دسته)
 *  • page_view — بازدید صفحات (بین‌برگ پایدار در layout)
 *
 * نشست مهمان: uuid در localStorage — بینندگان مهمان در آمار تجمیع می‌شوند.
 * توکن کاربر واردشده (اگر هست) ضمیمه می‌شود تا فعالیت به او نسبت داده شود.
 */

const SESSION_KEY = 'imach:anon-session';

/** نشست مرورگر — یک uuid پایدار per-browser */
export function anonSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

/** جلوگیری از دوبار شمارش یک صفحه در یک جلسه JS (Strict Mode / ریمونت) */
const pinged = new Set<string>();

/** خزنده‌ها و ابزارهای خودکار شمرده نمی‌شوند — فقط کاربر واقعی */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|lighthouse|headless|phantom|puppeteer|playwright|pagespeed/i;

export interface ActivityInput {
  type: 'search' | 'category_view' | 'page_view';
  q?: string;
  categoryName?: string;
  path?: string;
}

/**
 * ثبت یک رویداد — هرگز throw نمی‌کند و UX را منتظر نمی‌دارد.
 * `dedupeKey` داده شود، همان رویداد در این جلسه JS دوباره ثبت نمی‌شود.
 */
export function logActivity(input: ActivityInput, dedupeKey?: string): void {
  if (typeof window === 'undefined') return;
  if (BOT_RE.test(navigator.userAgent)) return;
  if (dedupeKey) {
    if (pinged.has(dedupeKey)) return;
    pinged.add(dedupeKey);
  }

  // توکن کاربر واردشده — از کلاینت مرکزی (بدون import دایره‌ای: فقط خواندن localStorage)
  let authHeader: Record<string, string> | undefined;
  try {
    const raw = localStorage.getItem('imach:tokens');
    const accessToken = raw ? (JSON.parse(raw) as { accessToken?: string })?.accessToken : undefined;
    if (accessToken) authHeader = { Authorization: `Bearer ${accessToken}` };
  } catch {
    /* بدون توکن — مهمان */
  }

  void fetch('/api/activity/log', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader },
    body: JSON.stringify({
      type: input.type,
      ...(input.q ? { q: input.q } : {}),
      ...(input.categoryName ? { categoryName: input.categoryName } : {}),
      ...(input.path ? { path: input.path } : {}),
      sessionId: anonSessionId(),
    }),
    keepalive: true,
  }).catch(() => {});
}
