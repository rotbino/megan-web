'use client';

/**
 * ناوبری بخش‌های پروفایل — عین باسکول (cp-navigation-container):
 * نوار لینک‌ها با خط جداکننده بالایی ۱px (مثل باسکول) داخل همان کارت
 * یکپارچه هدر؛ تب فعال متن رنگ برند + اندیکاتور خط زیرین ۲px دارد
 * (cp-nav-button-indicator). دسکتاپ هاور پس‌زمینه ملایم می‌گیرد.
 * کلیک اسکرول نرم به بخش مربوطه می‌برد و scroll-spy تب فعال را هایلایت می‌کند.
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

const SECTIONS = [
  { id: 'about', label: 'درباره فروشنده' },
  { id: 'products', label: 'محصولات' },
  { id: 'reviews', label: 'نظرات' },
] as const;

export function ProfileScrollNav({ productCount }: { productCount?: number }) {
  const [active, setActive] = useState<string>('about');

  useEffect(() => {
    // scroll-spy: آخرین بخشی که از خط نشانگر گذشته فعال است
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      // خط نشانگر ~یک‌سوم بالای صفحه — حس طبیعی «فعال شدن» زودهنگام
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="بخش‌های پروفایل" className="border-t border-border px-2 pt-0.5 sm:px-4">
      <ul className="flex items-center gap-1 overflow-x-auto">
        {SECTIONS.map(({ id, label }) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              onClick={() => setActive(id)}
              className={cn(
                // عین cp-nav-button: پدینگ ۱۴/۱۶ + اندیکاتور خط زیرین برای تب فعال
                'relative flex items-center rounded-sm px-4 py-3.5 text-sm transition-colors',
                active === id
                  ? 'border-b-2 border-primary font-bold text-primary'
                  : 'border-b-2 border-transparent font-normal text-muted-foreground hover:text-foreground lg:hover:bg-muted/60',
              )}
            >
              {label}
              {id === 'products' && productCount !== undefined && (
                <span className="text-[11px] font-medium text-muted-foreground">({toFa(productCount)})</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
