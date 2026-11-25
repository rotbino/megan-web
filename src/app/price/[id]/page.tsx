'use client';

/**
 * گزارش قیمت تک‌کالا (۲۵-۱۱ راند ۲) — عمومی: /price/{productId}
 * مقصد لینک «گزارش قیمت» زیر آمار هر آگهی.
 *
 * یک‌نگاهی: جایگاه قیمت این آگهی در بازار همان قلم — نوار کف/میانه/سقف،
 * پله‌های حجمی، برش شهری و روند روزانهٔ هفتهٔ اخیر. تماماً تجمیعی — قیمت هیچ فروشنده‌ای
 * با نامش نشان داده نمی‌شود. اعضا (لاگین‌شده) کامل می‌بینند — همان گِیت
 * قیمتِ سایت؛ مهمان دکمهٔ ورود می‌گیرد.
 */

import { AlertTriangle, BarChart3, TrendingUp } from 'lucide-react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/mock/auth';
import { useItemReport } from '@/lib/mock/hooks';
import { toFa, dateFa } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ChangeChip, CityChips, LineChart, PriceTrack, Sparkline, TierChips } from '@/components/reports/report-parts';
import type { ItemReport } from '@/lib/types';

export default function ItemReportPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params?.id);
  const { user, requireAuth } = useAuth();
  const { data, isLoading, isError, refetch } = useItemReport(productId);

  return (
    <>
      <Header backButton />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4 pb-8 lg:px-6">
          {isLoading ? (
            <Loading />
          ) : isError || !data ? (
            user ? (
              <ErrorBox onRetry={() => refetch()} />
            ) : (
              <Gate onLogin={() => requireAuth('price')} />
            )
          ) : !data.sufficient ? (
            <Insufficient data={data} />
          ) : (
            <ReportView data={data} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── نما ───────────────────────────────────────────────────────────────────

function ReportView({ data }: { data: ItemReport }) {
  const p = data.product;
  const pos = data.position;
  return (
    <div className="space-y-3">
      {/* سربرگ */}
      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="text-base font-extrabold sm:text-lg">گزارش قیمت {p.name}</h1>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {toFa(data.sellers)} فروشنده عرضه می‌کنند
          </span>
        </div>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          {p.category.path}
          {p.city ? (
            <>
              <span className="mx-1 text-muted-foreground/40">•</span>
              {p.city}
            </>
          ) : null}
          <span className="mx-1 text-muted-foreground/40">•</span>
          {dateFa(data.generatedAt)}
        </p>

        {/* جایگاه قیمت — یک نگاه */}
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xs text-muted-foreground">قیمت این آگهی:</span>
            <span className="font-num text-lg font-extrabold">{toFa(p.price)}</span>
            <span className="text-xs text-muted-foreground">هر {p.unit}</span>
            {pos?.diffPct != null && (
              <span className={`text-[11px] font-bold ${pos.diffPct > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {pos.diffPct > 0 ? 'گران‌تر از میانهٔ بازار' : 'ارزان‌تر از میانهٔ بازار'} {toFa(Math.abs(pos.diffPct))}٪
              </span>
            )}
            {pos?.cheaperThan != null && (
              <span className="text-[11px] text-muted-foreground">
                فقط {toFa(pos.cheaperThan)}٪ فروشنده‌ها ارزان‌ترند
              </span>
            )}
          </div>
          <PriceTrack
            min={data.min ?? p.price}
            max={data.max ?? p.price}
            median={data.median ?? null}
            mine={p.price}
            expired={pos?.expired}
          />
        </div>
      </section>

      {/* پله‌های حجمی + شهرها */}
      {(data.tiers?.length || data.cities?.length) && (
        <section className="rounded-lg border bg-card p-4 sm:p-5">
          <p className="mb-3 text-sm font-bold">پلهٔ حجم و برش شهری</p>
          {data.tiers?.length ? (
            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              {data.tiers.map((t) => (
                <div key={t.label} className="rounded-md bg-secondary/60 px-3 py-2">
                  <p className="text-[10px] font-bold text-muted-foreground">{t.label} — از {toFa(t.from)} {p.unit}</p>
                  <p className="mt-0.5 font-num text-sm font-extrabold">
                    {toFa(t.median)} <span className="text-[10px] font-normal text-muted-foreground">هر {p.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {data.cities?.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">میانه در شهرها:</span>
              <CityChips cities={data.cities} unit={p.unit} />
            </div>
          ) : null}
        </section>
      )}

      {/* نمودار — وقتی ≥۲ روز داده باشد */}
      {data.spark && data.spark.length >= 2 ? (
        <section className="rounded-lg border bg-card p-4 sm:p-5">
          <p className="mb-3 text-sm font-bold">روند روزانهٔ میانهٔ بازار</p>
          <LineChart points={data.spark} unit={p.unit} />
        </section>
      ) : (
        <p className="px-1 text-[11px] leading-5 text-muted-foreground/80">
          نمودار روند روزانه با ثبت‌شدن قیمت‌های تازه همین‌جا نشان داده می‌شود.
        </p>
      )}

      {/* بازگشت به آگهی */}
      <Button asChild variant="outline" className="rounded-md">
        <Link href={p.href}>بازگشت به آگهی</Link>
      </Button>

      <p className="px-1 text-[11px] leading-5 text-muted-foreground/80">
        آمار فقط از قیمت‌های به‌روزشدهٔ {data.basisDays != null ? `${toFa(data.basisDays)} روز اخیر` : 'هفتهٔ اخیر'} ({toFa(data.listings ?? 0)} آگهی) ساخته می‌شود؛ قیمت‌های کهنه ملاک نیستند و قیمت هیچ فروشنده‌ای با نامش منتشر نمی‌شود.
        {data.mixedUnit ? ' (واحدهای مختلفی ثبت شده — مقایسه تقریبی است)' : ''}
      </p>
    </div>
  );
}

// ─── حالت‌های دیگر ─────────────────────────────────────────────────────────

/** مهمان — گِیت ورود (همان گِیت قیمت سایت) */
function Gate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <BarChart3 size={26} />
      </span>
      <p className="mt-4 text-sm font-bold">گزارش قیمت برای اعضای ایمچ است</p>
      <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
        جایگاه قیمت این کالا در بازار، پله‌های حجمی و برش شهری — با ورود رایگان همین حالا.
      </p>
      <Button className="mt-5 rounded-md" onClick={onLogin}>
        <TrendingUp size={16} />
        ورود و دیدن گزارش
      </Button>
    </div>
  );
}

/** قلم آمار ندارد — صداقت */
function Insufficient({ data }: { data: ItemReport }) {
  const p = data.product;
  return (
    <div className="grid place-items-center rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <BarChart3 size={26} />
      </span>
      <p className="mt-4 text-sm font-bold">این قلم هنوز دادهٔ کافی ندارد</p>
      <p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
        قیمت‌ها روزانه نوسان می‌کنند؛ وقتی دست‌کم ۳ فروشنده قیمتِ {p.name} را در ۷ روز اخیر به‌روز کنند، گزارش همین‌جا ساخته می‌شود.
        الان {toFa(data.sellers)} فروشنده ثبت کرده‌اند — قیمت تازهٔ کافی نیست.
      </p>
      <Button asChild variant="outline" className="mt-5 rounded-md">
        <Link href={p.href}>بازگشت به آگهی</Link>
      </Button>
    </div>
  );
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <AlertTriangle size={26} />
      </span>
      <p className="mt-4 text-sm font-bold">گزارش الان در دسترس نیست</p>
      <Button className="mt-5 rounded-md" onClick={onRetry}>
        تلاش دوباره
      </Button>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-3">
      <div className="h-40 animate-pulse rounded-lg bg-secondary/60" />
      <div className="h-24 animate-pulse rounded-lg bg-secondary/60" />
    </div>
  );
}
