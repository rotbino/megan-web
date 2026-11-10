import { permanentRedirect } from 'next/navigation';

/**
 * ریدایرکت مسیر قدیمی پروفایل → کاتالوگ (خواستهٔ مالک ۱۰-۱۱ دور ۳).
 * کاتالوگ فروشنده همان صفحهٔ پروفایل اوست که حالا /c/{id} خوانده
 * می‌شود؛ لینک‌های قدیمی اشتراک‌گذاری‌شده (خارج از سایت) باید کار کنند.
 * دائمی (308) تا موتورهای جستجو canonical جدید را منتقل کنند.
 */
export default async function LegacyProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  permanentRedirect(`/c/${username}`);
}
