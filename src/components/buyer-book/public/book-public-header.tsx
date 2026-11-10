'use client';

/**
 * هدر اختصاصی صفحهٔ عمومی دفتر خرید (/b/{bookId} — خواستهٔ مالک ۱۰-۱۱ دور ۵)
 * — قرینهٔ هدر کاتالوگ: به‌جای هدر بزرگ ایمچ، این صفحه سند شخصی خریدار است.
 *  • سمت راست: لوگو (یا حرف اول نام) با رنگ برند + نام خریدار + بج «دفتر خرید»
 *  • سمت چپ: اشتراک‌گذاری (Web Share / کپی) + بازگشت
 * رنگ برند از CSS var ‏--catalog-accent می‌آید که ریشهٔ صفحه ست کرده؛ بدون
 * رنگ دلخواه، همان تم ایمچ برقرار می‌ماند.
 */

import { ArrowRightIcon } from '@/components/shared/buskool-icons';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { BookOpen, Share2 } from 'lucide-react';
import { absoluteUrl } from '@/lib/use-origin';
import type { BuyerBookSettings } from '@/lib/types';

export function BookPublicHeader({
  name,
  settings,
  sharePath,
}: {
  name: string;
  settings: BuyerBookSettings;
  /** مسیر نسبی دفتر (/b/{bookId}) — موقع اشتراک‌گذاری مطلق می‌شود */
  sharePath: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const accent = settings.brandColor || undefined;

  const share = async () => {
    const url = sharePath ? absoluteUrl(sharePath) : (typeof window !== 'undefined' ? window.location.href : '');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `دفتر خرید ${name}`, url });
        return;
      } catch {
        return; // کاربر لغو کرد
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
      toast({ description: 'لینک دفتر خرید کپی شد.' });
    }
  };

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/panel/buyers');
  };

  return (
    <header
      className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85"
      style={accent ? { borderColor: `${accent}55` } : undefined}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 lg:px-6">
        {/* هویت — لوگو/حرف اول + نام خریدار + بج دفتر خرید */}
        <div className="flex min-w-0 items-center gap-2.5">
          {settings.logo ? (
            <img
              src={settings.logo}
              alt={`لوگوی ${name}`}
              className="size-9 shrink-0 rounded-lg border object-cover"
            />
          ) : (
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg text-lg font-black text-white shadow-sm"
              style={{ backgroundColor: accent ?? 'var(--primary)' }}
              aria-hidden
            >
              {name.trim().charAt(0) || 'د'}
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-extrabold sm:text-[15px]">{name}</p>
            <p
              className="mt-0.5 hidden items-center gap-1 text-[10.5px] font-medium text-muted-foreground sm:inline-flex"
            >
              <BookOpen size={11} style={accent ? { color: accent } : undefined} />
              دفتر خرید
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
