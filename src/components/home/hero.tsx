import Link from 'next/link';
import { ArrowLeft, FileText, ShieldCheck, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      {/* بافت نرم پس‌زمینه */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_15%_20%,white_1.5px,transparent_1.5px),radial-gradient(circle_at_80%_70%,white_1px,transparent_1px)] [background-size:42px_42px,26px_26px]"
      />
      <div aria-hidden className="absolute -start-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 -end-16 size-96 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 sm:py-20 lg:px-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
          <ShieldCheck size={14} />
          بزرگ‌ترین شبکه خریداران و فروشندگان عمده ایران
        </p>
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl lg:leading-[1.15]">
          بازار خرید و فروش عمده،
          <span className="block text-emerald-200">مستقیم و بدون واسطه</span>
        </h1>
        <p className="max-w-xl text-sm leading-7 text-primary-foreground/85 sm:text-base">
          در مِگان با هزاران تولیدکننده و عرضه‌کننده کالای عمده در سراسر ایران در ارتباط باشید؛
          قیمت روز را ببینید، درخواست خرید ثبت کنید و با امنیت کامل معامله کنید.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="rounded-xl bg-white text-primary hover:bg-emerald-50">
            <Link href="/product-list">
              شروع معاملات عمده
              <ArrowLeft size={18} />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
            <Link href="/#rfq">
              <FileText size={18} />
              ثبت درخواست خرید
            </Link>
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-3 text-xs text-primary-foreground/80 sm:text-sm">
          <span className="inline-flex items-center gap-1.5"><Store size={15} /> +۴٬۸۰۰ فروشنده فعال</span>
          <span className="inline-flex items-center gap-1.5"><FileText size={15} /> +۱۲٬۰۰۰ درخواست خرید ماهانه</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} /> ۳۱ استان، ۴۳۰ صنف</span>
        </div>
      </div>
    </section>
  );
}
