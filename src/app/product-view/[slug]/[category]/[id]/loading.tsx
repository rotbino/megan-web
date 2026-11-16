import { ProductViewSkeleton } from '@/components/shared/page-skeletons';

/** لودینگ ناوبری صفحهٔ جزئیات آگهی — گالری + اطلاعات با اسکلت استریم می‌شود */
export default function Loading() {
  return (
    <main className="flex-1">
      <ProductViewSkeleton />
    </main>
  );
}
