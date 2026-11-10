#!/usr/bin/env python3
"""جایگزینی بخش getSuggestedBuyers در buy-requests.service.ts (خطوط 437-525) با پیاده‌سازی جدید."""

path = '/home/z/my-project/megan-back/src/buy-requests/buy-requests.service.ts'
with open(path, encoding='utf-8') as f:
    lines = f.readlines()

# بازهٔ 1-ایندکس: 437 (سربرگ بخش) تا 525 (پایان متد) — از خواندن فایل تأیید شد
start = 437 - 1
end = 525  # خط بعد از بسته‌شدن متد (خط 525 شامل «  }» است)

assert 'خریداران پیشنهادی' in lines[start], f'خط شروع اشتباه: {lines[start]!r}'
assert lines[end - 1].rstrip() == '  }', f'خط پایان اشتباه: {lines[end-1]!r}'

NEW = '''  // ─── خریداران پیشنهادی (تطبیق آگهی‌های من) ─────────────────────────────────

  /**
   * POST /buy-requests/getSuggestedBuyers — فرمول تطابق انعطاف‌پذیر (بازنویسی
   * خواستهٔ مالک ۷-۱۱). امتیاز ۰ تا ۱۰۰ از چهار محور:
   *   • کالا ۴۰ — هم‌برگ ۴۰ / هم‌پدر ۲۲ / هم‌ریشه ۱۰ (ستون فقرات؛ بدون آن
   *     محورهای دیگر اثر ندارند)
   *   • نوع کالا ۲۰ — تطبیق متن نوعِ درخواست با نام/نوع آگهی؛ درخواستِ بدون
   *     نوع یعنی «هر نوعی از همین کالا» و امتیاز کامل می‌گیرد
   *   • حجم خرید ۲۵ — بازهٔ معاملهٔ ممکن: حداقل سفارش فروشنده ≤ نیاز خریدار ≤
   *     موجودی؛ داخل بازه هرچه سهم بیشتری از عرضه بردارد به‌صرفه‌تر (تا ۲۵)،
   *     خارج بازه با نسبت فاصله کمرنگ می‌شود — «حجم خرید نزدیک». واحد وزنی
   *     نرمال می‌شود (تن ← کیلوگرم)؛ واحد غیرقابل‌مقایسه = امتیاز بی‌طرف ۱۰
   *   • مکان ۱۵ — هم‌شهر ۱۵ / هم‌استان ۱۰ (حمل ارزان‌تر = به‌صرفه‌تر)
   * هرگز خالی نمی‌شود (خواستهٔ مالک ۷-۱۱): اگر تطابق خاصی پیدا نشد، همان
   * خریداران موجود با امتیاز ۰ مرتب بر اساس تازگی نمایش داده می‌شوند.
   * گیت بسته حذف شد — دیدن خریداران آزاد است؛ گیت فقط سر ارسال تامین/تماس
   * است (assertSellerHasProduct و getBuyRequestContact).
   */
  async getSuggestedBuyers(userId: string): Promise<SuggestedBuyerDto[]> {
    const products = await this.prisma.product.findMany({
      where: { userId, status: { in: ['pending', 'confirmed'] } },
      select: {
        productName: true,
        subCategoryId: true,
        stock: true,
        minSaleAmount: true,
        provinceId: true,
        cityId: true,
        unit: true,
      },
      take: 50,
    });

    const requests = await this.prisma.buyRequest.findMany({
      where: { status: 'confirmed', user: { isActive: true } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const names = await this.hydrateNames(requests);

    // والد/ریشهٔ هر دسته از درخت کش‌شده — برای سطوح هم‌پدر/هم‌ریشه
    const all = await this.categories.getAllCategories();
    const flat = new Map<number, { parent: number | null }>();
    const walk = (nodes: Array<{ id: number; parent_id: number | null; children: unknown[] }>): void => {
      for (const n of nodes) {
        flat.set(n.id, { parent: n.parent_id });
        walk(n.children as typeof nodes);
      }
    };
    walk(all as never);

    const out: SuggestedBuyerDto[] = [];
    for (const req of requests) {
      if (req.userId === userId) continue; // درخواست خودم
      let best = 0;
      let tier: SuggestedBuyerDto['tier'] = 'other';
      let related = '';
      for (const product of products) {
        const m = this.scoreRequestMatch(product, req, flat);
        if (m.score > best) {
          best = m.score;
          tier = m.tier;
          related = product.productName;
        }
      }
      // ثبت همهٔ درخواست‌ها — حتی بی‌تطابق (هرگز خالی نمی‌شود)؛ درخواست‌های
      // تازه بالای بقیهٔ بی‌تطابق‌ها می‌مانند چون از ابتدا بر اساس createdAt
      // desc آمده‌اند و مرتب‌سازی پایین پایدار است
      out.push({
        buyRequest: this.toDto(req, names),
        matchScore: Math.round(best),
        tier,
        relatedProduct: related,
      });
    }

    return out.sort((a, b) => b.matchScore - a.matchScore).slice(0, 24);
  }

  /** امتیاز یک جفت (آگهی خودم، درخواست خرید) — فرمول چهارمحوری مالک ۷-۱۱ */
  private scoreRequestMatch(
    product: {
      productName: string;
      subCategoryId: number;
      stock: number;
      minSaleAmount: number;
      provinceId: number;
      cityId: number;
      unit: string;
    },
    req: {
      name: string | null;
      categoryId: number;
      requirementAmount: number;
      unit: string;
      provinceId: number | null;
      cityId: number | null;
    },
    flat: Map<number, { parent: number | null }>,
  ): { score: number; tier: SuggestedBuyerDto['tier'] } {
    // ── کالا — ستون فقرات ──
    const ancestorsOf = (id: number): Set<number> => {
      const set = new Set<number>();
      let cur = flat.get(id)?.parent ?? null;
      while (cur != null && !set.has(cur)) {
        set.add(cur);
        cur = flat.get(cur)?.parent ?? null;
      }
      return set;
    };
    const sameLeaf = req.categoryId === product.subCategoryId;
    const reqParent = flat.get(req.categoryId)?.parent ?? null;
    const prodParent = flat.get(product.subCategoryId)?.parent ?? null;
    const sameParent = reqParent != null && reqParent === prodParent;
    const sameRoot =
      !sameParent &&
      [...ancestorsOf(req.categoryId)].some((a) => ancestorsOf(product.subCategoryId).has(a));
    const catScore = sameLeaf ? 40 : sameParent ? 22 : sameRoot ? 10 : 0;
    if (catScore === 0) return { score: 0, tier: 'other' };

    // ── نوع کالا — تطبیق متن دوطرفه ──
    const norm = (s: string) => s.replace(/[\\u200c\\s]+/g, ' ').trim();
    const t = req.name ? norm(req.name) : '';
    const p = norm(product.productName);
    const typeScore = !t || p.includes(t) || t.includes(p) ? 20 : 0;

    // ── حجم خرید — بازهٔ معاملهٔ ممکن + نزدیکی ──
    const volScore = this.volumeScore(
      req.requirementAmount,
      req.unit,
      product.stock,
      Math.max(1, product.minSaleAmount),
      product.unit,
    );

    // ── مکان — هم‌شهر/هم‌استان ──
    const locScore =
      req.cityId != null && req.cityId === product.cityId
        ? 15
        : req.provinceId != null && req.provinceId === product.provinceId
          ? 10
          : 0;

    const tier: SuggestedBuyerDto['tier'] = sameLeaf
      ? t && typeScore > 0
        ? 'exact'
        : 'same-product'
      : 'near-category';

    return { score: catScore + typeScore + volScore + locScore, tier };
  }

  /**
   * امتیاز حجم (۰ تا ۲۵) — «حجم خرید نزدیک» (خواستهٔ مالک ۷-۱۱):
   *  • نیاز خریدار داخل بازهٔ [حداقل سفارش فروشنده، موجودی فروشنده] → معامله
   *    ممکن؛ هرچه سهم بیشتری از عرضه بردارد به‌صرفه‌تر: ۱۸ + ۷×سهم
   *  • زیر حداقل سفارش → با نسبت نزدیکی به حداقل کمرنگ می‌شود
   *  • بالای موجودی → با نسبت پوشش موجودی کمرنگ می‌شود
   *  • واحد غیرقابل‌مقایسه (مثل عدد در برابر کیلوگرم) → بی‌طرف ۱۰
   */
  private volumeScore(
    buyerAmount: number,
    buyerUnit: string,
    sellerStock: number,
    sellerMin: number,
    sellerUnit: string,
  ): number {
    const FAMILY: Record<string, string> = {
      'تن': 'weight',
      'کیلوگرم': 'weight',
      'گرم': 'weight',
      'عدد': 'count',
      'بسته': 'pack',
      'متر': 'length',
      'لیتر': 'volume',
    };
    const parse = (v: number, unit: string): { v: number; f: string } | null => {
      const f = FAMILY[unit];
      if (!f) return null;
      if (unit === 'تن') return { v: v * 1000, f };
      if (unit === 'گرم') return { v: v / 1000, f };
      return { v, f };
    };
    const buyer = parse(buyerAmount, buyerUnit);
    const stock = parse(Math.max(1, sellerStock), sellerUnit);
    const min = parse(sellerMin, sellerUnit);
    if (!buyer || !stock || !min || buyer.f !== stock.f) return 10; // غیرقابل‌مقایسه — بی‌طرف

    if (buyer.v >= min.v && buyer.v <= Math.max(min.v, stock.v)) {
      // داخل بازهٔ معامله — خرید بزرگ‌تر از عرضهٔ فروشنده به‌صرفه‌تر
      return 18 + 7 * Math.min(1, buyer.v / stock.v);
    }
    if (buyer.v < min.v) return 25 * (buyer.v / min.v) * 0.8; // زیر حداقل سفارش فروشنده
    return 25 * (stock.v / buyer.v) * 0.8; // بیش از موجودی فروشنده
  }
'''

lines[start:end] = [NEW]
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('done — new file length:', sum(1 for _ in open(path, encoding='utf-8')))
