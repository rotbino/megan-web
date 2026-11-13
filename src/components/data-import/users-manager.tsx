'use client';

/**
 * مدیریت کاربران ایمپورت‌شده — صفحهٔ «دیتا ایمپورت → مدیریت کاربران»
 * (خواستهٔ مالک ۱۳-۱۱). محیط کنترل رفتار کاربران ایمپورت‌شده از باسکول
 * در کنار سایر کاربران:
 *
 *   • فیلترها: منبع (باسکول/خودی/کمکی)، ویژهٔ باسکول + نوع بسته، وضعیت
 *     ورود (هرگز/بعد از تماس)، علامت تماس، ایمپورت ناقص، «رهاشده»
 *     (هرگز وارد نشده + بیش از N روز از ایمپورت) — پایهٔ پاک‌سازی سالانه.
 *   • سورت صعودی/نزولی روی آخرین ورود، ثبت‌نام، تعداد آگهی، تاریخ باسکول،
 *     ایمپورت و تماس + صفحه‌بندی.
 *   • جزئیات کامل هر کاربر: مشخصات، سند رفتار باسکول (b)، شمارنده‌ها و
 *     آگهی‌ها + باز کردن کاتالوگ عمومی.
 *   • CRM: علامت «تماس گرفتم و دعوتش کردم» (b.contactedAt).
 *   • حذف کامل انتخاب‌شده‌ها با همهٔ داده‌ها و عکس‌ها (خطرناک — گارد ادمین).
 *
 * ⚠️ ویژهٔ باسکول فقط «دادهٔ رفتاری» است — در آیمچ هیچ کاربری بدون پرداخت
 * ویژه نیست؛ این صفحه همان‌جاست که بعداً ویژه‌های سابق باسکول را پیدا و
 * برای خرید بسته دعوت می‌کنیم.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  Eye,
  Loader2,
  RefreshCcw,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ADMIN_PHONE,
  API_BASE,
  importedUsersApi,
  type ImportedUserDetail,
  type ImportedUserRow,
  type ImportedUsersParams,
} from '@/lib/importer/client';
import { dateFa, priceFa, timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

// ─── ثابت‌های نمایش ─────────────────────────────────────────────────────────

const PKG_LABELS = ['رایگان', 'دوماهه', 'شش‌ماهه', 'یک‌ساله'];
const ANY = '__any__';

function imgSrc(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

function fullName(u: { firstName: string; lastName: string; userName: string }): string {
  const n = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return n || `@${u.userName}`;
}

/** چیپ منبع کاربر — باسکول / ثبت‌نام خودی / کمکی(کامنت) */
function SourceChip({ row }: { row: ImportedUserRow }) {
  if (row.bUserName) {
    return (
      <Badge className="bg-primary-soft font-bold text-primary hover:bg-primary-soft" title={`@${row.bUserName} در باسکول`}>
        از باسکول
      </Badge>
    );
  }
  if (row.isStub) {
    return <Badge variant="secondary" className="font-bold text-muted-foreground">کمکی</Badge>;
  }
  return <Badge variant="outline" className="font-bold text-muted-foreground">ثبت‌نام خودی</Badge>;
}

/** چیپ بستهٔ باسکول — ویژه‌های سابق باسکول (نه اعتبار آیمچ) */
function BuskoolPackageChip({ row }: { row: ImportedUserRow }) {
  // کاربر بومی اصلاً باسکولی نیست — خط تیره؛ فقط رکورد قدیمیِ باسکولی «قدیمی» است
  if (!row.b) return row.bUserName ? <span className="text-[10px] text-muted-foreground">قدیمی</span> : <span className="text-[10px] text-muted-foreground">—</span>;
  const { premium } = row.b;
  if (!premium.isPremium) {
    return <span className="text-[11px] text-muted-foreground">رایگان</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600"
      title={`بستهٔ ${premium.packageTitle} در باسکول — در آیمچ رایگان است تا خودش پرداخت کند`}
    >
      <Crown size={11} />
      {premium.packageTitle}
    </span>
  );
}

// ═══════════════════════════════ صفحه ═══════════════════════════════

