'use client';

/**
 * فروشندگان پیشنهادی — عین MHTML باسکول (صفحه «پیشنهادی» پنل خریدار):
 * کارت‌های گروه دسته‌ای بر اساس درخواست‌های خرید تاییدشده کاربر —
 * «سیب زمینی — 56 فروشنده — 56+» / «لیمو عمانی — 22 فروشنده — 22+».
 * کلیک روی هر گروه → صفحه لیست محصولات همان دسته (هم‌رفتار باسکول:
 * product-list/category/سیب-زمینی).
 */

import Link from 'next/link';
import { ChevronLeft, Loader2, Sparkles, Store, Users } from 'lucide-react';
import { useSuggestedSellerGroups } from '@/lib/mock/hooks';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { toFa } from '@/lib/format';

export default function SuggestedSellersPage() {
  const { data, isLoading } = useSuggestedSellerGroups();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-lg font-extrabold">فروشندگان پیشنهادی</h1>
        {/* «درحال دریافت اطلاعات ...» — عین باسکول */}
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          درحال دریافت اطلاعات ...
        </div>
      </div>
    );
  }

  const groups = data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">فروشندگان پیشنهادی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          بر اساس درخواست‌های خرید تاییدشده شما، فروشندگان هم‌کالا در بازار ایمچ.
        </p>
      </div>

      {groups.length === 0 ? (
        <PanelEmptyState
          icon={Sparkles}
          title="فروشنده پیشنهادی برای شما ندارید."
          hint="با ثبت درخواست خرید، فروشندگان هم‌کالا را اینجا ببینید."
          actionLabel="ثبت درخواست خرید"
          actionHref="/panel/buy-requests/new"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={g.href}
              className="group flex items-center gap-3 rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary/5 text-primary">
                <Store size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">{g.categoryName}</span>
                <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users size={13} className="shrink-0" />
                  {toFa(g.sellerCount)} فروشنده
                </span>
              </span>
              {/* دکمه «56+» — عین باسکول */}
              <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {toFa(g.sellerCount)}+
                <ChevronLeft size={14} />
              </span>
            </Link>
          ))}
        </div>
      )}

      <PanelCard className="text-xs leading-6 text-muted-foreground">
        فروشندگان پیشنهادی ایمچ مرتبط‌ترین فروشندگان بازار با درخواست‌های خرید شما هستند؛ سابقه و اعتبار آنها را در
        پروفایلشان ببینید و با حرفه‌ای‌ها معامله کنید.
      </PanelCard>
    </div>
  );
}
