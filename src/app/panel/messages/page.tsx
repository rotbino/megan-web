'use client';

/**
 * پیام ها — پیام‌رسان پنل (منطق MHTML باسکول):
 * لیست مخاطبان با جستجو + نمای چت با جعبه «برای شروع مکالمه پیامی بنویسید» +
 * «ویرایش قیمت» در سرگفتگو (قیمت هر کیلو به تومان — با بادکنک تبدیل) +
 * «گزارش تخلف کاربر» + جعبه «ارسال برای دوستان» (تلگرام/واتس‌اپ/ایمیل + کپی لینک).
 */

import { useState } from 'react';
import { Copy, Flag, Mail, MessageSquare, Pencil, Search, Send, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { UnitInput } from '@/components/shared/unit-input';
import { useToast } from '@/hooks/use-toast';
import { timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const THREADS = [
  { id: 1, name: 'مریم صابری', last: 'سلام، پسته اکبری ۵۰۰ کیلو می‌خوام.', at: '2026-10-25 09:30', unread: 2 },
  { id: 2, name: 'علی افتخار', last: 'قیمت هر کیلو چند می‌شه؟', at: '2026-10-24 18:12', unread: 0 },
  { id: 3, name: 'مجتبی عالی پور', last: 'امکان ارسال به تبریز دارید؟', at: '2026-10-23 11:45', unread: 0 },
];

const SHARE_LINK = 'https://imach.example.com/buyer/messenger/contacts';

export default function PanelMessagesPage() {
  const { toast } = useToast();
  const [active, setActive] = useState(1);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<{ id: number; text: string }[]>([]);

  // ویرایش قیمت — عین دیالوگ باسکول
  const [priceOpen, setPriceOpen] = useState(false);
  const [price, setPrice] = useState('');

  // گزارش تخلف — عین دیالوگ باسکول
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');

  const thread = THREADS.find((t) => t.id === active);
  const threads = THREADS.filter((t) => !q.trim() || t.name.includes(q.trim()));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* لیست مخاطبان */}
        <PanelCard className="order-2 lg:order-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">
              مخاطب <span className="text-muted-foreground">({toFa(THREADS.length)})</span>
            </p>
          </div>
          <div className="relative mt-3">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی مکالمه…" className="rounded-md pe-9" />
          </div>
          <ul className="mt-3 divide-y divide-border/70">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActive(t.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors',
                    active === t.id ? 'bg-primary/10' : 'hover:bg-secondary/70',
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-extrabold">
                    {t.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{t.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgoFa(t.at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">{t.last}</span>
                      {t.unread > 0 && (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {t.unread.toLocaleString('fa-IR')}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* ارسال برای دوستان — عین باسکول */}
          <div className="mt-4 rounded-md border bg-secondary/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold">
              <Share2 size={14} />
              ارسال برای دوستان
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              با معرفی ایمچ به همکارانتان، بازار بزرگ‌تر و قیمت‌های بهتری داشته باشید.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 rounded-md text-[11px]"
                onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری در تلگرام' })}
              >
                تلگرام
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 rounded-md text-[11px]"
                onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری در واتس آپ' })}
              >
                واتس آپ
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 rounded-md text-[11px]"
                onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری با ایمیل' })}
              >
                <Mail size={13} /> ایمیل
              </Button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(SHARE_LINK).catch(() => {});
                }
                toast({ description: 'کپی شد.' });
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Copy size={12} />
              کپی لینک
            </button>
          </div>
        </PanelCard>

        {/* نمای چت */}
        <PanelCard className="order-1 flex min-h-[420px] flex-col lg:order-2">
          {thread ? (
            <>
              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                  {thread.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{thread.name}</p>
                  <p className="text-[11px] text-emerald-600">آنلاین</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="outline" className="rounded-md text-[11px]" onClick={() => setPriceOpen(true)}>
                    <Pencil size={13} /> ویرایش قیمت
                  </Button>
                  <button
                    type="button"
                    aria-label="گزارش تخلف کاربر"
                    title="گزارش تخلف کاربر"
                    onClick={() => setReportOpen(true)}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Flag size={15} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2 py-4">
                <p className="w-fit max-w-[80%] rounded-lg rounded-tr-sm bg-secondary px-3.5 py-2.5 text-xs leading-6">
                  {thread.last}
                </p>
                {sent.map((m) => (
                  <p
                    key={m.id}
                    className="ms-auto w-fit max-w-[80%] rounded-lg rounded-tl-sm bg-primary px-3.5 py-2.5 text-xs leading-6 text-primary-foreground"
                  >
                    {m.text}
                  </p>
                ))}
              </div>

              <form
                className="flex gap-2 border-t border-border/70 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  setSent((s) => [...s, { id: Date.now(), text: draft.trim() }]);
                  setDraft('');
                }}
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="برای شروع مکالمه پیامی بنویسید"
                  className="rounded-md"
                />
                <Button type="submit" size="icon" aria-label="ارسال پیام" className="rounded-md">
                  <Send size={15} />
                </Button>
              </form>
            </>
          ) : (
            <PanelEmptyState
              icon={MessageSquare}
              title="هیچ پیام جدیدی ندارید!"
              hint="برای شروع گفتگو با خریداران و فروشندگان ایمچ، پیام ارسال کنید."
            />
          )}
        </PanelCard>
      </div>

      {/* دیالوگ ویرایش قیمت — عین باسکول */}
      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">ویرایش قیمت</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="chat-price">
              قیمت <span className="text-muted-foreground">(هر کیلو به تومان)</span> <span className="text-red-500">*</span>
            </Label>
            <UnitInput
              id="chat-price"
              kind="price"
              unit="هر کیلو تومان"
              value={price}
              onValueChange={setPrice}
              placeholder="مثلا: 15,000"
            />
          </div>
          <Button
            className="w-full rounded-md"
            disabled={!price}
            onClick={() => {
              setPriceOpen(false);
              toast({ description: 'قیمت جدید ویرایش شد.' });
            }}
          >
            ویرایش
          </Button>
        </DialogContent>
      </Dialog>

      {/* دیالوگ گزارش تخلف — عین باسکول */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">گزارش تخلف کاربر</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="report-text">دلیل گزارش تخلف چیست؟</Label>
            <Textarea
              id="report-text"
              dir="rtl"
              rows={4}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="resize-none text-sm leading-7"
              placeholder="توضیح کوتاه بنویسید…"
            />
          </div>
          <Button
            className="w-full rounded-md"
            disabled={reportText.trim().length < 5}
            onClick={() => {
              setReportOpen(false);
              setReportText('');
              toast({ description: 'گزارش شما ثبت شد؛ تیم ایمچ بررسی می‌کند.' });
            }}
          >
            ثبت گزارش
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
