'use client';

/**
 * نمای کلی بخش «دیتا ایمپورت» — درگاه ابزارها:
 *   • کارت ایمپورتر باسکول و مدیریت کاربران ایمپورت‌شده
 *   • آمار زندهٔ دیتابیس و خلاصهٔ کاربران (منبع/ویژگی باسکول/رفتار ورود)
 *   • «مهاجرت ساختار b» — رکوردهای ایمپورت‌شدهٔ قدیمی (پیش از فیلد b) را
 *     به ساختار جدید می‌برد و activePakageType کپی‌شده از باسکول را صفر
 *     می‌کند (کاربر در آیمچ بدون پرداخت ویژه نیست — خواستهٔ مالک ۱۳-۱۱)
 */

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  DatabaseZap,
  Loader2,
  PackageSearch,
  RefreshCcw,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADMIN_PHONE, importerApi, importedUsersApi, type ImportedUsersSummary } from '@/lib/importer/client';
import { dateFa, toFa } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function DataImportOverviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [migrating, setMigrating] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['importer-stats'], queryFn: importerApi.stats });
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    // کلید با پیشوند ['imported-users'] تا با جهش‌های صفحهٔ مدیریت هم‌زمان تازه شود
    queryKey: ['imported-users', 'summary'],
    queryFn: async () => (await importedUsersApi.list({ pageSize: 5 })).summary,
  });

  const runMigration = async () => {
    setMigrating(true);
    try {
      const res = await importedUsersApi.migrateB(ADMIN_PHONE);
      toast({
        title: 'مهاجرت ساختار b انجام شد',
        description: `${toFa(res.migrated)} کاربر مهاجرت شد${
          res.premiumFixed ? ` — ${toFa(res.premiumFixed)} ویژهٔ کپی‌شدهٔ باسکول به رایگان برگشت` : ''
        }`,
      });
      await refetchSummary();
      void queryClient.invalidateQueries({ queryKey: ['imported-users'] });
    } catch (err) {
      toast({
        title: 'مهاجرت ناموفق بود',
        description: err instanceof Error ? err.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    } finally {
      setMigrating(false);
    }
  };

  const s: ImportedUsersSummary | undefined = summary;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <DatabaseZap size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">دیتا ایمپورت</h1>
            <p className="text-[11px] text-muted-foreground">
              ابزارهای مهاجرت داده از سایت‌های دیگر — فعلاً باسکول؛ ایمپورترهای بعدی هم اینجا اضافه می‌شوند
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 rounded-[10px] px-3 text-[11.5px]"
          onClick={() => void refetchSummary()}
        >
          <RefreshCcw size={13} /> به‌روزرسانی
        </Button>
      </div>

      {/* هشدار رکوردهای قدیمی بدون b */}
      {s && s.needsMigration > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3.5">
          <div className="flex items-start gap-2.5">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-[13px] font-bold text-amber-800">
                {toFa(s.needsMigration)} کاربر ایمپورت‌شدهٔ قدیمی هنوز «سند دادهٔ باسکولی (b)» ندارد
              </p>
              <p className="mt-0.5 text-[11px] leading-5 text-amber-700">
                با مهاجرت، فیلدهای پراکنده در یک سند یکپارچه جمع می‌شوند و ویژگیِ کپی‌شدهٔ باسکول (اگر باشد) از
                پروفایل آیمچ برداشته می‌شود — کاربر فقط با پرداخت واقعی در آیمچ ویژه می‌شود.
              </p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 rounded-[10px]" onClick={() => void runMigration()} disabled={migrating}>
            {migrating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {migrating ? 'در حال مهاجرت…' : 'مهاجرت ساختار b'}
          </Button>
        </div>
      )}

      {/* کارت ابزارها */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/data-import/buskool"
          className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <DatabaseZap size={20} />
            </span>
            <ArrowLeft size={16} className="text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
          </div>
          <p className="mt-3 text-sm font-extrabold">ایمپورتر باسکول</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            مهاجرت پروفایل، آواتار، آگهی‌ها و عکس‌ها از buskool.com — تک‌کاربره یا لیستی از کالکشن user-buskool
          </p>
        </Link>
        <Link
          href="/data-import/users"
          className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Users size={20} />
            </span>
            <ArrowLeft size={16} className="text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
          </div>
          <p className="mt-3 text-sm font-extrabold">مدیریت کاربران</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            کاربران ایمپورت‌شده در کنار سایر کاربران — فیلتر ویژه‌های باسکول، وضعیت ورود، علامت تماس و پاک‌سازی
            رهاشده‌ها
          </p>
        </Link>
      </div>

      {/* خلاصهٔ کاربران */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-extrabold">خلاصهٔ کاربران</h2>
        {summaryLoading && !s ? (
          <div className="grid place-items-center rounded-lg border bg-card py-10 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : s ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="کل کاربران" value={toFa(s.total)} hint={`${toFa(s.buskool)} از باسکول • ${toFa(s.native)} ثبت‌نام خودی`} />
            <StatCard label="ویژهٔ باسکول" value={toFa(s.premiumBuskool)} hint="فقط دادهٔ رفتاری — در آیمچ رایگان‌اند" />
            <StatCard label="هرگز وارد نشده" value={toFa(s.neverLoggedIn)} hint="کاندیدای پاک‌سازی سالانه" />
            <StatCard label="تماس گرفته‌شده" value={toFa(s.contacted)} hint={`${toFa(s.cameAfterContact)} نفر بعد از تماس آمدند`} />
            <StatCard label="ایمپورت ناقص" value={toFa(s.failed)} hint="پرچم failedImport" />
          </div>
        ) : null}
      </section>

      {/* آمار دیتابیس */}
      {stats ? (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold">
            <PackageSearch size={15} className="text-muted-foreground" />
            آمار دیتابیس ایمچ
            <span className="text-[10px] font-normal text-muted-foreground">تا {dateFa(new Date().toISOString())}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            <StatCard label="کاربران" value={toFa(stats.users)} />
            <StatCard label="آگهی‌ها" value={toFa(stats.products)} />
            <StatCard label="عکس‌ها" value={toFa(stats.photos)} />
            <StatCard label="نظرات" value={toFa(stats.reviews)} />
            <StatCard label="درخواست خرید" value={toFa(stats.buyRequests)} />
            <StatCard label="چت‌ها" value={toFa(stats.chats)} />
            <StatCard label="ذخیره‌شده‌ها" value={toFa(stats.savedUsers)} />
            <StatCard label="ثبت‌نام سرویس‌ها" value={toFa(stats.serviceInterests)} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
