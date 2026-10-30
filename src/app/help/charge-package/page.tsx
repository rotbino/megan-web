import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Boxes,
  Crown,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { ArticleLayout, ArticleP, BulletList, Figure, SectionTitle, StepItem, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';
import { priceFa, toFa } from '@/lib/format';
import { LADDER_MONTHLY_PRICE, MEMBERSHIP_PLANS, MIN_CHARGE } from '@/lib/mock/data';

export const metadata: Metadata = {
  title: 'بسته های اشتراک ویژه و نردبان | راهنمای ایمچ',
  description:
    'راهنمای خرید بسته های اشتراک ویژه ایمچ (دو، شش و یک‌ساله) با مزایای هر بسته، و راهنمای نردبان آگهی: قرار گرفتن آگهی در صدر محصولات، هزینه ۵۰ هزار تومانی یک‌ماهه و مراحل فعال‌سازی از کیف پول.',
  alternates: { canonical: '/help/charge-package' },
};

/** مزایای اشتراک ویژه — همان فهرست صفحه «بسته‌های اشتراک» پنل */
const SUBSCRIPTION_BENEFITS = [
  'ثبت تعداد نامحدود محصول — بدون سقف ظرفیت بسته رایگان.',
  'دسترسی نامحدود به همه خریداران: شماره تماس خریداران و فهرست خریداران پیشنهادی.',
  'درج نشان فروشنده ویژه روی محصولات و پروفایل شما.',
  'نمایش محصولات شما بالاتر از فروشندگان عادی در نتایج جستجو.',
  'اولویت بررسی آگهی‌ها و پشتیبانی ویژه.',
];

/** توضیح نردبان — متن پایه از مالک، صیقل‌خورده برای وب */
const LADDER_TEXT =
  'نردبان یعنی قرار گرفتن آگهی شما در صدر محصولات، حتی بالاتر از آگهی‌های فروشندگان ویژه. هزینه آن به‌صورت جداگانه از کیف پول پرداخت می‌شود و به اشتراک ربطی ندارد. این امکان برای کاربرانی است که می‌خواهند در میان کاربران ویژه بالاتر دیده شوند؛ پس از آگهی‌های نردبانی و ویژه، بقیه آگهی‌ها بر اساس جدیدترین به‌روزرسانی نمایش داده می‌شوند. نردبان به‌ویژه برای فروشندگانی که تعداد کالای کمی دارند به‌صرفه‌تر و مؤثرتر است.';

export default function ChargePackagePage() {
  return (
    <ArticleLayout
      title="بسته های اشتراک ویژه و نردبان"
      intro="دو خدمت مکمل برای دیده‌شدن بیشتر در ایمچ: بسته‌های اشتراک ویژه برای فروش بدون محدودیت، و نردبان برای رساندن آگهی به صدر نتایج."
      crumbs={[{ label: 'راهنما', href: '/help' }, { label: 'فروشندگان' }, { label: 'بسته های اشتراک ویژه و نردبان' }]}
    >
      <ArticleP>
        ایمچ برای همه کاربران یک بسته رایگان همیشگی دارد: ثبت تا {toFa(10)} محصول و درخواست خرید نامحدود. اگر
        بیشتر از این نیاز دارید یا می‌خواهید از امکانات ویژه بهره‌مند شوید، <b>بسته‌های اشتراک ویژه</b> برای شما
        ساخته شده‌اند. در کنار آن، <b>نردبان</b> به شما امکان می‌دهد آگهی خاصی را برای یک ماه به صدر نتایج برسانید؛
        این دو مستقل از هم هستند و هر کدام جدای از دیگری خریداری می‌شوند.
      </ArticleP>

      {/* ─── بسته‌های اشتراک ویژه — پیش از نردبان (خواسته مالک) ─── */}
      <section className="space-y-4">
        <SectionTitle>بسته‌های اشتراک ویژه</SectionTitle>
        <ArticleP>
          با خرید اشتراک ویژه، سقف ثبت محصول برای شما برداشته می‌شود و امکاناتی در اختیارتان قرار می‌گیرد که
          فروش را سریع‌تر می‌کند. اشتراک‌ها به‌صورت دوره‌ای هستند و با پایان دوره، به‌سادگی با خرید مجدد تمدید
          می‌شوند.
        </ArticleP>

        {/* پلن‌ها */}
        <div className="grid gap-3 sm:grid-cols-3">
          {MEMBERSHIP_PLANS.map((p) => (
            <div
              key={p.key}
              className={
                p.bestSeller
                  ? 'relative rounded-lg border-2 border-primary bg-primary/5 p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                  : 'rounded-lg border bg-card p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
              }
            >
              {p.bestSeller && (
                <span className="absolute -top-2.5 right-1/2 translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  پیشنهاد ایمچ
                </span>
              )}
              <span className="mx-auto grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                {p.bestSeller ? <Crown size={17} /> : <Boxes size={17} />}
              </span>
              <p className="mt-2 text-xs font-extrabold">اشتراک {p.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{toFa(p.months)} ماه اعتبار</p>
              <p className="font-num mt-2 text-sm font-extrabold text-primary">{priceFa(p.amount)}</p>
            </div>
          ))}
        </div>

        <BulletList items={SUBSCRIPTION_BENEFITS} />

        {/* مراحل خرید بسته */}
        <div className="space-y-3">
          <StepItem n={1} title="انتخاب بسته از پنل">
            <ArticleP>
              وارد پنل کاربری شوید و از منوی کنار، صفحه «بسته‌های اشتراک» را باز کنید. با توجه به حجم کارتان،
              یکی از بسته‌های دو ماهه، شش ماهه یا یک‌ساله را انتخاب کنید.
            </ArticleP>
          </StepItem>
          <StepItem n={2} title="پرداخت کارت به کارت و ارسال فیش">
            <ArticleP>
              مبلغ بسته را به شماره کارت ایمچ واریز کنید و تصویر فیش را در همان صفحه آپلود کنید. پرداخت به‌صورت
              کارت به کارت است و نیازی به درگاه پرداخت آنلاین ندارید.
            </ArticleP>
          </StepItem>
          <StepItem n={3} title="تایید و فعال‌سازی">
            <ArticleP>
              پس از تایید فیش توسط کارشناسان ایمچ، بسته شما فعال می‌شود؛ اگر اشتراک قبلی هنوز اعتبار داشته باشد،
              اعتبار جدید از همان تاریخ به آن اضافه می‌شود و چیزی از دست نمی‌دهید.
            </ArticleP>
          </StepItem>
        </div>

        <TipBox title="بسته رایگان همیشگی">
          اگر اشتراک نخرید هم چیزی از دست نمی‌دهید: ثبت تا {toFa(10)} محصول و درخواست خرید نامحدود برای همیشه
          رایگان است. تنها شماره تماس خریداران و فهرست خریداران پیشنهادی مخصوص اشتراک ویژه است.
        </TipBox>
      </section>

      {/* ─── نردبان ─── */}
      <section className="space-y-4">
        <SectionTitle>نردبان آگهی</SectionTitle>
        <ArticleP>{LADDER_TEXT}</ArticleP>
        <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp size={19} />
          </span>
          <div>
            <p className="text-sm font-extrabold">
              هزینه نردبان هر آگهی: {priceFa(LADDER_MONTHLY_PRICE)} در ماه — از یک ماه تا چهار ماه
            </p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              پیش‌فرض نردبان یک ماه (۳۰ روز) است؛ می‌توانید هنگام پرداخت تا چهار ماه انتخاب کنید. هزینه به‌صورت
              جداگانه از شارژ کیف پول کسر می‌شود؛ بنابراین حداقل شارژ {priceFa(MIN_CHARGE)} است.
            </p>
          </div>
        </div>

        {/* مراحل فعال‌سازی نردبان */}
        <div className="space-y-3">
          <StepItem n={1} title="شارژ کیف پول (کارت به کارت)">
            <ArticleP>
              ابتدا از پنل کاربری، صفحه «کیف پول» را انتخاب کنید. یکی از پکیج‌های شارژ را انتخاب کنید، مبلغ را به
              شماره کارت ایمچ کارت به کارت کنید و تصویر فیش را برای ما بفرستید. پس از تایید ادمین، شارژ به کیف
              پول شما اضافه می‌شود.
            </ArticleP>
          </StepItem>
          <Figure
            src="/help-img/wallet.png"
            alt="صفحه شارژ کیف پول ایمچ با پکیج‌های کارت به کارت"
            caption="صفحه کیف پول — انتخاب پکیج شارژ، شماره کارت ایمچ و آپلود تصویر فیش."
          />
          <TipBox title="پکیج‌های شارژ با جایزه">
            پکیج ۱۰۰ هزار تومانی بدون جایزه، پکیج ۲۰۰ هزار تومانی با ۱۰٪ جایزه (۲۲۰ هزار تومان شارژ) و پکیج ۴۰۰
            هزار تومانی با ۲۰٪ جایزه (۴۸۰ هزار تومان شارژ). با گزینه «سایر» می‌توانید مبلغ دلخواه خود را وارد
            کنید: از ۴۰۰ هزار تا ۱ میلیون تومان ۳۰٪ و بیش از ۱ میلیون تومان ۵۰٪ شارژ اضافه می‌گیرید.
          </TipBox>
          <StepItem n={2} title="نردبان آگهی از «محصولات من»">
            <ArticleP>
              پس از آنکه موجودی کیف پول شما کافی شد، از منوی «محصولات من»، روی دکمه «نردبان» آگهی مورد نظر کلیک
              کنید. در پنجره پرداخت، مدت نردبان را انتخاب کنید (پیش‌فرض یک ماه، تا چهار ماه) و با تایید، نردبان
              فعال می‌شود. اگر موجودی برای بازه انتخابی کافی نباشد، پیام همان بازه را می‌بینید.
            </ArticleP>
          </StepItem>
          <Figure
            src="/help-img/ladder-modal.png"
            alt="پنجره پرداخت هزینه نردبان در ایمچ"
            caption="پنجره پرداخت هزینه نردبان — یک‌ماهه ۳۰ روزه، کسر از کیف پول."
          />
          <TipBox title="نکته">
            آگهی‌های نردبان‌شده با برچسب «نردبان فعال» در لیست «محصولات من» مشخص می‌شوند و در صفحه محصولات همان
            دسته، بالاتر از همه — حتی بالاتر از آگهی‌های ویژه — نمایش داده می‌شوند.
          </TipBox>
        </div>
      </section>

      {/* ─── جمع‌بندی ─── */}
      <section className="space-y-3">
        <SectionTitle>کدام را انتخاب کنم؟</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <Sparkles size={17} />
            </span>
            <p className="mt-2 text-xs font-extrabold">اشتراک ویژه برای فروش پایدار</p>
            <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
              اگر تعداد کالای شما زیاد است و می‌خواهید به همه خریداران دسترسی داشته باشید، اشتراک ویژه انتخاب
              درستی است.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <TrendingUp size={17} />
            </span>
            <p className="mt-2 text-xs font-extrabold">نردبان برای دیده‌شدن سریع</p>
            <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
              اگر تعداد کالای کمی دارید و می‌خواهید همان آگهی‌ها در صدر ببینند، نردبان به‌صرفه‌تر و مؤثرتر است.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-5">
        <Button asChild size="sm" className="rounded-md">
          <Link href="/panel/pricing">
            <Crown size={15} className="ms-1" /> خرید بسته اشتراک ویژه
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-md">
          <Link href="/panel/wallet">
            <Wallet size={15} className="ms-1" /> شارژ کیف پول
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-md">
          <Link href="/panel/products">
            <TrendingUp size={15} className="ms-1" /> نردبان از محصولات من <ArrowLeft size={13} />
          </Link>
        </Button>
      </div>
    </ArticleLayout>
  );
}
