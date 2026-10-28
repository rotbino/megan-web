'use client';

/**
 * کارت هویت فروشنده — سرصفحه پروفایل (ساختار باسکول، اجرای تمیزتر):
 * کاور گرادیانی برند + آواتار (تصویر یا حرف اول) + نام + نشان احراز +
 * نشان آنلاین/آفلاین زنده + امتیاز نظرات + مدت عضویت + شهر + دکمه‌های
 * «شماره تماس» و «ارسال پیام» (گفتگوی مستقیم).
 */

import { BadgeCheck, Crown, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { ChatDialog } from '@/components/products/chat-dialog';
import { PresenceDot } from '@/components/shared/presence-dot';
import { RatingStars } from '@/components/shared/rating-stars';
import { VerifiedBadge } from '@/components/shared/badges';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';
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

export function ProfileHero({ user }: { user: ProfileHeroUser }) {
  const name = `${user.firstName} ${user.lastName}`.trim() || 'فروشنده ایمچ';
  const location = [user.provinceName, user.cityName].filter(Boolean).join('، ');

  // وضعیت زنده — SSR مقدار اولیه دارد (online/lastSeenAt)؛ این polling تازه نگه می‌دارد
  const { data: presenceItems } = usePresenceStatus({ userNames: [user.userName] });
  const live = findPresence(presenceItems, { userName: user.userName });
  const online = live?.online ?? user.online ?? null;
  const lastSeenAt = live?.lastSeenAt ?? user.lastSeenAt ?? null;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {/* کاور — گرادیان برند + بافت نقطه‌ای ملایم */}
      <div className="relative h-24 sm:h-32" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-l from-primary/80 via-primary/60 to-primary/30" />
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
        />
      </div>

      <div className="px-4 pb-5 sm:px-6">
        <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end">
          {/* آواتار — روی کاور افتاده مثل باسکول */}
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
              <span className="hidden items-center gap-1 sm:inline-flex">
                <BadgeCheck size={13} className="text-primary/70" />
                شناسه: <span dir="ltr" className="font-mono">{user.userName}</span>
              </span>
            </div>
          </div>

          {/* دکمه‌های اقدام — عین باسکول: تماس (پررنگ) + پیام (معمولی) */}
          <div className="flex gap-2 pb-1 sm:flex-col">
            <PhoneReveal sellerName={name} userName={user.userName}>
              <Button className="h-11 rounded-md px-5 text-sm font-bold">
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
              className="h-11 rounded-md px-5 text-sm font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
