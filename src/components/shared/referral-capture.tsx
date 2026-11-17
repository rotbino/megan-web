'use client';

/**
 * ذخیره کد رفرال بازاریاب در کوکی — ورود با لینک دعوت (?ref=10234)
 * کوکی ۹۰ روزه imach_ref؛ هنگام ثبت‌نام، کاربر به‌عنوان «دعوت‌شده»
 * مالک آن کد ثبت می‌شود (در بک‌اند: referredById روی User).
 * پارامتر بعد از ذخیره از URL حذف می‌شود تا canonical سئو سالم بماند.
 */

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const REFERRAL_COOKIE = 'imach_ref';
export const REFERRAL_COOKIE_MAX_AGE = 90 * 24 * 3600; // ۹۰ روز

function ReferralCaptureInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ref = sp.get('ref');

  useEffect(() => {
    if (ref && /^\d{3,8}$/.test(ref)) {
      document.cookie = `${REFERRAL_COOKIE}=${ref}; max-age=${REFERRAL_COOKIE_MAX_AGE}; path=/; samesite=lax`;
      // حذف ?ref از URL — بدون reload
      router.replace(pathname);
    }
  }, [ref, router, pathname]);

  return null;
}

export function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  );
}

/** خواندن کد معرف ذخیره‌شده — فقط سمت مرورگر */
export function readReferralCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
