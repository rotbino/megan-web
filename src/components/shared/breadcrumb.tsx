import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="مسیر صفحه" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {item.href ? (
              <Link href={item.href} className="hover:text-primary">{item.label}</Link>
            ) : (
              <span aria-current="page" className="font-medium text-foreground">{item.label}</span>
            )}
            {i < items.length - 1 && <ChevronLeft size={12} aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
