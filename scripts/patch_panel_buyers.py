#!/usr/bin/env python3
"""پچ صفحهٔ /panel/buyers — باز کردن دیدن + گیت ثبت کالا (خواستهٔ مالک ۷-۱۱)."""

import re

path = '/home/z/my-project/megan-web/src/app/panel/buyers/page.tsx'
src = open(path, encoding='utf-8').read()
orig = src

def sub(pattern, repl, flags=0, count=1):
    global src
    new, n = re.subn(pattern, repl, src, count=count, flags=flags)
    assert n == 1, f'pattern not found (matches={n}): {pattern[:80]!r}'
    src = new

# ۱) هدر کامنت + importها — حذف Crown/Lock و useMyPackage
sub(
    r" \*  • فرم مینیمال \(خواسته مالک ۶-۱۱\): بدون جملهٔ سورت/سهمیه — سهمیه و\n \*    محدودیت روزانه حذف شد؛ هزینه گروهی فقط لحظهٔ ارسال از کیف پول کسر می‌شود\n \*  • گیت بسته \(خواسته مالک\): بستهٔ رایگان خریداران را نمی‌بیند\n \*/",
    """ *  • فرم مینیمال (خواسته مالک ۶-۱۱): بدون جملهٔ سورت/سهمیه — سهمیه و
 *    محدودیت روزانه حذف شد؛ هزینه گروهی فقط لحظهٔ ارسال از کیف پول کسر می‌شود
 *  • گیت‌ها (خواستهٔ مالک ۷-۱۱): دیدن خریداران برای همهٔ فروشندگان آزاد
 *    شد؛ ارسال تامین/تماس/پیام اول گیت ثبت کالا دارد (مودال «ثبت کالا لازم
 *    است») و بعد گیت بستهٔ فعال — این‌طوری فروشندگان به ثبت کالایشان تشویق
 *    می‌شوند و فرمول تطابق (کالا ۴۰ + نوع ۲۰ + حجم ۲۵ + مکان ۱۵) روی همان
 *    داده‌ها مطابق‌ترین و به‌صرفه‌ترین خریداران را می‌سازد
 */""",
)
sub(r"\n  Crown,\n  Lock,\n", "\n")
sub(r"  useMyOfferQuota,\n  useMyPackage,\n  useMyProducts,\n", "  useMyOfferQuota,\n  useMyProducts,\n")

# ۲) حذف کوئری بسته از ابتدای کامپوننت
sub(
    r"  // گیت بسته \(خواسته مالک\): بسته رایگان خریداران را نمی‌بیند\n  const \{ data: myPackage, isLoading: pkgLoading \} = useMyPackage\(\);\n\n",
    "",
)

# ۳) state مودال ثبت کالا
sub(
    r"  // پیشنهاد تکی/گروهی \+ مودال نیاز به بسته\n",
    "  // پیشنهاد تکی/گروهی + مودال نیاز به بسته/ثبت کالا\n",
)
sub(r"  const \[needPkgOpen, setNeedPkgOpen\] = useState\(false\);",
    "  const [needPkgOpen, setNeedPkgOpen] = useState(false);\n  const [needProductOpen, setNeedProductOpen] = useState(false);")

# ۴) کوئری محصولات + hasProducts
sub(
    r"  const \{ data: myProducts \} = useMyProducts\(\);\n  const products = myProducts\?\.items;\n  const quotaQuery = useMyOfferQuota\(\);\n  const isFeatured = quotaQuery\.data\?\.isFeatured \?\? false;",
    """  const myProductsQuery = useMyProducts();
  const products = myProductsQuery.data?.items;
  const quotaQuery = useMyOfferQuota();
  const isFeatured = quotaQuery.data?.isFeatured ?? false;
  // گیت ثبت کالا (خواستهٔ مالک ۷-۱۱) — آگهی تأییدشده یا در انتظار، هر دو حساب است
  const hasProducts = (products ?? []).some(
    (p) => p.status === 'confirmed' || p.status === 'pending',
  );""",
)

# ۵) دروازهٔ پیشنهاد + دروازهٔ تماس/چت
sub(
    r"  /\*\* دروازهٔ پیشنهاد تامین — فروشندهٔ واردشده؛ بدون بسته → مودال خرید اشتراک \*/\n"
    r"  const passOfferGates = \(\): boolean => \{\n"
    r"    if \(quotaQuery\.isPending\) return false;\n"
    r"    if \(!isFeatured\) \{\n"
    r"      setNeedPkgOpen\(true\);\n"
    r"      return false;\n"
    r"    \}\n"
    r"    return true;\n"
    r"  \};",
    """  /** دروازهٔ پیشنهاد تامین (خواستهٔ مالک ۷-۱۱): اول گیت ثبت کالا — فروشندهٔ
   *  بدون آگهی مودال «ثبت کالا لازم است» را می‌بیند؛ بعد گیت بستهٔ فعال */
  const passOfferGates = (): boolean => {
    if (myProductsQuery.isPending || quotaQuery.isPending) return false;
    if (!hasProducts) {
      setNeedProductOpen(true);
      return false;
    }
    if (!isFeatured) {
      setNeedPkgOpen(true);
      return false;
    }
    return true;
  };

  /** دروازهٔ تماس/چت با خریدار — همان ترتیب: کالا اول، بعد بسته (فقط تماس) */
  const contactGate = (needPackageToo: boolean): boolean => {
    if (myProductsQuery.isPending || (needPackageToo && quotaQuery.isPending)) return false;
    if (!hasProducts) {
      setNeedProductOpen(true);
      return false;
    }
    if (needPackageToo && !isFeatured) {
      setNeedPkgOpen(true);
      return false;
    }
    return true;
  };""",
)

# ۶) حذف بلوک قفل canSeeBuyers (از resetPaging تا انتهای بلوک قفل)
m = re.search(
    r"  // ── گیت بسته: رایگان = قفل؛ در حال بارگذاری = اسکلتون ──\n.*?\n  \}\n\n",
    src,
    flags=re.S,
)
assert m, 'lock block not found'
src = src[:m.start()] + src[m.end():]

# ۷) ارسال contactGate به BuyerCard
sub(
    r"                    relatedHint=\{m\.relatedProduct \? `مرتبط با آگهی شما: \$\{m\.relatedProduct\}` : undefined\}\n                  />",
    "                    relatedHint={m.relatedProduct ? `مرتبط با آگهی شما: ${m.relatedProduct}` : undefined}\n                    contactGate={contactGate}\n                  />",
)

# ۸) مودال ثبت کالا کنار مودال بسته
sub(
    r"      \{/\* بدون بستهٔ فعال → مودال خرید اشتراک \(الگوی همیشگی\) \*/\}\n",
    """      {/* بدون کالای ثبت‌شده (خواستهٔ مالک ۷-۱۱) → مودال «ثبت کالا لازم است» */}
      <NeedPackageModal
        open={needProductOpen}
        onClose={() => setNeedProductOpen(false)}
        kind="product"
        message="برای ارسال تامین یا تماس یا پیام، باید کالاهای خود را برای فروش ثبت کنید تا خریداران مرتبط به شما نمایش داده شوند. با ثبت کالا و حداقل سفارش، سیستم تطابق مطابق‌ترین و به‌صرفه‌ترین خریداران را به شما نشان می‌دهد."
      />
      {/* بدون بستهٔ فعال → مودال خرید اشتراک (الگوی همیشگی) */}
""",
)

open(path, 'w', encoding='utf-8').write(src)
print('panel buyers page patched. size:', len(src), 'vs', len(orig))
