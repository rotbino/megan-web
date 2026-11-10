import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveBuyerBookPublicId } from '@/lib/mock/api';
import { BookPublicHeader } from '@/components/buyer-book/public/book-public-header';
import { BookPublicContent } from '@/components/buyer-book/public/book-public-content';
import type { BuyerBookSettings } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * صفحهٔ عمومی «دفتر خرید» خریدار — /b/{bookId} (خواستهٔ مالک ۱۰-۱۱ دور ۵).
 *
 * قرینهٔ کاتالوگ فروشنده: فروشنده کاتالوگ دارد که خریدار ذخیره می‌کند؛ خریدار
 * دفتر خرید دارد (کالاهای خرید دوره‌ای‌اش) که فروشنده ذخیره می‌کند — لیست
 * مشتری بالقوهٔ ارزشمند برای فروشنده.
 *  • صفحهٔ مستقل و شخصی مثل کاتالوگ: هدر اختصاصی + تم برند (رنگ/لوگو)؛
 *  • پوستهٔ SSR عمومی است (هویت و برند) اما محتوا (کالاها/نظرات/مشخصات)
 *    پشت گیت است: فقط خودِ خریدار یا کاربران دارندهٔ بستهٔ فعال ایمچ
 *    (خواستهٔ مالک) — مهمان به ورود/ثبت‌نام و بی‌بسته به خرید بسته دعوت.
 *  • آیدی لینک دلخواه است (مثل /b/phaksh-seyyed)؛ پیش‌فرض تصادفی ساخته
 *    می‌شود و خریدار از «تنظیمات دفتر خرید» پنلش عوضش می‌کند.
 */
async function resolveBook(id: string) {
  return resolveBuyerBookPublicId(decodeURIComponent(id));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const book = await resolveBook(id);
  if (!book) return { title: 'دفتر خرید یافت نشد' };
  // عنوان بنر دفتر (خواستهٔ مالک ۱۱-۱۱) — متن معرفی خودِ خریدار؛ اگر نوشته
  // باشد توضیح متادیتا و پیش‌نمایش اشتراک‌گذاری همان می‌شود
  const bannerTitle = book.settings.bannerTitle?.trim() || null;
  return {
    // دفتر خرید سند شخصی خریدار است — عنوان بدون پسوند «| ایمچ» (عین کاتالوگ)
    title: { absolute: `دفتر خرید ${book.name}` },
    description: bannerTitle ??
      `دفتر خرید دوره‌ای ${book.name} — کالاهایی که به‌طور مستمر می‌خرد، ` +
      'حجم و دورهٔ خرید هر کالا؛ دیدن دفتر ویژهٔ فروشندگان دارندهٔ بستهٔ ایمچ.',
    alternates: { canonical: `/b/${book.settings.bookId ?? id}` },
  };
}

export default async function BuyerBookPage({ params }: Props) {
  const { id } = await params;
  const book = await resolveBook(id);
  if (!book) notFound();

  const settings: BuyerBookSettings = book.settings;
  const sharePath = settings.bookId ? `/b/${settings.bookId}` : `/b/${id}`;

  return (
    // رنگ برند به‌صورت CSS var به همهٔ فرزندان می‌رسد (عین کاتالوگ /c)
    <div
      style={{ ['--catalog-accent' as string]: settings.brandColor || 'var(--primary)' } as React.CSSProperties}
      className="min-h-dvh bg-background"
    >
      <BookPublicHeader name={book.name} settings={settings} sharePath={sharePath} />
      <main className="flex-1">
        {/* محتوای گیت‌دار — کالاها، نظرات و مشخصات خریدار؛ آمار ذخیره‌ها */}
        <BookPublicContent
          bookId={decodeURIComponent(id)}
          resolvedUserName={book.userName}
          resolvedName={book.name}
          settings={settings}
          sharePath={sharePath}
        />
      </main>
    </div>
  );
}
