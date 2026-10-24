'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubmitBuyRequest } from '@/lib/mock/hooks';
import { toFa } from '@/lib/format';

/**
 * فرم ثبت درخواست خرید (RFQ) — همان الگوی باسکول در صفحه اصلی:
 * نام محصول (اختیاری) + نوع + مقدار نیاز → فروشندگان مرتبط قیمت می‌دهند.
 */
export function RfqForm() {
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('');
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const mutation = useSubmitBuyRequest();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number.isNaN(Number(amount))) return;
    mutation.mutate(
      { productName: productName.trim() || 'نامشخص', productType: productType.trim(), amount: Number(amount) },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <section id="rfq" aria-labelledby="rfq-title" className="bg-gradient-to-b from-secondary/60 to-background">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-12 lg:grid-cols-2 lg:px-6">
        {/* سمت متن */}
        <div className="space-y-4">
          <h2 id="rfq-title" className="text-2xl font-extrabold leading-tight sm:text-3xl">
            خریدار عمده هستید؟
            <span className="block text-primary">با یک درخواست، از چندین فروشنده قیمت بگیرید.</span>
          </h2>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            نیازمندی خود را ثبت کنید تا فروشندگان فعال آن دسته، پیشنهاد قیمت خود را برایتان ارسال کنند.
            بدون واسطه، بدون هزینه ثبت — دقیقاً همان فرایندی که در بازار سنتی دنبال آن هستید، اما آنلاین.
          </p>
          <ul className="space-y-2 text-sm">
            {['ثبت رایگان و بدون نیاز به عضویت ویژه', 'دریافت پیشنهاد از فروشندگان احراز‌شده', 'مقایسه قیمت‌ها و انتخاب بهترین پیشنهاد'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 size={16} className="shrink-0 text-primary" />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Users size={18} /></span>
              <div className="text-xs leading-5"><b className="block text-sm">+۲٬۴۰۰</b>درخواست فعال</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-gold-soft text-gold-foreground"><Send size={18} /></span>
              <div className="text-xs leading-5"><b className="block text-sm">۹۸٪</b>پاسخ در ۲۴ ساعت</div>
            </div>
          </div>
        </div>

        {/* فرم */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 size={32} />
              </span>
              <div>
                <h3 className="text-lg font-extrabold">درخواست شما ثبت شد!</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  فروشندگان دسته «{productName || 'انتخابی'}» پیشنهادهای خود را برای شما ارسال می‌کنند.
                </p>
              </div>
              <Button variant="outline" onClick={() => { setDone(false); setProductName(''); setProductType(''); setAmount(''); }}>
                ثبت درخواست دیگر
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rfq-name">نام محصول مورد نیاز</Label>
                <Input
                  id="rfq-name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="مثال: خرما"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rfq-type">نوع محصول <span className="text-xs font-normal text-muted-foreground">(اختیاری)</span></Label>
                <Input
                  id="rfq-type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="مثال: مضافتی"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rfq-amount">
                  میزان نیازمندی <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="rfq-amount"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="مثال: ۵۰٬۰۰۰"
                    className="rounded-xl pe-16"
                    required
                  />
                  <span className="absolute inset-y-0 end-3 my-auto h-fit text-xs text-muted-foreground">کیلوگرم</span>
                </div>
                {amount && <p className="text-[11px] text-muted-foreground">معادل {toFa(Number(amount))} کیلوگرم</p>}
              </div>
              <Button type="submit" size="lg" className="w-full rounded-xl" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {mutation.isPending ? 'در حال ثبت…' : 'ثبت درخواست خرید'}
              </Button>
              <p className="text-center text-[11px] leading-5 text-muted-foreground">
                با ثبت درخواست، قوانین مِگان را می‌پذیرید. اطلاعات تماس شما تا ارسال پیشنهاد محفوظ می‌ماند.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
