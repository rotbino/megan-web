'use client';

/**
 * پنل بازاریابی — ساده و شفاف:
 *   • لینک دعوت و کد رفرال
 *   • دعوت‌شده‌ها با شماره تماس (برای تماس/تشویق به پرداخت) و سابقه پرداخت‌ها
 *   • درآمدها: چه کسی، بابت چه چیزی پرداخت کرده و چقدر به کیف پول واریز شده
 *   • زیرمجموعه‌ها (فقط مدیر بازاریابی) + سهم ۱۰٪ از فروش آنها
 *   • پیام‌رسانی با ادمین
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  ChevronDown,
  CircleAlert,
  Clock,
  Copy,
  Link2,
  Loader2,
  Megaphone,
  MessageSquare,
  Phone,
  Send,
  Store,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import {
  useAffiliateEarnings,
  useAffiliateInvitees,
  useAffiliateMessages,
  useAffiliateSubMarketers,
  useSendAffiliateMessage,
} from '@/lib/affiliate-hooks';
import { dateFa, priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AffiliateInvitee, AffiliateOverview } from '@/lib/affiliate';

type TabKey = 'invitees' | 'earnings' | 'subs' | 'messages';

export function AffiliatePanel({ overview }: { overview: AffiliateOverview }) {
  const profile = overview.profile!;
  const isManager = profile.role === 'manager';
  const [tab, setTab] = useState<TabKey>('invitees');

  const inviteesQ = useAffiliateInvitees();
  const earningsQ = useAffiliateEarnings();
  const subsQ = useAffiliateSubMarketers();
  const messagesQ = useAffiliateMessages();

  const invitees = inviteesQ.data ?? [];
  const earnings = earningsQ.data ?? [];
  const subs = subsQ.data ?? [];

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; count?: number }[] = [
    { key: 'invitees', label: 'دعوت‌شده‌ها', icon: UserRound, count: invitees.length },
    { key: 'earnings', label: 'درآمدها', icon: Wallet, count: earnings.length },
    ...(isManager ? [{ key: 'subs' as TabKey, label: 'زیرمجموعه‌ها', icon: Users, count: subs.length }] : []),
    { key: 'messages', label: 'پیام‌ها', icon: MessageSquare },
  ];

  return (
    <div className="space-y-4">
      {/* ─── هدر: نقش + کیف پول ─── */}
      <PanelCard className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Megaphone size={22} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-extrabold sm:text-lg">بازاریابی ایمچ</h1>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                  isManager ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-foreground/70',
                )}
              >
                {isManager ? 'مدیر بازاریابی' : 'بازاریاب'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              قرارداد از {dateFa(profile.contractAcceptedAt)} — سهم {toFa(profile.level1Percent)}٪ مستقیم
              {isManager && ` + ${toFa(profile.level2Percent)}٪ از فروش زیرمجموعه‌ها`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-md border bg-secondary/40 px-3.5 py-2 text-xs">
            <span className="block text-muted-foreground">کیف پول بازاریابی</span>
            <span className="mt-0.5 block font-extrabold text-emerald-600">{priceFa(overview.walletPaid)}</span>
            {overview.walletPending > 0 && (
              <span className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-600">
                <Clock size={11} /> {priceFa(overview.walletPending)} در انتظار تایید پرداخت
              </span>
            )}
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-md">
            <Link href="/panel/wallet"><Wallet size={14} /> کیف پول</Link>
          </Button>
        </div>
      </PanelCard>

      {/* ─── لینک دعوت ─── */}
      <PanelCard>
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold">
          <Link2 size={14} className="text-primary" />
          لینک دعوت شما
        </h2>
        <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
          این لینک را برای مشتریان ارسال کنید؛ با ثبت‌نام آنها از طریق این لینک، به‌عنوان دعوت‌شده‌ی شما ثبت می‌شوند.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            readOnly
            dir="ltr"
            value={profile.referralLink}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded-md bg-secondary/40 font-mono text-xs"
            aria-label="لینک دعوت"
          />
          <CopyButton text={profile.referralLink} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          کد رفرال شما: <b dir="ltr" className="font-mono text-sm text-foreground">{toFa(profile.referralCode)}</b>
        </p>
      </PanelCard>

      {/* ─── تب‌ها ─── */}
      <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="بخش‌های بازاریابی">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold transition-colors',
              tab === key
                ? 'border-primary/40 bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={14} />
            {label}
            {count != null && (
              <span className={cn('rounded-full px-1.5 text-[10px]', tab === key ? 'bg-primary/10' : 'bg-secondary')}>
                {toFa(count)}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'invitees' && <InviteesTab query={inviteesQ} commissionOnWallet={profile.commissionOnWalletCharge} />}
      {tab === 'earnings' && <EarningsTab query={earningsQ} />}
      {tab === 'subs' && <SubsTab query={subsQ} level2Percent={profile.level2Percent} />}
      {tab === 'messages' && <MessagesTab query={messagesQ} />}
    </div>
  );
}

// ─── دعوت‌شده‌ها ────────────────────────────────────────────────────────

function InviteesTab({
  query,
  commissionOnWallet,
}: {
  query: ReturnType<typeof useAffiliateInvitees>;
  commissionOnWallet: boolean;
}) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (query.isLoading) {
    return (
      <PanelCard className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-md" />)}
      </PanelCard>
    );
  }
  const invitees = query.data ?? [];
  if (invitees.length === 0) {
    return (
      <PanelEmptyState
        icon={UserRound}
        title="هنوز کسی با لینک شما ثبت‌نام نکرده است."
        hint="لینک دعوت را برای مشتریان و همکارانتان ارسال کنید؛ لیست آنها با شماره تماس و وضعیت پرداخت اینجا نمایش داده می‌شود."
      />
    );
  }

  return (
    <PanelCard className="p-0 sm:p-0">
      <ul className="divide-y divide-border/70">
        {invitees.map((inv) => {
          const approvedPaid = inv.payments.filter((p) => p.approved).reduce((s, p) => s + p.amount, 0);
          const hasPending = inv.payments.some((p) => !p.approved);
          const open = openId === inv.id;
          return (
            <li key={inv.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : inv.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-secondary/30"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                  {inv.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="text-sm">{inv.name}</b>
                    {inv.payments.length === 0 ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">بدون پرداخت</span>
                    ) : hasPending ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">فیش در انتظار تایید</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">پرداخت تاییدشده</span>
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>عضویت: {dateFa(inv.createdAt)}</span>
                    {approvedPaid > 0 && <span>مجموع پرداخت: {priceFa(approvedPaid)}</span>}
                  </span>
                </span>
                <a
                  href={`tel:${inv.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                  aria-label={`تماس با ${inv.name}`}
                >
                  <Phone size={13} />
                  <span dir="ltr" className="font-mono">{toFa(inv.phone)}</span>
                </a>
                <ChevronDown size={16} className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
              </button>

              {open && (
                <div className="border-t border-dashed bg-secondary/20 px-4 py-3">
                  {inv.payments.length === 0 ? (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <CircleAlert size={13} className="text-amber-500" />
                      هنوز پرداختی ثبت نشده — با تماس و پیگیری، او را برای خرید بسته یا تکمیل پرداخت تشویق کنید.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {inv.payments.map((p) => {
                        const commissionable = p.source === 'package' || commissionOnWallet;
                        return (
                          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-xs">
                            <span className="flex items-center gap-2">
                              {p.source === 'package' ? <Store size={14} className="text-primary" /> : <Wallet size={14} className="text-muted-foreground" />}
                              <span>
                                <b>{p.title}</b>
                                <span className="mt-0.5 block text-[10px] text-muted-foreground">{dateFa(p.createdAt)}</span>
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <b>{priceFa(p.amount)}</b>
                              {p.approved ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">تاییدشده</span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">در انتظار تایید</span>
                              )}
                              {!commissionable && (
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">مشمول کمیسیون نیست</span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}

// ─── درآمدها ───────────────────────────────────────────────────────────

function EarningsTab({ query }: { query: ReturnType<typeof useAffiliateEarnings> }) {
  if (query.isLoading) {
    return (
      <PanelCard className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-md" />)}
      </PanelCard>
    );
  }
  const earnings = query.data ?? [];
  if (earnings.length === 0) {
    return (
      <PanelEmptyState
        icon={Wallet}
        title="هنوز درآمدی ثبت نشده است."
        hint="با تایید پرداخت اولین مشتری معرفی‌شده، سهم شما اینجا و در کیف پول نمایش داده می‌شود."
      />
    );
  }

  const paid = earnings.filter((e) => e.approved).reduce((s, e) => s + e.amount, 0);
  const pending = earnings.filter((e) => !e.approved).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <PanelCard className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-md bg-emerald-50 text-emerald-600"><BadgeCheck size={19} /></span>
          <div>
            <p className="text-[11px] text-muted-foreground">واریزشده به کیف پول</p>
            <p className="mt-0.5 text-sm font-extrabold text-emerald-600">{priceFa(paid)}</p>
          </div>
        </PanelCard>
        <PanelCard className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-md bg-amber-50 text-amber-600"><Clock size={19} /></span>
          <div>
            <p className="text-[11px] text-muted-foreground">در انتظار تایید پرداخت مشتری</p>
            <p className="mt-0.5 text-sm font-extrabold text-amber-600">{priceFa(pending)}</p>
          </div>
        </PanelCard>
      </div>

      <PanelCard className="p-0 sm:p-0">
        <ul className="divide-y divide-border/70">
          {earnings.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 p-4">
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-md',
                  e.tier === 1 ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-600',
                )}
                title={e.tier === 1 ? 'مشتری مستقیم' : 'مشتری بازاریاب زیرمجموعه'}
              >
                {e.tier === 1 ? <UserRound size={18} /> : <Users size={18} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <b>{e.payerName}</b>
                  <span className="text-[11px] font-normal text-muted-foreground">— {e.sourceTitle}</span>
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  پرداخت {priceFa(e.paymentAmount)} × {toFa(e.percent)}٪
                  {e.tier === 2 && e.viaMarketerName && <> — سهم از فروش زیرمجموعه «{e.viaMarketerName}»</>}
                  {' '}· {dateFa(e.createdAt)}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p className={cn('text-sm font-extrabold', e.approved ? 'text-emerald-600' : 'text-amber-600')}>
                  +{priceFa(e.amount)}
                </p>
                <p className={cn('mt-0.5 text-[10px]', e.approved ? 'text-emerald-600' : 'text-amber-600')}>
                  {e.approved ? 'واریزشده' : 'در انتظار تایید پرداخت'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </PanelCard>
    </div>
  );
}

// ─── زیرمجموعه‌ها (مدیر بازاریابی) ──────────────────────────────────────

function SubsTab({
  query,
  level2Percent,
}: {
  query: ReturnType<typeof useAffiliateSubMarketers>;
  level2Percent: number;
}) {
  if (query.isLoading) {
    return (
      <PanelCard className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-md" />)}
      </PanelCard>
    );
  }
  const subs = query.data ?? [];
  if (subs.length === 0) {
    return (
      <PanelEmptyState
        icon={Users}
        title="هنوز بازاریاب زیرمجموعه ندارید."
        hint="لینک دعوت خود را برای علاقه‌مندان بازاریابی ارسال کنید؛ پس از ثبت‌نام و پذیرش قرارداد توسط آنها، ادمین آنها را زیرمجموعه شما ثبت می‌کند."
      />
    );
  }

  return (
    <div className="space-y-3">
      <PanelCard className="flex items-start gap-2.5 border-amber-200/70 bg-amber-50/60 p-3.5">
        <Users size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-[11px] leading-6 text-foreground/80">
          به‌ازای هر فروش مشتریان بازاریابان زیرمجموعه شما، <b>{toFa(level2Percent)}٪</b> به‌طور جداگانه به کیف پول شما واریز می‌شود
          (سهم خودِ بازاریاب زیرمجموعه جداگانه و کامل پرداخت می‌شود). جلب بازاریاب بیشتر = درآمد بیشتر.
        </p>
      </PanelCard>

      <div className="grid gap-3 sm:grid-cols-2">
        {subs.map((s) => (
          <PanelCard key={s.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-50 text-sm font-extrabold text-amber-600">
                {s.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{s.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  بازاریاب زیرمجموعه از {dateFa(s.activeSince)} — کد {toFa(s.referralCode)}
                </p>
              </div>
              <a
                href={`tel:${s.phone}`}
                className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                aria-label={`تماس با ${s.name}`}
              >
                <Phone size={13} />
                <span dir="ltr" className="font-mono">{toFa(s.phone)}</span>
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-secondary/40 px-3 py-2">
                <span className="block text-[10px] text-muted-foreground">دعوت‌شده‌های او</span>
                <b className="mt-0.5 block">{toFa(s.inviteeCount)} نفر</b>
              </div>
              <div className="rounded-md bg-secondary/40 px-3 py-2">
                <span className="block text-[10px] text-muted-foreground">فروش مشتریان او</span>
                <b className="mt-0.5 block">{priceFa(s.salesTotal)}</b>
              </div>
            </div>
          </PanelCard>
        ))}
      </div>
    </div>
  );
}

// ─── پیام‌ها با ادمین ──────────────────────────────────────────────────

function MessagesTab({ query }: { query: ReturnType<typeof useAffiliateMessages> }) {
  const [text, setText] = useState('');
  const sendMutation = useSendAffiliateMessage();

  if (query.isLoading) {
    return (
      <PanelCard className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
      </PanelCard>
    );
  }
  const messages = query.data ?? [];

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sendMutation.isPending) return;
    sendMutation.mutate(body, { onSuccess: () => setText('') });
  };

  return (
    <PanelCard>
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
        <MessageSquare size={15} className="text-primary" />
        پیام‌ها با پشتیبانی ایمچ
      </h2>

      {messages.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">پیامی نیست — سوالی دارید، بنویسید.</p>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-y-auto pe-1">
          {messages.map((m) => (
            <li key={m.id} className={cn('flex', m.fromAdmin ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs leading-6',
                  m.fromAdmin ? 'rounded-ss-none bg-secondary' : 'rounded-se-none bg-primary text-primary-foreground',
                )}
              >
                <p className="mb-1 flex items-center gap-1.5 text-[10px] opacity-70">
                  {m.fromAdmin ? 'پشتیبانی ایمچ' : 'شما'} · {dateFa(m.createdAt)}
                </p>
                {m.body}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={send} className="mt-4 flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پیام خود را بنویسید…"
          className="rounded-md text-xs"
          aria-label="متن پیام به پشتیبانی"
        />
        <Button type="submit" size="icon" className="shrink-0 rounded-md" disabled={!text.trim() || sendMutation.isPending} aria-label="ارسال پیام">
          {sendMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </Button>
      </form>
    </PanelCard>
  );
}

// ─── دکمه کپی ──────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="shrink-0 gap-1.5 rounded-md text-xs"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
    >
      {copied ? <BadgeCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {copied ? 'کپی شد' : 'کپی'}
    </Button>
  );
}
