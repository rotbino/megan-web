'use client';

/**
 * ویژگی‌های کالا — بخش جدید فرم ویرایش/ثبت آگهی (خواستهٔ مالک ۲۸-۱۱ دور ۴).
 *
 * منبع = اتریبیوت‌های تاکسونومی v2 همان دستهٔ برگ (به‌ارث‌بری خانواده)؛
 * فروشنده هر ویژگی را با چیپ تک‌انتخابی ست می‌کند — مینیمال، دسته‌بندی‌شده
 * و ساده. این همان گزینه‌هایی است که صفحهٔ فیلتر پیشرفته فیلتر می‌کند؛
 * پس هرچه کامل‌تر، دیده‌شدن بیشتر.
 *
 *  • گزینه‌های وابسته (دور ۴): کشور تولیدکننده ← نوع/برند؛ انتخاب فرزند
 *    والدش را خودکار می‌نشاند و والد عوض‌شده فرزند ناهمخوان را می‌پاکد؛
 *  • ذخیره = features آگهی با key = کلید ویژگی (ctype/country/brand/…) و
 *    value = برچسب گزینه؛ سمت سرور با resolveProductAttrs خوانده می‌شود؛
 *  • ویژگی‌های آزاد قدیمی (کلید/مقدار بیرون از تعریف دسته) دست‌نخورده
 *    می‌مانند — فقط همان‌هایی که به گزینهٔ معتبر می‌خورند مدیریت می‌شوند.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import {
  chainOf,
  fetchCatalogV2Tree,
  impliedParent,
  pruneAttrSelection,
  visibleAttrOptions,
  type CatalogV2Attr,
} from '@/lib/catalog-v2';
import type { ProductFeature } from '@/lib/types';
import { cn } from '@/lib/utils';

/** اتریبیوت‌های مؤثر دسته — زنجیرهٔ ریشه تا برگ (خانواده + خودِ برگ)؛
 *  هوک مشترک: فرم و صفحه هر دو همان کش React Query را می‌خورند */
export function useLeafAttrs(leafKey?: string | null): CatalogV2Attr[] {
  const { data: tree } = useQuery({
    queryKey: ['catalog-v2-tree'],
    queryFn: fetchCatalogV2Tree,
    staleTime: 60_000,
  });
  return useMemo(() => {
    if (!tree || !leafKey) return [];
    return chainOf(tree.roots, leafKey).flatMap((n) => n.attrs ?? []);
  }, [tree, leafKey]);
}

export function ProductAttrsCard({
  leafKey,
  features,
  onChange,
}: {
  /** کلید v2 برگ دستهٔ انتخابی (draft.leaf.key) */
  leafKey?: string | null;
  features: ProductFeature[];
  onChange: (features: ProductFeature[]) => void;
}) {
  const attrs = useLeafAttrs(leafKey);

  /** ویژگیِ دستیِ یک اتریبیوت — key = کلید یا برچسب ویژگی؛ مقدار معتبر مقدم */
  const featureOf = (attr: CatalogV2Attr) => {
    const list = features.filter((x) => x.key === attr.key || x.key === attr.label);
    return list.find((x) => attr.options.some((o) => o.label === x.value)) ?? list[0];
  };

  /** انتخاب فعلی به شکل attrKey → [label] — همان منطق فیلتر عمومی */
  const selection = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const attr of attrs) {
      const fv = featureOf(attr)?.value;
      if (fv && attr.options.some((o) => o.label === fv)) out[attr.key] = [fv];
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs, features]);

  if (!attrs.length) return null;

  /** انتخاب/برداشتن یک گزینه — تک‌انتخابی؛ کلیک دوباره = حذف */
  const pick = (attr: CatalogV2Attr, label: string) => {
    const current = selection[attr.key]?.[0];
    if (current === label) {
      // برداشتن انتخاب — فقط همین ویژگی پاک می‌شود
      onChange(features.filter((x) => x.key !== attr.key && x.key !== attr.label));
      return;
    }
    // بقیهٔ ویژگی‌ها دست‌نخورده می‌مانند — فقط همین ویژگی عوض می‌شود
    let next: ProductFeature[] = features.filter(
      (x) => x.key !== attr.key && x.key !== attr.label,
    );
    next = [...next, { key: attr.key, value: label }];

    // گزینهٔ وابسته → والدش خودکار (صدری پاکستانی → کشور=پاکستان)
    const opt = attr.options.find((o) => o.label === label);
    const imp = opt ? impliedParent(opt, selection) : undefined;
    if (imp) {
      next = next.filter((x) => x.key !== imp.key);
      next.push({ key: imp.key, value: imp.value });
    }

    // والد عوض شد → فرزند ناهمخوان پاک شود (کشور=ایران، نوع=صدری پاکستانی ✗)
    const selMap: Record<string, string[]> = {};
    for (const a of attrs) {
      const fv = next.find((x) => x.key === a.key || x.key === a.label)?.value;
      if (fv && a.options.some((o) => o.label === fv)) selMap[a.key] = [fv];
    }
    const pruned = pruneAttrSelection(attrs, selMap);

    // بازسازی: ویژگی‌های آزاد/ناشناخته می‌مانند؛ شناخته‌شده‌ها از pruned؛
    // مقدار آزادِ قدیمیِ همان ویژگی که اکنون گزینهٔ معتبر دارد حذف می‌شود
    const rebuilt: ProductFeature[] = features.filter((x) => {
      const a = attrs.find((at) => at.key === x.key || at.label === x.key);
      if (!a) return true; // بی‌اتریبیوت — آزاد
      const known = a.options.some((o) => o.label === x.value);
      if (!known) return !pruned[a.key]?.length; // ناشناخته — فقط تا گزینهٔ معتبر نیامده
      return false; // شناخته — از pruned بازسازی می‌شود
    });
    for (const [k, labels] of Object.entries(pruned)) {
      if (labels[0]) rebuilt.push({ key: k, value: labels[0] });
    }
    onChange(rebuilt);
  };

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
          <ListChecks size={14} />
        </span>
        ویژگی‌های کالا
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          اختیاری
        </span>
      </h2>
      <p className="text-[11px] leading-5 text-muted-foreground">
        همین گزینه‌ها فیلتر صفحهٔ «فیلتر پیشرفتهٔ عمده» است — هرچه کامل‌تر پر
        کنید، کالای شما در نتایج دقیق‌تر دیده می‌شود.
      </p>

      {attrs.map((attr) => {
        const current = selection[attr.key]?.[0];
        const vis = visibleAttrOptions(attr, selection);
        return (
          <div key={attr.key} className="space-y-1.5">
            <p className="text-[12.5px] font-bold">
              {attr.label}
              {current && <span className="ms-1.5 text-[10px] font-normal text-muted-foreground">(برای حذف، دوباره انتخابش کن)</span>}
            </p>
            {attr.hint && (
              <p className="text-[10.5px] leading-5 text-muted-foreground">{attr.hint}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {vis.map((opt) => {
                const on = current === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => pick(attr, opt.label)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors',
                      on
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'bg-background text-foreground/75 hover:bg-secondary/60',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
