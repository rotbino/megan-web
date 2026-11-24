/**
 * وب‌پوش فرانت (B10) — سابسکرایب مرورگر با کلید عمومی VAPID بک‌اند.
 *
 * جریان: دکمه «فعال‌سازی اعلان‌ها» (یا ورود با اجازهٔ قبلی) →
 * Notification.requestPermission → PushManager.subscribe(applicationServerKey)
 * → POST /push/subscribe. از آن به بعد پیام‌های چتِ کاربرِ آفلاین
 * به‌صورت اعلان سیستمی می‌رسد (sw.js نمایش می‌دهد).
 *
 * همه خطاها ساکت handled می‌شوند — پوش هرگز جریان اصلی را نمی‌شکند.
 * فقط در HTTPS (یا localhost) و پس از ثبت Service Worker کار می‌کند.
 */

import { apiFetch } from '@/lib/api/client';

/** تبدیل base64url کلید VAPID → Uint8Array برای PushManager (الگوی استاندارد) */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushSupport =
  | 'unsupported'
  | 'insecure' // HTTP غیر لوکال — پوش فقط روی HTTPS است
  | 'no-service-worker'
  | 'denied' // کاربر قبلاً رد کرده — فقط از تنظیمات مرورگر برمی‌گردد
  | 'available';

/** وضعیت توان پوش این مرورگر — برای تصمیم UI (نمایش/عدم نمایش دکمه) */
export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    return 'insecure';
  }
  if (Notification.permission === 'denied') return 'denied';
  return 'available';
}

/** اجازهٔ فعلی اعلان — 'granted' یعنی می‌شود بی‌سروصدا سابسکرایب کرد */
export function pushPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
}

/**
 * فعال‌سازی اعلان‌ها (کل جریان) — از UI یا بعد از ورود صدا زده می‌شود.
 * @returns پیام وضعیت برای toast؛ null یعنی «کاری نکردم» (بدون اجازه/بدون توکن).
 */
export async function enablePushNotifications(): Promise<string | null> {
  try {
    const support = pushSupport();
    if (support === 'unsupported' || support === 'insecure' || support === 'no-service-worker') {
      return 'مرورگر شما از اعلان‌های وب پشتیبانی نمی‌کند.';
    }
    if (support === 'denied') {
      return 'اعلان‌ها در تنظیمات مرورگر مسدود شده‌اند — از تنظیمات سایت اجازه دهید.';
    }

    // ۱) اجازه (اگر قبلاً داده شده بی‌صدا رد می‌شود)
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return null; // کاربر رد کرد — بدون پیام خطا

    // ۲) ثبت SW باید انجام شده باشد (layout فقط در پروداکشن ثبت می‌کند)
    const registration = await navigator.serviceWorker.ready;

    // ۳) کلید عمومی از بک‌اند
    const { publicKey } = await apiFetch<{ publicKey: string }>('/push/getPublicKey', {}, { auth: false });
    if (!publicKey) return 'اعلان‌ها روی سرور فعال نیستند.';

    // ۴) سابسکرایب (اگر هست دوباره استفاده کن)
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // ۵) ارسال به بک‌اند
    const raw = subscription.toJSON();
    if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
      return 'اطلاعات اشتراک اعلان ناقص است — دوباره تلاش کنید.';
    }
    await apiFetch('/push/subscribe', {
      endpoint: raw.endpoint,
      p256dh: raw.keys.p256dh,
      auth: raw.keys.auth,
      user_agent: navigator.userAgent,
    });
    return 'اعلان‌های ایمچ فعال شد.';
  } catch {
    return 'فعال‌سازی اعلان ناموفق بود — کمی بعد دوباره تلاش کنید.';
  }
}

/** خاموش‌کردن اعلان این مرورگر — برای تنظیمات/خروج */
export async function disablePushNotifications(): Promise<string | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return null;
    await apiFetch('/push/unsubscribe', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
    return 'اعلان‌ها خاموش شد.';
  } catch {
    return null;
  }
}

/**
 * سابسکرایب بی‌صدا وقتی اجازه قبلاً داده شده — بعد از ورود موفق صدا زده
 * می‌شود؛ هر خطایی ساکت است (کاربر چیزی نمی‌بیند).
 */
export async function silentResubscribeIfGranted(): Promise<void> {
  try {
    if (pushPermission() !== 'granted') return;
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { publicKey } = await apiFetch<{ publicKey: string }>('/push/getPublicKey', {}, { auth: false });
      if (!publicKey) return;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const raw = subscription.toJSON();
    if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) return;
    await apiFetch('/push/subscribe', {
      endpoint: raw.endpoint,
      p256dh: raw.keys.p256dh,
      auth: raw.keys.auth,
      user_agent: navigator.userAgent,
    });
  } catch {
    /* ساکت — پوش اختیاری است */
  }
}
