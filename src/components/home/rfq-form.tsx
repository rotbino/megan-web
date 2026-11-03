'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryPicker } from '@/components/shared/category-picker';
import { UnitInput, unitBadgeText } from '@/components/shared/unit-input';
import { useSubmitBuyRequest } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { savePendingRfq, PANEL_RFQ_DEST } from '@/lib/pending-rfq';
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
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [productType, setProductType] = useState('');
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const mutation = useSubmitBuyRequest();
  const { requireAuth } = useAuth();

  const unit = category?.unit ?? 'کیلوگرم';

  /** تبدیل زندهٔ واحد — در ردیف عنوان فیلد نمایش داده می‌شود (نه شناور) */
  const convBadge = unitBadgeText(Number(amount.replace(/[^\d]/g, '')) || 0, 'weight', unit);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;
    // مهمان: داده فرم ذخیره می‌شود (pending RFQ)؛ مودال ورود باز می‌شود و
    // بعد از ورود/ثبت‌نام همین درخواست «بلافاصله» ثبت و کاربر به پنل خرید
    // (درخواست‌های در انتظار) می‌رود (خواسته مالک ۲۸-۱۰)
    if (!requireAuth('rfq')) {
      savePendingRfq({
        subCategoryId: category.id,
        productType: productType.trim(),
        amount: Number(amount),
      });
      return;
    }
    mutation.mutate(
      {
        subCategoryId: category.id,
        productType: productType.trim(),
        amount: Number(amount),
      },
      {
        onSuccess: () => {
          setError('');
          setDone(true);
          // کاربر واردشده هم بعد از ثبت مستقیم به درخواست‌های خودش می‌رود —
          // همان تجربه‌ای که مهمان بعد از ثبت‌نام می‌بیند
          router.push(PANEL_RFQ_DEST);
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود — دوباره تلاش کنید.'),
      },
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
            {/* آمار (خواسته مالک ۴-۱۱) — فروشندگان/خریداران/اصناف */}
            <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <p className="text-xl font-bold text-primary">{toFa(54000)} +</p>
                <p className="mt-1 text-xs text-muted-foreground">فروشندگان فعال</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{toFa(342000)} +</p>
                <p className="mt-1 text-xs text-muted-foreground">خریداران</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{toFa(150)}</p>
                <p className="mt-1 text-xs text-muted-foreground">اصناف مختلف</p>
              </div>
            </div>
          </div>

          {/* فرم — دسته‌بندی + نوع کالا + میزان نیازمندی */}
          <div className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
            {done ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 size={24} />
                </span>
                <p className="text-sm font-bold">درخواست خرید شما ثبت شد.</p>
                <Button variant="outline" size="sm" className="rounded-md" onClick={reset}>
                  ثبت درخواست دیگر
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                {/* ردیف ۱ — دسته‌بندی محصول (تمام‌عرض؛ عنوان بالای فیلد) */}
                <div>
                  <span className="mb-1.5 flex h-[18px] items-center text-xs font-medium text-foreground/75">
                    دسته‌بندی محصول
                  </span>
                  <CategoryPicker
                    value={category}
                    onChange={(c) => {
                      setCategory(c);
                      setProductType('');
                    }}
                  />
                </div>

                {/* ردیف ۲ — نوع کالا + میزان نیازمندی
                    موبایل: زیر هم (عرض کم، عدد و واحد روی هم می‌افتادند — خواسته مالک)
                    دسکتاپ (sm+): کنار هم با عنوان بالای هر فیلد */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                  <div className="min-w-0">
                    <span className="mb-1.5 flex h-[18px] items-center text-xs font-medium text-foreground/75">
                      نوع کالا
                    </span>
                    <Input
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      placeholder={
                        category
                          ? category.example
                            ? `مثلاً ${category.example}`
                            : 'نوع کالا را وارد کنید.'
                          : 'نوع کالا را وارد کنید.'
                      }
                      className="h-12 rounded-md md:h-12"
                      disabled={!category}
                      aria-label="نوع کالا"
                    />
                  </div>
                  <div className="min-w-0">
                    {/* عنوان + تبدیل زندهٔ واحد (≈ ۱ تن) — در همان ردیف عنوان */}
                    <span className="mb-1.5 flex h-[18px] items-center justify-between gap-1 text-xs font-medium text-foreground/75">
                      میزان نیازمندی
                      {convBadge && (
                        <span className="font-num inline-flex items-center rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground" aria-live="polite">
                          ≈ {convBadge}
                        </span>
                      )}
                    </span>
                    <UnitInput
                      kind="plain"
                      unit={unit}
                      value={amount}
                      onValueChange={setAmount}
                      placeholder="مثلاً ۵۰۰"
                      inputClassName="h-12 md:h-12 md:text-base"
                      ariaLabel="میزان نیازمندی محصول"
                    />
                  </div>
                </div>

                {/* دکمه — هم‌قدِ فیلدها (۴۸px)؛ رنگ برند (خواسته مالک ۲-۱۱:
                    سبزِ مکمل معنی نداشت — دکمه‌های عملکردی همیشه رنگ برندند، RULES.md §۱-ب) */}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-md text-sm"
                  disabled={mutation.isPending || !category || !amount}
                >
                  {mutation.isPending && <Loader2 className="animate-spin" size={18} />}
                  {mutation.isPending ? 'در حال ثبت…' : 'ثبت درخواست خرید'}
                </Button>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
