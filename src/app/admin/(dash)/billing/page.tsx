'use client';

/**
 * تنظیمات کیف شارژ و مصرف شارژ (خواسته مالک ۳۱-۱۰) — همهٔ هزینه‌ها/درصدها/
 * سقف‌های سایت از همین صفحه تعیین می‌شود؛ هیچ عددی در کد hardcode نیست:
 *  • پکیج‌های شارژ کیف پول (مبلغ + درصد اضافه) — افزودن/حذف آزاد
 *  • شارژ دلخواه (سقف + پله‌های درصد) — حداقل خودکار = گران‌ترین پکیج
 *  • نردبان (قیمت ماه + حداکثر ماه)
 *  • پیشنهاد تامین (سقف روزانه به تفکیک سطح بسته)
 *  • ارسال گروهی (هزینه هر گیرنده + سقف روزانه/هر ارسال)
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Loader2, Plus, Save, Settings2, Trash2, TrendingUp, Users } from 'lucide-react';
import { fetchAdminBilling, updateAdminBilling } from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { priceFa, toFa } from '@/lib/format';
import type { BillingConfig } from '@/lib/types';

interface PkgRow {
  key: string;
  amount: string;
  bonusPercent: string;
}
interface TierRow {
  aboveAmount: string;
  percent: string;
}
interface LimitRow {
  pakageType: string;
  label: string;
  limit: string;
}

/** فرم محلی — همهٔ اعداد به‌صورت رشته برای ویرایش راحت */
interface FormState {
  packages: PkgRow[];
  customMax: string;
  tiers: TierRow[];
  ladderPrice: string;
  ladderMax: string;
  limits: LimitRow[];
  groupPrice: string;
  groupDay: string;
  groupBatch: string;
}

const n = (s: string): number => Math.round(Number(s.replace(/[^\d]/g, '')) || 0);

function toForm(c: BillingConfig): FormState {
  return {
    packages: c.chargePackages.map((p) => ({
      key: p.key,
      amount: String(p.amount),
      bonusPercent: String(p.bonusPercent),
    })),
    customMax: String(c.customCharge.maxAmount),
    tiers: c.customCharge.tiers.map((t) => ({
      aboveAmount: String(t.aboveAmount),
      percent: String(t.percent),
    })),
    ladderPrice: String(c.ladder.monthlyPrice),
    ladderMax: String(c.ladder.maxMonths),
    limits: c.supplyOffer.dailyLimits.map((l) => ({
      pakageType: String(l.pakageType),
      label: l.label,
      limit: String(l.limit),
    })),
    groupPrice: String(c.groupSend.perRecipientPrice),
    groupDay: String(c.groupSend.maxPerDay),
    groupBatch: String(c.groupSend.maxBatch),
  };
}

