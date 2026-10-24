'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubmitBuyRequest } from '@/lib/mock/hooks';
import { toFa } from '@/lib/format';

/**
 * فرم ثبت درخواست خرید — عین باسکول: سه فیلد ساده + دکمه ثبت.
 * متن و جای‌نگاری‌ها کلمه‌به‌کلمه از باسکول برداشته شده است.
 */
export function RfqForm() {
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('');
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const mutation = useSubmitBuyRequest();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !amount) return;
    mutation.mutate(
      { productName: productName.trim(), productType: productType.trim(), amount: Number(amount) },
      { onSuccess: () => setDone(true) },
    );
  };

  return (
    <section className="bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          {/* توضیح + آمار — مثل باسکول */}
          <div>
            <p className="max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
              در صورتی که خریدار عمده هستید ، با ثبت یک درخواست خرید، از چندین فروشنده قیمت دریافت کنید.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <p className="text-xl font-bold text-primary">{toFa(24000)} +</p>
                <p className="mt-1 text-xs text-muted-foreground">فروشندگان فعال</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{toFa(3200)} +</p>
                <p className="mt-1 text-xs text-muted-foreground">شرکت های بازرگانی</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{toFa(130)}</p>
                <p className="mt-1 text-xs text-muted-foreground">صنایع مختلف</p>
              </div>
            </div>
          </div>

          {/* فرم — سه فیلد باسکول */}
          <div className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
            {done ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 size={24} />
                </span>
                <p className="text-sm font-bold">درخواست خرید شما ثبت شد.</p>
                <Button variant="outline" size="sm" className="rounded-md" onClick={() => { setDone(false); setProductName(''); setProductType(''); setAmount(''); }}>
                  ثبت درخواست دیگر
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="نام محصول مورد نیاز خود را وارد کنید."
                  className="rounded-md"
                  required
                />
                <Input
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="نوع محصول مورد نیاز خود را وارد کنید."
                  className="rounded-md"
                />
                <div className="relative">
                  <Input
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="میزان نیازمندی محصول را وارد کنید."
                    className="rounded-md pe-16"
                    required
                  />
                  <span className="absolute inset-y-0 end-3 my-auto h-fit text-xs text-muted-foreground">کیلوگرم</span>
                </div>
                <Button type="submit" size="lg" className="w-full rounded-md" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="animate-spin" size={18} />}
                  {mutation.isPending ? 'در حال ثبت…' : 'ثبت درخواست خرید'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
