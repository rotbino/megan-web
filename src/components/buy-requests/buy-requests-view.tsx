'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  MapPin,
  MessageSquareText,
  PackageSearch,
  Phone,
  Search,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBuyRequests, useProvinces } from '@/lib/mock/hooks';
import { toFa, timeAgoFa } from '@/lib/format';
import { VerifiedBadge } from '@/components/shared/badges';
import { provinces as provincesData } from '@/lib/mock/data';

/** درخواست‌های خرید (RFQ) — کارت‌های افقی مثل باسکول با فیلتر مکان و جستجو */
export function BuyRequestsView() {
  const [s, setS] = useState('');
  const [provinceName, setProvinceName] = useState<string>('all');
  const { data: list, isLoading } = useBuyRequests({ s, provinceName: provinceName === 'all' ? undefined : provinceName });

  const count = list?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:px-6">
      {/* فیلترها */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row">
        <form className="relative flex-1" onSubmit={(e) => e.preventDefault()} role="search">
          <Input
            value={s}
            onChange={(e) => setS(e.target.value)}
            placeholder="جستجو در درخواست‌های خرید…"
            className="rounded-xl pe-4 ps-10"
            aria-label="جستجوی درخواست"
          />
          <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground" />
        </form>
        <Select dir="rtl" value={provinceName} onValueChange={setProvinceName}>
          <SelectTrigger className="w-full rounded-xl sm:w-52" aria-label="استان">
            <SelectValue placeholder="همه ایران" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه ایران</SelectItem>
            {provincesData.map((p) => (
              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{isLoading ? 'در حال دریافت…' : <><b className="text-foreground">{toFa(count)}</b> درخواست فعال</>}</p>

      {/* لیست */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : count === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <p className="text-lg font-bold">درخواستی با این فیلترها یافت نشد.</p>
          <p className="mt-2 text-sm text-muted-foreground">فیلترها را تغییر دهید یا بعداً سر بزنید؛ درخواست‌های جدید روزانه ثبت می‌شوند.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list!.map((r) => <RequestCard key={r.id} request={r} />)}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ request }: { request: import('@/lib/types').BuyRequest }) {
  const [showPhone, setShowPhone] = useState(false);
  const title = request.name ?? `درخواست ${request.subcategoryName}`;

  return (
    <li className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <PackageSearch size={16} className="text-primary" />
          <Link href="/product-list" className="hover:text-primary">{title}</Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Tag size={12} />{request.subcategoryName}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{timeAgoFa(request.createdAt)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MapPin size={14} className="text-primary/70" />
          {request.city}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-muted-foreground">مقدار مورد نیاز:</span>
          <b>{toFa(request.requirementAmount)}</b>
          <span className="text-xs text-muted-foreground">{request.unit}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          خریدار: <b className="text-foreground">{request.firstName} {request.lastName}</b>
          {request.isVerified && <VerifiedBadge className="ms-1" label="احرازشده" />}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="sm" className="rounded-xl" onClick={() => setShowPhone(true)}>
          <Phone size={15} />
          {showPhone ? <span dir="ltr" className="font-mono">۰۹۱۲ ۰۰۰ ۰۰۰۰</span> : 'تماس با خریدار'}
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" asChild>
          <Link href="/register">
            <MessageSquareText size={15} />
            چت با خریدار
          </Link>
        </Button>
      </div>
    </li>
  );
}
