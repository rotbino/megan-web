import { ProductImagesManager } from '@/components/data-import/product-images-manager';

/**
 * تصاویر آگهی‌ها — «دیتا ایمپورت → تصاویر آگهی‌ها» (خواستهٔ مالک ۱۳-۱۱؛
 * بازطراحی ۱۶-۱۱ عصر): هر آگهی یک کارت با «همهٔ» عکس‌هایش (۳۰۰×۳۰۰) برای
 * یافتن واترمارک باسکول + تعویض تصویر «درجا» (همان نام/مسیر/URL؛ تامبنیل هم
 * بازساخته می‌شود) — هیچ عکسی از قلم نمی‌افتد.
 * گارد نقش ارشد داخل DataImportShell (layout) است.
 */
export default function DataImportProductImagesPage() {
  return <ProductImagesManager />;
}
