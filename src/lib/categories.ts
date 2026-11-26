import type { Category } from '@/lib/types';

/** همهٔ نودها به‌صورت مسطح (با والدشان در children) */
function flatten(tree: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (nodes: Category[]) => {
    for (const n of nodes) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(tree);
  return out;
}

/**
 * مسیر ریشه → برگ برای یک slug/کلید (برای BreadcrumbList و عنوان صفحه).
 * (۲۶-۱۱) درخت عمومی = تاکسونومی v2 — slug گره همان کلید v2 است و تطبیق
 * فقط با کلید انجام می‌شود؛ نام‌های فارسی کهنه (باسکول) هرگز این‌جا
 * resolve نمی‌شوند تا صفحهٔ دسته بتواند ریدایرکت دائمی بزند.
 */
export function findCategoryPath(tree: Category[], slug: string): Category[] | null {
  const path: Category[] = [];
  const walk = (nodes: Category[]): boolean => {
    for (const n of nodes) {
      path.push(n);
      if (n.slug === slug) return true;
      if (n.children?.length && walk(n.children)) return true;
      path.pop();
    }
    return false;
  };
  if (walk(tree)) return path;
  return null;
}

/** جستجوی یک نود با slug از درخت مسطح */
export function findCategoryBySlugTree(tree: Category[], slug: string): Category | null {
  return flatten(tree).find((c) => c.slug === slug) ?? null;
}

/** مسیر ریشه → نود برای یک id — ناوبری خریداران (دسکتاپ/بات‌شیت موبایل) */
export function findCategoryPathById(tree: Category[], id: number): Category[] | null {
  const path: Category[] = [];
  const walk = (nodes: Category[]): boolean => {
    for (const n of nodes) {
      path.push(n);
      if (n.id === id) return true;
      if (n.children?.length && walk(n.children)) return true;
      path.pop();
    }
    return false;
  };
  return walk(tree) ? path : null;
}
