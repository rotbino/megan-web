import Link from 'next/link';
import { ChevronsLeft } from 'lucide-react';

export function Hero() {
    return (
        <section className="relative overflow-hidden bg-primary-deep text-white nav-desktop:min-h-[440px] lg:min-h-[480px]">
            {/* ---------- موبایل: تصویر در جریان عادی، بدون کراپ، با نسبت حفظ‌شده ---------- */}
            <div className="relative nav-desktop:hidden">
                <img
                    src="/images/hero-mobile.jpg"
                    alt=""
                    fetchPriority="high"
                    className="block h-auto w-full"
                />
                {/* تیرگی ملایم فقط در سمت راست — برای خوانایی برند و شعار */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-l from-primary-deep/55 via-transparent to-transparent"
                />
            </div>

            {/* ---------- دسکتاپ: تصویر absolute + object-cover روی سکشن با ارتفاع مشخص ---------- */}
            <div className="absolute inset-0 hidden nav-desktop:block">
                <img
                    src="/images/hero.webp"
                    alt=""
                    fetchPriority="high"
                    className="h-full w-full object-cover object-[center_60%]"
                />
                {/* تیرگی فقط سمت راست — بقیه تصویر کاملاً روشن */}
                <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-l from-primary-deep/75 via-transparent to-transparent"
                />
            </div>

            {/* دسکتاپ: محتوا */}
            <div className="relative mx-auto hidden max-w-7xl flex-col items-start px-4 pt-16 pb-10 lg:px-6 nav-desktop:flex">
                <h1 className="text-4xl font-bold leading-[61px]">
                    ایمچ | بازار خرید و فروش عمده
                </h1>
                <h2 className="mt-4 max-w-xl text-xl font-normal leading-9 text-white/85">
                    ارتباط مستقیم با خریداران و فروشندگان عمده
                </h2>
                <Link
                    href="/product-list"
                    className="mt-8 inline-flex h-12 w-[204px] items-center justify-center gap-1.5 rounded-md bg-white text-base font-medium text-primary-deep transition-colors hover:bg-white/90"
                >
                    شروع معاملات عمده
                    <ChevronsLeft size={20} />
                </Link>
            </div>
        </section>
    );
}