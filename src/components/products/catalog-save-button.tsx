'use client';

/**
 * دکمهٔ «ذخیره کاتالوگ» روی صفحهٔ کاتالوگ کاربر (خواسته مالک ۱۰-۱۱
 * + بازنگری). کاتالوگ فروشنده همان صفحهٔ عمومی اوست؛ هر کاربر واردشده
 * می‌تواند آن را در «کاتالوگ های ذخیره شده» پنل خودش ذخیره کند — مهمان →
 * مودال ورود با نیات ذخیره (ابزار جذب کاربر جدید). خود فروشنده دکمه را
 * نمی‌بیند (کاتالوگ خودش را که ذخیره نکند).
 */

import { Bookmark, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/mock/auth';
import { useCatalogSaved, useToggleCatalogSave } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function CatalogSaveButton({
  sellerUserName,
  className,
  label,
  variant = 'default',
}: {
  /** userName فروشندهٔ صاحب کاتالوگ — کلید ذخیره در بک‌اند */
  sellerUserName: string;
  className?: string;
  label?: string;
  /** banner = قرص روشن روی بنر کاتالوگ (دسکتاپ) — خواستهٔ مالک ۱۰-۱۱ دور ۵ */
  variant?: 'default' | 'banner';
}) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const isSelf = !!user && user.userName === sellerUserName;
  const { data: saved } = useCatalogSaved(sellerUserName, !!user && !isSelf);
  const toggle = useToggleCatalogSave();

  // صاحب کاتالوگ دکمهٔ ذخیره ندارد — دکمه‌های تماس/چت خودش کافی است
  if (isSelf) return null;

  const isSaved = saved === true;

  const onClick = () => {
    if (!user) {
      // مهمان → مودال ورود/ثبت‌نام با نیات ذخیرهٔ کاتالوگ (خواستهٔ مالک ۱۰-۱۱
      // دور ۵: کاربر تازه وارد به /register هدایت می‌شود)
      requireAuth('save-catalog');
      return;
    }
    toggle.mutate(sellerUserName, {
      onSuccess: (now) =>
        toast({
          description: now
            ? 'کاتالوگ در «کاتالوگ های ذخیره شده» شما ذخیره شد.'
            : 'کاتالوگ از لیست ذخیره‌شده‌ها حذف شد.',
        }),
      onError: () =>
        toast({ description: 'ذخیره موقتاً ممکن نشد؛ دوباره تلاش کنید.', variant: 'destructive' }),
    });
  };

  if (variant === 'banner') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSaved}
        aria-label={isSaved ? 'حذف ذخیرهٔ کاتالوگ' : 'ذخیرهٔ کاتالوگ'}
        title={isSaved ? 'ذخیره شده — حذف از لیست' : 'ذخیرهٔ کاتالوگ در ایمچ'}
        className={cn(
          'flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium text-card-foreground shadow-[0_2px_8px_rgba(0,0,0,0.14)] transition hover:brightness-95',
          className,
        )}
      >
        {toggle.isPending ? (
          <Loader2 size={17} className="animate-spin" />
        ) : isSaved ? (
          <Check size={17} strokeWidth={2.6} className="text-emerald-600" />
        ) : (
          <Bookmark size={17} />
        )}
        {label ?? (isSaved ? 'ذخیره شد' : 'ذخیره کاتالوگ')}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={isSaved ? 'default' : 'outline'}
      onClick={onClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'حذف ذخیرهٔ کاتالوگ' : 'ذخیرهٔ کاتالوگ'}
      className={cn('h-11 w-full rounded-lg px-5 text-sm font-bold lg:h-10 lg:w-[142px]', className)}
    >
      {toggle.isPending ? (
        <Loader2 size={18} className="animate-spin" />
      ) : isSaved ? (
        <Check size={18} />
      ) : (
        <Bookmark size={18} />
      )}
      {label ?? (isSaved ? 'ذخیره شد' : 'ذخیره کاتالوگ')}
    </Button>
  );
}
