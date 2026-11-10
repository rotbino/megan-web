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
}: {
  /** userName فروشندهٔ صاحب کاتالوگ — کلید ذخیره در بک‌اند */
  sellerUserName: string;
  className?: string;
  label?: string;
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
      requireAuth('save');
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
