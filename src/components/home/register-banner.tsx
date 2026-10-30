'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';

import { setAfterAuthRedirect } from '@/lib/pending-rfq';

/**
 * بنر «ثبت فروشگاه» (همان متن باسکول) — با تصویر و قاب واضح‌تر برای جلب توجه.
 *
 * ریدایرکت هوشمند (خواسته مالک ۲۸-۱۰):
 * • واردشده → مستقیم لیست محصولات پنل خودش (/panel/products).
 * • مهمان → مودال ورود/ثبت‌نام؛ بعد از ورود یا تکمیل ثبت‌نام، کاربر به
 *   «بخش محصولات پنل» می‌رود (after-auth redirect).
 */
export function RegisterBanner() {
  const { user, requireAuth } = useAuth();

  const go = (e: React.MouseEvent) => {
    // واردشده → مستقیم محصولات پنل خودش
    if (user) return; // Link href کار می‌کند
    e.preventDefault();
    // مهمان → مقصد را ذخیره کن و مودال ورود/ثبت‌نام باز شود؛ بعد از ورود یا
    // ثبت‌نام (تکمیل نام/شهر) کارار به «بخش محصولات پنل» می‌رود (خواسته مالک)
    setAfterAuthRedirect('/panel/products');
    requireAuth();
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <Link
        href={user ? '/panel/products' : '/register'}
        onClick={go}
        aria-label="ساخت فروشگاه آنلاین در ایمچ"
        className="group block overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-l from-primary/5 via-secondary/60 to-secondary/60 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
      >
        <div className="flex flex-col-reverse items-center gap-4 px-6 py-6 sm:flex-row sm:gap-6 sm:py-0">
          {/* متن + دکمه */}
          <div className="flex flex-1 flex-col items-center gap-4 py-2 text-center sm:items-start sm:py-8 sm:text-start">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
                <Store size={24} strokeWidth={1.8} />
              </span>
              <p className="text-base font-extrabold sm:text-xl">
                همین حالا فروشگاه آنلاین خود را بسازید!
              </p>
            </div>
            <p className="max-w-md text-xs leading-6 text-muted-foreground sm:text-sm">
              محصولات خود را در ایمچ ثبت کنید و خریداران را به ویترین خود جذب کنید.
            </p>
            <span className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-primary-deep">
              {user ? 'ورود به پنل محصولات' : 'ثبت فروشگاه'}
            </span>
          </div>

          {/* تصویر — سبک بازار عمده ایرانی */}
          <div className="relative h-40 w-full shrink-0 sm:h-52 sm:w-80">
            <Image
              src="/images/register-banner.jpg"
              alt="فروشگاه آنلاین ایمچ — ثبت محصولات و جذب خریداران عمده"
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-contain object-center drop-shadow-sm"
              priority={false}
            />
          </div>
        </div>
      </Link>
    </section>
  );
}
