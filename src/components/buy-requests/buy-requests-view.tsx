'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquareText, Phone, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useBuyRequests } from '@/lib/mock/hooks';
import { toFa, timeAgoFa } from '@/lib/format';
import { provinces as provincesData } from '@/lib/mock/data';

/** درخواست‌های خرید — کارت‌های افقی مثل باسکول با جستجو و فیلتر مکان */
export function BuyRequestsView() {
  const [s, setS] = useState('');
  const [provinceName, setProvinceName] = useState<string>('all');
  const { data: list, isLoading } = useBuyRequests({ s, provinceName: provinceName === 'all' ? undefined : provinceName });

  const count = list?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:px-6">
      {/* فیلترها — مثل باسکول: جستجو + همه ایران */}
      <div className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row">
        <form className="relative flex-1" onSubmit={(e) => e.preventDefault()} role="search">
          <Input
            value={s}
            onChange={(e) => setS(e.target.value)}
            placeholder="جستجوی درخواست خرید"
            className="rounded-md pe-4 ps-10"
            aria-label="جستجوی درخواست خرید"
          />
          <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-muted-foreground" />
        </form>
        <Select dir="rtl" value={provinceName} onValueChange={setProvinceName}>
          <SelectTrigger className="w-full rounded-md sm:w-52" aria-label="استان">
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

      {/* لیست */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-md" />)}
        </div>
      ) : count === 0 ? (
        <div className="rounded-md border bg-card p-12 text-center">
          <p className="text-lg font-bold">درخواستی با این فیلترها یافت نشد.</p>
          <p className="mt-2 text-sm text-muted-foreground">فیلترها را تغییر دهید؛ درخواست‌های جدید روزانه ثبت می‌شوند.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list!.map((r) => <RequestCard key={r.id} request={r} />)}
        </ul>
      )}
    </div>
  );
}

/** کارت درخواست خرید — عین چیدمان باسکول: سربرگ کاربر + جمله «خریدار … هستم» + دکمه‌ها */
function RequestCard({ request }: { request: import('@/lib/types').BuyRequest }) {
  const [showPhone, setShowPhone] = useState(false);

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
        <Button size="sm" className="rounded-md" onClick={() => setShowPhone(true)}>
          <Phone size={15} />
          {showPhone ? <span dir="ltr" className="font-mono">۰۹۱۲ ۰۰۰ ۰۰۰۰</span> : 'تماس با خریدار'}
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
    </li>
  );
}
