/**
 * کارت‌های سئو پایین صفحه اصلی — همان سه کارت باسکول
 * (ایمچ چیست؟ / خدمات خریداران / خدمات فروشندگان) با متن اقتباس‌شده از باسکول.
 */
const CARDS = [
  {
    title: 'ایمچ چیست؟',
    text: 'ایمچ بستر ارتباط مستقیم خریدار و فروشنده را فراهم می‌کند و محصولات فروشندگان را در یک بازار آنلاین در معرض نمایش می‌گذارد.',
  },
  {
    title: 'خدمات خریداران',
    text: 'خریداران در ایمچ به فروشندگان عمده محصول مورد نظر خود در سراسر ایران به راحتی و بدون واسطه دسترسی دارند و با آنها در ارتباط هستند.',
  },
  {
    title: 'خدمات فروشندگان',
    text: 'فروشندگان در ایمچ محصولات خود را برای یافتن خریداران عمده و فروش بدون واسطه ثبت می‌کنند. نردبان آگهی، امکان دیده‌شدن در صدر نتایج را می‌دهد.',
  },
];

export function SeoCards() {
  return (
    <section aria-label="درباره ایمچ" className="mx-auto max-w-7xl px-4 pb-10 lg:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <article key={c.title} className="rounded-md border bg-card p-5">
            <h3 className="mb-2.5 text-sm font-bold">{c.title}</h3>
            <p className="text-xs leading-6 text-muted-foreground">{c.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
