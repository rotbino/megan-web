#!/usr/bin/env bun
/** تست API اولویت + پیگیری بعدی (خواسته مالک ۷-۱۱) — بک‌اند لوکال:4000 */
const BASE = 'http://localhost:4000/api/v1';
const PHONE = '09150000001';

async function post(path, body, token) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const login = async (phone) => {
  await post('auth/sendOtp', { phone });
  const v = await post('auth/verifyOtp', { phone, code: '1234' });
  return v.json?.data?.accessToken;
};

const main = async () => {
  const token = await login(PHONE);
  if (!token) throw new Error('login failed');
  console.log('✓ login');

  // همه موارد فعلی
  const all0 = await post('follow/getAllItems', {}, token);
  const items0 = all0.json?.data ?? [];
  console.log(`✓ getAllItems: ${items0.length} items`);

  if (items0.length === 0) {
    // پرونده بساز + اولین آیتم را از درخواست‌های خرید نمونه ذخیره کن
    const f = await post('follow/createFolder', { name: `تست اولویت ${Date.now() % 1000}` }, token);
    const folderId = f.json?.data?.id;
    console.log('✓ createFolder:', folderId);

    const reqs = await post('buyRequests/getAll', { perPage: 5 }, token);
    const req = reqs.json?.data?.items?.[0];
    if (!req) {
      console.log('⚠ درخواست خریدی برای تست نیست');
      return;
    }
    const up = await post(
      'follow/upsertItem',
      { folderId, targetType: 'buy_request', targetId: req.id, status: 'reviewing', priority: 1, nextFollowDays: 2, note: 'تست اولویت بالا' },
      token,
    );
    console.log('✓ upsertItem priority=1 nextFollowDays=2 →', JSON.stringify(up.json?.data && {
      priority: up.json.data.priority,
      nextFollowAt: up.json.data.nextFollowAt,
      status: up.json.data.status,
    }));
    const itemId = up.json?.data?.id;

    // تغییر اولویت به کم
    const pr = await post('follow/setItemPriority', { itemId, priority: 3 }, token);
    console.log('✓ setItemPriority(3):', pr.status, pr.json?.message);

    // روز دیگر → سررسیده
    const nf = await post('follow/setNextFollow', { itemId, days: 0 }, token);
    console.log('✓ setNextFollow(0 = امروز):', nf.status, nf.json?.message);

    // خواندن مجدد
    const all1 = await post('follow/getAllItems', {}, token);
    const it = (all1.json?.data ?? []).find((x) => x.id === itemId);
    console.log('✓ readback:', JSON.stringify({ priority: it?.priority, nextFollowAt: it?.nextFollowAt }));
    if (it?.priority === 3 && it?.nextFollowAt) console.log('★ FIRST-ITEM TEST PASS');
    else console.log('★ FAIL');

    // اعتبارسنجی: مقدار نامعتبر
    const bad = await post('follow/setItemPriority', { itemId, priority: 5 }, token);
    console.log('✓ invalid priority(5) rejected:', bad.status === 400 ? 'PASS' : `FAIL(${bad.status})`);
  } else {
    const itemId = items0[0].id;
    const pr = await post('follow/setItemPriority', { itemId, priority: 1 }, token);
    console.log('✓ setItemPriority(1):', pr.status, pr.json?.message);
    const nf = await post('follow/setNextFollow', { itemId, days: 3 }, token);
    console.log('✓ setNextFollow(3):', nf.status, nf.json?.message);
    const all1 = await post('follow/getAllItems', {}, token);
    const it = (all1.json?.data ?? []).find((x) => x.id === itemId);
    console.log('✓ readback:', JSON.stringify({ priority: it?.priority, nextFollowAt: it?.nextFollowAt }));
    if (it?.priority === 1 && it?.nextFollowAt) console.log('★ TEST PASS');
    else console.log('★ FAIL');
    // اعتبارسنجی: مقدار نامعتبر
    const bad = await post('follow/setItemPriority', { itemId, priority: 5 }, token);
    console.log('✓ invalid priority(5) rejected:', bad.status === 400 ? 'PASS' : `FAIL(${bad.status})`);
  }
};

main().catch((e) => {
  console.error('TEST ERROR:', e.message);
  process.exit(1);
});
