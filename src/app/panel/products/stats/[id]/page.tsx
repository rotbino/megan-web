'use client';

/**
 * آمار آگهی (خواسته مالک ۳۰-۱۰ + ۲-۱۱ دور ۱۸ + ۳-۱۱) — از دکمه «آمار» هر آگهی:
 *  • چه کسانی آگهی را دیدند، چند بار و در چه تاریخی
 *  • چه کسانی دکمه تماس را زدند
 *  • چه کسانی آگهی را ذخیره کردند
 *  • چه کسانی درباره این آگهی چت کردند (تب جدید ۲-۱۱ دور ۱۸)
 *  • انتخاب بازهٔ آمار (۳-۱۱): پیش‌فرض ۱۴ روز، از یک هفته تا چند سال +
 *    «کل دوره» — گزینه‌های بلندتر از عمر آگهی مخفی می‌شوند (از همان موقعِ
 *    ثبت آگهی) و بازدید کل همیشه کنار بازدیدِ بازه دیده می‌شود.
 *  • «روش‌های افزایش بازدید» (۳-۱۱، الگوی باسکول): نردبان / ارتقا عضویت /
 *    احراز هویت / بروز رسانی قیمت — انجام‌شده تیک سبز می‌خورد، نشده دکمه CTA.
 *
 * هویت بینندگان فقط برای مالکِ دارای اشتراک ویژه. به‌جای شماره تلفن، سه
 * دکمهٔ اقدام هر ردیف: نشان کردن (مهم‌ترین — مودال CRM) + چت + تماس.
 */

import Link from 'next/link';
import { use, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Check,
  Crown,
  Eye,
  Lock,
  MessageSquareText,
  Package,
  Pencil,
  Phone,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useMyProductStats, usePanelProfile } from '@/lib/mock/hooks';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { LadderPayDialog } from '@/components/panel/ladder-pay-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatDialog } from '@/components/products/chat-dialog';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { dateFa, dateShortFa, dateTimeFa, monthFa, monthYearFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StatsIdentity } from '@/lib/mock/api';

type StatsTab = 'views' | 'chats' | 'calls' | 'saves';

/** گزینه‌های بازهٔ آمار (خواسته مالک ۳-۱۱) — ۰ = کل دورهٔ زندگی آگهی از ثبت */
const RANGE_OPTIONS: { days: number; label: string }[] = [
  { days: 7, label: '۷ روز' },
  { days: 14, label: '۱۴ روز' },
  { days: 30, label: '۱ ماه' },
  { days: 90, label: '۳ ماه' },
  { days: 180, label: '۶ ماه' },
  { days: 365, label: '۱ سال' },
  { days: 730, label: '۲ سال' },
  { days: 1095, label: '۳ سال' },
  { days: 0, label: 'کل دوره' },
];

/** قیمتِ «به‌روز» — اگر در این چند روز ویرایش شده باشد تیک می‌خورد */
const PRICE_FRESH_DAYS = 7;

/** یک سطل نمودار — روز، هفته یا ماه بسته به بلندی بازه */
interface ChartBucket {
  key: string;
  count: number;
  /** متن کامل تولتیپ — «۵ آبان» یا «۵ تا ۱۱ آبان» یا «آبان ۱۴۰۴» */
  title: string;
  /** برچسب کوتاه زیر محور */
  label: string;
}

/**
 * سری روزانهٔ بازه را به سطل‌های نمودار تبدیل می‌کند:
 * تا ۳۱ روز → روزانه؛ تا ۷ ماه → هفتگی (تکه‌های ۷تایی از ابتدای بازه)؛
 * بلندتر → ماهانهٔ شمسی (ماه‌های تقویمی که کاربر می‌بیند، نه میلادی).
 */
function buildBuckets(daily: Array<{ date: string; count: number }>): ChartBucket[] {
  if (daily.length === 0) return [];
  if (daily.length <= 31) {
    return daily.map((d) => ({
      key: d.date,
      count: d.count,
      title: dateFa(d.date),
      label: dateShortFa(d.date),
    }));
  }
  if (daily.length <= 210) {
    const out: ChartBucket[] = [];
    for (let i = 0; i < daily.length; i += 7) {
      const chunk = daily.slice(i, i + 7);
      out.push({
        key: chunk[0].date,
        count: chunk.reduce((s, x) => s + x.count, 0),
        title: `${dateShortFa(chunk[0].date)} تا ${dateShortFa(chunk[chunk.length - 1].date)}`,
        label: dateShortFa(chunk[0].date),
      });
    }
    return out;
  }
  // ماهانهٔ شمسی — کلید = «ماه + سال»؛ روزهای هم‌ماه جمع می‌شوند
  const out: ChartBucket[] = [];
  let cur: { key: string; count: number; first: string } | null = null;
  for (const d of daily) {
    const k = monthYearFa(d.date);
    if (cur && cur.key === k) cur.count += d.count;
    else {
      if (cur) out.push({ key: cur.key, count: cur.count, title: cur.key, label: monthFa(cur.first) });
      cur = { key: k, count: d.count, first: d.date };
    }
  }
  if (cur) out.push({ key: cur.key, count: cur.count, title: cur.key, label: monthFa(cur.first) });
  return out;
}

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
        <Link href={`/c/${user.userName}`} className="font-bold text-primary hover:underline">
          {name}
        </Link>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>
      </div>

      {/* دکمه‌های اقدام — چت + تماس */}
      <div className="flex items-center gap-2">
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

