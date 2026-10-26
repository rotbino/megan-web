'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, LogIn, MessageSquareText, Phone, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBuyRequestContact, useBuyRequests, useProvinces } from '@/lib/mock/hooks';
import { AuthModal } from '@/components/shared/auth-modal';
import { getTokens } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';
import { toFa, timeAgoFa } from '@/lib/format';
import type { BuyRequest } from '@/lib/types';

/**
 * درخواست‌های خرید — کارت‌های افقی مثل باسکول با جستجو و فیلتر مکان +
 * صفحه‌بندی واقعی. شماره خریدار فقط برای کاربران واردشده آشکار می‌شود
 * (مدل Lead-gen باسکول) — در غیر این صورت مودال ورود باز می‌شود.
 */
export function BuyRequestsView() {
  const [s, setS] = useState('');
  const [provinceId, setProvinceId] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data: provinces } = useProvinces();
  const { data, isLoading } = useBuyRequests({
    s,
    provinceId: provinceId === 'all' ? undefined : Number(provinceId),
    page,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:px-6">
      {/* فیلترها — مثل باسکول: جستجو + همه ایران */}
      <div className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row">
        <form className="relative flex-1" onSubmit={(e) => e.preventDefault()} role="search">
          <Input
            value={s}
            onChange={(e) => {
              setS(e.target.value);
              setPage(1);
            }}
            placeholder="جستجوی درخواست خرید"
            className="rounded-md pe-4 ps-10"
            aria-label="جستجوی درخواست خرید"
          />
          <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground" />
        </form>
        <Select
          dir="rtl"
          value={provinceId}
          onValueChange={(v) => {
            setProvinceId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full rounded-md sm:w-52" aria-label="استان">
            <SelectValue placeholder="همه ایران" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه ایران</SelectItem>
            {(provinces ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* لیست */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-md" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border bg-card p-12 text-center">
          <p className="text-lg font-bold">درخواستی با این فیلترها یافت نشد.</p>
          <p className="mt-2 text-sm text-muted-foreground">فیلترها را تغییر دهید؛ درخواست‌های جدید روزانه ثبت می‌شوند.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{toFa(total)} درخواست خرید</p>
          <ul className="space-y-3">
            {items.map((r) => <RequestCard key={r.id} request={r} />)}
          </ul>

          {/* صفحه‌بندی — عین باسکول */}
          {pageCount > 1 && (
            <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-1 py-2">
              <Button
                variant="outline"
                size="sm"
                className="size-8 rounded-md p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="صفحه قبل"
              >
                <ChevronRight size={15} />
              </Button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pageCount || Math.abs(n - page) <= 1)
                .map((n, idx, arr) => (
                  <span key={n} className="flex items-center gap-1">
                    {idx > 0 && n - arr[idx - 1] > 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                    <Button
                      variant={n === page ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-8 rounded-md"
                      onClick={() => setPage(n)}
                      aria-current={n === page ? 'page' : undefined}
                    >
                      {toFa(n)}
                    </Button>
                  </span>
                ))}
              <Button
                variant="outline"
                size="sm"
                className="size-8 rounded-md p-0"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="صفحه بعد"
              >
                <ChevronLeft size={15} />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

/** کارت درخواست خرید — عین چیدمان باسکول: سربرگ کاربر + جمله «خریدار … هستم» + دکمه‌ها */
function RequestCard({ request }: { request: BuyRequest }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const contact = useBuyRequestContact();

  const reveal = async () => {
    if (phone) return;
    if (!getTokens()?.accessToken) {
      setNeedLogin(true);
      setLoginOpen(true);
      return;
    }
    setLoading(true);
    try {
      const data = await contact.mutateAsync(request.id);
      setPhone(data.isSelf ? 'این درخواست شماست' : data.phone);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setNeedLogin(true);
        setLoginOpen(true);
      }
      // خطای دیگر — بی‌صدا می‌ماند؛ دکمه قابل کلیک مجدد است
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="rounded-md border bg-card p-4 transition-shadow hover:shadow-md sm:p-5">
      {/* سربرگ: کاربر + تاریخ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
            {request.firstName.charAt(0)}
          </span>
          <span className="text-sm font-bold">
            {request.firstName} {request.lastName}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{timeAgoFa(request.createdAt)}</span>
      </div>

      {/* جمله عین باسکول */}
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        خریدار <span className="font-bold text-foreground">{toFa(request.requirementAmount)} {request.unit}</span>{' '}
        <Link href="/product-list" className="font-bold text-primary hover:underline">{request.subcategoryName}</Link>
        {request.name ? <> از نوع <span className="font-bold text-primary">{request.name}</span> هستم</> : ' هستم'}
      </p>

      {/* مکان */}
      <p className="mt-1 text-xs text-muted-foreground">{request.city}</p>

      {/* دکمه‌ها */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="sm" className="rounded-md" onClick={reveal} disabled={loading}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Phone size={15} />}
          {phone ? <span dir="ltr" className="font-mono">{toFa(phone)}</span> : 'تماس با خریدار'}
        </Button>
        <Button size="sm" variant="outline" className="rounded-md" asChild>
          <Link href="/register">
            <MessageSquareText size={15} />
            چت با خریدار
          </Link>
        </Button>
      </div>

      {/* توصیه — عین باسکول */}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck size={12} className="shrink-0 text-primary" />
        توصیه ایمچ: همواره به انجام معاملات حضوری است.
      </p>

      {/* ورود برای دیدن شماره — Lead-gen */}
      <AuthModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoggedIn={() => {
          setLoginOpen(false);
          setNeedLogin(false);
          void reveal();
        }}
      />
      {needLogin && !loginOpen && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
          <LogIn size={12} /> برای مشاهده شماره تماس خریدار، وارد حساب خود شوید.
        </p>
      )}
    </li>
  );
}
