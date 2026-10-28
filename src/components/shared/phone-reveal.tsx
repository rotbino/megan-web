'use client';

import { useState } from 'react';
import { BadgeCheck, Loader2, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api/client';
import { useAuth } from '@/lib/mock/auth';

/** پاسخ POST /products/getSellerPhone */
interface SellerPhoneInfo {
  sellerId: string;
  phone: string;
  firstName: string;
  lastName: string;
  userName: string;
  /** خریدار واردشده باشد، تماس در گزارش ادمین ثبت شده */
  callLogged: boolean;
}

/**
 * دکمه «شماره تماس» فروشنده — عین باسکول: دکمه پررنگ در کارت فروشنده
 * که شماره تماس را آشکار می‌کند.
 *
 * مهمان (لاگین‌نشده): کلیک «نمایش شماره تماس» مودال ورود را باز می‌کند —
 * شماره/قیمت تماس از اعضا پنهان است (مدل lead-gen + ثبت گزارش تماس).
 * با productId داده شود شماره واقعی از بک‌اند می‌آید و همین آشکارسازی
 * به‌عنوان «تماس» در گزارش ادمین ثبت می‌شود (کی به کی زنگ زده).
 */
export function PhoneReveal({
  sellerName,
  productId,
  fallbackPhone = '۰۹۱۲ ۰۰۰ ۰۰۰۰',
  children,
}: {
  sellerName: string;
  productId?: number;
  /** وقتی بک‌اند در دسترس نیست/productId نیست */
  fallbackPhone?: string;
  children?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { requireAuth } = useAuth();

  const reveal = async () => {
    // مهمان: مودال ورود باز می‌شود؛ بعد از ورود دوباره کلیک کند
    if (!requireAuth()) return;
    setShown(true);
    if (phone || !productId || loading) return;
    setLoading(true);
    try {
      const info = await apiFetch<SellerPhoneInfo>('/products/getSellerPhone', { id: productId });
      setPhone(info.phone);
    } catch {
      setFailed(true); // شماره جایگزین نشان بده — تجربه خریدار نباید خراب شود
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-md" dir="rtl">
        <DialogHeader className="text-start">
          <DialogTitle className="text-start text-base">شماره تماس {sellerName}</DialogTitle>
          <DialogDescription className="text-start">برای اطلاع از قیمت روز و خرید مستقیم تماس بگیرید.</DialogDescription>
        </DialogHeader>
        {!shown ? (
          <Button className="h-12 w-full rounded-md text-base" onClick={reveal} disabled={loading}>
            <Phone size={18} />
            نمایش شماره تماس
          </Button>
        ) : (
          <div className="space-y-2 rounded-md border p-4 text-center">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-1.5 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                در حال دریافت شماره…
              </p>
            ) : (
              <p className="flex items-center justify-center gap-2 text-lg font-extrabold text-primary">
                <BadgeCheck size={18} />
                <span dir="ltr" className="font-mono">{phone ?? fallbackPhone}</span>
              </p>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Phone size={16} />
                تماس در همین صفحه
              </a>
            )}
            {failed && (
              <p className="text-[10.5px] text-muted-foreground">
                شماره موقت نمایش داده می‌شود؛ برای شماره دقیق دوباره تلاش کنید.
              </p>
            )}
          </div>
        )}
        <div className="flex items-start gap-2 rounded-md bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
          <p>توصیه ایمچ: همواره به انجام معاملات حضوری است.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
