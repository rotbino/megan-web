import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/home/hero';
import { CategoryCircles } from '@/components/home/category-circles';
import { RfqForm } from '@/components/home/rfq-form';
import { LatestProducts } from '@/components/home/latest-products';
import { StoreCTA } from '@/components/home/store-cta';
import { JsonLd } from '@/components/shared/json-ld';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <CategoryCircles />
        <LatestProducts />
        <RfqForm />
        <StoreCTA />
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'مِگان',
          description: 'بازارگاه آنلاین خرید و فروش عمده محصولات بدون واسطه',
          potentialAction: {
            '@type': 'SearchAction',
            target: '/product-list?s={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />
    </>
  );
}
