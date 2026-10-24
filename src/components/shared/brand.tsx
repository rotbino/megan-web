import { cn } from '@/lib/utils';

/** نشان ایمچ (iMach) — لوگوی رسمی فولدر public */
export function BrandLogo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const h = { sm: 'h-7', md: 'h-9', lg: 'h-11' }[size];
  return (
     
    <img
      src="/logo2.svg"
      alt="ایمچ — بازار خرید و فروش عمده"
      className={cn(h, 'w-auto shrink-0', className)}
      loading="eager"
    />
  );
}
