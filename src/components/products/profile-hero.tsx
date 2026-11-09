'use client';

/**
 * کارت هویت فروشنده — سرصفحه پروفایل (بازطراحی دور ۱۷، عین باسکول cp-header):
 *  • بنر عریض ۱۳۶px موبایل / ۲۸۰px دسکتاپ با تصویر ۱۹۲۰×۴۴۱ و گوشه‌های
 *    پایین گرد ۱۶px (cp-header-banner-container) — ریشهٔ «نصفه افتادن» بنر
 *    قدیمی، تصویر ۲:۱ در کادرِ کوتاه بود؛ حالا تصویر و نسبت باسکول است.
 *  • دکمه‌های بازگشت (دایره) و اشتراک‌گذاری (قرص) فقط دسکتاپ روی بنر —
 *    باسکول در موبایل این دو را مخفی می‌کند (cp-banner-buttons-container).
 *  • آواتار ۸۵/۱۳۰px با رینگ ضخیم کارت؛ فروشنده ویژه: رینگ طلایی +
 *    بج «فروشنده ویژه» آویزان زیر آواتار (قانون طلایی: amber-400 + متن
 *    سفید + رینگ amber-500/50) — همان چیپ تاج‌دار، حالا در جای باسکولی.
 *  • متا: امتیاز + «N نظر» (لینک به نظرات) + مدت عضویت «X سال Y ماه در
 *    ایمچ» + شهر. دکمه‌ها موبایل گرید دوستونه وسط‌چین، دسکتاپ انتهای ردیف.
 * رنگ‌ها همه توکنی‌اند (bg-card/text-card-foreground برای دکمه‌های روی بنر)
 * تا تم تاریک سالم بماند — قبلاً bg-white + text-foreground در تاریک
 * «سفید روی سفید» می‌شد.
 */

import { BadgeCheck, Crown, MapPin, Phone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { ChatDialog } from '@/components/products/chat-dialog';
import { CatalogSaveButton } from '@/components/products/catalog-save-button';
import { PresenceDot } from '@/components/shared/presence-dot';
import { RatingStars } from '@/components/shared/rating-stars';
import { ArrowRightIcon } from '@/components/shared/buskool-icons';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export interface ProfileHeroUser {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  activePakageType: number;
  avatarUrl: string | null;
  daysInImach?: number;
  createdAt: string;
  online?: boolean;
  lastSeenAt?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  reviewSummary?: { avg: number; count: number } | null;
}

/** مدت عضویت به سبک باسکول — «۵ سال ۳ ماه در باسکول»؛ در کاتالوگ کاربر
 *  بدون ذکر ایمچ: «۵ سال ۳ ماه فعالیت» (بازنگری خواستهٔ ۱۰-۱۱) */
function membershipLabel(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0 && months > 0) return `${toFa(years)} سال ${toFa(months)} ماه فعالیت`;
  if (years > 0) return `${toFa(years)} سال فعالیت`;
  if (months > 0) return `${toFa(months)} ماه فعالیت`;
  return `${toFa(Math.max(days, 1))} روز فعالیت`;
}

