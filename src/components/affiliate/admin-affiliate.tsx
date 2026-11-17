'use client';

/**
 * پنل ادمین بازاریابی — مدیریت کامل برنامه افلیت:
 *   • تنظیمات قرارداد: درصدهای سطح ۱ و ۲، تعداد سال‌های سهم‌بری،
 *     تیک منابع پرداخت (خرید بسته / شارژ کیف پول)
 *   • بازاریاب‌ها: ارتقا به مدیر بازاریابی / بازگشت به بازاریاب،
 *     دیدن دعوت‌شده‌ها و پرداخت‌های آنها (مشتری بابت چه چیزی پرداخت کرده)،
 *     کیف پول بازاریابی و ارسال پیام
 *   • فید پرداخت‌های اخیر مشتریان با سهم ذی‌نفعان
 * نکته مهم: تغییر تنظیمات فقط روی قراردادهای جدید اعمال می‌شود (snapshot).
 */

import { useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  Eye,
  MessageSquare,
  Package,
  Send,
  Settings2,
  ShieldCheck,
  Store,
  UserRoundCog,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { ContractText } from '@/components/affiliate/contract-text';
import {
  useAdminAffiliateSettings,
  useAdminAffiliates,
  useAdminPayments,
  useSetAffiliateRole,
  useUpdateAffiliateSettings,
} from '@/lib/affiliate-hooks';
import { useToast } from '@/hooks/use-toast';
import { dateFa, priceFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AdminAffiliateRow, AffiliateRole, AffiliateSettings } from '@/lib/affiliate';

export function AdminAffiliate() {
  return (
    <div className="space-y-4">
      <PanelCard className="flex items-center gap-2.5 border-primary/30 bg-primary/5 p-3.5">
        <ShieldCheck size={17} className="shrink-0 text-primary" />
        <p className="text-[11px] leading-6 text-foreground/80">
          <b>پنل مدیریت بازاریابی</b> — در نسخه واقعی فقط برای مدیران سایت قابل دسترسی است (نمونه نمایشی).
          تغییر تنظیمات فقط روی قراردادهای جدید اعمال می‌شود؛ شرایط بازاریاب‌های فعلی (snapshot زمان پذیرش) تغییر نمی‌کند.
        </p>
      </PanelCard>

      <SettingsSection />
      <MarketersSection />
      <PaymentsSection />
    </div>
  );
}

// ─── تنظیمات قرارداد ───────────────────────────────────────────────────

function SettingsSection() {
  const settingsQ = useAdminAffiliateSettings();
  const updateMutation = useUpdateAffiliateSettings();
  const { toast } = useToast();

  const [form, setForm] = useState<AffiliateSettings | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // پر کردن فرم با دیتای سرور — الگوی تنظیم state در زمان رندر (بدون افکت)
  const settingsData = settingsQ.data ?? null;
  const [lastData, setLastData] = useState<AffiliateSettings | null>(null);
  if (settingsData && settingsData !== lastData) {
    setLastData(settingsData);
    setForm(settingsData);
  }

  if (settingsQ.isLoading || !form) {
    return <PanelCard className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}</PanelCard>;
  }

  const set = <K extends keyof AffiliateSettings>(key: K, value: AffiliateSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = () => {
    updateMutation.mutate(form, {
      onSuccess: () => toast({ description: 'تنظیمات ذخیره شد — از قرارداد بازاریاب‌های بعدی اعمال می‌شود.' }),
    });
  };

  return (
    <PanelCard>
      <h1 className="mb-1 flex items-center gap-1.5 text-base font-extrabold">
        <Settings2 size={17} className="text-primary" />
        تنظیمات قرارداد بازاریابی
      </h1>
      <p className="mb-4 text-[11px] leading-5 text-muted-foreground">
        مقادیر پیش‌فرض برنامه — مبنای متن قرارداد برای بازاریاب‌های جدید.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="l1">سهم بازاریاب از پرداخت مشتری (٪)</Label>
          <Input
            id="l1"
            dir="ltr"
            inputMode="numeric"
            className="rounded-md text-center font-mono"
            value={String(form.level1Percent)}
            onChange={(e) => set('level1Percent', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="l2">سهم مدیر از فروش زیرمجموعه‌ها (٪)</Label>
          <Input
            id="l2"
            dir="ltr"
            inputMode="numeric"
            className="rounded-md text-center font-mono"
            value={String(form.level2Percent)}
            onChange={(e) => set('level2Percent', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="years">مدت سهم‌بری از هر مشتری (سال)</Label>
          <Input
            id="years"
            dir="ltr"
            inputMode="numeric"
            className="rounded-md text-center font-mono"
            value={String(form.commissionYears)}
            onChange={(e) => set('commissionYears', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-bold">پرداخت‌هایی که سهم بازاریاب می‌برند (تیک بزنید):</p>
        <div className="flex flex-wrap gap-2">
          <Tick
            label="خرید بسته (ارتقا عضویت)"
            hint="پیش‌فرض فعال"
            checked={form.commissionOnPackage}
            onChange={(v) => set('commissionOnPackage', v)}
          />
          <Tick
            label="شارژ کیف پول"
            hint="پیش‌فرض غیرفعال"
            checked={form.commissionOnWalletCharge}
            onChange={(v) => set('commissionOnWalletCharge', v)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button className="rounded-md" size="sm" onClick={save} disabled={updateMutation.isPending}>
          <BadgeCheck size={14} /> {updateMutation.isPending ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-md text-xs text-muted-foreground"
          onClick={() => setShowPreview((v) => !v)}
        >
          <ChevronDown size={13} className={cn('transition-transform', showPreview && 'rotate-180')} />
          پیش‌نمایش قراردادِ بازاریاب‌های جدید
        </Button>
      </div>

      {showPreview && (
        <div className="mt-3 max-h-72 overflow-y-auto rounded-md border bg-secondary/30 p-4">
          <ContractText settings={form} />
        </div>
      )}
    </PanelCard>
  );
}

function Tick({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-start text-xs transition-colors',
        checked ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-foreground/25',
      )}
    >
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded border transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
        )}
      >
        {checked && <BadgeCheck size={13} />}
      </span>
      <span>
        <b>{label}</b>
        {hint && <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

// ─── بازاریاب‌ها ───────────────────────────────────────────────────────

function MarketersSection() {
  const rowsQ = useAdminAffiliates();
  const [detail, setDetail] = useState<AdminAffiliateRow | null>(null);
  const [messageFor, setMessageFor] = useState<AdminAffiliateRow | null>(null);

  if (rowsQ.isLoading) {
    return <PanelCard className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}</PanelCard>;
  }
  const rows = rowsQ.data ?? [];
  if (rows.length === 0) {
    return <PanelEmptyState icon={Users} title="هنوز بازاریابی ثبت‌نام نکرده است." hint="با انتشار لینک برنامه در فوتر سایت، کاربران به صفحه قرارداد هدایت می‌شوند." />;
  }

  return (
    <>
      <PanelCard className="p-0 sm:p-0">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Users size={15} className="text-primary" />
            بازاریاب‌ها و مدیران بازاریابی
          </h2>
          <span className="text-[11px] text-muted-foreground">{toFa(rows.length)} نفر</span>
        </div>

        {/* جدول دسکتاپ */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-secondary/40 text-muted-foreground">
                <th className="p-3 text-start font-medium">بازاریاب</th>
                <th className="p-3 text-start font-medium">نقش</th>
                <th className="p-3 text-start font-medium">کد</th>
                <th className="p-3 text-start font-medium">دعوت‌شده‌ها</th>
                <th className="p-3 text-start font-medium">فروش تاییدشده</th>
                <th className="p-3 text-start font-medium">کیف پول</th>
                <th className="p-3 text-start font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map((r) => (
                <tr key={r.id} className={cn('transition-colors hover:bg-secondary/20', r.isCurrentUser && 'bg-primary/[0.04]')}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-extrabold text-primary">
                        {r.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-bold">
                          {r.name}
                          {r.isCurrentUser && <span className="ms-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">شما</span>}
                        </p>
                        <p dir="ltr" className="mt-0.5 text-right font-mono text-[10px] text-muted-foreground">{toFa(r.phone)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', r.role === 'manager' ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-foreground/70')}>
                      {r.role === 'manager' ? 'مدیر بازاریابی' : 'بازاریاب'}
                    </span>
                  </td>
                  <td dir="ltr" className="p-3 text-right font-mono text-[11px]">{toFa(r.referralCode)}</td>
                  <td className="p-3 font-bold">{toFa(r.inviteeCount)}</td>
                  <td className="p-3">{priceFa(r.salesTotal)}</td>
                  <td className="p-3 font-bold text-emerald-600">{priceFa(r.walletBalance)}</td>
                  <td className="p-3">
                    <RowActions row={r} onDetail={() => setDetail(r)} onMessage={() => setMessageFor(r)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* کارت موبایل */}
        <ul className="divide-y divide-border/70 md:hidden">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2.5 p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                  {r.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    {r.name}
                    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', r.role === 'manager' ? 'bg-amber-100 text-amber-700' : 'bg-secondary text-foreground/70')}>
                      {r.role === 'manager' ? 'مدیر' : 'بازاریاب'}
                    </span>
                  </p>
                  <p dir="ltr" className="mt-0.5 text-right font-mono text-[10px] text-muted-foreground">{toFa(r.phone)}</p>
                </div>
                <div className="shrink-0 text-end text-[11px]">
                  <span className="block text-muted-foreground">کیف پول</span>
                  <b className="text-emerald-600">{priceFa(r.walletBalance)}</b>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>کد {toFa(r.referralCode)} · {toFa(r.inviteeCount)} دعوت‌شده · فروش {priceFa(r.salesTotal)}</span>
              </div>
              <RowActions row={r} onDetail={() => setDetail(r)} onMessage={() => setMessageFor(r)} />
            </li>
          ))}
        </ul>
      </PanelCard>

      <DetailDialog row={detail} onClose={() => setDetail(null)} />
      <MessageDialog row={messageFor} onClose={() => setMessageFor(null)} />
    </>
  );
}

function RowActions({ row, onDetail, onMessage }: { row: AdminAffiliateRow; onDetail: () => void; onMessage: () => void }) {
  const roleMutation = useSetAffiliateRole();
  const nextRole: AffiliateRole = row.role === 'manager' ? 'marketer' : 'manager';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 rounded-md px-2.5 text-[11px]"
        disabled={roleMutation.isPending}
        onClick={() =>
          roleMutation.mutate(
            { userId: row.id, role: nextRole },
            { onSuccess: () => undefined },
          )
        }
        title={row.role === 'manager' ? 'تبدیل به بازاریاب ساده' : 'ارتقا به مدیر بازاریابی (سهم از زیرمجموعه‌ها)'}
      >
        <UserRoundCog size={13} />
        {row.role === 'manager' ? 'سلب مدیر' : 'مدیر بازاریابی'}
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 rounded-md px-2.5 text-[11px]" onClick={onDetail}>
        <Eye size={13} /> جزئیات
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 rounded-md px-2.5 text-[11px]" onClick={onMessage}>
        <MessageSquare size={13} /> پیام
      </Button>
    </div>
  );
}

// ─── دیالوگ جزئیات بازاریاب: دعوت‌شده‌ها + پرداخت‌ها ─────────────────────

function DetailDialog({ row, onClose }: { row: AdminAffiliateRow | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">
            جزئیات {row?.name} — {row?.role === 'manager' ? 'مدیر بازاریابی' : 'بازاریاب'}
          </DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="کد رفرال" value={toFa(row.referralCode)} />
              <Stat label="دعوت‌شده‌ها" value={`${toFa(row.inviteeCount)} نفر`} />
              <Stat label="فروش تاییدشده" value={priceFa(row.salesTotal)} />
              <Stat label="کیف پول" value={priceFa(row.walletBalance)} highlight />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 font-bold">
                <Users size={13} className="text-primary" /> دعوت‌شده‌ها و پرداخت‌های آنها
              </p>
              {row.earnings.length === 0 && row.invitees.every((i) => i.payments.length === 0) ? (
                <p className="rounded-md border border-dashed p-3 text-center text-muted-foreground">پرداختی ثبت نشده است.</p>
              ) : (
                <ul className="space-y-2">
                  {row.earnings.map((e) => (
                    <li key={e.id} className="rounded-md border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-bold">
                          {e.tier === 1 ? <UserRoundIcon /> : <Users size={13} className="text-amber-500" />}
                          {e.payerName}
                        </span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', e.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                          {e.approved ? 'پرداخت تاییدشده' : 'در انتظار تایید فیش'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                        بابت <b className="text-foreground/80">{e.sourceTitle}</b> — {priceFa(e.paymentAmount)}
                        {' '}· سهم بازاریاب {priceFa(e.amount)} ({toFa(e.percent)}٪)
                        {e.tier === 2 && e.viaMarketerName && <> · مشتریِ زیرمجموعه «{e.viaMarketerName}»</>}
                        {' '}· {dateFa(e.createdAt)}
                      </p>
                    </li>
                  ))}
                  {row.invitees
                    .filter((i) => i.payments.some((p) => p.source === 'wallet'))
                    .flatMap((i) => i.payments.filter((p) => p.source === 'wallet').map((p) => ({ i, p })))
                    .map(({ i, p }) => (
                      <li key={p.id} className="rounded-md border border-dashed bg-secondary/20 p-3">
                        <p className="text-[11px] leading-5 text-muted-foreground">
                          <b className="text-foreground/80">{i.name}</b> — {p.title} ({priceFa(p.amount)})
                          {p.approved ? ' — تاییدشده' : ' — در انتظار تایید'} · مشمول کمیسیون نیست (طبق تیک‌های قرارداد)
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UserRoundIcon() {
  return <UserRoundCog size={13} className="text-primary" />;
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md bg-secondary/40 px-3 py-2">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <b className={cn('mt-0.5 block', highlight && 'text-emerald-600')}>{value}</b>
    </div>
  );
}

// ─── دیالوگ پیام به بازاریاب ───────────────────────────────────────────

function MessageDialog({ row, onClose }: { row: AdminAffiliateRow | null; onClose: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string[]>([]);

  // ریست فرم هنگام باز شدن گفتگوی بازاریاب جدید — الگوی تنظیم state در زمان رندر
  const [lastRow, setLastRow] = useState<AdminAffiliateRow | null>(null);
  if (row !== lastRow) {
    setLastRow(row);
    setText('');
    setSent([]);
  }

  return (
    <Dialog open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-start">پیام به {row?.name}</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-3 text-xs">
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md bg-secondary/30 p-3">
              {sent.length === 0 ? (
                <p className="text-center text-[11px] text-muted-foreground">
                  گفتگو با بازاریاب — پیام‌های ارسالی شما در پنل او هم نمایش داده می‌شود.
                </p>
              ) : (
                sent.map((s, i) => (
                  <p key={i} className="ms-auto w-fit max-w-[85%] rounded-lg rounded-se-none bg-primary px-3 py-2 leading-6 text-primary-foreground">
                    {s}
                  </p>
                ))
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="متن پیام…"
                className="rounded-md text-xs"
                aria-label="متن پیام به بازاریاب"
              />
              <Button
                size="sm"
                className="shrink-0 gap-1.5 rounded-md"
                disabled={!text.trim()}
                onClick={async () => {
                  const { adminSendAffiliateMessage } = await import('@/lib/affiliate');
                  await adminSendAffiliateMessage(row.id, text.trim());
                  setSent((s) => [...s, text.trim()]);
                  setText('');
                  toast({ description: 'پیام ارسال شد — در پنل بازاریاب قابل مشاهده است.' });
                }}
              >
                <Send size={13} /> ارسال
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── فید پرداخت‌های اخیر ───────────────────────────────────────────────

function PaymentsSection() {
  const paymentsQ = useAdminPayments();

  if (paymentsQ.isLoading) {
    return <PanelCard className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</PanelCard>;
  }
  const rows = paymentsQ.data ?? [];
  if (rows.length === 0) return null;

  return (
    <PanelCard className="p-0 sm:p-0">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Package size={15} className="text-primary" />
          پرداخت‌های اخیر مشتریان
        </h2>
        <span className="text-[11px] text-muted-foreground">چه کسی بابت چه چیزی پرداخت کرده</span>
      </div>
      <ul className="divide-y divide-border/70">
        {rows.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-4 text-xs">
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-md',
                p.source === 'package' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
              )}
            >
              {p.source === 'package' ? <Store size={16} /> : <Wallet size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5">
                <b>{p.payerName}</b>
                <span className="text-muted-foreground">— {p.sourceTitle}</span>
                {p.approved ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">تاییدشده</span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">در انتظار تایید</span>
                )}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                معرف: <b className="text-foreground/75">{p.marketerName}</b>
                {p.commissionAmount > 0 && <> — سهم {priceFa(p.commissionAmount)}</>}
                {p.managerName && p.managerCut != null && p.managerCut > 0 && (
                  <> · سهم مدیر {p.managerName}: {priceFa(p.managerCut)}</>
                )}
                {p.commissionAmount === 0 && ' — مشمول کمیسیون نیست'}
                {' '}· {dateFa(p.createdAt)}
              </p>
            </div>
            <b className={cn('shrink-0', p.approved ? 'text-foreground' : 'text-muted-foreground')}>{priceFa(p.amount)}</b>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 border-t p-3 text-[10px] text-muted-foreground">
        <Clock size={11} />
        سهم بازاریاب‌ها فقط پس از تایید فیش/درگاه به کیف پول آنها واریز می‌شود.
      </p>
    </PanelCard>
  );
}
