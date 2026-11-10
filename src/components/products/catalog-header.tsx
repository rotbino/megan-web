'use client';

/**
 * هدر اختصاصی کاتالوگ (خواستهٔ مالک ۱۰-۱۱ دور ۳) — به‌جای هدر بزرگ ایمچ
 * (جستجو/لینک‌ها) در صفحهٔ کاتالوگ کاربر می‌آید؛ این صفحه سند بازاریابی
 * خودِ فروشنده است و نباید کاربرِ مشتری را به جستجوی ایمچ دعوت کند.
 *  • سمت راست: آیکون برند (با رنگ دلخواه) + نام برند + بج «کاتالوگ»
 *  • سمت چپ: اشتراک‌گذاری (Web Share / کپی) + بازگشت
 * رنگ برند از CSS var ‏--catalog-accent می‌آید که ریشهٔ صفحه ست کرده؛
 * بدون رنگ دلخواه، همان تم نقره‌ای ایمچ برقرار می‌ماند.
 */

import { ArrowRightIcon } from '@/components/shared/buskool-icons';
import { catalogIcon } from '@/lib/catalog-brand';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { BookOpen, Share2 } from 'lucide-react';
import { absoluteUrl } from '@/lib/use-origin';

export function CatalogHeader({
  brandName,
  brandIcon,
  brandColor,
  sharePath,
}: {
  brandName: string;
  brandIcon: string;
  brandColor: string | null;
  /** مسیر نسبی کاتالوگ (مثل /c/{id}) — موقع اشتراک‌گذاری با
   *  location صفحهٔ فعلی مطلق می‌شود (خواستهٔ مالک ۱۰-۱۱ دور ۴) */
  sharePath?: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const { Icon } = catalogIcon(brandIcon);
  const accent = brandColor || undefined; // CSS var --catalog-accent

  const share = async () => {
    // لینک از location میزبانیِ فعلی ساخته می‌شود — نه دامنهٔ کانفیگ
    const url = sharePath ? absoluteUrl(sharePath) : (typeof window !== 'undefined' ? window.location.href : '');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: brandName, url });
        return;
      } catch {
        return; // کاربر لغو کرد
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
      toast({ description: 'لینک کاتالوگ کپی شد.' });
    }
  };

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/product-list');
  };

  return (
    <header
      className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85"
      style={accent ? { borderColor: `${accent}55` } : undefined}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 lg:px-6">
        {/* هویت برند — آیکون با رنگ دلخواه + نام + بج کاتالوگ */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg text-white shadow-sm"
            style={{ backgroundColor: accent ?? 'var(--primary)' }}
            aria-hidden
          >
            <Icon size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-extrabold sm:text-[15px]">{brandName}</p>
            <p
              className="mt-0.5 hidden items-center gap-1 text-[10.5px] font-medium text-muted-foreground sm:inline-flex"
            >
              <BookOpen size={11} style={accent ? { color: accent } : undefined} />
              کاتالوگ آنلاین
            </p>
          </div>
        </div>

        {/* اقدام‌ها — بازگشت + اشتراک‌گذاری */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={goBack}
            title="بازگشت"
            aria-label="بازگشت"
            className="grid size-9 place-items-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowRightIcon size={18} />
          </button>
          <button
            type="button"
            onClick={share}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white shadow-sm transition-[filter] hover:brightness-95"
            style={{ backgroundColor: accent ?? 'var(--primary)' }}
          >
            <Share2 size={15} />
            <span className="hidden sm:inline">اشتراک گذاری</span>
          </button>
        </div>
      </div>
    </header>
  );
}
