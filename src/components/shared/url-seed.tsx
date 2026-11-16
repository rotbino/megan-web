'use client';

import { useEffect } from 'react';
import { readUrlFilters } from '@/lib/list-nav';

/**
 * seed فیلترهای URL بعد از هیدریشن (خواستهٔ مالک ۱۷-۱۱ دور ۲) — عین الگوی
 * SearchBridge/MatchBridge: صفحه‌ها ایستا رندر می‌شوند و پارامترهای
 * ?province= &city= &sort=newest را نمی‌بینند؛ این برگهٔ نامرئی یک‌بار هنگام
 * mount مقدارها را از URL می‌خواند و از طریق callback به state می‌رساند —
 * بدون setState مستقیم در effect و بدون تغییر رندر ایستا (سئو سالم).
 *
 * فقط همین یک‌بار خوانده می‌شود؛ بعد از آن تغییر فیلترها خودشان state و URL
 * را هم‌زمان به‌روز می‌کنند (writeUrlFilters با replaceState — بدون ناوبری).
 */
export function UrlFilterSeed({
  onSeed,
}: {
  onSeed: (v: { provinceId?: number; cityId?: number; sort?: 'newest' }) => void;
}) {
  useEffect(() => {
    onSeed(readUrlFilters());
    // seed فقط هنگام mount — عمداً بدون وابستگی
  }, []);
  return null;
}