export function UsersManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── فیلترها ──
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [source, setSource] = useState<string>('all');
  const [premium, setPremium] = useState<string>(ANY);
  const [packageType, setPackageType] = useState<string>(ANY);
  const [login, setLogin] = useState<string>(ANY);
  const [contacted, setContacted] = useState<string>(ANY);
  const [failed, setFailed] = useState<string>(ANY);
  const [staleDays, setStaleDays] = useState<string>(ANY);
  const [sort, setSort] = useState<string>('lastLogin');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ── انتخاب و دیالوگ‌ها ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const params: ImportedUsersParams = useMemo(
    () => ({
      ...(debounced ? { q: debounced } : {}),
      ...(source !== 'all' ? { source: source as ImportedUsersParams['source'] } : {}),
      ...(premium !== ANY ? { premium: premium as 'yes' | 'no' } : {}),
      ...(packageType !== ANY ? { packageType: Number(packageType) } : {}),
      ...(login !== ANY ? { login: login as ImportedUsersParams['login'] } : {}),
      ...(contacted !== ANY ? { contacted: contacted as 'yes' | 'no' } : {}),
      ...(failed !== ANY ? { failed: failed as 'yes' | 'no' } : {}),
      ...(staleDays !== ANY ? { staleDays: Number(staleDays) } : {}),
      sort: sort as ImportedUsersParams['sort'],
      dir,
      page,
      pageSize,
    }),
    [debounced, source, premium, packageType, login, contacted, failed, staleDays, sort, dir, page],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['imported-users', params],
    queryFn: () => importedUsersApi.list(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const pageCount = data?.pageCount ?? 1;

  // ── انتخاب چندتایی ──
  const pageIds = rows.map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── جهش‌ها (mutate) ──
  const contactMutation = useMutation({
    mutationFn: ({ id, undo }: { id: string; undo: boolean }) => importedUsersApi.markContacted(id, undo),
    onSuccess: (res) => {
      toast({
        title: res.contactedAt ? 'علامت تماس ثبت شد' : 'علامت تماس برداشته شد',
        description: res.contactedAt ? `زمان: ${dateFa(res.contactedAt)}` : undefined,
      });
      void queryClient.invalidateQueries({ queryKey: ['imported-users'] });
    },
    onError: (err) => {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => importedUsersApi.remove(ids, ADMIN_PHONE),
    onSuccess: (res) => {
      toast({
        title: `${toFa(res.deleted)} کاربر با همهٔ داده‌ها حذف شد`,
        description: res.failed ? `${toFa(res.failed)} مورد ناموفق — جزئیات در لاگ` : undefined,
        variant: res.failed ? 'destructive' : undefined,
      });
      setSelected(new Set());
      setDeleteIds(null);
      void queryClient.invalidateQueries({ queryKey: ['imported-users'] });
    },
    onError: (err) => {
      toast({ title: 'حذف ناموفق بود', description: err instanceof Error ? err.message : 'خطای نامشخص', variant: 'destructive' });
    },
  });

  const resetFilters = () => {
    setSearch('');
    setSource('all');
    setPremium(ANY);
    setPackageType(ANY);
    setLogin(ANY);
    setContacted(ANY);
    setFailed(ANY);
    setStaleDays(ANY);
    setSort('lastLogin');
    setDir('desc');
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Users size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">مدیریت کاربران</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} کاربر مطابق فیلترها` : 'کنترل رفتار کاربران ایمپورت‌شده در کنار سایر کاربران'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading ? <Loader2 size={15} className="animate-spin text-muted-foreground" /> : null}
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 rounded-[10px] px-3 text-[11.5px]"
            onClick={() => void refetch()}
          >
            <RefreshCcw size={13} /> به‌روزرسانی
          </Button>
        </div>
      </div>

      {/* کارت‌های آماری */}
      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'کل', value: summary.total, hint: 'همهٔ کاربران' },
            { label: 'از باسکول', value: summary.buskool, hint: 'ایمپورت‌شده' },
            { label: 'ثبت‌نام خودی', value: summary.native, hint: 'خودشان آمده‌اند' },
            { label: 'ویژهٔ باسکول', value: summary.premiumBuskool, hint: 'کاندیدای دعوت به پرداخت', accent: true },
            { label: 'بعد از تماس آمدند', value: summary.cameAfterContact, hint: `از ${toFa(summary.contacted)} تماس‌گرفته` },
            { label: 'هرگز وارد نشده', value: summary.neverLoggedIn, hint: summary.failed ? `+ ${toFa(summary.failed)} ایمپورت ناقص` : 'کاندیدای پاک‌سازی' },
          ].map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setPage(1)}
              className={cn(
                'rounded-lg border bg-card p-2.5 text-start transition-colors hover:border-primary/40',
                c.accent && 'border-amber-300/70 bg-amber-50/50',
              )}
              title={c.hint}
            >
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
              <p className={cn('mt-0.5 text-base font-extrabold tabular-nums', c.accent && 'text-amber-600')}>
                {toFa(c.value)}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {/* هشدار مهاجرت b */}
      {summary && summary.needsMigration > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3.5 py-2.5">
          <p className="flex items-center gap-2 text-[12px] font-bold text-amber-800">
            <AlertTriangle size={15} />
            {toFa(summary.needsMigration)} کاربر قدیمی هنوز سند دادهٔ باسکولی (b) ندارد
          </p>
          <Button asChild size="sm" variant="outline" className="h-7 rounded-md text-[11px]">
            <Link href="/data-import">اجرای مهاجرت در نمای کلی</Link>
          </Button>
        </div>
      )}

      {/* فیلترها */}
      <div className="space-y-2.5 rounded-lg border bg-card p-3">
        <div className="relative">
          <Search size={15} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو: شماره موبایل، نام، شناسه یا یوزرنیم باسکول…"
            className="h-9 rounded-md pe-9"
            maxLength={60}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[130px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همهٔ منابع</SelectItem>
              <SelectItem value="buskool">از باسکول</SelectItem>
              <SelectItem value="native">ثبت‌نام خودی</SelectItem>
              <SelectItem value="stub">کمکی (کامنت)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={premium} onValueChange={(v) => { setPremium(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[125px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>ویژگی باسکول: همه</SelectItem>
              <SelectItem value="yes">ویژهٔ باسکول</SelectItem>
              <SelectItem value="no">غیرویژه</SelectItem>
            </SelectContent>
          </Select>

          <Select value={packageType} onValueChange={(v) => { setPackageType(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[115px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>نوع بسته: همه</SelectItem>
              {PKG_LABELS.map((l, i) => (
                <SelectItem key={l} value={String(i)}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={login} onValueChange={(v) => { setLogin(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[135px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>ورود: همه</SelectItem>
              <SelectItem value="ever">وارد شده</SelectItem>
              <SelectItem value="never">هرگز وارد نشده</SelectItem>
              <SelectItem value="after-contact">بعد از تماس آمده</SelectItem>
            </SelectContent>
          </Select>

          <Select value={contacted} onValueChange={(v) => { setContacted(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[115px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>تماس: همه</SelectItem>
              <SelectItem value="yes">تماس گرفته‌شده</SelectItem>
              <SelectItem value="no">تماس نگرفته</SelectItem>
            </SelectContent>
          </Select>

          <Select value={failed} onValueChange={(v) => { setFailed(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[130px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>ایمپورت ناقص: همه</SelectItem>
              <SelectItem value="yes">ناقص/شکست‌خورده</SelectItem>
              <SelectItem value="no">سالم</SelectItem>
            </SelectContent>
          </Select>

          <Select value={staleDays} onValueChange={(v) => { setStaleDays(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[150px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>رهاشده: بدون فیلتر</SelectItem>
              <SelectItem value="30">۳۰+ روز بدون ورود</SelectItem>
              <SelectItem value="90">۹۰+ روز بدون ورود</SelectItem>
              <SelectItem value="180">۱۸۰+ روز بدون ورود</SelectItem>
              <SelectItem value="365">۳۶۵+ روز بدون ورود</SelectItem>
            </SelectContent>
          </Select>

          <span className="mx-1 h-5 w-px bg-border" aria-hidden />

          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-[145px] rounded-[10px] text-[11.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lastLogin">مرتب: آخرین ورود</SelectItem>
              <SelectItem value="createdAt">مرتب: ثبت‌نام</SelectItem>
              <SelectItem value="products">مرتب: تعداد آگهی</SelectItem>
              <SelectItem value="buskoolCreated">مرتب: ثبت‌نام باسکول</SelectItem>
              <SelectItem value="imported">مرتب: تاریخ ایمپورت</SelectItem>
              <SelectItem value="contacted">مرتب: تاریخ تماس</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-[10px] px-2.5 text-[11px]"
            onClick={() => setDir(dir === 'desc' ? 'asc' : 'desc')}
            title={dir === 'desc' ? 'نزولی (جدید→قدیم) — کلیک: صعودی' : 'صعودی (قدیم→جدید) — کلیک: نزولی'}
          >
            {dir === 'desc' ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            {dir === 'desc' ? 'نزولی' : 'صعودی'}
          </Button>

          <Button size="sm" variant="ghost" className="h-8 rounded-[10px] px-2.5 text-[11px] text-muted-foreground" onClick={resetFilters}>
            پاک‌کردن فیلترها
          </Button>
        </div>

        {/* نوار عملیات گروهی */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-[12px] font-bold text-destructive">
              {toFa(selected.size)} کاربر انتخاب شده — حذف کامل (آگهی‌ها، عکس‌ها و همهٔ داده‌ها)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 rounded-md text-[11px]" onClick={() => setSelected(new Set())}>
                لغو انتخاب
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 gap-1 rounded-md text-[11px]"
                onClick={() => setDeleteIds([...selected])}
              >
                <Trash2 size={12} /> حذف کامل انتخاب‌شده‌ها
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* جدول */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border bg-card py-16 text-center">
          <Users size={30} className="text-muted-foreground/40" />
          <p className="mt-2 text-sm font-bold">کاربری مطابق فیلترها پیدا نشد</p>
          <p className="mt-1 text-[11px] text-muted-foreground">فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                <th className="w-9 p-2">
                  <Checkbox checked={allOnPage} onCheckedChange={toggleAll} aria-label="انتخاب همهٔ ردیف‌های صفحه" />
                </th>
                <th className="p-2 text-start font-bold">کاربر</th>
                <th className="hidden p-2 text-start font-bold md:table-cell">منبع</th>
                <th className="p-2 text-start font-bold">بستهٔ باسکول</th>
                <th className="hidden p-2 text-start font-bold sm:table-cell">آگهی‌ها</th>
                <th className="p-2 text-start font-bold">آخرین ورود</th>
                <th className="hidden p-2 text-start font-bold lg:table-cell">تماس</th>
                <th className="hidden p-2 text-start font-bold lg:table-cell">ثبت</th>
                <th className="p-2 text-start font-bold">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-secondary/30">
                  <td className="p-2 align-middle">
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={() => toggleOne(row.id)}
                      aria-label={`انتخاب ${fullName(row)}`}
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8 shrink-0">
                        {row.avatarUrl ? <AvatarImage src={imgSrc(row.avatarUrl)} alt="" /> : null}
                        <AvatarFallback className="text-[11px]">
                          {(row.firstName || row.userName || '؟').slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate font-bold">
                          {fullName(row)}
                          {row.isVerified && <BadgeCheck size={12} className="shrink-0 text-verified" aria-label="احرازشده" />}
                          {!row.isActive && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                              <Ban size={9} /> غیرفعال
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[10.5px] text-muted-foreground" dir="ltr">
                          @{row.userName} • {row.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden p-2 align-middle md:table-cell"><SourceChip row={row} /></td>
                  <td className="p-2 align-middle"><BuskoolPackageChip row={row} /></td>
                  <td className="hidden p-2 align-middle sm:table-cell">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Boxes size={13} className="text-muted-foreground/70" />
                      {toFa(row.productsCount)}
                    </span>
                  </td>
                  <td className="p-2 align-middle">
                    {row.lastLoginAt ? (
                      <span className="tabular-nums" title={dateFa(row.lastLoginAt)}>{timeAgoFa(row.lastLoginAt)}</span>
                    ) : (
                      <span className="text-[11px] font-bold text-muted-foreground">هرگز</span>
                    )}
                  </td>
                  <td className="hidden p-2 align-middle lg:table-cell">
                    {row.b?.contactedAt ? (
                      <span className="text-[11px] tabular-nums text-emerald-600" title={`تماس: ${dateFa(row.b.contactedAt)}`}>
                        {timeAgoFa(row.b.contactedAt)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden p-2 align-middle text-[11px] tabular-nums text-muted-foreground lg:table-cell">
                    {row.createdAt ? dateFa(row.createdAt) : '—'}
                  </td>
                  <td className="p-2 align-middle">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 rounded-md p-0"
                        title="جزئیات کامل"
                        onClick={() => setDetailId(row.id)}
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 rounded-md p-0"
                        title={row.b?.contactedAt ? 'برداشتن علامت تماس' : 'علامت «تماس گرفتم و دعوتش کردم»'}
                        disabled={contactMutation.isPending || !row.b}
                        onClick={() => contactMutation.mutate({ id: row.id, undo: Boolean(row.b?.contactedAt) })}
                      >
                        {row.b?.contactedAt ? <UserMinus size={14} className="text-emerald-600" /> : <UserCheck size={14} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 rounded-md p-0 text-muted-foreground hover:text-destructive"
                        title="حذف کامل این کاربر"
                        onClick={() => setDeleteIds([row.id])}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* صفحه‌بندی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" className="h-8 rounded-md" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronRight size={14} /> قبلی
          </Button>
          <span className="text-[11.5px] text-muted-foreground">
            صفحهٔ {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button size="sm" variant="outline" className="h-8 rounded-md" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
            بعدی <ChevronLeft size={14} />
          </Button>
        </div>
      )}

      {/* دیالوگ جزئیات */}
      {detailId && <DetailDialog id={detailId} onClose={() => setDetailId(null)} />}

      {/* تأیید حذف */}
      <AlertDialog open={deleteIds !== null} onOpenChange={(v) => !v && setDeleteIds(null)}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              حذف کامل {deleteIds ? toFa(deleteIds.length) : ''} کاربر
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-6">
              همهٔ آگهی‌ها، عکس‌ها، چت‌ها، نظرات و داده‌های این کاربران برای همیشه حذف می‌شود (بایت‌های ابرآروان
              هم). حساب ادمین هرگز حذف نمی‌شود. این عملیات بازگشت‌پذیر نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel className="rounded-md">انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 rounded-md bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteIds) deleteMutation.mutate(deleteIds);
              }}
            >
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              حذف کامل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════ دیالوگ جزئیات کاربر ═══════════════════════════

function DetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['imported-user-detail', id],
    queryFn: () => importedUsersApi.detail(id),
    retry: 1,
  });

  const contactMutation = useMutation({
    mutationFn: (undo: boolean) => importedUsersApi.markContacted(id, undo),
    onSuccess: () => {
      toast({ title: 'ثبت شد' });
      void queryClient.invalidateQueries({ queryKey: ['imported-user-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['imported-users'] });
    },
    onError: (err) => {
      toast({ title: 'خطا', description: err instanceof Error ? err.message : 'ناموفق', variant: 'destructive' });
    },
  });

  const u = data?.user;
  const b = u?.b ?? null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            {u ? (
              <>
                <Avatar className="size-9">
                  {u.avatarUrl ? <AvatarImage src={imgSrc(u.avatarUrl)} alt="" /> : null}
                  <AvatarFallback className="text-xs">{(u.firstName || u.userName || '؟').slice(0, 1)}</AvatarFallback>
                </Avatar>
                {fullName(u)}
              </>
            ) : (
              'جزئیات کاربر'
            )}
          </DialogTitle>
          <DialogDescription>
            {u ? `@${u.userName} • ${u.phone}` : 'در حال دریافت…'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data || !u ? (
          <div className="grid place-items-center py-12 text-muted-foreground">
            {error ? (
              <p className="max-w-xs text-center text-[12px] leading-6 text-destructive">
                دریافت جزئیات ناموفق بود: {error instanceof Error ? error.message : 'خطای نامشخص'}
              </p>
            ) : (
              <Loader2 className="size-6 animate-spin" />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* دکمه‌های عملیات */}
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 rounded-md text-[11.5px]">
                <a href={`/c/${u.catalogId || u.userName}`} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} /> کاتالوگ عمومی
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-md text-[11.5px]"
                disabled={contactMutation.isPending || !b}
                title={b ? '' : 'کاربر سند دادهٔ باسکولی ندارد'}
                onClick={() => contactMutation.mutate(Boolean(b?.contactedAt))}
              >
                {contactMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : b?.contactedAt ? (
                  <UserMinus size={13} />
                ) : (
                  <UserCheck size={13} />
                )}
                {b?.contactedAt ? `برداشتن علامت تماس (${dateFa(b.contactedAt)})` : 'علامت «تماس گرفتم و دعوتش کردم»'}
              </Button>
            </div>

            {/* مشخصات آیمچ */}
            <section className="rounded-lg border p-3">
              <h3 className="mb-2 text-[12px] font-extrabold">مشخصات در آیمچ</h3>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px] sm:grid-cols-3">
                <Info label="نام" value={fullName(u)} />
                <Info label="موبایل" value={u.phone} ltr />
                <Info label="جنسیت" value={u.sex ?? '—'} />
                <Info label="شهر" value={u.cityName ?? u.provinceName ?? '—'} />
                <Info label="نقش" value={u.role === 'ADMIN' ? 'ادمین' : u.isSeller ? 'فروشنده' : 'خریدار'} />
                <Info label="وضعیت" value={u.isActive ? 'فعال' : 'غیرفعال'} />
                <Info label="احراز هویت" value={u.isVerified ? 'شده' : 'نشده'} />
                <Info label="کیف پول" value={priceFa(u.walletBalance)} />
                <Info label="بستهٔ آیمچ" value={u.activePakageType > 0 ? PKG_LABELS[u.activePakageType] ?? '—' : 'رایگان'} />
                <Info label="ثبت‌نام" value={dateFa(u.createdAt)} />
                <Info label="آخرین ورود" value={u.lastLoginAt ? `${dateFa(u.lastLoginAt)} (${timeAgoFa(u.lastLoginAt)})` : 'هرگز'} />
                <Info label="آخرین حضور" value={u.lastSeenAt ? timeAgoFa(u.lastSeenAt) : '—'} />
              </dl>
              {u.businessDesc ? (
                <p className="mt-2.5 rounded-md bg-secondary/50 p-2 text-[11.5px] leading-6">{u.businessDesc}</p>
              ) : (
                <p className="mt-2.5 text-[10.5px] text-muted-foreground">
                  «توضیحات کسب و کار» خالی است — صفحهٔ عمومی متن پیش‌فرض پارامتریک آیمچ را نشان می‌دهد
                </p>
              )}
            </section>

            {/* سند رفتار باسکول */}
            <section className={cn('rounded-lg border p-3', b?.premium.isPremium && 'border-amber-300/70 bg-amber-50/40')}>
              <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold">
                <Crown size={13} className="text-amber-500" />
                رفتار این کاربر در باسکول
                {b?.premium.isPremium ? (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    ویژهٔ باسکول ({b.premium.packageTitle}) — در آیمچ رایگان است تا پرداخت کند
                  </span>
                ) : null}
              </h3>
              {b ? (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px] sm:grid-cols-3">
                  <Info label="یوزرنیم باسکول" value={`@${b.userName}`} ltr />
                  <Info label="شناسه باسکول" value={String(b.userId)} ltr />
                  <Info label="ثبت‌نام باسکول" value={b.createdAt ? dateFa(b.createdAt) : '—'} />
                  <Info label="ایمپورت" value={dateFa(b.importedAt)} />
                  <Info label="بسته" value={b.premium.packageTitle} />
                  <Info label="تماس/دعوت" value={b.contactedAt ? dateFa(b.contactedAt) : 'هنوز نه'} />
                  <Info label="احراز باسکول" value={b.isVerified ? 'شده' : 'نشده'} />
                  <Info label="نقش باسکول" value={b.isSeller ? (b.isBuyer ? 'خریدار و فروشنده' : 'فروشنده') : b.isBuyer ? 'خریدار' : '—'} />
                  <Info label="کیف پول باسکول" value={priceFa(b.walletBalance)} />
                  <Info label="دامنهٔ فعالیت" value={b.activityDomain ?? '—'} />
                  <Info label="نوع فعالیت" value={b.activityType ?? '—'} />
                  <Info label="استان/شهر" value={[b.province, b.city].filter(Boolean).join(' - ') || '—'} />
                  <Info label="نشانی" value={b.address ?? '—'} />
                  <Info label="شرکت" value={b.isCompany ? b.companyName || 'بله' : 'حقیقی'} />
                  <Info label="تأیید پروفایل" value={b.confirmed ? 'شده' : 'نشده'} />
                  <Info label="نرخ پاسخ‌دهی" value={b.responseRate != null ? `${toFa(b.responseRate)}٪` : '—'} />
                  <Info label="امتیاز اعتبار" value={b.reputationScore ?? '—'} />
                  <Info label="امتیاز باسکول" value={b.ratingAvg != null ? `${toFa(b.ratingAvg)} از ${toFa(b.ratingCount ?? 0)} نظر` : '—'} />
                  <Info label="آگهی در باسکول" value={b.productsCount != null ? toFa(b.productsCount) : '—'} />
                  <Info label="آمده از" value={b.comingFrom ?? '—'} />
                  <Info label="ibp" value={b.ibp ? 'بله' : 'خیر'} />
                  <Info label="عکس‌های مرتبط" value={toFa(b.relateds.length)} />
                  <Info label="متن کسب‌وکار" value={b.descriptionIsAuto ? 'خودکار باسکول (رد شد)' : b.descriptionRaw ? 'متن خود کاربر' : '—'} />
                </dl>
              ) : (
                <p className="text-[11px] leading-6 text-muted-foreground">
                  {u.bUserName
                    ? 'رکورد قدیمی است و سند b ندارد — از «نمای کلی» مهاجرت ساختار b را اجرا کنید.'
                    : 'این کاربر از باسکول نیامده است.'}
                </p>
              )}
            </section>

            {/* شمارنده‌ها */}
            <section className="rounded-lg border p-3">
              <h3 className="mb-2 text-[12px] font-extrabold">داده‌ها در آیمچ</h3>
              <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                {[
                  { label: 'آگهی', value: data.counts.products },
                  { label: 'عکس', value: data.counts.photos },
                  { label: 'نظر دریافتی', value: data.counts.reviewsReceived },
                  { label: 'نظر نوشته', value: data.counts.reviewsWritten },
                  { label: 'درخواست خرید', value: data.counts.buyRequests },
                  { label: 'پیشنهاد تامین', value: data.counts.supplyOffers },
                ].map((c) => (
                  <div key={c.label} className="rounded-md bg-secondary/40 p-2">
                    <p className="text-sm font-extrabold tabular-nums">{toFa(c.value)}</p>
                    <p className="text-[10px] text-muted-foreground">{c.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* آگهی‌ها */}
            {data.products.length > 0 && (
              <section className="rounded-lg border p-3">
                <h3 className="mb-2 flex items-center justify-between text-[12px] font-extrabold">
                  آگهی‌ها
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {toFa(data.counts.products)} مورد — {toFa(data.products.length)} اخیر
                  </span>
                </h3>
                <ul className="divide-y">
                  {data.products.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-[11.5px]">
                      <span className="min-w-0 flex-1 truncate">
                        <a
                          href={`/product-view?product_id=${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary hover:underline"
                        >
                          {p.name}
                        </a>
                        <span className="ms-1.5 text-[10px] text-muted-foreground">{p.category ?? ''}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground" title={`موجودی: ${toFa(p.stock)} ${p.unit}`}>
                        {p.price ? priceFa(p.price) : '—'}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{dateFa(p.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className={cn('truncate font-bold', ltr && 'text-start')} dir={ltr ? 'ltr' : undefined} title={value}>
        {value}
      </dd>
    </div>
  );
}
