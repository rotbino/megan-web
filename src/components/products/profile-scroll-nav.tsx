'use client';

/**
 * ناوبری بخش‌های کاتالوگ/دفتر خرید — عین باسکول (cp-navigation-container):
 * نوار لینک‌ها با خط جداکننده بالایی ۱px (مثل باسکول) داخل همان کارت
 * یکپارچه هدر؛ تب فعال متن رنگ برند + اندیکاتور خط زیرین ۲px دارد
 * (cp-nav-button-indicator). دسکتاپ هاور پس‌زمینه ملایم می‌گیرد.
 * کلیک اسکرول نرم به بخش مربوطه می‌برد و scroll-spy تب فعال را هایلایت می‌کند.
 *
 * ترتیب پیش‌فرض (خواستهٔ مالک ۱۱-۱۱): «نظرات» بلافاصله بعد از «محصولات»
 * می‌آید — نظرات برای خریدار/فروشنده از گواهی‌نامه‌ها مهم‌تر است و نباید
 * زیر اسکرول قایم شود. بخش‌ها با prop قابل تنظیم است (دفتر خرید عنوان‌های
 * خودش را می‌دهد).
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

export interface NavSection {
  id: string;
  label: string;
  /** شمار کنار برچسب (مثل تعداد محصولات) */
  count?: number;
  /** فقط وقتی دیتا دارد نمایش داده شود (گالری/مجوزها) */
  visible?: boolean;
}

/** ترتیب پیش‌فرض کاتالوگ — نظرات بعد از محصولات (خواستهٔ مالک ۱۱-۱۱) */
const DEFAULT_SECTIONS: NavSection[] = [
  { id: 'about', label: 'درباره فروشنده' },
  { id: 'products', label: 'محصولات' },
  { id: 'reviews', label: 'نظرات' },
  { id: 'gallery', label: 'مجوزها و گواهی‌نامه‌ها' },
];

export function ProfileScrollNav({
  productCount,
  hasGallery = false,
  sections,
  activeDefault = 'about',
}: {
  productCount?: number;
  /** بخش گالری/گواهی‌ها فقط وقتی دیتا دارد نمایش داده شود (خواستهٔ مالک ۱۰-۱۱ دور ۵) */
  hasGallery?: boolean;
  /** بخش‌های سفارشی (دفتر خرید) — پیش‌فرض ترتیب کاتالوگ */
  sections?: NavSection[];
  /** تب فعال اولیه */
  activeDefault?: string;
}) {
  const [active, setActive] = useState<string>(activeDefault);

  const list: NavSection[] =
    sections ??
    DEFAULT_SECTIONS.map((s) =>
      s.id === 'products' && productCount !== undefined ? { ...s, count: productCount } : s,
    );

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
    for (const s of list) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // list عمداً از وابستگی‌ها خارج است — ساختار بخش‌ها در طول عمر صفحه ثابت است
  }, []);

  return (
    <nav
      aria-label="بخش‌های صفحه"
      className="border-t border-border px-2 pt-0.5 sm:px-4"
    >
      <ul className="flex items-center gap-1 overflow-x-auto">
        {list
          // سفارشی: فقط فلگ visible خودش حاکم است؛ پیش‌فرض کاتالوگ: گالری فقط با دیتا
          .filter((s) => s.visible !== false)
          .filter((s) => sections != null || s.id !== 'gallery' || hasGallery)
          .map(({ id, label, count }) => (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                aria-current={active === id ? 'true' : undefined}
                onClick={() => setActive(id)}
                className={cn(
                  // عین cp-nav-button: پدینگ ۱۴/۱۶ + اندیکاتور خط زیرین برای تب فعال
                  'relative flex items-center gap-1 rounded-sm px-4 py-3.5 text-sm transition-colors',
                  active === id
                    ? 'border-b-2 border-(--catalog-accent) font-bold text-(--catalog-accent)'
                    : 'border-b-2 border-transparent font-normal text-muted-foreground hover:text-foreground lg:hover:bg-muted/60',
                )}
              >
                {label}
                {count !== undefined && (
                  <span className="font-num text-[11px] font-medium text-muted-foreground">({toFa(count)})</span>
                )}
              </a>
            </li>
          ))}
      </ul>
    </nav>
  );
}
