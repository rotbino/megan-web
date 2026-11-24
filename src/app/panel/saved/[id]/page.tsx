import { redirect } from 'next/navigation';

/**
 * مسیر قدیمی صفحهٔ پرونده (پیش از تک‌صفحه‌ای‌شدن CRM) — به پیگیری‌ها با
 * فیلتر همان پرونده ریدایرکت می‌شود تا بوکمارک‌های قدیمی کار کنند.
 */
export default async function LegacyFollowFolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/panel/saved?folder=${encodeURIComponent(id)}`);
}
