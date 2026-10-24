'use client';

import { ProductCard } from '@/components/products/product-card';
import { useRelatedProducts } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/types';

export function RelatedProducts({ product }: { product: Product }) {
  const { data: related = [], isLoading } = useRelatedProducts(product);

  if (!isLoading && related.length === 0) return null;

  return (
    <section aria-labelledby="related" className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h2 id="related" className="mb-5 text-xl font-extrabold">محصولات مرتبط</h2>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
