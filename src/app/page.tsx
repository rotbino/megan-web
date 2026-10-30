import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/home/hero';
import { CategoryCards } from '@/components/home/category-cards';
import { LatestProducts } from '@/components/home/latest-products';
import { LatestBuyRequests } from '@/components/home/latest-buy-requests';
import { RfqForm } from '@/components/home/rfq-form';
import { RegisterBanner } from '@/components/home/register-banner';
import { SeoCards } from '@/components/home/seo-cards';
import { JsonLd } from '@/components/shared/json-ld';

/**
 * صفحه اصلی — ساختار عین صفحه اول باسکول:
 * هیرو → دسته‌بندی‌های اصلی → جدیدترین محصولات → جدیدترین درخواست‌های خرید →
 * فرم درخواست خرید → بنر ثبت فروشگاه → کارت‌های سئو → فوتر
 */
export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <CategoryCards />
        <LatestProducts />
        <LatestBuyRequests />
        <div id="rfq" className="scroll-mt-20 mt-6">
          <RfqForm />
        </div>
        <RegisterBanner />
        <SeoCards />
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'ایمچ',
          description: 'بازار خرید و فروش عمده محصولات بدون واسطه',
          potentialAction: {
            '@type': 'SearchAction',
            target: '/product-list/search/{search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />
    </>
  );
}
