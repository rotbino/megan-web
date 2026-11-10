// تست نگهبان نوع پرونده — ذخیرهٔ سرنخ فروش در پروندهٔ خرید باید خطا بدهد
const BASE = 'http://localhost:4000/api/v1';
const PHONE = '09144133782';

await fetch(`${BASE}/auth/sendOtp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: PHONE }),
});
const r2 = await fetch(`${BASE}/auth/verifyOtp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: PHONE, code: '1234' }),
});
const auth = await r2.json();
const token = auth?.data?.accessToken ?? auth?.accessToken;

// پرونده‌های خرید این کاربر
const folders = await (
  await fetch(`${BASE}/follow/getFolders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: 'buy' }),
  })
).json();
const buyFolder = folders?.data?.[0];
console.log('buy folder:', buyFolder?.name, buyFolder?.id);

// یک درخواست خرید واقعی (سرنخ فروش) — تلاش برای ذخیره در پروندهٔ خرید
const reqs = await (
  await fetch(`${BASE}/buy-requests/getBuyRequests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perPage: 1 }),
  })
).json();
const reqId = reqs?.data?.items?.[0]?.id ?? 108;
console.log('target buy_request id:', reqId);

const up = await (
  await fetch(`${BASE}/follow/upsertItem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folderId: buyFolder.id, targetType: 'buy_request', targetId: reqId }),
  })
).json();
console.log('نتیجه (باید خطا باشد):', up.status === false ? `✓ ${up.message}` : `✗ بدون خطا! ${JSON.stringify(up).slice(0, 120)}`);
