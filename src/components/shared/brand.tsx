import { Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';

/** نشان مِگان — بازار عمده بدون واسطه */
export function BrandLogo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-12 w-12 rounded-2xl' }[size];
  const icon = { sm: 18, md: 22, lg: 28 }[size];
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('grid place-items-center bg-primary text-primary-foreground shadow-sm', dims)}>
        <Boxes size={icon} strokeWidth={2.2} />
      </span>
      {(size !== 'sm' || true) && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-tight text-foreground">مِگان</span>
          <span className="text-[10px] font-medium text-muted-foreground">بازار عمده بدون واسطه</span>
        </span>
      )}
    </span>
  );
}
