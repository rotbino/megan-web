import Link from 'next/link';
import { ArrowLeft, BarChart3, Rocket, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** CTA فروشندگان — مثل باسکول: «همین حالا فروشگاه آنلاین خود را بسازید» */
export function StoreCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 lg:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-primary to-emerald-700 p-8 text-primary-foreground sm:p-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_85%_30%,white_1.5px,transparent_1.5px),radial-gradient(circle_at_20%_80%,white_1px,transparent_1px)] [background-size:38px_38px,24px_24px]"
        />
        <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
              <Rocket size={14} />
              ویترین مِگان
            </span>
            <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
              همین حالا فروشگاه آنلاین خود را بسازید!
            </h2>
            <p className="text-sm leading-7 text-primary-foreground/85">
              محصولات خود را در مِگان ثبت کنید و در معرض دید هزاران خریدار عمده و صادرکننده قرار بگیرید؛
              با آمار دقیق بازدید و ابزارهای بازاریابی مِگان سریع‌تر بفروشید.
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-primary-foreground/80">
              <li className="inline-flex items-center gap-1.5"><Store size={13} /> ثبت آگهی نامحدود</li>
              <li className="inline-flex items-center gap-1.5"><BarChart3 size={13} /> گزارش عملکرد فروش</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button asChild size="lg" className="rounded-xl bg-white text-primary hover:bg-emerald-50">
              <Link href="/panel">
                ثبت فروشگاه
                <ArrowLeft size={18} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
              <Link href="/panel/products/new">ثبت اولین محصول</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
