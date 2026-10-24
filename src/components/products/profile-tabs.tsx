'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Store, Info } from 'lucide-react';
import { ProductCard } from '@/components/products/product-card';
import { toFa } from '@/lib/format';
import type { Product, User } from '@/lib/types';

/** تب‌های پروفایل فروشنده — مثل باسکول: اصلی / محصولات / درباره */
export function ProfileTabs({ user, products }: { user: User; products: Product[] }) {
  const [tab, setTab] = useState('products');
  const totalStock = products.reduce((a, p) => a + p.stock, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 lg:px-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full justify-start gap-1 rounded-md bg-secondary/50 p-1 sm:w-auto">
          <TabsTrigger value="main" className="gap-1.5 rounded-lg px-4 py-2 text-sm">اصلی</TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5 rounded-lg px-4 py-2 text-sm">
            <Package size={14} />
            محصولات ({toFa(products.length)})
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-1.5 rounded-lg px-4 py-2 text-sm">
            <Info size={14} />
            درباره
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'آگهی فعال', value: toFa(products.length) },
            { label: 'موجودی عرضه', value: `${toFa(totalStock)} ${products[0]?.unit ?? 'کیلوگرم'}` },
            { label: 'امتیاز اعتماد', value: '۴.۶ از ۵' },
          ].map((s) => (
            <div key={s.label} className="rounded-md border bg-card p-5 text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
          <div className="rounded-md border bg-card p-5 sm:col-span-3">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Store size={15} className="text-primary" /> درباره کسب‌وکار</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{user.businessDesc}</p>
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          {products.length === 0 ? (
            <p className="rounded-md border bg-card p-10 text-center text-sm text-muted-foreground">
              این فروشنده هنوز آگهی فعالی ثبت نکرده است.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          <div className="max-w-2xl rounded-md border bg-card p-6">
            <h2 className="text-sm font-bold">درباره کسب‌وکار</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{user.businessDesc}</p>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              شناسه پروفایل: <span dir="ltr" className="font-mono">{user.userName}</span> — عضویت از{' '}
              {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(user.createdAt))}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
