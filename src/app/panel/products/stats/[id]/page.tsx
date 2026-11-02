'use client';

/**
 * آمار آگهی (خواسته مالک ۳۰-۱۰ + ۲-۱۱ دور ۱۸) — از دکمه «آمار» هر آگهی در «محصولات من»:
 *  • چه کسانی آگهی را دیدند، چند بار و در چه تاریخی
 *  • چه کسانی دکمه تماس را زدند
 *  • چه کسانی آگهی را ذخیره کردند
 *  • چه کسانی درباره این آگهی چت کردند (تب جدید ۲-۱۱ دور ۱۸ — کاربرانی که
 *    درباره این آگهی سؤال پرسیدند؛ چت همان مکالمهٔ آگهی را باز می‌کند)
 * هویت بینندگان فقط برای مالکِ دارای اشتراک ویژه. به‌جای شماره تلفن، سه
 * دکمهٔ اقدام هر ردیف: نشان کردن (مهم‌ترین — مودال CRM) + چت + تماس
 * (خواسته مالک ۲-۱۱ دور ۱۸).
 */

import Link from 'next/link';
import { use, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Crown,
  Eye,
  Lock,
  MessageSquareText,
  Package,
  Phone,
  PhoneCall,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useMyProductStats } from '@/lib/mock/hooks';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatDialog } from '@/components/products/chat-dialog';
import { MarkUserButton } from '@/components/shared/mark-user-sheet';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { dateFa, dateTimeFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StatsIdentity } from '@/lib/mock/api';

type StatsTab = 'views' | 'chats' | 'calls' | 'saves';

/** ردیف هویت — باز است یا قفل (گیت اشتراک ویژه مالک) */
function UserCell({
  user,
  meta,
  productId,
  productName,
  threadId,
}: {
  user: StatsIdentity | null;
  /** خط متای زیر نام — «۳ بار بازدید»، «۲ پیام» و… */
  meta: string;
  productId: number;
  productName: string;
  /** مکالمهٔ موجود درباره همین آگهی (تب چت‌کنندگان) */
  threadId?: string;
}) {
  if (!user) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock size={12} /> امکان مشاهده فقط برای کاربران ویژه
      </span>
    );
  }
  const name = `${user.firstName} ${user.lastName}`.trim() || 'کاربر ایمچ';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* هویت — نام + متا */}
      <div className="min-w-0 flex-1 sm:flex-none">
        <Link href={`/profile/${user.userName}`} className="font-bold text-primary hover:underline">
          {name}
        </Link>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>
      </div>

      {/* دکمه‌های اقدام — نشان کردن (مهم‌ترین) + چت + تماس (۲-۱۱ دور ۱۸) */}
      <div className="flex items-center gap-2">
        <MarkUserButton
          target={{
            targetUserId: user.id,
            targetName: name,
            isVerified: user.isVerified,
            avatarUrl: user.avatarUrl,
            defaultListName: productName,
          }}
        />
        <ChatDialog
          sellerUserName={user.userName}
          sellerId={user.id}
          sellerName={name}
          sellerAvatarUrl={user.avatarUrl}
          productName={productName}
          threadId={threadId}
          /** productId فقط با مکالمهٔ موجود (چت‌کنندگان) — نمایش «دربارهٔ همین آگهی»؛
           *  در بقیهٔ تب‌ها startThread با productId مالکِ خودش خطای SELF_CHAT می‌دهد */
          productId={threadId != null ? productId : undefined}
          buttonLabel={`چت با ${name}`}
          buttonVariant="outline"
          buttonSize="icon"
          className="size-9 shrink-0 rounded-md"
        />
        {/* تماس با خودِ کاربر ردیف — فقط userName؛ productId مسیر «شماره مالک
            آگهی» است و اینجا شمارهٔ اشتباه (خودِ مالک) برمی‌گرداند */}
        <PhoneReveal sellerName={name} userName={user.userName}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title={`تماس با ${name}`}
            aria-label={`تماس با ${name}`}
            className="size-9 shrink-0 rounded-md"
          >
            <Phone size={16} />
          </Button>
        </PhoneReveal>
      </div>
    </div>
  );
}

/** یک ردیف لیست — قالب مشترک همه تب‌ها (حداقل‌گرایانه، موبایل‌دوست) */
function StatsRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 px-4 py-3.5 hover:bg-secondary/30">{children}</div>;
}

