import Link from 'next/link';
import { Headphones, Link2, Mail, Megaphone, Phone, UserRoundCheck } from 'lucide-react';
import { BrandLogo } from '@/components/shared/brand';

/** فوتر — همان ساختار باسکول: سه هدف، ستون‌های لینک، توضیح سئویی، تماس و کپی‌رایت */
const goals = [
  [UserRoundCheck, 'ارتباط مستقیم فروشنده و خریدار'],
  [Headphones, 'پشتیبانی آنلاین و تلفنی'],
  [Megaphone, 'بازاریابی محصولات شما'],
] as const;

const footerCols = [
  {
    title: 'درباره ما',
    links: [
      { label: 'درباره ایمچ', href: '/help' },
      { label: 'ایمچ چگونه کار می کند؟', href: '/help' },
      { label: 'تماس با ما و پشتیبانی', href: '/panel/support' },
      { label: 'قوانین و مقررات', href: '/help' },
      { label: 'پرداخت امن ایمچ', href: '/help/secure-payment' },
    ],
  },
  {
    title: 'فروشندگان',
    links: [
      { label: 'نحوه ثبت محصول', href: '/panel/products/new' },
      { label: 'انواع عضویت فروشندگان', href: '/panel/pricing' },
      { label: 'احراز هویت حقیقی و حقوقی', href: '/panel/verification' },
      { label: 'چگونه بفروشیم', href: '/help' },
    ],
  },
  {
    title: 'خریداران',
    links: [
      { label: 'نحوه احراز هویت', href: '/panel/verification' },
      { label: 'نحوه ثبت درخواست', href: '/panel/buy-requests/new' },
      { label: 'چگونه بخریم', href: '/help' },
      { label: 'نمایش درخواست‌های خرید', href: '/buyAd-requests' },
    ],
  },
];

const seoLinks = ['خرید پسته', 'قیمت زعفران', 'خرید خرما', 'کشمش عمده', 'برنج عمده', 'گردو عمده', 'قیمت برنج', 'میوه خشک', 'زرشک عمده', 'بادام عمده', 'خرید سیب'];

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card">
      {/* سه هدف — عین باسکول */}
      <div className="border-b bg-secondary/40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 text-sm sm:grid-cols-3 lg:px-6">
          {goals.map(([Icon, title]) => (
            <div key={title} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon size={19} strokeWidth={1.9} />
              </span>
              <p className="font-bold leading-6">{title}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div className="space-y-4">
          <BrandLogo size="md" />
          <p className="max-w-xs text-xs leading-6 text-muted-foreground">
            ایمچ، بازار عمده خرید و فروش عمده کالا در ایران؛ فضایی برای دسترسی مستقیم به تولیدکنندگان و عرضه‌کنندگان انواع کالای ایرانی.
          </p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><Phone size={13} className="text-primary" /> ۰۲۱-۹۱۰۹۱۴۱۹</p>
            <p className="flex items-center gap-2"><Mail size={13} className="text-primary" /> support@imach.ir</p>
          </div>
        </div>
        {footerCols.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="mb-3 text-sm font-bold">{col.title}</h3>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-xs text-muted-foreground transition-colors hover:text-primary">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* لینک‌های سئویی مثل باسکول */}
      <div className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Link2 size={12} /> پربازدیدترین بازارهای عمده
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {seoLinks.map((s) => (
              <li key={s}>
                <Link href="/product-list" className="hover:text-primary">{s}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t bg-secondary/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row lg:px-6">
          <p>تمام حقوق مادی و معنوی سایت متعلق به ایمچ است.</p>
          <p>ایمچ — بازار خرید و فروش عمده</p>
        </div>
      </div>
    </footer>
  );
}
