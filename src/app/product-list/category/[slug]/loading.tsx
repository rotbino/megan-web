import { ProductListSkeleton } from '@/components/shared/page-skeletons';

/** لودینگ تغییر پارامتر همین سگمنت (دسته/صفحه/جستجو) — اسکلت همان لحظه */
export default function Loading() {
  return (
    <main className="flex-1">
      <ProductListSkeleton />
    </main>
  );
}
