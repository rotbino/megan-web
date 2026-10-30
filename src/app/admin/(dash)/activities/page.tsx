'use client';

/**
 * فعالیت کاربران (پنل ادمین — خواسته مالک ۳۰-۱۰):
 *  • تب‌های نوع فعالیت: همه / جستجوها / انتخاب دسته / بازدید صفحات
 *  • جدول رویدادها: زمان، نوع، کاربر (نام/موبایل یا «مهمان»)، جزئیات
 *  • کارت‌های آمار + پربازدیدهای جستجو/دسته/صفحه
 * ثبت سمت فرانت: SearchPing / CategoryViewPing / PageViewPing → /activity/log
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileQuestion,
  Loader2,
  MousePointerClick,
  Search,
  Users,
} from 'lucide-react';
import {
  fetchAdminActivities,
  fetchAdminActivityStats,
  type AdminActivityType,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const TYPE_TABS: Array<{ key: AdminActivityType | 'all'; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'search', label: 'جستجوها' },
  { key: 'category_view', label: 'انتخاب دسته' },
  { key: 'page_view', label: 'بازدید صفحات' },
];

const TYPE_LABEL: Record<AdminActivityType, string> = {
  search: 'جستجو',
  category_view: 'انتخاب دسته',
  page_view: 'بازدید صفحه',
};

const TYPE_STYLE: Record<AdminActivityType, string> = {
  search: 'bg-blue-50 text-blue-700',
  category_view: 'bg-emerald-50 text-emerald-700',
  page_view: 'bg-amber-50 text-amber-700',
};

/** رندر جزئیات هر رویداد بر اساس نوع */
function ActivityDetail({ a }: { a: { type: AdminActivityType; q: string | null; categoryName: string | null; path: string | null } }) {
  if (a.type === 'search') return <span className="font-bold">«{a.q ?? '—'}»</span>;
  if (a.type === 'category_view') return <span className="font-bold">{a.categoryName ?? '—'}</span>;
  return <span dir="ltr" className="font-medium text-muted-foreground">{a.path ?? '—'}</span>;
}

export default function AdminActivitiesPage() {
  const [tab, setTab] = useState<AdminActivityType | 'all'>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['admin-activities', tab, q, page],
    queryFn: () =>
      fetchAdminActivities({
        type: tab === 'all' ? undefined : tab,
        q: q.trim() || undefined,
        page,
        perPage: 25,
      }),
  });

  const statsQuery = useQuery({
    queryKey: ['admin-activities-stats'],
    queryFn: fetchAdminActivityStats,
  });

  const stats = statsQuery.data;
  const list = listQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* سربرگ */}
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Activity size={18} />
        </span>
        <div>
          <h1 className="text-base font-extrabold">فعالیت کاربران</h1>
          <p className="text-[11px] text-muted-foreground">
            جستجوها، دسته‌های انتخاب‌شده و صفحات بازدید‌شده — ثبت زنده از سایت
          </p>
        </div>
      </div>

      {/* کارت‌های آمار */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Activity, label: 'کل رویدادها', value: stats?.total },
          { icon: MousePointerClick, label: 'رویداد ۲۴ ساعت اخیر', value: stats?.today },
          { icon: Users, label: 'بازدیدکننده یکتا (۲۴س)', value: stats?.uniqueToday },
          { icon: Search, label: 'جستجوها', value: stats?.types.search },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon size={15} className="text-primary" />
              <p className="text-[11px]">{label}</p>
            </div>
            {statsQuery.isLoading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="font-num mt-1.5 text-xl font-extrabold">{toFa(value ?? 0)}</p>
            )}
          </div>
        ))}
      </div>

      {/* پربازدیدها */}
      {stats && !statsQuery.isLoading && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold">
              <Search size={13} className="text-primary" /> پرتکرارترین جستجوها
            </p>
            <ul className="mt-2 space-y-1.5">
              {stats.topSearches.length === 0 && <li className="text-[11px] text-muted-foreground">هنوز جستجویی ثبت نشده.</li>}
              {stats.topSearches.map((s) => (
                <li key={s.q} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">«{s.q}»</span>
                  <span className="font-num shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {toFa(s.count)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold">
              <Eye size={13} className="text-primary" /> پرانتخاب‌ترین دسته‌ها
            </p>
            <ul className="mt-2 space-y-1.5">
              {stats.topCategories.length === 0 && <li className="text-[11px] text-muted-foreground">هنوز دسته‌ای انتخاب نشده.</li>}
              {stats.topCategories.map((c) => (
                <li key={c.categoryName} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{c.categoryName}</span>
                  <span className="font-num shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {toFa(c.count)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold">
              <FileQuestion size={13} className="text-primary" /> پربازدیدترین صفحات
            </p>
            <ul className="mt-2 space-y-1.5">
              {stats.topPages.length === 0 && <li className="text-[11px] text-muted-foreground">هنوز صفحه‌ای بازدید نشده.</li>}
              {stats.topPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-2 text-xs">
                  <span dir="ltr" className="truncate text-muted-foreground">{p.path}</span>
                  <span className="font-num shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {toFa(p.count)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* تب‌های نوع */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
              tab === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* جستجو */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="جستجو در متن جستجو / دسته / مسیر…"
          className="rounded-md pe-9"
        />
      </div>

      {/* جدول رویدادها */}
      <div className="overflow-hidden rounded-lg border bg-card">
        {listQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-md" />
            ))}
          </div>
        ) : !list || list.items.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {q.trim() ? 'رویدادی با این عبارت پیدا نشد.' : 'هنوز فعالیتی ثبت نشده است.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                  <th className="px-3 py-2.5 text-right font-medium">زمان</th>
                  <th className="px-2 py-2.5 text-right font-medium">نوع</th>
                  <th className="px-2 py-2.5 text-right font-medium">جزئیات</th>
                  <th className="hidden px-2 py-2.5 text-right font-medium md:table-cell">کاربر</th>
                  <th className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">موبایل</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-secondary/30">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{dateFa(a.createdAt)}</td>
                    <td className="px-2 py-2.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', TYPE_STYLE[a.type])}>
                        {TYPE_LABEL[a.type]}
                      </span>
                    </td>
                    <td className="max-w-[16rem] px-2 py-2.5 text-xs">
                      <ActivityDetail a={a} />
                    </td>
                    <td className="hidden px-2 py-2.5 text-xs md:table-cell">
                      {a.isGuest ? (
                        <span className="text-muted-foreground">مهمان</span>
                      ) : a.user ? (
                        <span className="font-medium">
                          {a.user.firstName} {a.user.lastName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="font-num hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell" dir="ltr">
                      {a.user?.phone ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* صفحه‌بندی */}
      {list && list.pageCount > 1 && (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="صفحه قبل"
          >
            <ChevronRight size={16} />
          </Button>
          <span className="font-num px-2 text-xs text-muted-foreground">
            {toFa(page)} از {toFa(list.pageCount)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= list.pageCount}
            onClick={() => setPage((p) => p + 1)}
            aria-label="صفحه بعد"
          >
            <ChevronLeft size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
