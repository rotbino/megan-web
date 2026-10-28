'use client';

/**
 * ناوبری بخش‌های پروفایل — چسبان با scroll-spy (بهبود نسبت به تب باسکول):
 * همه بخش‌ها در یک صفحه قابل پیمایش‌اند (هیچ محتوایی پنهان نمی‌شود)؛
 * این نوار فقط «کجای صفحه هستیم» را هایلایت می‌کند و با کلیک نرم اسکرول
 * می‌کند — الگوی مدرن پروفایل‌ها (GitHub/LinkedIn) + ساختار باسکول.
 */

import { useEffect, useState } from 'react';
import { Info, MessageSquareText, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

const SECTIONS = [
  { id: 'about', label: 'درباره فروشنده', icon: Info },
  { id: 'products', label: 'محصولات', icon: Package },
  { id: 'reviews', label: 'نظرات', icon: MessageSquareText },
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
    <nav
      aria-label="بخش‌های پروفایل"
      className="sticky top-0 z-30 mb-4 mt-4 border-y bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <ul className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 lg:px-6">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              onClick={() => setActive(id)}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-bold transition-colors',
                active === id
                  ? 'bg-primary-soft text-primary'
                  : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
              )}
            >
              <Icon size={14} />
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
