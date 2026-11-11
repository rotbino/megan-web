'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Loader2, PhoneCall, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch, ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';

/** پاسخ POST /products/getSellerPhone */
interface SellerPhoneInfo {
  sellerId: string;
  phone: string;
  firstName: string;
  lastName: string;
  userName: string;
  /** خریدار واردشده باشد، تماس در گزارش ادمین ثبت شده */
  callLogged: boolean;
  /** تماس‌های باقی‌ماندهٔ امروز (سهمیهٔ بسته) — از بک‌اند */
  callsLeftToday?: number;
}

type RevealResult = { phone: string | null; error: null | 'quota' | 'rate' | 'failed' };

/**
 * دکمه «شماره تماس» فروشنده — امنیت شماره‌ها (خواسته مالک ۱-۱۱):
 *
 * • شماره موبایل هرگز در دیتای لیست/جزئیات نیست؛ فقط همین سرویس اختصاصی
 *   توکندار آن را برمی‌گرداند (مدل lead-gen + سهمیهٔ تماس روزانه).
 * • مهمان (لاگین‌نشده): کلیک مستقیماً مودال ورود را با پیام «برای تماس
 *   ابتدا وارد شوید» باز می‌کند — دیالوگ شماره اصلاً باز نمی‌شود.
 * • عضو + موبایل: بدون باز کردن دیالوگ، شماره گرفته می‌شود و همان لحظه
 *   تماس (tel:) برقرار می‌شود.
 * • عضو + دسکتاپ: دیالوگ شماره تماس با شمارهٔ واقعی باز می‌شود.
 */
export function PhoneReveal({
  sellerName,
  productId,
  userName,
  description,
  children,
}: {
  sellerName: string;
  productId?: number;
  /** شناسه عمومی فروشنده — مسیر پروفایل */
  userName?: string;
  /** متن زیرعنوان دیالوگ شماره — پیش‌فرض متن فروش؛ دفتر خرید متن تامین می‌دهد */
  description?: string;
  children?: React.ReactNode;
}) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calling, setCalling] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [quotaMsg, setQuotaMsg] = useState<string | null>(null);
  const [callsLeft, setCallsLeft] = useState<number | null>(null);
  const inFlight = useRef(false);

  /** مرورگر موبایل/تبلت؟ — هم‌قدم با برک‌پوینت nav-desktop (992px) */
  const isMobile = useCallback(
    () => typeof window !== 'undefined' && !window.matchMedia('(min-width: 992px)').matches,
    [],
  );

  /** دریافت شماره از سرویس اختصاصی (توکن لازم) — خطا مهار و دسته‌بندی می‌شود */
  const fetchPhone = useCallback(async (): Promise<RevealResult> => {
    if (!productId && !userName) return { phone: null, error: 'failed' };
    try {
      const info = await apiFetch<SellerPhoneInfo>(
        '/products/getSellerPhone',
        productId != null ? { id: productId } : { userName },
      );
      setPhone(info.phone);
      setCallsLeft(info.callsLeftToday ?? null);
      return { phone: info.phone, error: null };
    } catch (err) {
      // سهمیهٔ روزانه پر شده — پیام دقیق بک‌اند به کاربر می‌رسد
      if (err instanceof ApiError && err.code === 'CALL_DAILY_LIMIT') {
        setQuotaMsg(err.message);
        toast({ description: err.message, variant: 'destructive' });
        return { phone: null, error: 'quota' };
      }
      // حد نرخ — کمی صبر و تلاش دوباره
      if (err instanceof ApiError && err.status === 429) {
        toast({
          description: 'درخواست‌های شما زیاد است؛ چند لحظه صبر کنید و دوباره تلاش کنید.',
          variant: 'destructive',
        });
        return { phone: null, error: 'rate' };
      }
      setFailed(true);
      return { phone: null, error: 'failed' };
    }
  }, [productId, userName, toast]);

  // دسکتاپ: دیالوگ که باز شد شماره خودکار گرفته می‌شود
  useEffect(() => {
    if (!open || phone || loading || inFlight.current || quotaMsg) return;
    inFlight.current = true;
    setLoading(true);
    void fetchPhone().finally(() => {
      setLoading(false);
      inFlight.current = false;
    });
  }, [open, phone, loading, quotaMsg, fetchPhone]);

  /** بستن دیالوگ — خطای شبکه برای تلاش دوباره پاک می‌شود (سهمیه می‌ماند) */
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setFailed(false);
  };

  /** کلیک روی دکمهٔ شماره تماس — سه مسیر: مهمان / موبایل / دسکتاپ */
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // مهمان → مودال ورود با پیام «برای تماس ابتدا وارد شوید» (نه دیالوگ شماره)
    if (!user) {
      requireAuth('call');
      return;
    }
    // موبایل → مستقیم تماس: شماره از سرویس گرفته می‌شود و tel: اجرا می‌شود
    if (isMobile()) {
      if (calling) return;
      setCalling(true);
      try {
        const res = phone
          ? ({ phone, error: null } as RevealResult)
          : await fetchPhone();
        if (res.phone) {
          window.location.href = `tel:${res.phone}`;
        } else if (res.error === 'failed') {
          toast({
            description: 'دریافت شماره موقتاً ممکن نشد؛ چند لحظه دیگر دوباره تلاش کنید.',
            variant: 'destructive',
          });
        }
      } finally {
        setCalling(false);
      }
      return;
    }
    // دسکتاپ → دیالوگ شماره تماس
    handleOpenChange(true);
  };

  return (
    <>
      {/* فرزند (دکمهٔ شماره تماس) همان‌جای خودش؛ کلیکش به منطق سه‌مسیره وصل است */}
      <span className="contents" onClick={handleClick}>
        {children}
      </span>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-sm rounded-md"
          dir="rtl"
          aria-describedby="phone-reveal-desc"
        >
          <DialogHeader className="text-start">
            <DialogTitle className="text-start text-base">شماره تماس {sellerName}</DialogTitle>
            <DialogDescription id="phone-reveal-desc" className="text-start">
              {description ?? 'برای اطلاع از قیمت روز و خرید مستقیم تماس بگیرید.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-md border p-4 text-center">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-1.5 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                در حال دریافت شماره…
              </p>
            ) : quotaMsg ? (
              <p className="py-1.5 text-xs font-medium leading-6 text-destructive">{quotaMsg}</p>
            ) : (
              <p className="flex items-center justify-center gap-2 text-lg font-extrabold text-primary">
                <BadgeCheck size={18} />
                <span dir="ltr" className="font-mono">{phone ?? '—'}</span>
              </p>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <PhoneCall size={16} />
                تماس در همین صفحه
              </a>
            )}
            {failed && !phone && !quotaMsg && (
              <p className="text-[10.5px] leading-5 text-muted-foreground">
                دریافت شماره موقتاً ممکن نشد؛ ببندید و دوباره تلاش کنید.
              </p>
            )}
            {phone && (
              <p className="text-[10.5px] leading-5 text-muted-foreground">
                شمارهٔ موبایل فروشندگان فقط برای اعضای واردشده نمایش داده می‌شود.
              </p>
            )}
            {phone && callsLeft != null && callsLeft <= 5 && (
              <p className="text-[10.5px] font-medium leading-5 text-amber-600">
                {toFa(callsLeft)} تماس دیگر امروز برای شما باقی مانده است.
              </p>
            )}
          </div>
          <div className="flex items-start gap-2 rounded-md bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
            <p>توصیه ایمچ: همواره به انجام معاملات حضوری است.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
