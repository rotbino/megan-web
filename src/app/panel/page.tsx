'use client';

import Link from 'next/link';
import {
  Eye,
  Package,
  PlusCircle,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LadderBadge, OldAdBadge } from '@/components/shared/badges';
import { products } from '@/lib/mock/data';
import { stockFa, toFa } from '@/lib/format';

/** داشبورد پنل فروشنده — آمار ویترین و مدیریت آگهی‌ها (دیتای ماک کاربر اول) */
export default function PanelDashboard() {
  const myProducts = products.filter((p) => p.myuserId === 46676);
  const totalViews = myProducts.reduce((a, p) => a + p.viewCount, 0);
  const totalStock = myProducts.reduce((a, p) => a + p.stock, 0);
  const newRequests = 3; // ماک

  const stats = [
    { label: 'آگهی فعال', value: toFa(myProducts.length), icon: Package, hint: 'در ۴ دسته' },
    { label: 'بازدید کل آگهی‌ها', value: toFa(totalViews), icon: Eye, hint: '۳۰ روز گذشته' },
    { label: 'درخواست‌های جدید', value: toFa(newRequests), icon: ShoppingCart, hint: 'مناسب محصولات شما' },
    { label: 'موجودی عرضه', value: stockFa(totalStock), icon: TrendingUp, hint: 'مجموع آگهی‌ها' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">داشبورد فروشنده</h1>
          <p className="mt-1 text-sm text-muted-foreground">وضعیت ویترین و آگهی‌های شما در بازار ایمچ</p>
        </div>
        <Button asChild className="rounded-md">
          <Link href="/panel/products/new"><PlusCircle size={16} /> ثبت محصول جدید</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label} className="rounded-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              <span className="grid size-8 place-items-center rounded-sm bg-primary/10 text-primary"><Icon size={15} /></span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold">{value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle className="text-base">آگهی‌های من</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>محصول</TableHead>
                <TableHead>دسته</TableHead>
                <TableHead>موجودی</TableHead>
                <TableHead>کف قیمت</TableHead>
                <TableHead>بازدید</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold">
                    <Link href={`/product-view/${p.slug}/${p.categoryName}/${p.id}`} className="hover:text-primary">
                      {p.productName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.subCategoryName}</TableCell>
                  <TableCell>{stockFa(p.stock, p.unit)}</TableCell>
                  <TableCell>{p.minSalePrice ? `${toFa(p.minSalePrice)} تومان` : '—'}</TableCell>
                  <TableCell>{toFa(p.viewCount)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.isLadder ? <LadderBadge compact /> : <Badge variant="secondary">عادی</Badge>}
                      {p.isOld && <OldAdBadge />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
