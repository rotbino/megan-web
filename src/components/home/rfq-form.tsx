'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryPicker } from '@/components/shared/category-picker';
import { UnitInput } from '@/components/shared/unit-input';
import { useSubmitBuyRequest } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { toFa } from '@/lib/format';
import type { Category } from '@/lib/types';

/**
 * فرم ثبت درخواست خرید:
 * ۱) باکس «دسته‌بندی محصول» مودال انتخاب دسته را باز می‌کند (موبایل: بات‌شیت از پایین)
 *    و کاربر تا آخرین نودِ دسته کالا پایین می‌رود.
 * ۲) باکس «نوع کالا» — نمونه هر دسته در پلیس‌هولدر زده می‌شود (مثل: پسته ← «مثلاً فندقی»).
 *    نوع‌هایی که کاربران وارد می‌کنند بعداً به‌عنوان «نوع کالا» زیر برگ همان دسته در
 *    دیتابیس ذخیره می‌شوند (مدل نوع کالا در بک‌اند) تا درخواست خرید به فروشندگان
 *    همان کالا در پنل کاربری برسد.
 */
export function RfqForm() {
  const [category, setCategory] = useState<Category | null>(null);
  const [productType, setProductType] = useState('');
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const mutation = useSubmitBuyRequest();
  const { requireAuth } = useAuth();

  const unit = category?.unit ?? 'کیلوگرم';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;
    // مهمان: مودال ورود باز می‌شود و فرم دست‌نخورده می‌ماند تا بعد از ورود ثبت شود
    if (!requireAuth()) return;
    mutation.mutate(
      {
        subCategoryId: category.id,
        productType: productType.trim(),
        amount: Number(amount),
      },
      { onSuccess: () => setDone(true) },
    );
  };

  const reset = () => {
    setDone(false);
    setCategory(null);
    setProductType('');
    setAmount('');
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

          {/* فرم — دسته‌بندی + نوع کالا + میزان نیازمندی */}
          <div className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
            {done ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 size={24} />
                </span>
                <p className="text-sm font-bold">درخواست خرید شما ثبت شد.</p>
                <Button variant="outline" size="sm" className="rounded-md" onClick={reset}>
                  ثبت درخواست دیگر
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <CategoryPicker
                  value={category}
                  onChange={(c) => {
                    setCategory(c);
                    setProductType('');
                  }}
                />
                <Input
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder={
                    category
                      ? category.example
                        ? `مثلاً ${category.example}`
                        : 'نوع کالا مورد نیاز خود را وارد کنید.'
                      : 'ابتدا دسته‌بندی را انتخاب کنید.'
                  }
                  className="rounded-md"
                  disabled={!category}
                  aria-label="نوع کالا"
                />
                <UnitInput
                  kind="weight"
                  unit={unit}
                  value={amount}
                  onValueChange={setAmount}
                  placeholder="میزان نیازمندی محصول را وارد کنید."
                  ariaLabel="میزان نیازمندی محصول"
                />
                <Button type="submit" size="lg" className="w-full rounded-md" disabled={mutation.isPending || !category || !amount}>
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
