'use client';

/**
 * پیشنهادهای تامین دریافتی — پنل خریدار (خواستهٔ مالک):
 *  • همهٔ پیشنهادهایی که فروشندگان برای نیازهای خریدِ «دفتر خرید من» فرستاده‌اند
 *    در یک‌جا، با شرایط ساختاریافته (دسته، نوع کالا، چک، ارسال به محل، حداقل
 *    خرید) به‌صورت چیپ — تا خریدار بتواند پیشنهادها را فیلتر و مقایسه کند.
 *  • ورود از دفتر خرید (خواسته مالک ۲-۱۱ دور ۱۵): کلیک روی هر کالا به همین
 *    صفحه با ?category= همان گروه می‌آید؛ URL منبع حقیقت فیلتر دسته است و
 *    کاربر همین‌جا هم می‌تواند گروه را عوض کند (بک/فوروارد هم درست کار می‌کند).
 *  • فیلترهای دیگر: جستجوی نوع کالا، «فقط با چک» و «فقط با ارسال به محل».
 *  • «مشاهدهٔ گفتگو» مستقیم به مکالمهٔ همان پیشنهاد می‌رود (?thread=).
 */

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BadgeCheck,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  MessageSquare,
  RotateCcw,
  Search,
  Truck,
} from 'lucide-react';
import { useMyBuyerBook, useMyReceivedOffers } from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { RelativeTime } from '@/components/shared/relative-time';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReceivedOffer } from '@/lib/types';

const PER_PAGE = 10;

/** چیپ شرایط ساختاریافته — رنگ ثابت برای مقایسهٔ سریع بین کارت‌ها */
function Chip({ tone, children }: { tone: 'sky' | 'amber' | 'emerald'; children: React.ReactNode }) {
  const tones = {
    sky: 'border-sky-200/70 bg-sky-50 text-sky-700',
    amber: 'border-amber-200/70 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200/70 bg-emerald-50 text-emerald-700',
  } as const;
  return (
    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-bold', tones[tone])}>{children}</span>
  );
}

/** دکمهٔ فیلتر روشن/خاموش — «فقط با چک» و «فقط با ارسال به محل» */
function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/** کارت یک پیشنهاد دریافتی — سربرگ فروشنده، چیپ شرایط، متن، گفتگو */
function OfferCard({ offer }: { offer: ReceivedOffer }) {
  const [expanded, setExpanded] = useState(false);
  const longText = offer.message.length > 280;

  return (
    <PanelCard className="space-y-3">
      {/* سربرگ — فروشنده + دسته + زمان */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
            {offer.sellerName.trim().charAt(0) || 'ف'}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <span className="truncate">{offer.sellerName}</span>
              {offer.sellerVerified && <BadgeCheck size={14} className="shrink-0 text-verified" aria-label="احراز هویت شده" />}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {offer.categoryPath ? `${offer.categoryPath} / ` : ''}
              <b className="text-foreground/75">{offer.categoryName ?? 'بدون دسته'}</b>
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          <RelativeTime date={offer.createdAt} />
        </span>
      </div>

      {/* چیپ‌های شرایط ساختاریافته — مقایسه در یک نگاه */}
      {(offer.productType || offer.minOrderAmount != null || offer.checkAccepted || offer.deliveryToBuyer) && (
        <div className="flex flex-wrap gap-1.5">
          {offer.productType && <Chip tone="sky">نوع: {offer.productType}</Chip>}
          {offer.minOrderAmount != null && (
            <Chip tone="amber">
              حداقل سفارش: {toFa(offer.minOrderAmount)} {offer.unit}
            </Chip>
          )}
          {offer.checkAccepted && offer.checkPercent != null && offer.checkMaxDays != null && (
            <Chip tone="emerald">
              چک تا {toFa(offer.checkPercent)}٪ — حداکثر {toFa(offer.checkMaxDays)} روز
            </Chip>
          )}
          {offer.deliveryToBuyer && (
            <Chip tone="emerald">
              ارسال به محل — حمل با {offer.shippingCostBy === 'seller' ? 'فروشنده' : 'مشتری'}
            </Chip>
          )}
        </div>
      )}

      {/* متن پیشنهاد */}
      <p
        className={cn(
          'whitespace-pre-line text-xs leading-6 text-foreground/85',
          !expanded && 'line-clamp-4',
        )}
      >
        {offer.message}
      </p>
      {longText && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] font-bold text-primary transition-colors hover:underline"
        >
          {expanded ? 'نمایش کمتر' : 'نمایش کامل متن'}
        </button>
      )}

      {/* اقدام — گفتگوی همان پیشنهاد */}
      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
          <Link href={offer.threadId ? `/panel/messages?thread=${offer.threadId}` : '/panel/messages'}>
            <MessageSquare size={13} /> مشاهدهٔ گفتگو
          </Link>
        </Button>
        {offer.isGroup && (
          <span className="text-[10px] text-muted-foreground" title="این پیشنهاد به‌صورت گروهی برای چند خریدار ارسال شده">
            ارسال گروهی فروشنده
          </span>
        )}
      </div>
    </PanelCard>
  );
}

function ReceivedOffersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // فیلتر دسته از URL می‌آید (لینک کالاهای دفتر خرید) — URL منبع حقیقت است
  const catParam = searchParams.get('category');
  const categoryId = catParam && /^\d+$/.test(catParam) ? Number(catParam) : null;
  const changeCategory = (id: number | null) => {
    router.replace(id ? `/panel/received-offers?category=${id}` : '/panel/received-offers', { scroll: false });
    setPage(1);
  };

  // فیلترهای دیگر
  const [productType, setProductType] = useState('');
  const [hasCheck, setHasCheck] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMyReceivedOffers({
    categoryId: categoryId ?? undefined,
    productType: productType.trim() || undefined,
    hasCheck: hasCheck || undefined,
    hasDelivery: hasDelivery || undefined,
    page,
    perPage: PER_PAGE,
  });

  // گزینه‌های فیلتر دسته = دسته‌های دارای پیشنهاد ∪ گروه‌های دفتر خرید
  // (همان کش react-query) — این‌طور دستهٔ بدون پیشنهاد هم برچسب دارد و
  // دراپ‌داون هرگز خالی نمی‌ماند (خواستهٔ مالک: فیلر از طریق کلیک روی ایتم‌های
  // دفتر خرید ممکن باشد و در همین صفحه هم گروه عوض شود)
  const { data: book } = useMyBuyerBook();
  const categoryOptions = (() => {
    const byId = new Map<number, string>();
    for (const c of data?.categories ?? []) byId.set(c.id, c.name);
    for (const i of book?.items ?? []) if (!byId.has(i.categoryId)) byId.set(i.categoryId, i.name);
    return [...byId].map(([id, name]) => ({ id, name }));
  })();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters =
    categoryId != null || !!productType.trim() || hasCheck || hasDelivery;

  const reset = () => {
    changeCategory(null);
    setProductType('');
    setHasCheck(false);
    setHasDelivery(false);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">پیشنهادهای تامین دریافتی</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          پیشنهادهایی که فروشندگان برای نیازهای خرید شما فرستاده‌اند — بر اساس دسته،
          نوع کالا و شرایط (چک، ارسال) فیلتر کنید و کنار هم مقایسه کنید.
        </p>
      </div>

      {/* فیلترها */}
      <PanelCard className="space-y-2.5">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Select
            dir="rtl"
            value={categoryId ? String(categoryId) : 'all'}
            onValueChange={(v) => {
              changeCategory(v === 'all' ? null : Number(v));
            }}
          >
            <SelectTrigger className="h-9 w-full rounded-md text-xs sm:w-52" aria-label="دستهٔ کالا">
              <SelectValue placeholder="همه دسته‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌ها</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <form className="relative flex-1" onSubmit={(e) => e.preventDefault()} role="search">
            <Input
              value={productType}
              onChange={(e) => {
                setProductType(e.target.value.slice(0, 60));
                setPage(1);
              }}
              placeholder="جستجوی نوع کالا؛ مثلاً آگریا"
              className="h-9 rounded-md text-xs ps-4 pe-9"
              aria-label="جستجوی نوع کالا"
            />
            <Search size={14} className="pointer-events-none absolute inset-y-0 end-3 my-auto text-muted-foreground" />
          </form>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleChip
            active={hasCheck}
            onClick={() => {
              setHasCheck((v) => !v);
              setPage(1);
            }}
          >
            <Banknote size={13} /> فقط با چک
          </ToggleChip>
          <ToggleChip
            active={hasDelivery}
            onClick={() => {
              setHasDelivery((v) => !v);
              setPage(1);
            }}
          >
            <Truck size={13} /> فقط با ارسال به محل
          </ToggleChip>
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
            >
              <RotateCcw size={12} />
              حذف فیلترها
            </button>
          )}
          <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">
            {isLoading ? '…' : <><b className="text-foreground">{toFa(total)}</b> پیشنهاد</>}
          </span>
        </div>
      </PanelCard>

      {/* لیست */}
      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        hasFilters ? (
          <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
            <Inbox size={28} className="mx-auto text-muted-foreground/60" />
            <p className="mt-3 text-sm font-bold">پیشنهادی با این فیلترها پیدا نشد.</p>
            <Button size="sm" variant="outline" className="mt-4 rounded-md" onClick={reset}>
              حذف فیلترها
            </Button>
          </div>
        ) : (
          <PanelEmptyState
            icon={Inbox}
            title="هنوز پیشنهاد تامین دریافت نکرده‌اید."
            hint="دفتر خرید خود را کامل کنید تا فروشندگان نیازمندی‌هایتان را پیدا کنند و برایتان پیشنهاد بفرستند."
            actionLabel="درخواست‌های خرید دوره‌ای من"
            actionHref="/panel/my-requests?tab=book"
          />
        )
      ) : (
        <>
          <div className={cn('space-y-3 transition-opacity', isLoading && 'opacity-60')}>
            {items.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>

          {pageCount > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-1" aria-label="صفحه‌بندی">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronRight size={15} /> قبلی
              </Button>
              <span className="text-xs text-muted-foreground">
                صفحهٔ {toFa(page)} از {toFa(pageCount)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                بعدی <ChevronLeft size={15} />
              </Button>
            </nav>
          )}
        </>
      )}

      {/* در حال بارگذاری صفحه‌های بعد — نشانگر کوچک زیر لیست */}
      {isLoading && data && (
        <div className="grid place-items-center py-1 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
    </div>
  );
}

export default function ReceivedOffersPage() {
  return (
    <Suspense>
      <ReceivedOffersPageInner />
    </Suspense>
  );
}
