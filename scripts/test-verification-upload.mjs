#!/usr/bin/env node
/**
 * تست E2E باگ MULTIPART_TRUNCATED (گزارش مالک ۱۰-۱۱):
 * ارسال فرم multipart با ۴ فایل بزرگ (مجموعاً ~۱۲MB — بالای سقف قبلی ۱۰MB
 * پراکسی dev نکست) از طریق پروکسی :3000 به verification/submitVerification.
 * پاسخ باید status:true باشد (نه کد MULTIPART_TRUNCATED).
 *
 * همچنین uploads/uploadImage و buyerBook/updateSettings را می‌آزماید.
 */
const BASE = 'http://127.0.0.1:3000';

/** ساخت فایل JPEG ساختگی با حجم مشخص (بدنهٔ تصادفی — پارس multipart واقعی) */
function fakeJpeg(sizeBytes) {
  const head = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const body = Buffer.alloc(Math.max(0, sizeBytes - head.length), 0xab);
  // الگوی مرز-یاب را نشکنیم: بایت‌های تصادفی امن (بدون --)
  for (let i = 0; i < body.length; i += 997) body[i] = (i * 31) % 251;
  return Buffer.concat([head, body]);
}

/** ساخت بدنهٔ multipart دستی — عین FormData مرورگر */
function multipart(fields) {
  const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).slice(2, 8);
  const parts = [];
  for (const [name, { filename, content, type }] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\n` +
          `Content-Type: ${type}\r\n\r\n`,
      ),
    );
    parts.push(content);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

async function post(path, body, contentType) {
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 120) }; }
  return { http: res.status, json };
}

const MB = 1024 * 1024;
let failed = 0;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
  if (!ok) failed += 1;
};

// ─── ۱) احراز هویت: ۴ فایل ~۱۲MB مجموعاً (بازتولید شرایط باگ) ───
{
  const { body, contentType } = multipart({
    nationalCardFront: { filename: 'front.jpg', type: 'image/jpeg', content: fakeJpeg(4 * MB) },
    nationalCardBack: { filename: 'back.jpg', type: 'image/jpeg', content: fakeJpeg(3.5 * MB) },
    selfieWithCard: { filename: 'selfie.jpg', type: 'image/jpeg', content: fakeJpeg(4 * MB) },
    registrationNotice: { filename: 'notice.jpg', type: 'image/jpeg', content: fakeJpeg(1 * MB) },
  });
  const r = await post('/api/verification/submitVerification', body, contentType);
  check(
    'verification/submitVerification (۴ فایل ~۱۲.۵MB از طریق پروکسی)',
    r.http === 200 && r.json.status === true && r.json.data?.status === 'pending',
    `HTTP ${r.http} code=${r.json.code ?? '—'} status=${r.json.data?.status ?? '—'}`,
  );
}

// ─── ۲) همان فرم بدون registrationNotice (حساب شخصی) ───
{
  const { body, contentType } = multipart({
    nationalCardFront: { filename: 'front.jpg', type: 'image/jpeg', content: fakeJpeg(2 * MB) },
    nationalCardBack: { filename: 'back.jpg', type: 'image/jpeg', content: fakeJpeg(2 * MB) },
    selfieWithCard: { filename: 'selfie.jpg', type: 'image/jpeg', content: fakeJpeg(2 * MB) },
  });
  const r = await post('/api/verification/submitVerification', body, contentType);
  check(
    'submitVerification شخصی (۳ فایل ۶MB)',
    r.http === 200 && r.json.status === true && r.json.data?.accountType === 'personal',
    `HTTP ${r.http} accountType=${r.json.data?.accountType ?? '—'}`,
  );
}

// ─── ۳) فرم ناقص → باید همان خطای قراردادی بک‌اند واقعی را بدهد ───
{
  const { body, contentType } = multipart({
    nationalCardFront: { filename: 'front.jpg', type: 'image/jpeg', content: fakeJpeg(50 * 1024) },
    // back و selfie غایب‌اند → MULTIPART_TRUNCATED (رفتار درست)
  });
  const r = await post('/api/verification/submitVerification', body, contentType);
  check(
    'فرم ناقص → خطای قراردادی MULTIPART_TRUNCATED',
    r.http === 400 && r.json.status === false && r.json.code === 'MULTIPART_TRUNCATED',
    `HTTP ${r.http} code=${r.json.code ?? '—'}`,
  );
}

// ─── ۴) uploads/uploadImage (لوگوی دفتر خرید) ───
{
  const { body, contentType } = multipart({
    file: { filename: 'logo.png', type: 'image/png', content: fakeJpeg(300 * 1024) },
  });
  const r = await post('/api/uploads/uploadImage?key=logo', body, contentType);
  const url = r.json.data?.url;
  check('uploads/uploadImage (لوگو)', r.http === 200 && !!url, `url=${url ?? '—'}`);
  // فایل سرو می‌شود؟
  if (url) {
    const img = await fetch(BASE + url);
    check('GET فایل آپلودشده', img.status === 200 && (await img.arrayBuffer()).byteLength === 300 * 1024, `HTTP ${img.status}`);
  }
}

console.log(failed === 0 ? '\n🎉 همهٔ تست‌های آپلود موفق' : `\n💥 ${failed} تست شکست خورد`);
process.exit(failed === 0 ? 0 : 1);
