import { ProductListSkeleton } from '@/components/shared/page-skeletons';

/**
 * لودینگ ناوبری /product-list و زیرمسیرهای بدون loading اختصاصی —
 * هدر/فوتر از layout می‌آیند و پایدارند؛ اسکلتِ محتوا زیر آن‌ها
 * (خواستهٔ مالک ۱۷-۱۱: مکث اگر هست باید «لودینگ کالاها در صفحه» باشد).
 */
export default function Loading() {
  return <ProductListSkeleton />;
}
