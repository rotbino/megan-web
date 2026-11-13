import { ProductImagesManager } from '@/components/data-import/product-images-manager';

/**
 * تصاویر آگهی‌ها — «دیتا ایمپورت → تصاویر آگهی‌ها» (خواستهٔ مالک ۱۳-۱۱):
 * آلبوم ۲۰تایی (~۲۰۰×۲۰۰) برای یافتن واترمارک باسکول + تعویض تصویر «درجا»
 * (همان نام/مسیر/URL؛ تامبنیل هم بازساخته می‌شود).
 * گارد نقش ارشد داخل DataImportShell (layout) است.
 */
export default function DataImportProductImagesPage() {
  return <ProductImagesManager />;
}
