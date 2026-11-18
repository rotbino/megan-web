import { ProductImagesManager } from '@/components/data-import/product-images-manager';

/**
 * تصاویر آگهی‌ها — «دیتا ایمپورت → تصاویر آگهی‌ها» (خواستهٔ مالک ۱۳-۱۱؛
 * بازطراحی کامل ۱۹-۱۱ «فقط تصاویر»): به‌جای کارت‌های آگهی، فقط خودِ تصاویر
 * از جدول فایل‌ها — نه عنوان و نه هیچ دادهٔ دیگری. زیر هر تصویر: شناسهٔ
 * فایل + سوییچ «واترمارک» (مرحلهٔ ۱ شکار واترمارک) — تیک ادمین یعنی این
 * تصویر واترمارک دارد → File.hasWatermark ترو می‌شود؛ با فیلتر، لیست
 * علامت‌خورده‌ها برای کار پاک‌سازی (مرحلهٔ بعد) یک‌جا جدا می‌شود.
 * گارد نقش ارشد داخل DataImportShell (layout) است.
 */
export default function DataImportProductImagesPage() {
  return <ProductImagesManager />;
}
