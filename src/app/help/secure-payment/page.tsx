import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, HandCoins, Phone, ReceiptText, ShieldCheck, Truck } from 'lucide-react';
import { ArticleLayout, ArticleP, SectionTitle, StepItem, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'پرداخت امن در ایمچ | راهنما',
  description:
    'راهنمای پرداخت امن ایمچ: مراحل استفاده از پرداخت امن، نکات خرید امن، معامله حضوری، نکات مهم در انتقال وجه، نقش ایمچ در معاملات و زنگ خطرها.',
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

const NO_INPERSON = [
  'اطمینان از کالا: قبل از دیدن کالا و بررسی مشخصات مورد نظرتان، پرداخت نکنید.',
  'دریافت مبلغ: برای پیگیری واریز مبلغ، حتماً حساب خود را چک کنید و به تصویر فیش پرداختی و رسید پرداخت اینترنتی اعتماد نکنید.',
  'تصاویر و اطلاعات کالا: از فروشنده بخواهید تصاویر واضح و اطلاعات کافی از کالا را در اختیار شما بگذارد.',
  'پرهیز از اعتماد بی‌جا: ارائه کردن اطلاعات شخصی مانند آدرس، شمارهٔ تلفن ثابت، اطلاعات حساب بانکی، شناسه شبکه‌های اجتماعی و… معیاری برای اعتماد کردن به طرف مقابل نیست. چون ممکن است از اطلاعات شخص دیگری سوءاستفاده شده باشد.',
];

const IMCH_ROLE = [
  'ایمچ هیچگونه سود یا مسئولیتی در قبال معاملاتی که خارج از سیستم پرداخت امن ایمچ انجام شود ندارد.',
  'در صورت مشاهدهٔ مورد مشکوک یا تخلف، از طریق تماس با پشتیبانی ایمچ، ما را در جریان قرار دهید.',
  'ایمچ هیچ دخالتی در قیمت‌گذاری کالاهای فروشندگان ندارد. قیمت کالا توسط فروشنده مشخص می‌شود.',
  'ایمچ از اصالت هویت فروشندگان و خریداران آگاه نمی‌باشد. بنابراین کاربران باید خودشان جنبه‌های مختلف امنیتی را در نظر بگیرند.',
  'در صورتی که مزاحمت یا مشکلی برای شما ایجاد شده است، ایمچ همکاری‌های لازم را با مراجع قانونی انجام می‌دهد.',
];

const RED_FLAGS = [
  'قیمت و شرایط ارائه‌شده بیش از حد عالی به نظر می‌رسد.',
  'درخواست بیعانه قبل از دریافت کالا، به هر عنوانی توسط فروشنده پیشنهاد شود.',
  'فروشنده اطلاعات شفاف و کاملی دربارهٔ کالا ارائه نمی‌کند.',
  'در میانهٔ چت‌کردن در چت ایمچ، مخاطب درخواست می‌کند که مکالمه در سایر پیام‌رسان‌ها مانند تلگرام و واتس‌اپ و… ادامه پیدا کند.',
  'طرف مقابل بدون دلیل منطقی درخواست معاملهٔ حضوری را رد کند.',
  'طرف مقابل بدون دلیل منطقی اطلاعات شخصی یا حساب بانکی شما را می‌پرسد.',
  'خریدار بخواهد بدون دیدن کالا، آن را با قیمت عالی بخرد.',
];

export default function SecurePaymentGuidePage() {
  return (
    <ArticleLayout
      title="پرداخت امن از طریق ایمچ"
      intro="با پرداخت وجه معاملات از طریق ایمچ، با اطمینان معامله کنید."
      crumbs={[{ label: 'راهنما', href: '/help' }, { label: 'پرداخت امن ایمچ' }]}
    >
      <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 p-6 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck size={26} />
        </span>
        <p className="text-sm leading-6 text-muted-foreground">
          با استفاده از سیستم پرداخت امن ایمچ، تا زمان دریافت بار توسط خریدار، وجه معامله نزد ایمچ محفوظ می‌ماند و
          پس از تایید طرفین مبنی بر رعایت تمام مفاد قرارداد، مبلغ معامله به حساب فروشنده منتقل می‌شود.
        </p>
        <Button asChild size="sm" className="rounded-md">
          <Link href="/panel/secure-deals">
            <HandCoins size={15} className="ms-1" /> استفاده از پرداخت امن
          </Link>
        </Button>
      </div>

      {/* مراحل */}
      <section className="space-y-4">
        <SectionTitle>چگونه از پرداخت امن ایمچ استفاده کنیم؟</SectionTitle>
        <ol className="space-y-3">
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
      <section className="space-y-4">
        <SectionTitle>چرا از پرداخت امن ایمچ استفاده کنیم؟</SectionTitle>
        <ul className="space-y-2">
          {WHY.map((w) => (
            <li key={w} className="flex items-start gap-2 rounded-lg border bg-card p-3.5 text-xs leading-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <BadgeCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              {w}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/60 p-4">
          <p className="flex items-center gap-2 text-xs font-bold">
            <Phone size={15} className="text-primary" /> شماره تماس واحد پشتیبانی:
            <a href="tel:02191091419" dir="ltr" className="text-primary">021-91091419</a>
          </p>
          <p className="text-[11px] text-muted-foreground">ساعت پاسخ‌گویی: ۸ صبح الی ۴ عصر روزهای کاری</p>
        </div>
      </section>

      {/* نکات خرید امن */}
      <section className="space-y-4">
        <SectionTitle>نکات خرید امن در ایمچ</SectionTitle>
        <TipBox title="معاملهٔ حضوری؛ امن‌ترین راه معامله">
          <p>
            <b>معامله و پرداخت حضوری:</b> امن‌ترین و بهترین راه خرید، معاملهٔ حضوری است. یعنی خریدار در ملاقات حضوری با
            فروشنده، کالا را ببیند، بررسی کند و همان زمان مبلغ را پرداخت نماید. هرگز بعد از تحویل کالا یا خدمات، پرداخت
            مبلغ را به زمان دیگری موکول نکنید.
          </p>
          <p>
            <b>شواهد معامله:</b> بهتر است هنگام خرید کالا، رسید کتبی معتبر از فروشنده دریافت کنید.
          </p>
        </TipBox>

        <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-extrabold">نکات مهم در انتقال وجه</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-6 text-muted-foreground">
            <li>پرداخت نقدی: بهتر است پرداخت مبلغ به صورت نقدی باشد.</li>
            <li>
              پرداخت اینترنتی و کارت به کارت: در صورت پرداخت اینترنتی یا کارت به کارت، به دیدن رسید پرداخت اکتفا نکنید.
              قبل از تحویل کالا، شخصاً از وارد شدن مبلغ به حسابتان مطمئن شوید.
            </li>
            <li>چک و سفته: چک و سفته ممکن است نقد نشوند. برای کسب اطلاعات بیشتر، به قوانین رسمی چک رجوع کنید.</li>
            <li>چک رمزدار بانکی: در صورت دریافت چک‌های رمزدار بانکی، با مراجعه به بانک مورد نظر، از اصالت آن مطمئن شوید.</li>
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-extrabold">نکات مهم پیش از معامله</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-6 text-muted-foreground">
            <li>بیعانه ندهید: هرگز پیش از دریافت کالا، هزینه‌ای تحت عنوان بیعانه، شیرینی، رزرو و… پرداخت نکنید.</li>
            <li>ذخیرهٔ اطلاعات: اطلاعات فروشنده حتماً ذخیره کنید تا در صورت نیاز، دسترسی سریع داشته باشید.</li>
            <li>درخواست فاکتور خرید: در مورد برخی کالاها بهتر است از فروشنده بخواهید فاکتور خرید را به همراه داشته باشد.</li>
            <li>پرهیز از مزاحمت: دادن اطلاعات شخصی که نامربوط به معامله است، فقط احتمال مزاحمت را بالا می‌برد.</li>
          </ul>
        </div>
      </section>

      {/* معامله غیرحضوری */}
      <section className="space-y-3">
        <SectionTitle>امکان معاملهٔ حضوری وجود ندارد؟ دقت کنید!</SectionTitle>
        <ul className="space-y-1.5">
          {NO_INPERSON.map((n) => (
            <li key={n} className="flex items-start gap-2 text-sm leading-7 text-foreground/90">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-amber-500/80" aria-hidden />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* نقش ایمچ */}
      <section className="space-y-3">
        <SectionTitle>نقش ایمچ در معاملات</SectionTitle>
        <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <ul className="space-y-1.5 text-xs leading-6 text-muted-foreground">
            {IMCH_ROLE.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* زنگ خطرها */}
      <section className="space-y-3">
        <SectionTitle>زنگ خطرها در معامله؛ بیشتر احتیاط کنید وقتی</SectionTitle>
        <div className="rounded-lg border border-amber-300/70 bg-amber-50/70 p-4">
          <ul className="space-y-1.5 text-xs leading-6 text-amber-900/90">
            {RED_FLAGS.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="mt-1.5 text-amber-600" aria-hidden>▲</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </ArticleLayout>
  );
}
