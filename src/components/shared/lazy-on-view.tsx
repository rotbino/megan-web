'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * لیزی‌لود سکشن‌های پایین صفحه (خواستهٔ مالک ۱۸-۱۱ — سرعت صفحهٔ آگهی):
 * children فقط وقتی به ویوپورت «نزدیک» شود مونت می‌شود (پیش‌فرض ۱۲۰۰px قبل
 * از رسیدن) — یعنی فچ‌های کلاینتِ سکشن‌های پایین (مثل ریل محصولات فروشنده)
 * دیگر هم‌زمان با هیدریشن شل شلیک نمی‌شوند و پهنای باند/باتچ بک‌اند برای
 * همان لحظهٔ اول آزاد می‌ماند. تا آن لحظه fallback (اسکلت) رندر می‌شود؛
 * fallback در SSR هم رندر می‌شود تا جای سکشن از قبل رزرو و پرش صفحه (CLS)
 * صفر بماند.
 *
 * برای محتوای سئویی از این کامپوننت استفاده نکنید — آن محتوا یا در شل یا
 * با Suspense استریم می‌شود تا داخل HTML بماند؛ این فقط برای بخش‌هایی است
 * که به‌هرحال کلاینت‌فچ‌اند و در HTML اولیه نیستند.
 */
export function LazyOnView({
  children,
  fallback,
  rootMargin = '1200px 0px',
}: {
  children: React.ReactNode;
  /** جای سکشن تا لحظهٔ ورود به ویو — معمولاً اسکلت هم‌شکل خود سکشن */
  fallback?: React.ReactNode;
  /** چقدر قبل از رسیدن به ویوپورت فعال شود (پیش‌فرض ۱۲۰۰px مثل نگهبان اسکرول لیست) */
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    // IntersectionObserver نیست (مرورگر خیلی قدیمی/تست) → همان قدیم: بدون لیزی
    // (یک تیک بعد، نه هم‌زمان در بدنهٔ افکت — قانون react-hooks/set-state-in-effect)
    if (typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(t);
    }
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect(); // یک‌بار برای همیشه — سکشن مونت می‌ماند
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);

  return (
    <div ref={ref} data-lazy-section={inView ? 'mounted' : 'pending'}>
      {inView ? children : (fallback ?? null)}
    </div>
  );
}
