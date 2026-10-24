import Link from 'next/link';
import { Store } from 'lucide-react';

/** بنر «ثبت فروشگاه» — همان متن باسکول */
export function RegisterBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="flex flex-col items-center justify-between gap-5 rounded-md border bg-secondary/50 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-md bg-card text-primary ring-1 ring-border">
            <Store size={26} strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-base font-bold sm:text-lg">همین حالا فروشگاه آنلاین خود را بسازید!</p>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground sm:text-sm">
              محصولات خود را در ایمچ ثبت کنید و خریداران را به ویترین خود جذب کنید.
            </p>
          </div>
        </div>
        <Link
          href="/register"
          className="shrink-0 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep"
        >
          ثبت فروشگاه
        </Link>
      </div>
    </section>
  );
}
