import { ProductListSkeleton } from '@/components/shared/page-skeletons';

/**
 * لودینگ ناوبری /product-list و همهٔ زیرمسیرهایش (دسته/جستجو/صفحه‌بندی) —
 * کلیک همان لحظه اسکلت نشان می‌دهد، دیتا در همان‌جا استریم می‌شود (خواستهٔ
 * مالک ۱۷-۱۱: مکث اگر هست باید «لودینگ کالاها در صفحه» باشد نه گیر روی نود).
 */
export default function Loading() {
  return (
    <main className="flex-1">
      <ProductListSkeleton />
    </main>
  );
}
