'use client';

/**
 * کارت هویت فروشنده — سرصفحه پروفایل (ساختار عین باسکول cp-header):
 * بنر تصویری با ارتفاع مناسب + دکمه‌های اشتراک‌گذاری/ادامه در گوشه بالای بنر
 * (cp-banner-buttons-container) + آواتار روی بنر + نام + نشان احراز + نشان
 * آنلاین/آفلاین زنده + امتیاز نظرات + مدت عضویت + شهر + دکمه‌های «شماره تماس»
 * و «ارسال پیام» به‌صورت افقی کنار هم (cp-header-buttons-container).
 *
 * توجه: خود این کامپوننت قاب/سایه ندارد — در صفحه داخل یک کارت یکپارچه
 * (بنر + هویت + نوار بخش‌ها) نشسته که با سایه نرم از محتوا جدا می‌شود.
 */

import { Crown, MapPin, Phone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { ChatDialog } from '@/components/products/chat-dialog';
import { PresenceDot } from '@/components/shared/presence-dot';
import { RatingStars } from '@/components/shared/rating-stars';
import { VerifiedBadge } from '@/components/shared/badges';
import { ArrowLeftIcon } from '@/components/shared/buskool-icons';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';

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

export function ProfileHero({ user, shareUrl }: { user: ProfileHeroUser; shareUrl?: string }) {
  const name = `${user.firstName} ${user.lastName}`.trim() || 'فروشنده ایمچ';
  const location = [user.provinceName, user.cityName].filter(Boolean).join('، ');
  const { toast } = useToast();

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

  return (
    <div>
      {/* ─── بنر — تصویر مناسب با ارتفاع مناسب (cp-header-banner-container) ─── */}
      <div className="relative h-28 bg-secondary sm:h-36 lg:h-40">
        <img
          src="/images/company-profile-banner.png"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
        />

        {/* دکمه‌های گوشه بالای بنر — عین باسکول (cp-banner-buttons-container):
            دکمه گرد «همه آگهی‌ها» (فلش رو به بیرون — قانون RTL) + دکمه اشتراک‌گذاری */}
        <div className="absolute end-3 top-3 flex items-center gap-2">
          <a
            href="/product-list"
            title="همه آگهی‌ها"
            aria-label="مشاهده همه آگهی‌ها"
            className="grid size-9 place-items-center rounded-full bg-white text-foreground shadow-[0_2px_8px_rgba(35,38,43,0.18)] transition-transform hover:scale-105"
          >
            <ArrowLeftIcon size={18} />
          </a>
          <button
            type="button"
            onClick={share}
            className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-bold text-foreground shadow-[0_2px_8px_rgba(35,38,43,0.18)] transition-transform hover:scale-105"
          >
            <Share2 size={15} />
            اشتراک گذاری
          </button>
        </div>
      </div>

      {/* ─── ردیف هویت — آواتار روی بنر + نام + متا + دکمه‌ها (cp-header-container) ─── */}
      <div className="px-4 pb-4 sm:px-6">
        <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end">
          {/* آواتار — روی بنر افتاده مثل باسکول */}
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`تصویر ${name}`}
              className="size-20 shrink-0 rounded-full border-4 border-card bg-card object-cover sm:size-24"
            />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-full border-4 border-card bg-primary/10 text-2xl font-black text-primary sm:size-24">
              {user.firstName?.[0] ?? '؟'}
            </span>
          )}

          <div className="min-w-0 flex-1 space-y-2 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold leading-8 sm:text-2xl">{name}</h1>
              {user.isVerified && <VerifiedBadge />}
              {user.activePakageType > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-600">
                  <Crown size={11} /> فروشنده ویژه
                </span>
              )}
              <PresenceDot online={online} lastSeenAt={lastSeenAt} size="md" />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {user.reviewSummary && user.reviewSummary.count > 0 && (
                <RatingStars value={user.reviewSummary.avg} size={13} showValue count={user.reviewSummary.count} />
              )}
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-primary/70" />
                  {location}
                </span>
              )}
              <span>{toFa(user.daysInImach ?? 1)} روز در ایمچ</span>
            </div>
          </div>

          {/* دکمه‌های اقدام — عین باسکول: افقی کنار هم (تماس پررنگ + پیام معمولی) */}
          <div className="flex gap-2 pb-1">
            <PhoneReveal sellerName={name} userName={user.userName}>
              <Button className="h-11 flex-1 rounded-md px-5 text-sm font-bold sm:flex-none">
                <Phone size={17} />
                شماره تماس
              </Button>
            </PhoneReveal>
            <ChatDialog
              sellerUserName={user.userName}
              sellerId={user.id}
              sellerName={name}
              buttonLabel="ارسال پیام"
              buttonVariant="outline"
              className="h-11 flex-1 rounded-md px-5 text-sm font-bold sm:flex-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
