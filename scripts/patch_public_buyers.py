#!/usr/bin/env python3
"""پچ صفحهٔ عمومی خریداران (buyers-view.tsx) — گیت ثبت کالا در passOfferGates."""

import re

path = '/home/z/my-project/megan-web/src/components/buyers/buyers-view.tsx'
src = open(path, encoding='utf-8').read()

def sub(pattern, repl, count=1):
    global src
    new, n = re.subn(pattern, repl, src, count=count)
    assert n == 1, f'pattern not found (matches={n}): {pattern[:90]!r}'
    src = new

# ۱) state مودال ثبت کالا
sub(
    r"  // الگوی همیشگی نیاز به اشتراک/شارژ \(خواستهٔ مالک ۱-۱۱\) — مودال با بستن \+ خرید بسته\n"
    r"  const \[needPkgOpen, setNeedPkgOpen\] = useState\(false\);",
    "  // الگوی همیشگی نیاز به اشتراک/شارژ (خواستهٔ مالک ۱-۱۱) — مودال با بستن + خرید بسته\n"
    "  const [needPkgOpen, setNeedPkgOpen] = useState(false);\n"
    "  // گیت ثبت کالا (خواستهٔ مالک ۷-۱۱) — بدون آگهی، تامین/تماس/پیام بسته است\n"
    "  const [needProductOpen, setNeedProductOpen] = useState(false);",
)

# ۲) کوئری محصولات + hasProducts
sub(
    r"  // آگهی‌های خود فروشنده — برای پیش‌نویس دقیق متن پیشنهاد \(کالا/واحد/قیمت واقعی\)\n"
    r"  const \{ data: myProducts \} = useMyProducts\(Boolean\(user\)\);",
    "  // آگهی‌های خود فروشنده — برای پیش‌نویس دقیق متن پیشنهاد (کالا/واحد/قیمت واقعی)\n"
    "  // + گیت ثبت کالا (خواستهٔ مالک ۷-۱۱) — آگهی تأییدشده یا در انتظار، هر دو حساب است\n"
    "  const myProductsQuery = useMyProducts(Boolean(user));\n"
    "  const myProducts = myProductsQuery.data;\n"
    "  const hasProducts = (myProducts?.items ?? []).some(\n"
    "    (p) => p.status === 'confirmed' || p.status === 'pending',\n"
    "  );",
)

# ۳) passOfferGates — گیت کالا قبل از گیت بسته
sub(
    r"  /\*\* دروازهٔ مشترک پیشنهاد تامین \(تکی و گروهی\): ورود → بستهٔ فعال؛\n"
    r"   \*  دکمه‌ها همیشه فعال‌اند و مودال‌های راهنما باز می‌شوند\. \*/\n"
    r"  const passOfferGates = \(\): boolean => \{\n"
    r"    if \(!user\) \{\n"
    r"      setAuthOpen\(true\);\n"
    r"      return false;\n"
    r"    \}\n"
    r"    // اگر وضعیت بسته هنوز در حال بارگذاری است صبر می‌کنیم تا قضاوت اشتباه نشود\.\n"
    r"    if \(quotaQuery\.isPending\) \{\n"
    r"      toast\(\{ description: 'در حال بررسی وضعیت بستهٔ شما…' \}\);\n"
    r"      return false;\n"
    r"    \}\n"
    r"    // بدون بستهٔ فعال → مودال خرید اشتراک \(الگوی همیشگی ۱-۱۱، به‌جای توست\)\.\n"
    r"    if \(!isFeatured\) \{\n"
    r"      setNeedPkgOpen\(true\);\n"
    r"      return false;\n"
    r"    \}\n"
    r"    return true;\n"
    r"  \};",
    """  /** دروازهٔ مشترک پیشنهاد تامین (تکی و گروهی): ورود → ثبت کالا → بستهٔ فعال
   *  (خواستهٔ مالک ۷-۱۱: کالا اول — فروشنده بدون آگهی مودال «ثبت کالا لازم
   *  است» را می‌بیند؛ دیدن خریداران آزاد است)؛ دکمه‌ها همیشه فعال‌اند و
   *  مودال‌های راهنما باز می‌شوند. */
  const passOfferGates = (): boolean => {
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    // اگر وضعیت آگهی/بسته هنوز در حال بارگذاری است صبر می‌کنیم تا قضاوت اشتباه نشود.
    if (myProductsQuery.isPending || quotaQuery.isPending) {
      toast({ description: 'در حال بررسی وضعیت حساب شما…' });
      return false;
    }
    // بدون کالای ثبت‌شده → مودال ثبت کالا (خواستهٔ مالک ۷-۱۱، قبل از بسته)
    if (!hasProducts) {
      setNeedProductOpen(true);
      return false;
    }
    // بدون بستهٔ فعال → مودال خرید اشتراک (الگوی همیشگی ۱-۱۱، به‌جای توست).
    if (!isFeatured) {
      setNeedPkgOpen(true);
      return false;
    }
    return true;
  };""",
)

# ۴) مودال ثبت کالا کنار مودال بسته (آخر کامپوننت)
sub(
    r"      \{/\* الگوی همیشگی ۱-۱۱: بدون بستهٔ فعال، مودال «خرید اشتراک» باز می‌شود \*/\}\n",
    """      {/* گیت ثبت کالا (خواستهٔ مالک ۷-۱۱): بدون کالای فروش، مودال «ثبت کالا لازم است» */}
      <NeedPackageModal
        open={needProductOpen}
        onClose={() => setNeedProductOpen(false)}
        kind="product"
        message="برای ارسال تامین یا تماس یا پیام، باید کالاهای خود را برای فروش ثبت کنید تا خریداران مرتبط به شما نمایش داده شوند. با ثبت کالا و حداقل سفارش، سیستم تطابق مطابق‌ترین و به‌صرفه‌ترین خریداران را به شما نشان می‌دهد."
      />
      {/* الگوی همیشگی ۱-۱۱: بدون بستهٔ فعال، مودال «خرید اشتراک» باز می‌شود */}
""",
)

open(path, 'w', encoding='utf-8').write(src)
print('buyers-view patched ok')
