import { timeAgoFa } from '@/lib/format';

/**
 * زمان نسبی فارسی مقاوم در برابر هیدریشن (F5):
 * «۵۹ دقیقه پیش» سمت سرور ممکن است هنگام هیدریشن «۱ ساعت پیش» شده باشد —
 * تفاوت متن = React #418 + بازتولید زیردرخت. suppressHydrationWarning متن
 * سرور را نگه می‌دارد تا رندر بعدی (رفچ React Query) به‌روزش کند.
 * datetime ایزو هم برای سئو/دسترس‌پذیری اضافه می‌شود.
 */
export function RelativeTime({
  date,
  className,
}: {
  date: string;
  className?: string;
}) {
  const iso = new Date(date).toISOString();
  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {timeAgoFa(date)}
    </time>
  );
}
