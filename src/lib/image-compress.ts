/**
 * فشرده‌سازی تصویر سمت کلاینت — رفع ریشهٔ گزارش مالک ۱۰-۱۱ (MULTIPART_TRUNCATED):
 * عکس‌های موبایل ۴ تا ۸ مگابایت بودند و مجموع بدنهٔ multipart مدارک احراز (تا ۴
 * فایل) از سقف بافر پروکسی dev نکست می‌گذشت؛ استریم ناقص به بک‌اند می‌رسید و
 * busboy خطای «آپلود ناقص» می‌داد. سقف پروکسی در next.config بالا برده شد و
 * این‌جا علاوه بر آن، تصویرها قبل از ارسال بازفشرده می‌شوند — ارسال سریع‌تر و
 * پایدارتر روی شبکهٔ ضعیف موبایل.
 *
 * متن کارت ملی با حداکثر ضلع ۱۸۰۰px و کیفیت ۰.۸۵ کاملاً خوانا می‌ماند
 * (کف حجم ۴KB پارسِ فرم هم همیشه برقرار است). فایل‌های کوچک دست نمی‌خورند.
 */

export interface CompressOptions {
  /** حداکثر ضلع تصویر خروجی — پیش‌فرض ۱۸۰۰ (مدارک) */
  maxEdge?: number;
  /** کیفیت JPEG — پیش‌فرض ۰.۸۵ */
  quality?: number;
  /** فایل‌های کوچک‌تر از این حد بازفشرده نمی‌شوند — پیش‌فرض ۱.۲MB */
  skipBelow?: number;
}

/** بازفشرده‌سازی تصویر — در هر خطا فایل اصلی برگردده می‌شود (fail-open) */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxEdge = 1800, quality = 0.85, skipBelow = 1_200_000 } = opts;
  if (file.size < skipBelow) return file;
  if (typeof createImageBitmap !== 'function') return file; // مرورگر قدیمی
  try {
    // from-image: چرخش EXIF (عکس‌های آیفون) لحاظ می‌شود
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    // فشرده‌سازی سودی نداشت یا شکست خورد → فایل اصلی
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
