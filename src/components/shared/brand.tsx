import { cn } from '@/lib/utils';

/**
 * نشان ایمچ (iMach) — لوگوی رسمی فولدر public (پالت نارنجی برند).
 * در موبایل نسخه کوتاه (نشان ıM) نمایش داده می‌شود تا نوار جستجو جا بگیرد؛
 * در دسکتاپ وردمارک کامل (logo2) است.
 */
export function BrandLogo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const h = { sm: 'h-7', md: 'h-9', lg: 'h-11' }[size];
  return (
    <>
      {/* موبایل — لوگوی کوتاه */}
      <img
        src="/logo-short.svg"
        alt="ایمچ — بازار خرید و فروش عمده"
        className={cn(h, 'w-auto shrink-0 nav-desktop:hidden', className)}
        loading="eager"
      />
      {/* دسکتاپ — وردمارک کامل */}
      <img
        src="/logo2.svg"
        alt="ایمچ — بازار خرید و فروش عمده"
        className={cn(h, 'hidden w-auto shrink-0 nav-desktop:block', className)}
        loading="eager"
      />
    </>
  );
}
