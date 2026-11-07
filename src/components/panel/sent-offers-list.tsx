'use client';

/**
 * لیست «پیشنهادهای من» (خواسته مالک ۶-۱۱؛ ۸-۱۱) — کامپوننت مشترک:
 *  • تب سوم صفحهٔ «خریداران» پنل (/panel/buyers) همین را رندر می‌کند.
 *  • (خواسته مالک ۸-۱۱) عین تب «پیشنهادهای من» صفحهٔ خریدارانِ هر کالا، این
 *    لیست هم «تایم‌لاین واحد» است: پیشنهادهای تامین ارسالی به درخواست‌های
 *    دوره‌ای + گفتگوهای خرید فوری — دو صفحه عین هم‌اند.
 *  • پیشنهاد تامین: متن و مشخصات (نوع، حداقل خرید، چک، ارسال) روی کارت —
 *    کارت مشترک outreach-cards؛ بج «تکی/گروهی» حذف شد (گیج‌کننده بود).
 *  • گفتگوی خرید فوری: جملهٔ درخواست خریدار + آخرین وضعیت گفتگو.
 *  • فیلتر دستهٔ کالا: پیشنهادها سمت سرور، گفتگوها کلاینت؛ صفحه‌بندی پیشنهادها.
 */

import { useMemo, useState } from 'react';
import { Package, Send } from 'lucide-react';
import { useMySentOffers, useMyUrgentChats } from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelCard } from '@/components/panel/panel-parts';
import { SupplyOfferCard, UrgentChatCard } from '@/components/panel/outreach-cards';
import { parseServerDate, toFa } from '@/lib/format';
import type { SentOffer, UrgentChat } from '@/lib/types';

const PAGE_SIZE = 20;

/** آیتم تایم‌لاین — پیشنهاد تامین یا گفتگوی خرید فوری؛ مرتب بر آخرین فعالیت */
type OutreachItem =
  | { kind: 'offer'; at: string; offer: SentOffer }
  | { kind: 'urgent'; at: string; chat: UrgentChat };

export function SentOffersList({
  /** حالت خالی — دکمهٔ «دیدن خریداران» به تب خریداران همان صفحه برمی‌گردد */
  onGoBuyers,
}: {
  onGoBuyers?: () => void;
}) {
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  const catId = category !== 'all' ? Number(category) : undefined;

  const { data, isLoading } = useMySentOffers({
    categoryId: catId,
    page,
    perPage: PAGE_SIZE,
  });
  // گفتگوهای خرید فوری — همهٔ دسته‌ها؛ با فیلتر دسته، کلاینت-ساید محدود می‌شود
  const { data: chatsData, isLoading: chatsLoading } = useMyUrgentChats(undefined);

  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const offers = useMemo(() => data?.items ?? [], [data]);
  const chats = useMemo(() => {
    const items = chatsData?.items ?? [];
    return catId != null ? items.filter((c) => c.request?.categoryId === catId) : items;
  }, [chatsData, catId]);

  /** تایم‌لاین واحد — پیشنهادها + گفتگوها، جدیدترین فعالیت بالا */
  const timeline = useMemo<OutreachItem[]>(() => {
    const ts = (s: string) => new Date(parseServerDate(s)).getTime();
    const of: OutreachItem[] = offers.map((o) => ({
      kind: 'offer',
      at: o.lastMessage?.at ?? o.createdAt,
      offer: o,
    }));
    const ur: OutreachItem[] = chats.map((c) => ({
      kind: 'urgent',
      at: c.lastMessage?.at ?? c.updatedAt,
      chat: c,
    }));
    return [...of, ...ur].sort((a, b) => ts(b.at) - ts(a.at));
  }, [offers, chats]);

  const total = (data?.total ?? 0) + chats.length;
  const loading = isLoading || chatsLoading;

  return (
    <div className="space-y-4" role="tabpanel" aria-label="پیشنهادهای من">
      {/* فیلتر دسته + شمار */}
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-52 rounded-md" aria-label="دستهٔ کالا">
                <Package size={14} className="text-muted-foreground" />
                <SelectValue placeholder="همه کالاها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه کالاها</SelectItem>
                {(data?.categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {loading ? '…' : total > 0 ? `${toFa(total)} پیشنهاد و گفتگو` : ''}
            </span>
          </div>
        </div>
      </PanelCard>

      {/* تایم‌لاین واحد */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : timeline.length === 0 ? (
        <PanelCard className="py-12 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Send size={24} />
          </span>
          <p className="mt-3 text-sm font-extrabold">هنوز پیشنهاد یا گفتگویی ندارید</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
            از تب‌های «درخواست‌های خرید»، مطابق‌ترین خریداران با آگهی‌های خودتان را ببینید — برای
            درخواست‌های دوره‌ای پیشنهاد تامین بفرستید و به درخواست‌های فوری در چت پاسخ دهید؛
            تاریخچه و جواب همهٔ آن‌ها همین‌جا جمع می‌شود.
          </p>
          {onGoBuyers && (
            <Button className="mt-4 rounded-md" onClick={onGoBuyers}>
              دیدن خریداران
            </Button>
          )}
        </PanelCard>
      ) : (
        <>
          <ul className="space-y-3">
            {timeline.map((it) =>
              it.kind === 'offer' ? (
                <SupplyOfferCard key={`o-${it.offer.id}`} offer={it.offer} />
              ) : (
                <UrgentChatCard key={`u-${it.chat.threadId}`} chat={it.chat} />
              ),
            )}
          </ul>

          {/* صفحه‌بندی — مختص پیشنهادها (گفتگوها همیشه حداکثر ۵۰ تای اخیرند) */}
          {pageCount > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-1" aria-label="صفحه‌بندی پیشنهادات">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </Button>
              <span className="text-xs text-muted-foreground">
                صفحهٔ {toFa(page)} از {toFa(pageCount)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                بعدی
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
