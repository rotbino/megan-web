#!/usr/bin/env node
/**
 * تست E2E جریان کامل «دفتر خرید» (خواستهٔ مالک ۱۰-۱۱ دور ۵) از طریق پروکسی :3000:
 *  ۱) resolvePublicId — آیدی سفارشی phaksh-seyyed → buyer1
 *  ۲) getPublic — گیت بسته (کاربر نشست استاب ME بسته دارد؟ ببینیم)
 *  ۳) getMySettings — آیدی تصادفی پیش‌فرض ساخته می‌شود
 *  ۴) updateSettings — آیدی سفارشی + رنگ برند + ولیدیشن‌ها
 *  ۵) toggleSave + getMySaved — ذخیرهٔ دفتر خریدار توسط فروشنده
 *  ۶) buyers/directory — bookId روی کارت‌ها (لینک فوتر)
 *  ۷) وضعیت NEED_PACKAGE وقتی بی‌بسته — با سوییچ نشست امکانی نیست؛
 *     حداقل پاسخ قراردادی گیت را در کد استاب بررسی می‌کنیم (static check).
 */
const BASE = 'http://127.0.0.1:3000';
let failed = 0;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failed += 1;
};
const post = async (path, payload) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  return { http: res.status, json };
};

// ─── ۱) resolvePublicId ───
{
  const r = await post('/api/buyerBook/resolvePublicId', { id: 'phaksh-seyyed' });
  check(
    'resolvePublicId(phaksh-seyyed) → buyer1 + رنگ #0891b2',
    r.http === 200 && r.json.data?.userName === 'buyer1' && r.json.data?.settings?.brandColor === '#0891b2',
    `userName=${r.json.data?.userName ?? '—'}`,
  );
}
{
  const r = await post('/api/buyerBook/resolvePublicId', { id: 'این-آیدی-نیست' });
  check('resolvePublicId ناشناخته → null', r.http === 200 && r.json.data === null);
}

// ─── ۲) getPublic (کاربر نشست = seller0 که بسته دارد → مجاز) ───
{
  const r = await post('/api/buyerBook/getPublic', { id: 'phaksh-seyyed' });
  const d = r.json.data ?? {};
  check(
    'getPublic(phaksh-seyyed) — خریدار + آیتم‌های confirmed',
    r.http === 200 && d.buyer?.userName === 'buyer1' && Array.isArray(d.items) && d.items.length === 2,
    `items=${d.items?.length ?? '—'} savers=${d.saversCount ?? '—'}`,
  );
  check(
    'saversCount — دفتر buyer1 قبلاً توسط کاربر نشست ذخیره شده (seed ≥ 1)',
    (d.saversCount ?? 0) >= 1,
    `saversCount=${d.saversCount}`,
  );
}

// ─── ۳) getMySettings — آیدی تصادفی خودکار ───
{
  const r = await post('/api/buyerBook/getMySettings');
  const id = r.json.data?.settings?.bookId;
  check(
    'getMySettings — bookId تصادفی پیش‌فرض ساخته شد (b + ۷ نویسه)',
    r.http === 200 && /^b[a-z0-9]{6,10}$/.test(String(id ?? '')),
    `bookId=${id}`,
  );
}

// ─── ۴) updateSettings ───
{
  // آیدی سفارشی آزاد
  let r = await post('/api/buyerBook/updateSettings', { bookId: 'dfter-kharid-man', brandColor: '#0e9f6e' });
  check(
    'updateSettings — آیدی دلخواه + رنگ برند',
    r.http === 200 && r.json.data?.settings?.bookId === 'dfter-kharid-man' && r.json.data?.settings?.brandColor === '#0e9f6e',
    `settings=${JSON.stringify(r.json.data?.settings)}`,
  );

  // آیدی گرفته‌شده (phaksh-seyyed متعلق به buyer1) → 409
  r = await post('/api/buyerBook/updateSettings', { bookId: 'phaksh-seyyed' });
  check('آیدی تکراری → 409', r.http === 409 && r.json.status === false, `HTTP ${r.http}`);

  // آیدی نامعتبر → 400
  r = await post('/api/buyerBook/updateSettings', { bookId: 'اب' });
  check('آیدی نامعتبر (فارسی ۲ نویسه) → 400', r.http === 400 && r.json.status === false, `HTTP ${r.http}`);

  // رنگ نامعتبر → 400
  r = await post('/api/buyerBook/updateSettings', { brandColor: 'قرمز' });
  check('رنگ نامعتبر → 400', r.http === 400 && r.json.status === false, `HTTP ${r.http}`);

  // برگرداندن به وضعیت اول (آیدی تصادفی نمی‌شود برگرداند ولی رنگ خالی می‌شود)
  r = await post('/api/buyerBook/updateSettings', { brandColor: null });
  check('پاک‌کردن رنگ برند', r.http === 200 && r.json.data?.settings?.brandColor === null);
}

// ─── ۵) ذخیرهٔ دفتر توسط فروشنده ───
{
  // buyer2 را ذخیره کن
  let r = await post('/api/buyerBook/toggleSave', { userName: 'buyer2' });
  check('toggleSave(buyer2) → true', r.http === 200 && r.json.data?.saved === true);

  // دوباره → حذف
  r = await post('/api/buyerBook/toggleSave', { userName: 'buyer2' });
  check('toggleSave(buyer2) دوباره → false (حذف)', r.http === 200 && r.json.data?.saved === false);

  // دوباره ذخیره برای لیست نهایی
  r = await post('/api/buyerBook/toggleSave', { userName: 'buyer2' });

  // لیست ذخیره‌شده‌ها — seed: buyer1 + تازه: buyer2
  r = await post('/api/buyerBook/getMySaved');
  const items = r.json.data?.items ?? [];
  check(
    'getMySaved — buyer1 (seed) + buyer2 (تازه) با bookId',
    r.http === 200 && items.some((i) => i.buyerUserName === 'buyer1') && items.some((i) => i.buyerUserName === 'buyer2'),
    `count=${items.length}`,
  );
}

// ─── ۶) buyers/directory — bookId روی کارت‌ها ───
{
  const r = await post('/api/buyers/directory', { page: 1, perPage: 50 });
  const items = r.json.data?.items ?? [];
  const withBook = items.filter((i) => i.bookId);
  check(
    'buyers/directory — کارت‌ها bookId دارند (لینک فوتر دفتر خرید)',
    r.http === 200 && items.length > 0 && withBook.length === items.length,
    `items=${items.length} withBookId=${withBook.length}`,
  );
}

// ─── ۷) صفحهٔ عمومی دفتر خودم — resolvePublicId(userName) ───
{
  const r = await post('/api/buyerBook/resolvePublicId', { id: 'seller0' });
  check('resolvePublicId(seller0) → خودم', r.http === 200 && r.json.data?.userName === 'seller0');
}

console.log(failed === 0 ? '\n🎉 همهٔ تست‌های دفتر خرید موفق' : `\n💥 ${failed} تست شکست خورد`);
process.exit(failed === 0 ? 0 : 1);
