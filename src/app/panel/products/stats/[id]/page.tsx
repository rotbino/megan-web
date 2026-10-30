'use client';

/**
 * آمار آگهی (خواسته مالک ۳۰-۱۰) — از دکمه «آمار» هر آگهی در «محصولات من»:
 *  • چه کسانی آگهی را دیدند، چند بار و در چه تاریخی
 *  • چه کسانی دکمه تماس را زدند
 *  • چه کسانی آگهی را ذخیره کردند
 * هویت بینندگان (نام/شماره/لینک پروفایل) فقط برای مالکِ دارای اشتراک ویژه؛
 * مالک رایگان شمارنده‌ها را می‌بیند و هویت‌ها قفل‌اند + دکمه خرید اشتراک.
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
  Package,
  PhoneCall,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useMyProductStats } from '@/lib/mock/hooks';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dateFa, dateTimeFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/** ردیف هویت — باز است یا قفل (گیت اشتراک ویژه مالک) */
function IdentityCell({ user }: { user: { firstName: string; lastName: string; userName: string; phone: string } | null }) {
  if (user) {
    const name = `${user.firstName} ${user.lastName}`.trim() || 'کاربر ایمچ';
    return (
      <div className="min-w-0">
        <Link href={`/profile/${user.userName}`} className="font-bold text-primary hover:underline">
          {name}
        </Link>
        <p className="font-num mt-0.5 text-[11px] text-muted-foreground" dir="ltr">
          {user.phone}
        </p>
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Lock size={12} /> امکان مشاهده فقط برای کاربران ویژه
    </span>
  );
}

export default function ProductStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const productId = Number(id);
  const { user } = useAuth();
  const { data, isLoading, error } = useMyProductStats(productId, Boolean(user));
  const [tab, setTab] = useState<'views' | 'calls' | 'saves'>('views');

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

  const { product, totals, daily, viewers, callers, savers, canSeeIdentity } = data;
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  const cards = [
    { icon: Eye, label: 'بازدید', value: totals.views, hint: `${toFa(totals.uniqueViewers)} بیننده یکتا` },
    { icon: Users, label: 'بیننده یکتا', value: totals.uniqueViewers, hint: 'کاربر + مهمان' },
    { icon: PhoneCall, label: 'کلیک تماس', value: totals.contactClicks, hint: 'دکمه شماره تماس' },
    { icon: Bookmark, label: 'ذخیره آگهی', value: totals.saves, hint: 'علاقه‌مندی کاربران' },
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
                <p className="text-sm font-extrabold text-amber-800">نام و شماره تماس بینندگان قفل است</p>
                <p className="mt-1 text-xs leading-6 text-amber-700/90">
                  امکان مشاهده فقط برای کاربران ویژه است — با خرید بسته اشتراک ویژه، هویت کامل
                  بینندگان، تماس‌گیرندگان و ذخیره‌کنندگان این آگهی را ببینید.
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      {/* نمودار روزانه — میله‌های CSS سبک */}
      <PanelCard>
        <p className="text-sm font-extrabold">بازدید ۱۴ روز اخیر</p>
        <div className="mt-4 flex h-32 items-end gap-1.5" dir="ltr">
          {daily.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.count} بازدید`}>
              <div
                className={cn(
                  'rounded-t-sm transition-colors',
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

      {/* تب‌های جزئیات */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'views' as const, label: `بینندگان (${toFa(viewers.length)})`, icon: Eye },
          { key: 'calls' as const, label: `تماس‌ها (${toFa(callers.length)})`, icon: PhoneCall },
          { key: 'saves' as const, label: `ذخیره‌کنندگان (${toFa(savers.length)})`, icon: Bookmark },
        ].map(({ key, label, icon: Icon }) => (
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
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* جدول بینندگان */}
      {tab === 'views' ? (
        <PanelCard className="overflow-x-auto p-0">
          {viewers.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">
              هنوز بازدیدی برای این آگهی ثبت نشده است (بازدید خود شما شمرده نمی‌شود).
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                  <th className="px-4 py-2.5 text-right font-medium">بیننده</th>
                  <th className="px-2 py-2.5 text-right font-medium">تعداد بازدید</th>
                  <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">اولین بازدید</th>
                  <th className="px-4 py-2.5 text-right font-medium">آخرین بازدید</th>
                </tr>
              </thead>
              <tbody>
                {viewers.map((v, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      {v.isGuest ? (
                        <span className="text-xs text-muted-foreground">کاربر مهمان</span>
                      ) : (
                        <IdentityCell user={v.user} />
                      )}
                    </td>
                    <td className="font-num px-2 py-3 text-xs font-bold">{toFa(v.views)} بار</td>
                    <td className="hidden px-2 py-3 text-xs text-muted-foreground sm:table-cell">{dateTimeFa(v.firstAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{dateTimeFa(v.lastAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PanelCard>
      ) : tab === 'calls' ? (
        <PanelCard className="overflow-x-auto p-0">
          {callers.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">
              هنوز کسی دکمه «شماره تماس» این آگهی را نزده است.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                  <th className="px-4 py-2.5 text-right font-medium">تماس‌گیرنده</th>
                  <th className="px-4 py-2.5 text-right font-medium">زمان</th>
                </tr>
              </thead>
              <tbody>
                {callers.map((c, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <IdentityCell user={c.user} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{dateTimeFa(c.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PanelCard>
      ) : (
        <PanelCard className="overflow-x-auto p-0">
          {savers.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">
              هنوز کسی این آگهی را ذخیره نکرده است.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                  <th className="px-4 py-2.5 text-right font-medium">ذخیره‌کننده</th>
                  <th className="px-4 py-2.5 text-right font-medium">زمان</th>
                </tr>
              </thead>
              <tbody>
                {savers.map((s, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <IdentityCell user={s.user} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{dateTimeFa(s.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PanelCard>
      )}

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
