#!/usr/bin/env python3
"""پچ supply-offer-modal (پیام عمومی بدون کالا) + buy-requests-view (گیت ثبت کالا) + آستانه بج book-entry-card."""

import re

# ─── ۱) supply-offer-modal.tsx ────────────────────────────────────────────────
path = '/home/z/my-project/megan-web/src/components/buyers/supply-offer-modal.tsx'
src = open(path, encoding='utf-8').read()

def sub(pattern, repl, count=1):
    global src
    new, n = re.subn(pattern, repl, src, count=count)
    assert n == 1, f'[{path.split("/")[-1]}] pattern not found (matches={n}): {pattern[:90]!r}'
    src = new

# شمار آگهی‌های فعال کل — برای تفکیک «هیچ کالایی ندارد» از «این دسته را ندارد»
sub(
    r"  const hasCategoryProduct = !category \|\| categoryProducts\.length > 0;",
    "  const hasCategoryProduct = !category || categoryProducts.length > 0;\n"
    "  // کل آگهی‌های فعال فروشنده (خواستهٔ مالک ۷-۱۱): هیچ کالایی ثبت نکرده →\n"
    "  // پیام عمومی «ثبت کالا»؛ کالای دیگری دارد → پیام اختصاصی همین دسته\n"
    "  const activeProductCount = (products ?? []).filter(\n"
    "    (p) => p.status === 'confirmed' || p.status === 'pending',\n"
    "  ).length;",
)

# پیام گیت کالا — دو حالته
old_gate = re.search(
    r"  // ─── گیت کالا: کالای این دسته را ندارید — پیام شفاف \+ مسیر ثبت محصول ───\n"
    r"  if \(!hasCategoryProduct\) \{\n"
    r"    return \(\n"
    r"      <div className=\"rounded-lg border border-dashed border-primary/40 bg-primary/\[0\.03\] p-4 text-center\">\n"
    r"        <p className=\"text-xs font-extrabold leading-6\">\n"
    r"          برای ارسال پیشنهاد تامین \{category\?\.categoryName \?\? 'این کالا'\} باید این کالا را در لیست محصولات خود داشته\n"
    r"          باشید\.\n"
    r"        </p>\n"
    r"        <p className=\"mt-1\.5 text-\[11px\] leading-5 text-muted-foreground\">\n"
    r"          ابتدا آگهی همین کالا را ثبت کنید تا خریداران بدانند چه چیزی عرضه می‌کنید؛ سپس پیشنهاد بفرستید\.\n"
    r"        </p>\n"
    r"        <Button asChild size=\"sm\" className=\"mt-3 rounded-md\">\n"
    r"          <Link href=\"/panel/products/new\">\n"
    r"            <Plus size=\{14\} /> ثبت محصول\n"
    r"          </Link>\n"
    r"        </Button>\n"
    r"      </div>\n"
    r"    \);\n"
    r"  \}\n",
    src,
)
assert old_gate, 'category gate block not found in supply-offer-modal'
new_gate = """  // ─── گیت کالا: هیچ کالایی ندارید (پیام عمومی مالک ۷-۱۱) یا فقط کالای این
  // دسته را ندارید (پیام اختصاصی همان دسته) — هر دو با مسیر ثبت محصول ───
  if (!hasCategoryProduct) {
    const noProductsAtAll = activeProductCount === 0;
    return (
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/[0.03] p-4 text-center">
        <p className="text-xs font-extrabold leading-6">
          {noProductsAtAll
            ? 'برای ارسال تامین یا تماس یا پیام، باید کالاهای خود را برای فروش ثبت کنید تا خریداران مرتبط به شما نمایش داده شوند.'
            : `برای ارسال پیشنهاد تامین ${category?.categoryName ?? 'این کالا'} باید این کالا را در لیست محصولات خود داشته باشید.`}
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
          {noProductsAtAll
            ? 'با ثبت کالا و حداقل سفارش، سیستم تطابق مطابق‌ترین و به‌صرفه‌ترین خریداران را به شما نشان می‌دهد.'
            : 'ابتدا آگهی همین کالا را ثبت کنید تا خریداران بدانند چه چیزی عرضه می‌کنید؛ سپس پیشنهاد بفرستید.'}
        </p>
        <Button asChild size="sm" className="mt-3 rounded-md">
          <Link href="/panel/products/new">
            <Plus size={14} /> ثبت محصول
          </Link>
        </Button>
      </div>
    );
  }
"""
src = src[:old_gate.start()] + new_gate + src[old_gate.end():]
open(path, 'w', encoding='utf-8').write(src)
print('supply-offer-modal patched')

