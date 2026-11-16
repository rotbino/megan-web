import { BuyRequestsSkeleton } from '@/components/shared/page-skeletons';

/** لودینگ صفحه‌بندی درخواست‌های خرید */
export default function Loading() {
  return (
    <main className="flex-1">
      <BuyRequestsSkeleton />
    </main>
  );
}
