'use client';

/**
 * راهنمای پرداخت امن — عین MHTML باسکول:
 * چهار گام استفاده + چرا پرداخت امن؟ + جعبه تماس پشتیبانی + بخش‌های کامل
 * «نکات خرید امن در ایمچ» (حضوری/انتقال وجه/پیش از معامله/غیرحضوری/نقش ایمچ/زنگ خطرها).
 */

import Link from 'next/link';
import {
  AlarmClock,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Eye,
  Handshake,
  Phone,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';

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

const SAFE_SECTIONS: { title: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; points: string[] }[] = [
  {
    title: 'معاملهٔ حضوری؛ امن‌ترین راه معامله',
    icon: Eye,
    points: [
      'معامله و پرداخت حضوری: امن‌ترین و بهترین راه خرید، معاملهٔ حضوری است. یعنی خریدار در ملاقات حضوری با فروشنده، کالا را ببیند، بررسی کند و همان زمان مبلغ را پرداخت نماید. هرگز بعد از تحویل کالا یا خدمات، پرداخت مبلغ را به زمان دیگری موکول نکنید.',
      'شواهد معامله: بهتر است هنگام خرید کالا، رسید کتبی معتبر از فروشنده دریافت کنید.',
    ],
  },
  {
    title: 'نکات مهم در انتقال وجه',
    icon: Wallet,
    points: [
      'پرداخت نقدی: بهتر است پرداخت مبلغ به صورت نقدی باشد.',
      'پرداخت اینترنتی و کارت به کارت: در صورت پرداخت اینترنتی یا کارت به کارت، به دیدن رسید پرداخت اکتفا نکنید. قبل از تحویل کالا، شخصاً از وارد شدن مبلغ به حسابتان مطمئن شوید.',
      'چک و سفته: چک و سفته ممکن است نقد نشوند. برای کسب اطلاعات بیشتر، به قوانین رسمی چک رجوع کنید.',
      'چک رمزدار بانکی: در صورت دریافت چک‌های رمزدار بانکی، با مراجعه به بانک مورد نظر، از اصالت آن مطمئن شوید.',
    ],
  },
  {
    title: 'نکات مهم پیش از معامله',
    icon: ShieldCheck,
    points: [
      'بیعانه ندهید: هرگز پیش از دریافت کالا، هزینه‌ای تحت عنوان بیعانه، شیرینی، رزرو و… پرداخت نکنید.',
      'ذخیرهٔ اطلاعات: اطلاعات فروشنده حتماً ذخیره کنید تا در صورت نیاز، دسترسی سریع داشته باشید.',
      'درخواست فاکتور خرید: در مورد برخی کالاها بهتر است از فروشنده بخواهید فاکتور خرید را به همراه داشته باشد.',
      'پرهیز از مزاحمت: دادن اطلاعات شخصی که نامربوط به معامله است، فقط احتمال مزاحمت را بالا می‌برد.',
    ],
  },
  {
    title: 'امکان معاملهٔ حضوری وجود ندارد؟ دقت کنید!',
    icon: AlarmClock,
    points: [
      'اطمینان از کالا: قبل از دیدن کالا و بررسی مشخصات مورد نظرتان، پرداخت نکنید.',
      'دریافت مبلغ: برای پیگیری واریز مبلغ، حتماً حساب خود را چک کنید و به تصویر فیش پرداختی و رسید پرداخت اینترنتی اعتماد نکنید.',
      'تصاویر و اطلاعات کالا: از فروشنده بخواهید تصاویر واضح و اطلاعات کافی از کالا را در اختیار شما بگذارد.',
      'پرهیز از اعتماد بی‌جا: ارائه کردن اطلاعات شخصی مانند آدرس، شمارهٔ تلفن ثابت، اطلاعات حساب بانکی، شناسه شبکه‌های اجتماعی و… معیاری برای اعتماد کردن به طرف مقابل نیست؛ چون ممکن است از اطلاعات شخص دیگری سوءاستفاده شده باشد.',
    ],
  },
  {
    title: 'نقش ایمچ در معاملات',
    icon: Handshake,
    points: [
      'ایمچ هیچگونه سود یا مسئولیتی در قبال معاملاتی که خارج از سیستم پرداخت امن ایمچ انجام شود ندارد.',
      'در صورت مشاهدهٔ مورد مشکوک یا تخلف، از طریق تماس با پشتیبانی ایمچ، ما را در جریان قرار دهید.',
      'ایمچ هیچ دخالتی در قیمت‌گذاری کالاهای فروشندگان ندارد؛ قیمت کالا توسط فروشنده مشخص می‌شود.',
      'ایمچ از اصالت هویت فروشندگان و خریداران آگاه نیست؛ بنابراین کاربران باید خودشان جنبه‌های مختلف امنیتی را در نظر بگیرند.',
      'در صورتی که مزاحمت یا مشکلی برای شما ایجاد شده است، ایمچ همکاری‌های لازم را با مراجع قانونی انجام می‌دهد.',
    ],
  },
  {
    title: 'زنگ خطرها در معامله؛ بیشتر احتیاط کنید وقتی…',
    icon: Ban,
    points: [
      'قیمت و شرایط ارائه شده بیش از حد عالی به نظر می‌رسد.',
      'درخواست بیعانه قبل از دریافت کالا، به هر عنوانی توسط فروشنده پیشنهاد شود.',
      'فروشنده اطلاعات شفاف و کاملی دربارهٔ کالا ارائه نمی‌کند.',
      'در میانهٔ چت‌کردن در چت ایمچ، مخاطب درخواست می‌کند که مکالمه در سایر پیام‌رسان‌ها مانند تلگرام و واتس‌اپ و… ادامه پیدا کند.',
      'طرف مقابل بدون دلیل منطقی درخواست معاملهٔ حضوری را رد کند.',
      'طرف مقابل بدون دلیل منطقی اطلاعات شخصی یا حساب بانکی شما را می‌پرسد.',
      'خریدار بخواهد بدون دیدن کالا، آن را با قیمت عالی بخرد.',
    ],
  },
];

export default function SecureDealsGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/panel/secure-deals" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={14} />
          معاملات پرداخت امن
        </Link>
        <h1 className="mt-2 text-lg font-extrabold">پرداخت امن از طریق ایمچ</h1>
        <p className="mt-1 text-sm text-muted-foreground">با پرداخت وجه معاملات از طریق ایمچ با اطمینان معامله کنید.</p>
      </div>

      {/* چگونه استفاده کنیم؟ */}
      <PanelCard>
        <p className="text-sm font-bold">چگونه از پرداخت امن ایمچ استفاده کنیم؟</p>
        <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
          با استفاده از سیستم پرداخت امن ایمچ، تا زمان دریافت بار توسط خریدار، وجه معامله نزد ایمچ محفوظ می‌ماند و
          پس از تایید طرفین مبنی بر رعایت تمام مفاد قرارداد، مبلغ معامله به حساب فروشنده منتقل می‌شود.
        </p>
        <ol className="mt-4 space-y-2.5">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-start gap-3 rounded-md border bg-secondary/30 px-3 py-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {(i + 1).toLocaleString('fa-IR')}
              </span>
              <span className="text-xs leading-6">{s}</span>
            </li>
          ))}
        </ol>
      </PanelCard>

      {/* چرا؟ */}
      <PanelCard>
        <p className="text-sm font-bold">چرا از پرداخت امن ایمچ استفاده کنیم؟</p>
        <ul className="mt-3 space-y-2">
          {WHY.map((w) => (
            <li key={w} className="flex items-start gap-2 text-xs leading-6">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              {w}
            </li>
          ))}
        </ul>
      </PanelCard>

      {/* تماس پشتیبانی */}
      <PanelCard className="border-primary/25 bg-primary/5">
        <p className="text-sm font-bold text-primary">برای دریافت خدمات پرداخت امن و اطلاعات بیشتر با شماره تلفن واحد پشتیبانی ایمچ تماس بگیرید.</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5 font-bold" dir="ltr">
            <Phone size={14} className="shrink-0" />
            021-91091419
          </span>
          <span className="text-muted-foreground">ساعت پاسخ گویی: ۸ صبح الی ۴ عصر روزهای کاری</span>
        </div>
        <Button size="sm" className="mt-4 rounded-md">
          <Send size={14} /> پیام به پشتیبانی
        </Button>
      </PanelCard>

      {/* نکات خرید امن */}
      <div>
        <h2 className="text-base font-extrabold">نکات خرید امن در ایمچ</h2>
        <div className="mt-3 space-y-3">
          {SAFE_SECTIONS.map(({ title, icon: Icon, points }) => (
            <PanelCard key={title}>
              <p className="flex items-center gap-2 text-sm font-bold">
                <Icon size={16} className="shrink-0 text-primary" />
                {title}
              </p>
              <ul className="mt-2.5 space-y-2">
                {points.map((p) => (
                  <li key={p.slice(0, 40)} className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </PanelCard>
          ))}
        </div>
      </div>
    </div>
  );
}