export default function ProductStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const productId = Number(id);
  const { user } = useAuth();
  const { data, isLoading, error } = useMyProductStats(productId, Boolean(user));
  const [tab, setTab] = useState<StatsTab>('views');

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-10 w-56 rounded-md" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-md" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <PanelEmptyState
        icon={BarChart3}
        title="آمار این آگهی در دسترس نیست."
        hint={error instanceof Error ? error.message : 'آگهی پیدا نشد یا متعلق به شما نیست.'}
        actionLabel="بازگشت به محصولات من"
        actionHref="/panel/products"
      />
    );
  }

  const { product, totals, daily, viewers, callers, savers, chatters, canSeeIdentity } = data;
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  const cards = [
    { icon: Eye, label: 'بازدید', value: totals.views, hint: `${toFa(totals.uniqueViewers)} بیننده یکتا` },
    { icon: Users, label: 'بیننده یکتا', value: totals.uniqueViewers, hint: 'کاربر + مهمان' },
    { icon: MessageSquareText, label: 'چت', value: chatters.length, hint: 'مکالمه درباره این آگهی' },
    { icon: PhoneCall, label: 'کلیک تماس', value: totals.contactClicks, hint: 'دکمه شماره تماس' },
    { icon: Bookmark, label: 'ذخیره آگهی', value: totals.saves, hint: 'علاقه‌مندی کاربران' },
  ];

  const tabs: { key: StatsTab; label: string; icon: typeof Eye; count: number }[] = [
    { key: 'views', label: 'بینندگان', icon: Eye, count: viewers.length },
    { key: 'chats', label: 'چت کنندگان', icon: MessageSquareText, count: chatters.length },
    { key: 'calls', label: 'تماس‌ها', icon: PhoneCall, count: callers.length },
    { key: 'saves', label: 'ذخیره‌کنندگان', icon: Bookmark, count: savers.length },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <BarChart3 size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">آمار «{product.productName}»</h1>
            <p className="text-[11px] text-muted-foreground">
              ثبت از {dateFa(product.createdAt)} · {toFa(product.viewCount)} بازدید کل
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-md text-xs">
          <Link href="/panel/products">
            <ArrowRight size={14} /> بازگشت به محصولات
          </Link>
        </Button>
      </div>

      {/* گیت هویت — قفل برای مالک بدون اشتراک ویژه */}
      {!canSeeIdentity && (
        <PanelCard className="border-amber-200 bg-amber-50/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-amber-500/15 text-amber-600">
                <Crown size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-amber-800">نام و اطلاعات بینندگان قفل است</p>
                <p className="mt-1 text-xs leading-6 text-amber-700/90">
                  امکان مشاهده فقط برای کاربران ویژه است — با خرید بسته اشتراک ویژه، هویت کامل
                  بینندگان، چت‌کنندگان، تماس‌گیرندگان و ذخیره‌کنندگان این آگهی را ببینید و با
                  آن‌ها چت، تماس و نشان کردن انجام دهید.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0 rounded-md">
              <Link href="/panel/pricing">
                <Crown size={15} /> خرید اشتراک ویژه
              </Link>
            </Button>
          </div>
        </PanelCard>
      )}

      {/* کارت‌های مجموع */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon size={15} className="text-primary" />
              <p className="text-[11px]">{label}</p>
            </div>
            <p className="font-num mt-1.5 text-xl font-extrabold">{toFa(value)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      {/* نمودار روزانه — میله‌های CSS سبک + تعداد بازدید بالای هر میله (۲-۱۱ دور ۱۸) */}
      <PanelCard>
        <p className="text-sm font-extrabold">بازدید ۱۴ روز اخیر</p>
        <div className="mt-4 flex h-32 items-end gap-1.5" dir="ltr">
          {daily.map((d) => (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${d.count} بازدید`}
            >
              <span
                className={cn(
                  'font-num text-[9.5px] leading-none',
                  d.count > 0 ? 'font-bold text-foreground/75' : 'text-muted-foreground/50',
                )}
              >
                {toFa(d.count)}
              </span>
              <div
                className={cn(
                  'w-full rounded-t-sm transition-colors',
                  d.count > 0 ? 'bg-primary/70 group-hover:bg-primary' : 'bg-secondary',
                )}
                style={{ height: `${Math.max(6, (d.count / maxDaily) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground" dir="ltr">
          <span>{dateFa(daily[0]?.date ?? '')}</span>
          <span>امروز</span>
        </div>
      </PanelCard>

      {/* تب‌های جزئیات — چت‌کنندگان جدید (۲-۱۱ دور ۱۸) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
              tab === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            <Icon size={14} /> {label}{' '}
            <span
              className={cn(
                'font-num rounded-full px-1.5 py-0.5 text-[10px]',
                tab === key ? 'bg-primary-foreground/20' : 'bg-secondary',
              )}
            >
              ({toFa(count)})
            </span>
          </button>
        ))}
      </div>

      {/* لیست‌ها — ردیف‌های ساده با دکمه‌های نشان/چت/تماس به‌جای شماره تلفن */}
      <PanelCard className="p-0">
        {tab === 'views' && (
          <>
            {viewers.length === 0 ? (
              <p className="p-8 text-center text-xs text-muted-foreground">
                هنوز بازدیدی برای این آگهی ثبت نشده است (بازدید خود شما شمرده نمی‌شود).
              </p>
            ) : (
              <div className="divide-y">
                {viewers.map((v, i) => (
                  <StatsRow key={i}>
                    {v.isGuest ? (
                      <>
                        <span className="text-xs text-muted-foreground">کاربر مهمان</span>
                        <span className="font-num ms-auto text-[11px] text-muted-foreground">
                          {toFa(v.views)} بار · {dateTimeFa(v.lastAt)}
                        </span>
                      </>
                    ) : (
                      <>
                        <UserCell
                          user={v.user}
                          meta={`${toFa(v.views)} بار بازدید · آخرین: ${dateTimeFa(v.lastAt)}`}
                          productId={product.id}
                          productName={product.productName}
                        />
                      </>
                    )}
                  </StatsRow>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'chats' && (
          <>
            {chatters.length === 0 ? (
              <p className="p-8 text-center text-xs leading-6 text-muted-foreground">
                هنوز کسی درباره این آگهی پیامی ننوشته است.
                <br />
                خریدارانی که در چت این آگهی سؤال بپرسند، این‌جا دیده می‌شوند.
              </p>
            ) : (
              <div className="divide-y">
                {chatters.map((c, i) => (
                  <StatsRow key={i}>
                    <UserCell
                      user={c.user}
                      meta={`${toFa(c.messages)} پیام · آخرین پیام: ${dateTimeFa(c.lastAt)}`}
                      productId={product.id}
                      productName={product.productName}
                      threadId={c.threadId}
                    />
                  </StatsRow>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'calls' && (
          <>
            {callers.length === 0 ? (
              <p className="p-8 text-center text-xs text-muted-foreground">
                هنوز کسی دکمه «شماره تماس» این آگهی را نزده است.
              </p>
            ) : (
              <div className="divide-y">
                {callers.map((c, i) => (
                  <StatsRow key={i}>
                    <UserCell
                      user={c.user}
                      meta={`زمان کلیک: ${dateTimeFa(c.at)}`}
                      productId={product.id}
                      productName={product.productName}
                    />
                  </StatsRow>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'saves' && (
          <>
            {savers.length === 0 ? (
              <p className="p-8 text-center text-xs text-muted-foreground">
                هنوز کسی این آگهی را ذخیره نکرده است.
              </p>
            ) : (
              <div className="divide-y">
                {savers.map((s, i) => (
                  <StatsRow key={i}>
                    <UserCell
                      user={s.user}
                      meta={`زمان ذخیره: ${dateTimeFa(s.at)}`}
                      productId={product.id}
                      productName={product.productName}
                    />
                  </StatsRow>
                ))}
              </div>
            )}
          </>
        )}
      </PanelCard>

      <p className="text-center text-[10px] leading-5 text-muted-foreground">
        بازدید هر مرورگر حداکثر یک‌بار در هر ۳۰ دقیقه شمرده می‌شود؛ بازدید خود شما و خزنده‌ها ثبت نمی‌شود.
      </p>

      <div className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground">
        <Package size={13} />
        <Link href="/panel/products" className="hover:text-primary">
          همه آگهی‌های من
        </Link>
      </div>
    </div>
  );
}
