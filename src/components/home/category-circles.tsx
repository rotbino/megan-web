'use client';

import Link from 'next/link';
import { ChevronLeft, Sprout, UtensilsCrossed, Factory, Wrench, Building2, Tv, Shirt, Footprints, Dumbbell, Sparkles, Boxes, type LucideIcon } from 'lucide-react';
import { useCategoryTree } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';

const GLYPHS: LucideIcon[] = [Sprout, UtensilsCrossed, Factory, Wrench, Building2, Tv, Shirt, Footprints, Dumbbell, Sparkles];

/** دسته‌های اصلی به‌سبک باسکول — کارت‌های دایره‌ای، مدرن‌تر */
export function CategoryCircles() {
  const { data: tree, isLoading } = useCategoryTree();
  const roots = (tree ?? []).filter((c) => (c.children?.length ?? 0) > 0);

  return (
    <section aria-labelledby="main-cats" className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-6 flex items-end justify-between">
        <h2 id="main-cats" className="text-xl font-extrabold sm:text-2xl">دسته‌بندی‌های اصلی</h2>
        <Link href="/product-list" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          همه محصولات
          <ChevronLeft size={16} />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {roots.map((c, i) => {
            const Glyph = GLYPHS[i % GLYPHS.length] ?? Boxes;
            return (
              <Link
                key={c.id}
                href={`/product-list/category/${c.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/15 to-emerald-100 text-primary ring-1 ring-primary/15 transition-transform group-hover:scale-105 sm:size-20">
                  <Glyph size={26} strokeWidth={1.8} />
                </span>
                <span className="text-xs font-bold leading-5 sm:text-sm">{c.categoryName}</span>
                <span className="text-[10px] text-muted-foreground">{c.children?.length ?? 0} زیرشاخه</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