/** ردیف «روش‌های افزایش بازدید» — انجام‌شده تیک سبز، نشده دکمهٔ اقدام (الگوی باسکول) */
function TipRow({
  icon: Icon,
  title,
  desc,
  done,
  doneLabel,
  children,
}: {
  icon: typeof Crown;
  title: string;
  desc: string;
  done: boolean;
  doneLabel: string;
  /** دکمهٔ CTA — فقط وقتی انجام نشده رندر می‌شود */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-primary">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold">{title}</p>
          <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{desc}</p>
        </div>
      </div>
      {done ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          <Check size={13} /> {doneLabel}
        </span>
      ) : (
        <div className="shrink-0">{children}</div>
      )}
    </div>
  );
}

export default function ProductStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const productId = Number(id);
  const { user } = useAuth();
  /** بازهٔ آمار — پیش‌فرض ۱۴ روز (خواسته مالک ۳-۱۱)؛ ۰ = کل دوره از ثبت */
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState<StatsTab>('views');
  const [ladderOpen, setLadderOpen] = useState(false);
  const { data: profile } = usePanelProfile();
  const { data, isLoading, error, isFetching } = useMyProductStats(productId, Boolean(user), days);

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

  const { product, totals, rangeTotals, daily, viewers, callers, savers, chatters, canSeeIdentity, ownerIsVerified } = data;

  // عمر آگهی — گزینه‌های بلندتر از این مخفی می‌شوند (از همان موقعِ ثبت)
  const ageDays = Math.max(1, Math.ceil((Date.now() - new Date(product.createdAt).getTime()) / 86_400_000));
  const visibleRanges = RANGE_OPTIONS.filter(
    (o) => o.days === 0 || o.days <= 14 || o.days <= ageDays,
  );
  const activeRange = RANGE_OPTIONS.find((o) => o.days === days) ?? RANGE_OPTIONS[1];

  // نمودار — سطل‌بندی بر اساس بلندی بازه
  const buckets = buildBuckets(daily);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const labelStep = Math.max(1, Math.ceil(buckets.length / 6));
  const showBarValues = buckets.length <= 18;

  // قیمت به‌روز؟ — برای تیک ردیف «بروز رسانی قیمت»
  const priceFresh =
    Date.now() - new Date(product.updatedAt).getTime() < PRICE_FRESH_DAYS * 86_400_000;
  const balance = profile?.userInfo.walletBalance ?? 0;
  const ladderAllowed = product.status === 'confirmed';

  const cards = [
    { icon: Eye, label: 'بازدید کل', value: totals.views, hint: 'از ثبت آگهی' },
    { icon: Users, label: 'بیننده یکتا', value: totals.uniqueViewers, hint: 'کاربر + مهمان' },
    { icon: MessageSquareText, label: 'چت', value: totals.chats, hint: 'مکالمه درباره این آگهی' },
    { icon: PhoneCall, label: 'کلیک تماس', value: totals.contactClicks, hint: 'دکمه شماره تماس' },
    { icon: Bookmark, label: 'ذخیره آگهی', value: totals.saves, hint: 'علاقه‌مندی کاربران' },
  ];

  const tabs: { key: StatsTab; label: string; icon: typeof Eye; count: number }[] = [
    { key: 'views', label: 'بینندگان', icon: Eye, count: rangeTotals.uniqueViewers },
    { key: 'chats', label: 'چت کنندگان', icon: MessageSquareText, count: rangeTotals.chats },
    { key: 'calls', label: 'تماس‌ها', icon: PhoneCall, count: rangeTotals.contactClicks },
    { key: 'saves', label: 'ذخیره‌کنندگان', icon: Bookmark, count: rangeTotals.saves },
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

      {/* کارت‌های مجموع — کل، از ثبت آگهی (بازدید کل) */}
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

      {/* نمودار بازدید + انتخاب بازه (خواسته مالک ۳-۱۱) */}
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-extrabold">بازدید {activeRange.label}</p>
          <p className="font-num text-[11px] text-muted-foreground">
            جمع این بازه: <b className="text-foreground">{toFa(rangeTotals.views)}</b> · بازدید کل از ثبت:{' '}
            <b className="text-foreground">{toFa(totals.views)}</b>
          </p>
        </div>

        {/* چیپ‌های بازه — بلندتر از عمر آگهی مخفی (از همان موقعِ ثبت) */}
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="بازهٔ آمار">
          {visibleRanges.map((o) => {
            const active = o.days === days;
            return (
              <button
                key={o.days}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDays(o.days)}
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {/* میله‌ها — روزانه/هفتگی/ماهانه بسته به بازه؛ قدیمی چپ، امروز راست */}
        <div
          className={cn('mt-4 flex h-32 items-end gap-1.5 transition-opacity', isFetching && 'opacity-60')}
          dir="ltr"
        >
          {buckets.map((b) => (
            <div
              key={b.key}
              className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${b.title} — ${toFa(b.count)} بازدید`}
            >
              {showBarValues && (
                <span
                  className={cn(
                    'font-num text-[9.5px] leading-none',
                    b.count > 0 ? 'font-bold text-foreground/75' : 'text-muted-foreground/50',
                  )}
                >
                  {toFa(b.count)}
                </span>
              )}
              <div
                className={cn(
                  'w-full rounded-t-sm transition-colors',
                  b.count > 0 ? 'bg-primary/70 group-hover:bg-primary' : 'bg-secondary',
                )}
                style={{ height: `${Math.max(6, (b.count / maxCount) * 100)}%` }}
              />
            </div>
          ))}
        </div>

        {/* برچسب‌های محور — حداکثر ~۶ تا، هم‌تراز با میله‌ها */}
        <div className="mt-1.5 flex text-[10px] text-muted-foreground" dir="ltr" aria-hidden>
          {buckets.map((b, i) => (
            <span key={b.key} className="min-w-0 flex-1 truncate text-center">
              {i % labelStep === 0 || i === buckets.length - 1 ? b.label : ''}
            </span>
          ))}
        </div>
        <p className="font-num mt-2 text-center text-[10px] text-muted-foreground">
          از {dateFa(daily[0]?.date ?? product.createdAt)} تا امروز ({toFa(daily.length)} روز)
        </p>
      </PanelCard>

      {/* روش‌های افزایش بازدید — الگوی باسکول (خواسته مالک ۳-۱۱):
          انجام‌شده تیک می‌خورد، نشده دکمهٔ اقدام */}
      <PanelCard>
        <p className="text-sm font-extrabold">روش‌های افزایش بازدید</p>
        <div className="mt-1 divide-y">
          <TipRow
            icon={Crown}
            title="ارتقا عضویت به ویژه"
            desc="فروشنده‌های ویژه ۵ برابر بیشتر دیده می‌شوند و در ابتدای لیست محصولات قرار می‌گیرند."
            done={canSeeIdentity}
            doneLabel="اشتراک ویژه فعال است"
          >
            <Button asChild variant="outline" size="sm" className="rounded-md text-xs text-primary">
              <Link href="/panel/pricing">
                <Crown size={14} /> ارتقا عضویت
              </Link>
            </Button>
          </TipRow>

          <TipRow
            icon={ShieldCheck}
            title="احراز هویت"
            desc="فروشنده‌های احراز هویت‌شده اعتماد خریداران را جلب می‌کنند و در نتایج جستجو بالاتر دیده می‌شوند."
            done={ownerIsVerified}
            doneLabel="احراز هویت شده‌اید"
          >
            <Button asChild variant="outline" size="sm" className="rounded-md text-xs text-primary">
              <Link href="/panel/verification">
                <ShieldCheck size={14} /> احراز هویت
              </Link>
            </Button>
          </TipRow>

          <TipRow
            icon={TrendingUp}
            title="اعمال نردبان"
            desc="آگهی نردبان‌شده در صدر لیست محصولات — حتی بالاتر از آگهی‌های ویژه — قرار می‌گیرد."
            done={product.isLadder}
            doneLabel="نردبان فعال است"
          >
            <Button
              variant="outline"
              size="sm"
              className="rounded-md text-xs text-primary"
              disabled={!ladderAllowed}
              title={ladderAllowed ? undefined : 'فقط آگهی‌های تاییدشده قابل نردبان‌اند'}
              onClick={() => setLadderOpen(true)}
            >
              <TrendingUp size={14} /> اعمال نردبان
            </Button>
          </TipRow>

          <TipRow
            icon={RefreshCw}
            title="بروز رسانی قیمت"
            desc={`آگهی‌هایی که قیمتشان به‌روز است در جستجو و لیست‌ها جای بهتری می‌گیرند — آخرین بروز رسانی: ${dateFa(product.updatedAt)}.`}
            done={priceFresh}
            doneLabel="قیمت به‌روز است"
          >
            <Button asChild variant="outline" size="sm" className="rounded-md text-xs text-primary">
              <Link href={`/panel/products/edit/${product.id}`}>
                <Pencil size={14} /> بروز رسانی قیمت
              </Link>
            </Button>
          </TipRow>
        </div>
      </PanelCard>

      {/* تب‌های جزئیات — شمارنده‌ها مال همین بازه */}
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
                در این بازه بازدیدی برای این آگهی ثبت نشده است (بازدید خود شما شمرده نمی‌شود).
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
                در این بازه کسی درباره این آگهی پیامی ننوشته است.
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
                در این بازه کسی دکمه «شماره تماس» این آگهی را نزده است.
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
                در این بازه کسی این آگهی را ذخیره نکرده است.
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

      {/* مودال نردبان — از ردیف «اعمال نردبان» (خواسته مالک ۳-۱۱) */}
      <LadderPayDialog
        product={ladderOpen ? { id: product.id, productName: product.productName } : null}
        balance={balance}
        onClose={() => setLadderOpen(false)}
      />
    </div>
  );
}
