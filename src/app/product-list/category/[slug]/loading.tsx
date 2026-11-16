import { ListingColumnSkeleton } from '@/components/shared/page-skeletons';

/**
 * لودینگ ناوبری بین دسته‌ها (تغییر پارامتر همین سگمنت) — فقط ستون لیست
 * اسکلت می‌گیرد؛ هدر/فوتر از layout بالاتر و سایدبار فیلترها از layout
 * همین سگمنت می‌آیند و سر جایشان می‌مانند (خواستهٔ مالک ۱۷-۱۱).
 */
export default function Loading() {
  return <ListingColumnSkeleton />;
}
