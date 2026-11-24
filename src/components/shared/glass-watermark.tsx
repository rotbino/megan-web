'use client';

/**
 * واترمارک شیشه‌ای لوگوی کامل ایمچ روی تصویر محصول (خواسته مالک ۳-۱۱) —
 * ضد دزدیده‌شدن تصاویر: پچ شیشه‌ای (بلور + سفیدِ کم) با لوگوی سفید
 * نیمه‌شفاف که پشتش نسبتاً دیده می‌شود؛ جایش هر بار کمی تغییر می‌کند
 * ولی هرگز مرکزِ کالا نیست و در چشم نمی‌آید.
 *
 * جای تصادفی فقط بعد از mount و در فریم بعدی اعمال می‌شود (rAF) — رندر
 * SSR/ISR همیشه یک نقطهٔ امن ثابت دارد تا hydration mismatch پیش نیاید.
 */

import { useEffect, useState } from 'react';

/** لنگرهای مجاز (٪ از گوشهٔ بالا-چپِ کادر تصویر) — گوشه‌ها و حاشیه‌ها؛
 *  مرکز ممنوع: جنس باید دیده شود. جمع‌وجور نگه داشته می‌شود تا در چشم نیاید. */
const ANCHORS = [
  { x: 6, y: 6 },
  { x: 46, y: 7 },
  { x: 70, y: 10 },
  { x: 7, y: 42 },
  { x: 44, y: 86 },
  { x: 70, y: 78 },
  { x: 10, y: 74 },
] as const;

/** لنگر پیش‌فرض SSR — بالا-چپ، محافظه‌کارانه */
const DEFAULT_ANCHOR = { x: 6, y: 6 };

export function GlassWatermark({ seed }: { seed?: string }) {
  const [anchor, setAnchor] = useState<{ x: number; y: number }>(DEFAULT_ANCHOR);

  useEffect(() => {
    // فریم بعدی: جای تصادفی فقط سمت کلاینت — بدون ناسازگاری hydration
    const raf = requestAnimationFrame(() => {
      const base = ANCHORS[Math.floor(Math.random() * ANCHORS.length)];
      // جیتر کوچک (±۳٪) — «هر بار کمی تغییر کند» ولی همیشه در حاشیهٔ امن
      const jitter = () => Math.random() * 6 - 3;
      setAnchor({
        x: Math.min(76, Math.max(4, base.x + jitter())),
        y: Math.min(86, Math.max(4, base.y + jitter())),
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [seed]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-[1] select-none"
      style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
    >
      <span className="flex items-center rounded-full bg-white/15 px-2 py-1 shadow-[0_1px_6px_rgba(0,0,0,0.08)] backdrop-blur-[2.5px]">
        <img
          src="/logo-watermark.svg"
          alt=""
          draggable={false}
          className="h-[18px] w-auto opacity-70 sm:h-5"
        />
      </span>
    </div>
  );
}