export function ProfileHero({
  user,
  shareUrl,
}: {
  user: ProfileHeroUser;
  shareUrl?: string;
}) {
  const name = `${user.firstName} ${user.lastName}`.trim() || 'فروشنده';
  const location = [user.provinceName, user.cityName].filter(Boolean).join('، ');
  const special = user.activePakageType > 0;
  const { toast } = useToast();
  const router = useRouter();

  // وضعیت زنده — SSR مقدار اولیه دارد (online/lastSeenAt)؛ این polling تازه نگه می‌دارد
  const { data: presenceItems } = usePresenceStatus({ userNames: [user.userName] });
  const live = findPresence(presenceItems, { userName: user.userName });
  const online = live?.online ?? user.online ?? null;
  const lastSeenAt = live?.lastSeenAt ?? user.lastSeenAt ?? null;

  /** اشتراک‌گذاری پروفایل — عین باسکول: Web Share (موبایل) و در غیر این صورت کپی لینک */
  const share = async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `فروشگاه ${name}`, url });
        return;
      } catch {
        return; // کاربر لغو کرد
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
      toast({ description: 'لینک پروفایل کپی شد.' });
    }
  };

  /** بازگشت — فلش راست‌گرد (قانون RTL)؛ ورود مستقیم → همه آگهی‌ها */
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/product-list');
  };

  return (
    <div>
      {/* ─── بنر — عریض عین باسکول: ۱۳۶ موبایل / ۲۸۰ دسکتاپ، گوشه پایین گرد ─── */}
      <div className="relative h-[136px] overflow-hidden lg:h-[280px] lg:rounded-b-2xl">
        <img
          src="/images/company-profile-banner.png"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />

        {/* دکمه‌های گوشه بالای بنر — فقط دسکتاپ (موبایل باسکول مخفی):
            بازگشت راست + اشتراک‌گذاری چپ؛ توکنی تا تم تاریک خوانا بماند */}
        <div className="absolute inset-x-0 top-0 hidden items-center justify-between px-6 py-5 lg:flex">
          <button
            type="button"
            onClick={goBack}
            title="بازگشت"
            aria-label="بازگشت"
            className="grid size-10 place-items-center rounded-full bg-card text-card-foreground shadow-[0_2px_8px_rgba(0,0,0,0.14)] transition hover:brightness-95"
          >
            <ArrowRightIcon size={20} />
          </button>
          <button
            type="button"
            onClick={share}
            className="flex h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium text-card-foreground shadow-[0_2px_8px_rgba(0,0,0,0.14)] transition hover:brightness-95"
          >
            <Share2 size={17} />
            اشتراک گذاری
          </button>
        </div>
      </div>

      {/* ─── ردیف هویت — آواتار روی بنر + نام + متا + دکمه‌ها (cp-header-container) ─── */}
      <div className="px-4 pb-5 pt-0 lg:px-8 lg:pb-6 lg:pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
          {/* آواتار — ۵۴٪ روی بنر افتاده مثل باسکول (۸۵px/-46px و ۱۳۰px/-70px) */}
          <div className="relative -mt-[46px] size-[85px] shrink-0 lg:-mt-[80px] lg:size-[130px] lg:self-start">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`تصویر ${name}`}
                className={cn(
                  'size-full rounded-full border-2 object-cover shadow-[0_2px_10px_rgba(0,0,0,0.08)] lg:border-[5px]',
                  special ? 'border-amber-400' : 'border-card',
                )}
              />
            ) : (
              <span
                className={cn(
                  'grid size-full place-items-center rounded-full border-2 bg-primary/10 text-2xl font-black text-primary shadow-[0_2px_10px_rgba(0,0,0,0.08)] lg:border-[5px]',
                  special ? 'border-amber-400' : 'border-card',
                )}
              >
                {user.firstName?.[0] ?? '؟'}
              </span>
            )}

            {/* بج فروشنده ویژه — آویزان زیر آواتار (جایگاه باسکول)؛
                طلایی همیشه: amber-400 + متن سفید + رینگ amber-500/50 */}
            {special && (
              <span className="absolute bottom-[-12px] start-0 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[10.5px] font-bold text-white ring-1 ring-amber-500/50 shadow-sm lg:bottom-[-14px] lg:left-1/2 lg:-translate-x-1/2 lg:px-2.5 lg:py-1 lg:text-[11.5px] lg:start-auto">
                <Crown size={11} strokeWidth={2.4} />
                فروشنده ویژه
              </span>
            )}
          </div>

          {/* نام + متا */}
          <div className="min-w-0 flex-1 space-y-1.5 pt-4 lg:pt-0 lg:pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xl font-extrabold leading-8 lg:text-[32px] lg:leading-10">
                {name}
              </h1>
              {user.isVerified && (
                <BadgeCheck
                  className="size-5 shrink-0 text-primary lg:size-6"
                  aria-label="احراز هویت شده"
                />
              )}
              <PresenceDot online={online} lastSeenAt={lastSeenAt} size="md" />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground lg:gap-x-4 lg:text-sm">
              {user.reviewSummary && user.reviewSummary.count > 0 && (
                <>
                  <RatingStars value={user.reviewSummary.avg} size={14} showValue />
                  <a href="#reviews" className="font-medium text-primary hover:underline">
                    {toFa(user.reviewSummary.count)} نظر
                  </a>
                </>
              )}
              <span className="hidden size-1 rounded-full bg-border sm:inline-block" aria-hidden />
              <span>{membershipLabel(user.daysInImach ?? 1)}</span>
              {location && (
                <>
                  <span className="hidden size-1 rounded-full bg-border sm:inline-block" aria-hidden />
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} className="text-primary/70" />
                    {location}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* دکمه‌های اقدام — موبایل: گرید دوستونه وسط‌چین (باسکول)؛ دسکتاپ: انتهای ردیف */}
          <div className="mx-auto grid w-full max-w-[640px] grid-cols-2 gap-4 pt-1 lg:mx-0 lg:flex lg:w-auto lg:gap-4 lg:pt-0">
            <PhoneReveal sellerName={name} userName={user.userName}>
              <Button className="h-11 w-full rounded-lg px-5 text-sm font-bold lg:h-10 lg:w-[142px]">
                <Phone size={18} />
                شماره تماس
              </Button>
            </PhoneReveal>
            <ChatDialog
              sellerUserName={user.userName}
              sellerId={user.id}
              sellerName={name}
              sellerAvatarUrl={user.avatarUrl}
              buttonLabel="ارسال پیام"
              buttonVariant="outline"
              className="h-11 w-full rounded-lg px-5 text-sm font-bold lg:h-10 lg:w-[142px]"
            />
            {/* ذخیرهٔ کاتالوگ (خواسته مالک ۱۰-۱۱ + بازنگری) — کاتالوگ همان
                پروفایل است؛ موبایل تمام‌عرض زیر دو دکمهٔ بالا، دسکتاپ کنار هم.
                برای خودِ فروشنده رندر نمی‌شود */}
            <CatalogSaveButton
              sellerUserName={user.userName}
              className="col-span-2 lg:col-span-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
