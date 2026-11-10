'use client';

import { useEffect } from 'react';
import { logActivity } from '@/lib/activity';

/**
 * ثبت انتخاب دسته از سایدبار — روی صفحه /product-list/category/[slug].
 * دسته‌ی فعال از prop سرور می‌آید (نه از URL کلاینت) — دقیق و بدون پارس مسیر.
 */
export function CategoryViewPing({ categoryName }: { categoryName: string }) {
  useEffect(() => {
    if (!categoryName) return;
    logActivity(
      { type: 'category_view', categoryName },
      `c:${categoryName}`,
    );
  }, [categoryName]);
  return null;
}
