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
 * مسیر ریشه → برگ برای یک slug یا نام دسته (برای BreadcrumbList و عنوان صفحه).
 * مثال: [کشاورزی، خشکبار، پسته] — URLهای باسکول‌گونه هم با نام کار می‌کنند.
 */
export function findCategoryPath(tree: Category[], slugOrName: string): Category[] | null {
  const path: Category[] = [];
  const walk = (nodes: Category[]): boolean => {
    for (const n of nodes) {
      path.push(n);
      if (n.slug === slugOrName || n.categoryName === slugOrName) return true;
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
