import { cn } from '@/lib/utils';

/**
 * نشان M ایمچ — همان لوگوی رسمی (logo-short.svg، پالت نارنجی برند).
 * به‌جای آیکون هدست در «پشتیبانی ایمچ» (خواسته مالک ۷-۱۱): چت پشتیبانی
 * با لوگوی کوچک برند شناخته می‌شود، نه یک آیکون عمومی.
 */
export function ImchMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary',
        className ?? 'size-10',
      )}
    >
      <img
        src="/logo-short.svg"
        alt="پشتیبانی ایمچ"
        className="size-[72%] w-auto object-contain"
        loading="lazy"
      />
    </span>
  );
}
