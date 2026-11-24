import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Ban, BellRing, MessageSquareText } from 'lucide-react';
import { ArticleLayout, ArticleP, BulletList, Figure, SectionTitle, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'چگونه در ایمچ پیام تجاری ارسال کنیم؟ | راهنما',
  description:
    'راهنمای ارسال پیام و شروع گفتگوی موثر در ایمچ: نوشتن پیام اولیه حرفه‌ای، معرفی و بیان هدف، پیگیری پیام‌های بی‌پاسخ و قوانین ارسال پیام.',
  alternates: { canonical: '/help/start-conversation' },
};

export default function StartConversationPage() {
  return (
    <ArticleLayout
      title="راهنمای ارسال پیام و شروع گفتگوی موثر"
      intro="پیام اولیه شما تأثیر زیادی بر روند مکالمه و نتیجه نهایی دارد."
      crumbs={[{ label: 'راهنما', href: '/help' }, { label: 'حساب کاربری' }, { label: 'ارسال پیام تجاری' }]}
    >
      <ArticleP>
        پیام اولیه شما تأثیر زیادی بر روند مکالمه و نتیجه نهایی دارد. پیام باید حرفه‌ای، کامل، و دقیق باشد.
        مکالمات متنی (چت) تفاوت‌هایی با گفتگوی تلفنی و حضوری دارد. پس بهتر است تلاش کنیم با یک شروع خوب،
        ارتباط موثری را شکل دهیم.
      </ArticleP>
      <ArticleP>برای شروع یک مکالمه حرفه‌ای و موثر، نیازی به تعارفات طولانی نیست.</ArticleP>
      <TipBox title="مثال">
        به جای اینکه با یک «سلام» ساده شروع کنید و منتظر پیام مخاطب بمانید، می‌توانید مستقیم به موضوع اصلی بپردازید و
        خواسته خود را در قالب یک پیام مطرح کنید؛ مثلا:
        «سلام وقت بخیر، به دنبال خرید عمده سیب زمینی هستم. لطفا قیمت و شرایط فروش را اطلاع دهید.»
        با این روش، نشان می‌دهید که به زمان طرف مقابل احترام می‌گذارید و به دنبال یک ارتباط تجاری موثر هستید.
      </TipBox>

      <section className="space-y-3">
        <SectionTitle>معرفی و بیان هدف مکالمه</SectionTitle>
        <ArticleP>
          برای شروع یک مکالمه حرفه‌ای و موثر، ابتدا خود را به شکلی کوتاه و دقیق معرفی کنید. نام، موقعیت شغلی، و دلیل
          پیام خود را ذکر کنید.
        </ArticleP>
        <TipBox title="نمونه">
          «سلام، من احمدی هستم، خریدار گوجه‌فرنگی صادراتی. لطفاً در مورد موجودی محصول توضیح دهید.»
        </TipBox>
        <ArticleP>
          هدف خود را به‌طور واضح بیان کنید تا از ارسال پیام‌های طولانی، پراکنده، و بدون نتیجه جلوگیری شود.
          این روش باعث می‌شود سریع‌تر به نتیجه برسید.
        </ArticleP>
        <ArticleP>
          در نظر داشته باشید که مخاطبان شما در ایمچ، تاجران و مسئولان فروش هستند که روزانه با چندین مشتری تعامل دارند
          و علاوه بر پاسخگویی، وظایف دیگری مثل پیگیری بار و مرسولات را نیز انجام می‌دهند. بنابراین، با ارسال
          پیام‌های تکه‌تکه وقت آن‌ها را نگیرید و از همان ابتدا به اصل مطلب بپردازید.
        </ArticleP>
      </section>

      <Figure
        src="/help-img/messages.png"
        alt="پیام‌رسان ایمچ — لیست مخاطبان و پنجره گفتگو"
        caption="پیام‌رسان ایمچ در پنل کاربری — برای شروع مکالمه، از دکمه «ارسال پیام» در صفحه محصول یا پروفایل فروشنده استفاده کنید."
      />

      <section className="space-y-3">
        <SectionTitle>پیگیری پیام‌های بی‌پاسخ</SectionTitle>
        <ArticleP>
          اگر پس از ارسال پیام در ایمچ پاسخی دریافت نکردید، دلایل مختلفی ممکن است وجود داشته باشد. یکی از اصلی‌ترین
          دلایل این است که بازرگان هنوز پیام شما را ندیده باشد. با توجه به طراحی پیام‌رسان ایمچ در بستر وب، ممکن است
          بازرگان هنوز وارد سایت نشده و از پیام شما مطلع نشده باشد.
        </ArticleP>
        <div className="space-y-2.5">
          <div className="flex items-start gap-3 rounded-lg border bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">۱</span>
            <p className="text-xs leading-6 text-foreground/90">
              <b className="text-sm">ارسال پیامک یا تماس تلفنی: </b>
              از شماره تماس موجود در پروفایل بازرگان استفاده کنید. این روش می‌تواند سریع‌تر و مؤثرتر باشد.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">۲</span>
            <p className="text-xs leading-6 text-foreground/90">
              <b className="text-sm">ارسال مجدد پیام در پیام‌رسان ایمچ: </b>
              پیام خود را دوباره ارسال کنید و در صورت نیاز شماره تماس خود را برای بازرگان بگذارید. ایمچ با ارسال پیامک
              به بازرگان اطلاع می‌دهد که پیام جدیدی دریافت کرده است.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">۳</span>
            <p className="text-xs leading-6 text-foreground/90">
              <b className="text-sm">نصب اپلیکیشن ایمچ: </b>
              برای دسترسی سریع‌تر به پیام‌ها و دریافت اعلان‌های فوری، نصب اپلیکیشن ایمچ به تمامی کاربران توصیه می‌شود.
              با این کار نیازی به ورود مکرر به سایت نخواهید داشت و پیام‌های جدید خود را بدون تأخیر مشاهده می‌کنید.
            </p>
          </div>
        </div>
        <ArticleP>
          این اقدامات به شما کمک می‌کنند که سریع‌تر با مخاطب خود ارتباط برقرار کنید و از ایجاد تأخیر در معاملات جلوگیری شود.
        </ArticleP>
      </section>

      <section className="space-y-3">
        <SectionTitle>قوانین ارسال پیام در ایمچ</SectionTitle>
        <ArticleP>
          برای حفظ امنیت حساب و اطلاعات خود، از ارسال لینک‌های حاوی کلاهبرداری، پیام‌های تبلیغاتی انبوه یا کپی‌پیست‌شده
          و همچنین اطلاعات هویتی مانند عکس یا شماره کارت ملی خودداری کنید.
        </ArticleP>
        <BulletList
          items={[
            'ارسال لینک به دلیل خطر فیشینگ و کلاهبرداری، ممنوع است و در صورت نقض این قانون، حساب کاربری شما مسدود خواهد شد.',
            'اگر مشتری برای اعتماد بیشتر از شما درخواست احراز هویت کرد، تنها از طریق صفحه احراز هویت ایمچ اقدام کنید. این روش اطلاعات شما را به‌صورت محرمانه نزد ایمچ نگه می‌دارد.',
            'به هیچ عنوان مدارک هویتی خود را مستقیماً برای افراد ارسال نکنید.',
          ]}
        />
        <TipBox title="نکته پایانی" tone="warn">
          رعایت این قوانین به امنیت و اعتماد بیشتر در معاملات ایمچ کمک می‌کند.
        </TipBox>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-5">
        <Button asChild size="sm" className="rounded-md">
          <Link href="/panel/messages">
            <MessageSquareText size={15} className="ms-1" /> رفتن به پیام‌رسان
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-md">
          <Link href="/help/become-buyer">
            <BellRing size={15} className="ms-1" /> راهنمای خریداران <ArrowLeft size={13} />
          </Link>
        </Button>
      </div>
    </ArticleLayout>
  );
}
