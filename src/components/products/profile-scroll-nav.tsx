'use client';

/**
 * ناوبری بخش‌های پروفایل — عین باسکول (cp-navigation-container):
 * نوار لینک‌های «درباره فروشنده / محصولات / نظرات» داخل همان کارت یکپارچه
 * هدر (بنر + هویت + نوار) نشسته — بدون خط جداکننده بالای نوار؛
 * تب فعال اندیکاتور خط زیرین دارد (cp-nav-button-indicator).
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
    <nav aria-label="بخش‌های پروفایل" className="px-2 sm:px-4">
      <ul className="flex items-center gap-1 overflow-x-auto">
        {SECTIONS.map(({ id, label }) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              onClick={() => setActive(id)}
              className={cn(
                // عین cp-nav-button: ارتفاع ثابت + اندیکاتور خط زیرین برای تب فعال
                'relative flex h-11 items-center border-b-2 px-3.5 text-[13px] font-bold transition-colors',
                active === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              {id === 'products' && productCount !== undefined && (
                <span className="text-[10.5px] font-medium text-muted-foreground">({toFa(productCount)})</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
