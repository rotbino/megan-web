'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/mock/auth';
import { priceFa, stockFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

/**
 * قیمت آگهی — فقط برای اعضای ایمچ:
 *   لاگین‌نشده: دکمه «مشاهده قیمت» → مودال ورود با شماره موبایل باز می‌شود
 *   لاگین‌شده: کف قیمت مستقیماً و به‌جای دکمه نمایش داده می‌شود
 * (قیمت نهایی و مذاکره از طریق تماس/چت با فروشنده — مدل Lead-gen باسکول)
 */
export function ProductPrice({
  product,
  variant = 'card',
}: {
  product: Product;
  variant?: 'card' | 'page';
}) {
  const { user, requireAuth } = useAuth();

  if (!user) {
    return (
      <Button
        onClick={() => requireAuth()}
        className={cn(
          'w-full rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary-deep',
          variant === 'page' ? 'h-12 text-base' : 'h-10',
        )}
        aria-label={`مشاهده قیمت ${product.productName}`}
      >
        مشاهده قیمت
      </Button>
    );
  }

  if (variant === 'page') {
    return (
      <div className="rounded-md bg-secondary/60 p-4">
        <p className="text-xs text-muted-foreground">کف قیمت هر {product.unit}:</p>
        <p className="mt-1 text-2xl font-extrabold text-primary">
          {product.minSalePrice ? priceFa(product.minSalePrice) : 'تماس بگیرید'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          حداقل هر معامله: {stockFa(product.minSaleAmount, product.unit)} — موجودی: {stockFa(product.stock, product.unit)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">قیمت نهایی توافقی است؛ برای مذاکره با فروشنده تماس بگیرید.</p>
      </div>
    );
  }

  return (
    <div className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-secondary font-extrabold text-primary">
      {product.minSalePrice ? (
        <>
          <span className="text-base">{priceFa(product.minSalePrice).replace(' تومان', '')}</span>
          <span className="text-[11px] font-medium text-muted-foreground">تومان / {product.unit}</span>
        </>
      ) : (
        <span className="text-sm">تماس بگیرید</span>
      )}
    </div>
  );
}
