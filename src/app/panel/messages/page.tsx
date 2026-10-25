'use client';

/**
 * پیام ها — پیام‌رسان پنل (نمونه):
 * لیست مکالمه‌های ماک + نمای چت با پیام نمونه و جعبه «برای شروع مکالمه پیامی بنویسید».
 */

import { useState } from 'react';
import { MessageSquare, Search, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { timeAgoFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const THREADS = [
  { id: 1, name: 'مریم صابری', last: 'سلام، پسته اکبری ۵۰۰ کیلو می‌خوام.', at: '2026-10-25 09:30', unread: 2 },
  { id: 2, name: 'علی افتخار', last: 'قیمت هر کیلو چند می‌شه؟', at: '2026-10-24 18:12', unread: 0 },
  { id: 3, name: 'مجتبی عالی پور', last: 'امکان ارسال به تبرید دارید؟', at: '2026-10-23 11:45', unread: 0 },
];

export default function PanelMessagesPage() {
  const [active, setActive] = useState(1);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<{ id: number; text: string }[]>([]);

  const thread = THREADS.find((t) => t.id === active);
  const threads = THREADS.filter((t) => !q.trim() || t.name.includes(q.trim()));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* لیست مکالمه‌ها */}
        <PanelCard className="order-2 lg:order-1">
          <div className="relative">
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
        </PanelCard>

        {/* نمای چت */}
        <PanelCard className="order-1 flex min-h-[420px] flex-col lg:order-2">
          {thread ? (
            <>
              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                  {thread.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-bold">{thread.name}</p>
                  <p className="text-[11px] text-emerald-600">آنلاین</p>
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
              title="مکالمه‌ای انتخاب نشده است."
              hint="برای شروع مکالمه پیامی بنویسید."
            />
          )}
        </PanelCard>
      </div>
    </div>
  );
}
