import Link from 'next/link';
import { ChevronLeft, Home } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export interface Crumb {
  label: string;
  href?: string;
}

interface ArticleLayoutProps {
  title: string;
  intro?: string;
  crumbs: Crumb[];
  children: React.ReactNode;
}

/**
 * لی‌اوت مقاله راهنما — همان ساختار باسکول:
 * breadcrumb وسط‌چین، عنوان درشت وسط، بدنه تک‌ستونی max-w-3xl، بدون سایدبار.
 */
export function ArticleLayout({ title, intro, crumbs, children }: ArticleLayoutProps) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
          {/* breadcrumb */}
          <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-primary">
              <Home size={12} /> صفحه اصلی
            </Link>
            {crumbs.map((c) => (
              <span key={c.label} className="flex items-center gap-1">
                <ChevronLeft size={12} className="text-muted-foreground/50" />
                {c.href ? (
                  <Link href={c.href} className="transition-colors hover:text-primary">{c.label}</Link>
                ) : (
                  <span className="text-foreground/80">{c.label}</span>
                )}
              </span>
            ))}
          </nav>

          {/* عنوان مقاله — عین بنر عنوان باسکول */}
          <header className="mt-5 rounded-lg border border-primary/25 bg-primary/5 px-4 py-6 text-center">
            <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
            {intro && <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-muted-foreground sm:text-sm">{intro}</p>}
          </header>

          {/* بدنه */}
          <div className="mt-8 space-y-8">{children}</div>
        </article>
      </main>
      <Footer />
    </>
  );
}

/** تیتر بخش — با خط عمودی برند مثل باسکول */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-base font-extrabold">
      <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
      {children}
    </h2>
  );
}

/** پاراگراف بدنه */
export function ArticleP({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-8 text-foreground/90">{children}</p>;
}

/** شماره‌دار مراحل — عنوان بولد + متن، مثل باسکول */
export function StepItem({ n, title, children }: { n: string | number; title: string; children?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-extrabold">
        <span className="me-2 inline-flex size-6 translate-y-0.5 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">{n}</span>
        {title}
      </h3>
      {children && <div className="space-y-2 ps-8">{children}</div>}
    </section>
  );
}

/** جعبه نکته/تذکر — بوردر برند + پس‌زمینه ملایم، مثل باسکول */
export function TipBox({ title, tone = 'brand', children }: { title?: string; tone?: 'brand' | 'warn'; children: React.ReactNode }) {
  return (
    <aside
      className={
        tone === 'warn'
          ? 'rounded-lg border border-amber-300/70 bg-amber-50/70 p-4'
          : 'rounded-lg border border-primary/30 bg-primary/5 p-4'
      }
    >
      {title && (
        <p className={tone === 'warn' ? 'text-xs font-extrabold text-amber-800' : 'text-xs font-extrabold text-primary'}>{title}</p>
      )}
      <div className={tone === 'warn' ? 'mt-1.5 space-y-1.5 text-xs leading-6 text-amber-900/90' : 'mt-1.5 space-y-1.5 text-xs leading-6 text-foreground/85'}>
        {children}
      </div>
    </aside>
  );
}

/** تصویر راهنما با کپشن — قاب بوردر + سایه ملایم */
export function Figure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="space-y-2">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        loading="lazy"
      />
      {caption && <figcaption className="text-center text-[11px] text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

/** لیست بولت‌دار راهنما */
export function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-7 text-foreground/90">
          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
