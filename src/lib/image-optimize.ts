/**
 * بهینه‌سازی تصویر سمت کلاینت (خواسته مهم مالک):
 *  • عرض حداکثر ۱۲۰۰px — طول به‌تناسب کم می‌شود (کیفیت حفظ می‌شود).
 *  • اگر حجم بعد از کوچک‌شدن از ۵۰۰KB بیشتر باشد، کیفیت پله‌ای کم می‌شود
 *    تا زیر سقف بیاید — هر پله فقط ~۷٪ افت تا عکس زیاد خراب نشود.
 *  • خروجی همیشه JPEG (عکس‌های گالری آگهی همین قواعد را دارند).
 *
 * چرا کلاینت؟ عکس چند-مگابایتی اصلاً آپلود نمی‌شود → پهنای باند کاربر و
 * پردازش سرور هر دو ذخیره می‌شوند. بک‌اند هم همین منطق را با sharp به‌عنوان
 * شبکه ایمنی اجرا می‌کند (اگر کلاینت به هر دلیلی نتوانست).
 */

export const IMAGE_MAX_WIDTH = 1200;
export const IMAGE_MAX_BYTES = 500 * 1024; // ۵۰۰KB

/** decode + رزایز با canvas — EXIF جهت را مرورگرهای مدرن خودشان رعایت می‌کنند */
async function resizeToBlob(file: Blob, maxWidth: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas context unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality,
      );
    });
  } finally {
    bitmap.close();
  }
}

/**
 * بهینه‌سازی برای گالری آگهی — فایل کوچک/سبک دست‌نخورده برمی‌گردد
 * (زیر ۲۰KB اصلاً فشرده نمی‌کنیم چون سمت بک رد می‌شود).
 * خروجی همیشه نوع image/jpeg دارد (قاعده گالری).
 */
export async function optimizeProductImage(file: File): Promise<File> {
  // فقط jpeg ورودی می‌پذیریم — غیر آن را بدون تغییر رد کن (فرانت قبلاً فیلتر می‌کند)
  const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
  const alreadySmall = file.size <= IMAGE_MAX_BYTES;
  const smallEnoughWidth = await isWidthWithin(file, IMAGE_MAX_WIDTH);

  if (!isJpeg || (alreadySmall && smallEnoughWidth)) {
    return file;
  }

  // پله‌های کیفیت — از بهترین شروع، هر بار ~۷٪ کمتر
  const qualityLadder = [0.85, 0.8, 0.74, 0.68, 0.62, 0.56, 0.5, 0.44];
  let best: Blob | null = null;
  for (const q of qualityLadder) {
    best = await resizeToBlob(file, IMAGE_MAX_WIDTH, q);
    if (best.size <= IMAGE_MAX_BYTES) break;
  }
  if (!best) return file; // مرورگر canvas ندارد — فایل اصلی

  // اگر باز هم بزرگ بود، عرض را هم پله‌ای کم کن (آخرین راه)
  if (best.size > IMAGE_MAX_BYTES) {
    for (const w of [1000, 850, 700, 560]) {
      best = await resizeToBlob(file, w, 0.6);
      if (best.size <= IMAGE_MAX_BYTES) break;
    }
  }
  if (!best || best.size >= file.size) return file; // بهینه‌سازی کمکی نکرد

  const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([best], `${name}.jpg`, { type: 'image/jpeg' });
}

/** آیا عرض تصویر از حد مجاز کمتر است؟ (بدون خطا → false، یعنی نیاز به رزایز) */
async function isWidthWithin(file: Blob, maxWidth: number): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    const ok = bitmap.width <= maxWidth;
    bitmap.close();
    return ok;
  } catch {
    return false;
  }
}

/** حجم خوانا — «۸۱۲ کیلوبایت» / «۱٫۲ مگابایت» */
export function humanSizeFa(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number(mb.toFixed(1)).toLocaleString('fa-IR')} مگابایت`;
  }
  return `${Math.round(bytes / 1024).toLocaleString('fa-IR')} کیلوبایت`;
}
