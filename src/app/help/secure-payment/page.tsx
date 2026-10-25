import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, HandCoins, Phone, ReceiptText, ShieldCheck, Truck } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'پرداخت امن در ایمچ | راهنما',
  description:
    'راهنمای پرداخت امن ایمچ: چگونه از پرداخت امن استفاده کنیم، چرا پرداخت امن، نکات خرید امن، معامله حضوری و نکات مهم در انتقال وجه.',
  alternates: { canonical: '/help/secure-payment' },
};

const STEPS = [
  'فروشنده مورد نظر خود را در ایمچ پیدا کنید.',
  'درباره ویژگی محصول و موارد لازم در معامله توافق کنید.',
  'وجه معامله را از طریق ایمچ پرداخت می‌کنید.',
  'پس از تحویل بار، ایمچ وجه معامله را به حساب فروشنده انتقال می‌دهد.',
];

const WHY = [
  'اطمینان فروشنده از پرداخت وجه معامله به صورت تمام و کمال',
  'بازگشت پول به خریدار در صورت درخواست مرجوعی بار، بدون قید و شرط',
  'پرداخت به موقع وجه معامله',
];

export default function SecurePaymentGuidePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
          {/* سرصفحه */}
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-6 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheck size={26} />
            </span>
            <h1 className="mt-3 text-xl font-extrabold">پرداخت امن از طریق ایمچ</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              با پرداخت وجه معاملات از طریق ایمچ با اطمینان معامله کنید.
            </p>
            <Link
              href="/panel/secure-deals"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <HandCoins size={15} /> استفاده از پرداخت امن
            </Link>
          </div>

          {/* چگونه کار می‌کند */}
          <section className="mt-8">
            <h2 className="text-base font-extrabold">چگونه از پرداخت امن ایمچ استفاده کنیم؟</h2>
            <p className="mt-3 text-xs leading-7 text-muted-foreground">
              با استفاده از سیستم پرداخت امن ایمچ، تا زمان دریافت بار توسط خریدار، وجه معامله نزد ایمچ محفوظ می‌ماند و
              پس از تایید طرفین مبنی بر رعایت تمام مفاد قرارداد، مبلغ معامله به حساب فروشنده منتقل می‌شود.
            </p>
            <ol className="mt-5 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-lg border bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
                    {['۱', '۲', '۳', '۴'][i]}
                  </span>
                  <span className="text-xs font-bold leading-5">{s}</span>
                  {i === 0 && <Truck size={16} className="ms-auto shrink-0 text-muted-foreground/50" />}
                  {i === 3 && <ReceiptText size={16} className="ms-auto shrink-0 text-muted-foreground/50" />}
                </li>
              ))}
            </ol>
          </section>

          {/* چرا پرداخت امن */}
          <section className="mt-8">
            <h2 className="text-base font-extrabold">چرا از پرداخت امن ایمچ استفاده کنیم؟</h2>
            <ul className="mt-3 space-y-2">
              {WHY.map((w) => (
                <li key={w} className="flex items-start gap-2 rounded-lg border bg-card p-3.5 text-xs leading-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <BadgeCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  {w}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
              برای دریافت خدمات پرداخت امن و اطلاعات بیشتر با شماره تلفن واحد پشتیبانی ایمچ تماس بگیرید.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/60 p-4">
              <p className="flex items-center gap-2 text-xs font-bold">
                <Phone size={15} className="text-primary" /> شماره تماس واحد پشتیبانی:
                <a href="tel:02191091419" dir="ltr" className="text-primary">021-91091419</a>
              </p>
              <p className="text-[11px] text-muted-foreground">ساعت پاسخ گویی: ۸ صبح الی ۴ عصر روزهای کاری</p>
            </div>
          </section>

          {/* نکات خرید امن */}
          <section className="mt-8 space-y-4">
            <h2 className="text-base font-extrabold">نکات خرید امن در ایمچ</h2>

            <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-extrabold">معاملهٔ حضوری؛ امن‌ترین راه معامله</p>
              <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                معامله و پرداخت حضوری: امن‌ترین و بهترین راه خرید، معاملهٔ حضوری است. یعنی خریدار در ملاقات حضوری با
                فروشنده، کالا را ببیند، بررسی کند و همان زمان مبلغ را پرداخت نماید. هرگز بعد از تحویل کالا یا خدمات،
                پرداخت مبلغ را به زمان دیگری موکول نکنید. شواهد معامله: بهتر است هنگام خرید کالا، رسید کتبی معتبر از
                فروشنده دریافت کنید.
              </p>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-extrabold">نکات مهم در انتقال وجه</p>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-6 text-muted-foreground">
                <li>پرداخت نقدی: بهتر است پرداخت مبلغ به صورت نقدی باشد.</li>
                <li>
                  پرداخت اینترنتی و کارت به کارت: در صورت پرداخت اینترنتی یا کارت به کارت، به دیدن رسید پرداخت اکتفا
                  نکنید. قبل از تحویل کالا، شخصاً از وارد شدن مبلغ به حسابتان مطمئن شوید.
                </li>
                <li>چک و سفته: چک و سفته ممکن است نقد نشوند. برای کسب اطلاعات بیشتر، به قوانین رسمی چک رجوع کنید.</li>
                <li>
                  چک رمزدار بانکی: در صورت دریافت چک‌های رمزدار بانکی، با مراجعه به بانک مورد نظر، از اصالت آن مطمئن شوید.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-extrabold">نکات مهم پیش از معامله</p>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-6 text-muted-foreground">
                <li>بیعانه ندهید: هرگز پیش از دریافت کالا، هزینه‌ای تحت عنوان بیعانه، شیرینی، رزرو و… پرداخت نکنید.</li>
                <li>ذخیرهٔ اطلاعات: اطلاعات فروشنده حتماً ذخیره کنید تا در صورت نیاز، دسترسی سریع داشته باشید.</li>
                <li>درخواست فاکتور خرید: در مورد برخی کالاها بهتر است از فروشنده بخواهید فاکتور خرید را به همراه داشته باشد.</li>
                <li>پرهیز از مزاحمت: دادن اطلاعات شخصی که نامربوط به معامله است، فقط احتمال مزاحمت را بالا می‌برد.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[11px] leading-6 text-amber-800">
              امکان معاملهٔ حضوری وجود ندارد؟ دقت کنید که ایمچ هیچ‌گونه مسئولیتی در قبال معاملات غیرحضوری نمی‌پذیرد و
              توصیهٔ همیشگی ایمچ انجام معاملات حضوری است.
            </div>
          </section>

          <div className="mt-8 text-center">
            <Link href="/help" className="text-xs font-bold text-primary hover:underline">
              ← بازگشت به راهنما
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
