import { timeAgoFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * زمان نسبی فارسی مقاوم در برابر هیدریشن (F5):
 * «۵۹ دقیقه پیش» سمت سرور ممکن است هنگام هیدریشن «۱ ساعت پیش» شده باشد —
 * تفاوت متن = React #418 + بازتولید زیردرخت. suppressHydrationWarning متن
 * سرور را نگه می‌دارد تا رندر بعدی (رفچ React Query) به‌روزش کند.
 * datetime ایزو هم برای سئو/دسترس‌پذیری اضافه می‌شود.
 * زمان همیشه با فونت num ایران‌سنس است (قانون فونت ۲-۱۱ — اعداد همه‌جا).
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
    <time dateTime={iso} suppressHydrationWarning className={cn('font-num', className)}>
      {timeAgoFa(date)}
    </time>
  );
}
