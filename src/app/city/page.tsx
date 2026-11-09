import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { listProvincesWithCities } from '@/lib/city-markets';
import { toFa } from '@/lib/format';

/**
 * دایرکتوری «همه شهرها» — مقصد دکمهٔ «همه شهرها» باکس صفحهٔ اول.
 * هر استان (به ترتیب اهمیت) و همهٔ شهرهای دیتابیسِ همان استان؛ هر شهر
 * (بزرگ یا کوچک) به صفحهٔ بازار عمدهٔ خودش لینک می‌شود — دیتای کاملاً
 * زنده از بک‌اند (خواستهٔ مالک: «همه چیز باید از دیتابیس بیاد»).
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  // قالب layout خودش «| ایمچ» اضافه می‌کند
  title: 'بازار عمده شهرهای ایران | همه شهرها',
  description:
    'فهرست بازارهای عمده ایمچ در شهرهای ایران — خرید و فروش عمده به تفکیک استان و شهر؛ بازار عمده تهران، مشهد، اصفهان، شیراز و سایر شهرها.',
  alternates: { canonical: '/city' },
};

export default async function CityDirectoryPage() {
  const provinces = await listProvincesWithCities();
  const cityCount = provinces.reduce((a, p) => a + p.cities.length, 0);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-6">
          <h1 className="text-lg font-extrabold lg:text-2xl">بازار عمده شهرهای ایران</h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-6 text-muted-foreground lg:text-sm">
            خرید و فروش عمده به تفکیک شهر — هر شهر یک بازار عمده اختصاصی با آگهی‌های واقعی همان شهر؛
            برای خرده‌فروشان، سوپرمارکت‌ها و شرکت‌های پخشِ فعال در محدودهٔ شهر یا استان خودشان.
            {cityCount > 0 ? ` ${toFa(cityCount)} شهر در ${toFa(provinces.length)} استان.` : ''}
          </p>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
          {provinces.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
              فعلاً فهرست شهرها در دسترس نیست؛ کمی بعد دوباره تلاش کنید.
            </div>
          ) : (
            <div className="space-y-3">
              {provinces.map((p) => (
                <section
                  key={p.provinceId}
                  aria-labelledby={`province-${p.provinceId}`}
                  className="rounded-lg border border-border/70 bg-card p-4 shadow-sm lg:p-5"
                >
                  <h2
                    id={`province-${p.provinceId}`}
                    className="flex items-center gap-1.5 text-sm font-bold"
                  >
                    <MapPin size={15} className="text-primary" />
                    استان {p.provinceName}
                  </h2>
                  <nav
                    aria-label={`شهرهای استان ${p.provinceName}`}
                    className="mt-3 flex flex-wrap gap-x-3 gap-y-2"
                  >
                    {p.cities.map((c) => (
                      <Link
                        key={c.id}
                        href={c.href}
                        title={`بازار عمده ${c.name}`}
                        className={
                          c.major
                            ? 'rounded-md px-2 py-1 text-[13px] font-bold text-foreground transition-colors hover:bg-accent'
                            : 'rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                        }
                      >
                        {c.name}
                      </Link>
                    ))}
                  </nav>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