# ─── ۲) buy-requests-view.tsx ────────────────────────────────────────────────
path = '/home/z/my-project/megan-web/src/components/buy-requests/buy-requests-view.tsx'
src = open(path, encoding='utf-8').read()

# state نیاز به ثبت کالا
sub = None  # py flake
def sub2(pattern, repl, count=1):
    global src
    new, n = re.subn(pattern, repl, src, count=count)
    assert n == 1, f'[buy-requests-view] pattern not found (matches={n}): {pattern[:90]!r}'
    src = new

sub2(
    r"  const \[contactError, setContactError\] = useState<string \| null>\(null\);",
    "  const [contactError, setContactError] = useState<string | null>(null);\n"
    "  // گیت ثبت کالا (خواستهٔ مالک ۷-۱۱) — بک‌اند با PRODUCT_REGISTRATION_REQUIRED می‌گوید\n"
    "  const [needProduct, setNeedProduct] = useState(false);",
)

# تشخیص کد خطا
sub2(
    r"      \} else if \(err instanceof ApiError\) \{\n"
    r"        // پیام بک‌اند \(مثلاً سهمیهٔ تماس روزانه\) همان‌جا زیر دکمه دیده می‌شود\n"
    r"        setContactError\(err\.message\);\n"
    r"      \} else \{",
    "      } else if (err instanceof ApiError) {\n"
    "        // گیت ثبت کالا (خواستهٔ مالک ۷-۱۱) → پیام + مسیر ثبت کالا؛ بقیهٔ پیام‌های\n"
    "        // بک‌اند (بسته، سهمیهٔ تماس روزانه و …) همان‌جا زیر دکمه دیده می‌شوند\n"
    "        if (err.code === 'PRODUCT_REGISTRATION_REQUIRED') {\n"
    "          setContactError(err.message);\n"
    "          setNeedProduct(true);\n"
    "        } else {\n"
    "          setContactError(err.message);\n"
    "        }\n"
    "      } else {",
)

# نمایش مسیر ثبت کالا کنار خطا
sub2(
    r"      \{contactError && \(\n"
    r"        <p className=\"mt-2 text-\[11px\] font-medium leading-5 text-destructive\">\{contactError\}</p>\n"
    r"      \)\}",
    """      {contactError && (
        <p className="mt-2 text-[11px] font-medium leading-5 text-destructive">{contactError}</p>
      )}
      {needProduct && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium leading-5 text-primary">
          <PackagePlus size={13} className="shrink-0" />
          <Link href="/panel/products/new" className="font-bold underline">
            ثبت کالای خود برای فروش
          </Link>{' '}
          — با ثبت کالا و حداقل سفارش، مطابق‌ترین خریداران به شما نمایش داده می‌شوند.
        </p>
      )}""",
)

# import آیکون PackagePlus (به import موجود lucide اضافه شود)
sub2(
    r"import \{ ChevronLeft, ChevronRight, Loader2, LogIn, MessageSquareText, Phone, Search, ShieldCheck \} from 'lucide-react';",
    "import { ChevronLeft, ChevronRight, Loader2, LogIn, MessageSquareText, PackagePlus, Phone, Search, ShieldCheck } from 'lucide-react';",
)
open(path, 'w', encoding='utf-8').write(src)
print('buy-requests-view patched')

# ─── ۳) book-entry-card.tsx — آستانه بج تطابق جدید (≥۷۰ سبز) ─────────────────
path = '/home/z/my-project/megan-web/src/components/buyers/book-entry-card.tsx'
src = open(path, encoding='utf-8').read()
old = "matchBadge.score >= 85 ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600',"
assert old in src, 'badge threshold not found in book-entry-card'
src = src.replace(old, "matchBadge.score >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600',", 1)
open(path, 'w', encoding='utf-8').write(src)
print('book-entry-card patched')
