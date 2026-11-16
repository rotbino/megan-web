import { BuyRequestsSkeleton } from '@/components/shared/page-skeletons';

/** لودینگ ناوبری درخواست‌های خرید — کارت‌های ردیفی جای خالی را پر می‌کنند */
export default function Loading() {
  return (
    <main className="flex-1">
      <BuyRequestsSkeleton />
    </main>
  );
}