export default function AdminBillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-billing'],
    queryFn: fetchAdminBilling,
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [prevData, setPrevData] = useState<typeof data>(undefined);

  // بارگیری اولیه — الگوی رسمی React (تنظیم حین رندر، بدون effect)؛ فقط بار اول
  // تا رفرش‌های بعدی ویرایش در جریان ادمین را بازنویسی نکنند
  if (data && prevData === undefined) {
    setPrevData(data);
    setForm(toForm(data));
  }

  const save = useMutation({
    mutationFn: (c: BillingConfig) => updateAdminBilling(c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-billing'] });
      queryClient.invalidateQueries({ queryKey: ['billing-config'] });
      toast({ description: 'تنظیمات کیف شارژ و مصرف شارژ ذخیره شد.' });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  if (isLoading || !form) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  const patch = (p: Partial<FormState>) => setForm((f) => (f ? { ...f, ...p } : f));

  /** حداقل شارژ دلخواه — خودکار از گران‌ترین پکیج محاسبه می‌شود */
  const customMin = form.packages.reduce((m, p) => Math.max(m, n(p.amount)), 0);

  const buildConfig = (): BillingConfig => ({
    chargePackages: form.packages.map((p) => ({
      key: p.key.trim() || `p${n(p.amount)}`,
      amount: n(p.amount),
      bonusPercent: Math.min(100, n(p.bonusPercent)),
    })),
    customCharge: {
      minAmount: customMin,
      maxAmount: n(form.customMax),
      tiers: form.tiers
        .map((t) => ({ aboveAmount: n(t.aboveAmount), percent: Math.min(100, n(t.percent)) }))
        .sort((a, b) => a.aboveAmount - b.aboveAmount),
    },
    ladder: { monthlyPrice: n(form.ladderPrice), maxMonths: Math.max(1, n(form.ladderMax)) },
    supplyOffer: {
      dailyLimits: form.limits.map((l) => ({
        pakageType: Math.max(1, n(l.pakageType)),
        label: l.label.trim() || `سطح ${n(l.pakageType)}`,
        limit: n(l.limit),
      })),
    },
    groupSend: {
      perRecipientPrice: n(form.groupPrice),
      maxPerDay: Math.max(1, n(form.groupDay)),
      maxBatch: Math.max(1, n(form.groupBatch)),
    },
  });

  const validate = (): string | null => {
    if (form.packages.length === 0) return 'حداقل یک پکیج شارژ لازم است.';
    const keys = new Set<string>();
    for (const p of form.packages) {
      if (n(p.amount) < 10_000) return 'مبلغ پکیج شارژ باید حداقل ۱۰ هزار تومان باشد.';
      if (keys.has(p.key.trim())) return 'کلید پکیج‌ها نباید تکراری باشد.';
      keys.add(p.key.trim());
    }
    if (n(form.customMax) < customMin) return 'سقف شارژ دلخواه نباید از حداقل آن کمتر باشد.';
    if (form.tiers.length === 0 || n(form.tiers[0].aboveAmount) !== 0) {
      return 'اولین پلهٔ شارژ دلخواه باید از مبلغ ۰ شروع شود.';
    }
    if (n(form.ladderPrice) < 1000) return 'قیمت ماهانهٔ نردبان نامعتبر است.';
    if (form.limits.length === 0) return 'حداقل یک سطح بسته برای سقف پیشنهاد تامین لازم است.';
    return null;
  };

  const onSave = () => {
    const err = validate();
    if (err) {
      toast({ description: err, variant: 'destructive' });
      return;
    }
    save.mutate(buildConfig());
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* سرصفحه */}
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Settings2 size={21} />
        </span>
        <div>
          <h1 className="text-lg font-extrabold">تنظیمات کیف شارژ و مصرف شارژ</h1>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            همهٔ هزینه‌ها و سقف‌های مصرف سایت از همین صفحه تعیین می‌شود؛ تغییرات بلافاصله روی کل سایت اعمال می‌شود.
          </p>
        </div>
      </div>

      {/* پکیج‌های شارژ */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <Coins size={16} className="text-primary" /> پکیج‌های شارژ کیف پول
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          پکیج‌هایی که در صفحهٔ کیف پول نمایش داده می‌شوند — مبلغ واریز + درصد شارژ اضافه.
        </p>
        <ul className="mt-3 space-y-2">
          {form.packages.map((p, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Input
                dir="ltr"
                value={p.key}
                onChange={(e) =>
                  patch({ packages: form.packages.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)) })
                }
                placeholder="کلید (p100)"
                className="h-9 w-24 rounded-md text-center text-xs"
                aria-label="کلید پکیج"
              />
              <Input
                dir="ltr"
                inputMode="numeric"
                value={p.amount ? toFa(p.amount) : ''}
                onChange={(e) =>
                  patch({
                    packages: form.packages.map((r, idx) =>
                      idx === i ? { ...r, amount: e.target.value.replace(/[^\d]/g, '').slice(0, 10) } : r,
                    ),
                  })
                }
                placeholder="مبلغ (تومان)"
                className="h-9 w-32 rounded-md text-center text-xs font-num"
                aria-label="مبلغ پکیج"
              />
              <Input
                dir="ltr"
                inputMode="numeric"
                value={p.bonusPercent ? toFa(p.bonusPercent) : ''}
                onChange={(e) =>
                  patch({
                    packages: form.packages.map((r, idx) =>
                      idx === i ? { ...r, bonusPercent: e.target.value.replace(/[^\d]/g, '').slice(0, 3) } : r,
                    ),
                  })
                }
                placeholder="٪ اضافه"
                className="h-9 w-20 rounded-md text-center text-xs font-num"
                aria-label="درصد شارژ اضافه"
              />
              <span className="text-[11px] text-muted-foreground">
                = {priceFa(Math.round((n(p.amount) * (100 + n(p.bonusPercent))) / 100))} شارژ
              </span>
              <button
                type="button"
                onClick={() => patch({ packages: form.packages.filter((_, idx) => idx !== i) })}
                className="ms-auto grid size-8 place-items-center rounded-md text-red-500 hover:bg-red-50"
                aria-label="حذف پکیج"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 rounded-md"
          onClick={() =>
            patch({
              packages: [...form.packages, { key: `p${form.packages.length + 1}`, amount: '', bonusPercent: '0' }],
            })
          }
        >
          <Plus size={14} /> افزودن پکیج
        </Button>
      </section>

      {/* شارژ دلخواه */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-extrabold">شارژ دلخواه (دکمهٔ «سایر»)</h2>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          حداقل مبلغ خودکار است: <b className="text-foreground">{priceFa(customMin)}</b> (گران‌ترین پکیج شارژ).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Label className="text-[11px]">سقف مبلغ (تومان):</Label>
          <Input
            dir="ltr"
            inputMode="numeric"
            value={form.customMax ? toFa(form.customMax) : ''}
            onChange={(e) => patch({ customMax: e.target.value.replace(/[^\d]/g, '').slice(0, 11) })}
            className="h-9 w-36 rounded-md text-center text-xs font-num"
            aria-label="سقف شارژ دلخواه"
          />
        </div>
        <p className="mt-3 text-[11px] font-bold">پله‌های درصد شارژ اضافه:</p>
        <ul className="mt-2 space-y-2">
          {form.tiers.map((t, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {n(t.aboveAmount) === 0 ? 'از ابتدا تا' : 'بیشتر از'}
              </span>
              <Input
                dir="ltr"
                inputMode="numeric"
                value={t.aboveAmount ? toFa(t.aboveAmount) : ''}
                onChange={(e) =>
                  patch({
                    tiers: form.tiers.map((r, idx) =>
                      idx === i ? { ...r, aboveAmount: e.target.value.replace(/[^\d]/g, '').slice(0, 11) } : r,
                    ),
                  })
                }
                className="h-9 w-32 rounded-md text-center text-xs font-num"
                aria-label="آستانه پله"
                disabled={n(t.aboveAmount) === 0 && i === 0}
              />
              <span className="text-[11px] text-muted-foreground">تومان →</span>
              <Input
                dir="ltr"
                inputMode="numeric"
                value={t.percent ? toFa(t.percent) : ''}
                onChange={(e) =>
                  patch({
                    tiers: form.tiers.map((r, idx) =>
                      idx === i ? { ...r, percent: e.target.value.replace(/[^\d]/g, '').slice(0, 3) } : r,
                    ),
                  })
                }
                className="h-9 w-20 rounded-md text-center text-xs font-num"
                aria-label="درصد پله"
              />
              <span className="text-[11px]">٪ شارژ اضافه</span>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => patch({ tiers: form.tiers.filter((_, idx) => idx !== i) })}
                  className="ms-auto grid size-8 place-items-center rounded-md text-red-500 hover:bg-red-50"
                  aria-label="حذف پله"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 rounded-md"
          onClick={() => patch({ tiers: [...form.tiers, { aboveAmount: '', percent: '' }] })}
        >
          <Plus size={14} /> افزودن پله
        </Button>
      </section>

      {/* نردبان */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <TrendingUp size={16} className="text-amber-600" /> نردبان آگهی
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Label className="text-[11px]">قیمت هر ماه (تومان):</Label>
          <Input
            dir="ltr"
            inputMode="numeric"
            value={form.ladderPrice ? toFa(form.ladderPrice) : ''}
            onChange={(e) => patch({ ladderPrice: e.target.value.replace(/[^\d]/g, '').slice(0, 9) })}
            className="h-9 w-32 rounded-md text-center text-xs font-num"
            aria-label="قیمت ماهانه نردبان"
          />
          <Label className="ms-3 text-[11px]">حداکثر ماه:</Label>
          <Input
            dir="ltr"
            inputMode="numeric"
            value={form.ladderMax ? toFa(form.ladderMax) : ''}
            onChange={(e) => patch({ ladderMax: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })}
            className="h-9 w-16 rounded-md text-center text-xs font-num"
            aria-label="حداکثر ماه نردبان"
          />
        </div>
      </section>

      {/* پیشنهاد تامین */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <Users size={16} className="text-emerald-600" /> پیشنهاد تامین — سقف روزانهٔ هر سطح بسته
        </h2>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          فروشندهٔ دارندهٔ بسته، روزانه تا این تعداد خریدارِ متمایز پیشنهاد رایگان می‌فرستد (تکرار به یک خریدار سهمیه
          نمی‌گیرد).
        </p>
        <ul className="mt-3 space-y-2">
          {form.limits.map((l, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">سطح</span>
              <Input
                dir="ltr"
                inputMode="numeric"
                value={toFa(l.pakageType)}
                onChange={(e) =>
                  patch({
                    limits: form.limits.map((r, idx) =>
                      idx === i ? { ...r, pakageType: e.target.value.replace(/[^\d]/g, '').slice(0, 1) } : r,
                    ),
                  })
                }
                className="h-9 w-14 rounded-md text-center text-xs font-num"
                aria-label="سطح بسته"
              />
              <Input
                value={l.label}
                onChange={(e) =>
                  patch({ limits: form.limits.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)) })
                }
                placeholder="عنوان (شش ماهه)"
                className="h-9 w-32 rounded-md text-center text-xs"
                aria-label="عنوان سطح"
              />
              <Input
                dir="ltr"
                inputMode="numeric"
                value={l.limit ? toFa(l.limit) : ''}
                onChange={(e) =>
                  patch({
                    limits: form.limits.map((r, idx) =>
                      idx === i ? { ...r, limit: e.target.value.replace(/[^\d]/g, '').slice(0, 4) } : r,
                    ),
                  })
                }
                placeholder="سقف"
                className="h-9 w-20 rounded-md text-center text-xs font-num"
                aria-label="سقف روزانه"
              />
              <span className="text-[11px] text-muted-foreground">خریدار در شبانه‌روز</span>
              <button
                type="button"
                onClick={() => patch({ limits: form.limits.filter((_, idx) => idx !== i) })}
                className="ms-auto grid size-8 place-items-center rounded-md text-red-500 hover:bg-red-50"
                aria-label="حذف سطح"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 rounded-md"
          onClick={() => patch({ limits: [...form.limits, { pakageType: '', label: '', limit: '' }] })}
        >
          <Plus size={14} /> افزودن سطح
        </Button>
      </section>

      {/* ارسال گروهی */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-extrabold">ارسال گروهی پیشنهاد تامین</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Label className="text-[11px]">هزینه هر گیرنده (تومان):</Label>
          <Input
            dir="ltr"
            inputMode="numeric"
            value={form.groupPrice ? toFa(form.groupPrice) : ''}
            onChange={(e) => patch({ groupPrice: e.target.value.replace(/[^\d]/g, '').slice(0, 9) })}
            className="h-9 w-32 rounded-md text-center text-xs font-num"
            aria-label="هزینه هر گیرنده"
          />
          <Label className="ms-3 text-[11px]">سقف روزانه:</Label>
          <Input
            dir="ltr"
            inputMode="numeric"
            value={form.groupDay ? toFa(form.groupDay) : ''}
            onChange={(e) => patch({ groupDay: e.target.value.replace(/[^\d]/g, '').slice(0, 5) })}
            className="h-9 w-24 rounded-md text-center text-xs font-num"
            aria-label="سقف روزانه گروهی"
          />
          <Label className="ms-3 text-[11px]">سقف هر ارسال:</Label>
          <Input
            dir="ltr"
            inputMode="numeric"
            value={form.groupBatch ? toFa(form.groupBatch) : ''}
            onChange={(e) => patch({ groupBatch: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
            className="h-9 w-20 rounded-md text-center text-xs font-num"
            aria-label="سقف هر ارسال"
          />
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          هزینهٔ ارسال گروهی لحظهٔ ارسال به‌صورت اتمیک از کیف پول فروشنده کسر می‌شود و در تراکنش‌های او ثبت می‌شود.
        </p>
      </section>

      {/* ذخیره */}
      <Button className="w-full rounded-md" onClick={onSave} disabled={save.isPending}>
        {save.isPending ? (
          <>
            <Loader2 size={15} className="animate-spin" /> در حال ذخیره…
          </>
        ) : (
          <>
            <Save size={15} /> ذخیرهٔ تنظیمات
          </>
        )}
      </Button>
    </div>
  );
}
