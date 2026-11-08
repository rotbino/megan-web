// E2E واترمارک تکی — آپلود واقعی از طریق API بک‌اند و بازبینی خروجی
const BASE = 'http://localhost:4000/api/v1';
const PHONE = '09144133782';

// ۱) ورود با OTP
const r1 = await fetch(`${BASE}/auth/sendOtp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: PHONE }),
});
console.log('sendOtp:', r1.status);

const r2 = await fetch(`${BASE}/auth/verifyOtp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: PHONE, code: '1234' }),
});
console.log('verifyOtp:', r2.status);
const auth = await r2.json();
const token = auth?.data?.accessToken ?? auth?.accessToken;
if (!token) {
  console.error('توکن نیامد:', JSON.stringify(auth).slice(0, 300));
  process.exit(1);
}

// ۲) عکس تستی — گرادیان با جزئیات (اینجا با sharp بک‌اند می‌سازیم)
const { spawnSync } = await import('node:child_process');
const sharpPath = '/home/z/my-project/megan-back/node_modules/sharp/dist/index.cjs';
const { default: sharp } = await import(sharpPath);
const jpeg = await sharp({
  create: { width: 1200, height: 900, channels: 3, background: { r: 150, g: 120, b: 80 } },
})
  .composite([{
    input: Buffer.from(
      `<svg width="1200" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="#d9b98a"/><stop offset="100%" stop-color="#5b744a"/></linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/></svg>`,
    ),
  }])
  .jpeg({ quality: 92 })
  .toBuffer();

// ۳) آپلود staged به‌عنوان تصویر آگهی (Product → واترمارک می‌گیرد)
const form = new FormData();
form.append('file', new Blob([jpeg], { type: 'image/jpeg' }), 'wm-e2e-test.jpg');
const up = await fetch(`${BASE}/uploads/uploadImage?model=Product&key=gallery`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
console.log('upload:', up.status);
const upJson = await up.json();
const url = upJson?.data?.url ?? upJson?.url;
console.log('url:', url);
if (!url) {
  console.error(JSON.stringify(upJson).slice(0, 400));
  process.exit(1);
}

// ۴) دانلود خروجی سرور (همان بایتی که ذخیره می‌شود)
const dl = await fetch(url);
const buf = Buffer.from(await dl.arrayBuffer());
const { writeFileSync } = await import('node:fs');
writeFileSync('/tmp/wm-e2e-server.jpg', buf);
console.log('✓ /tmp/wm-e2e-server.jpg —', buf.length, 'bytes');
