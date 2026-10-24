'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Eye,
  MessageSquareText,
  Phone,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { priceFa, stockFa, toFa } from '@/lib/format';
import type { Product } from '@/lib/types';

/**
 * آشکارسازی قیمت — الگوی Lead-gen باسکول: قیمت «کف» نمایش داده می‌شود و
 * تماس/چت برای قیمت نهایی و مذاکره. (باسکول فقط بعد از تعامل قیمت نشان می‌داد؛
 * اینجا تجربه شفاف‌تر و قابل‌مقایسه‌تر است.)
 */
export function PriceReveal({
  product,
  children,
}: {
  product: Product;
  children?: React.ReactNode;
}) {
  const [contact, setContact] = useState(false);

  return (
    <Dialog onOpenChange={() => setContact(false)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl" dir="rtl">
        <DialogHeader className="text-start">
          <DialogTitle className="text-start text-lg leading-6">{product.productName}</DialogTitle>
          <DialogDescription className="text-start">
            {product.provinceName}، {product.cityName.trim()} — {product.seller.firstName} {product.seller.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-secondary/60 p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp size={13} />
            کف قیمت هر {product.unit} برای خرید عمده:
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">
            {product.minSalePrice ? priceFa(product.minSalePrice) : 'تماس بگیرید'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            حداقل هر معامله: {stockFa(product.minSaleAmount, product.unit)} — موجودی: {stockFa(product.stock, product.unit)}
          </p>
        </div>

        {!contact ? (
          <div className="grid grid-cols-2 gap-2">
            <Button className="rounded-xl" onClick={() => setContact(true)}>
              <Phone size={16} />
              تماس با فروشنده
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href={`/product-view/${product.slug}/${product.categoryName}/${product.id}#chat`}>
                <MessageSquareText size={16} />
                چت با فروشنده
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <BadgeCheck size={16} className="text-primary" />
              شماره تماس فروشنده: <span dir="ltr" className="font-mono">۰۹۱۲ ۰۰۰ ۰۰۰۰</span>
            </p>
            <p className="text-xs leading-6 text-muted-foreground">
              شنبه تا پنجشنبه، ۹ تا ۱۸ پاسخ‌گو است. برای اطلاع از قیمت به‌روز و تخفیف پلکانی،
              حتماً به «مِگان» اشاره کنید.
            </p>
          </div>
        )}

        <Separator />
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
          <p>
            پیش از هر پرداختی، از صحت کالا حضوری اطمینان حاصل کنید یا از «پرداخت امن مِگان» استفاده کنید.
            مِگان در معاملات خارج از پرداخت امن مسئولیتی ندارد.
          </p>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          <Eye size={11} className="me-1 inline" />
          {toFa(product.viewCount)} خریدار این آگهی را دیده‌اند
        </p>
      </DialogContent>
    </Dialog>
  );
}
