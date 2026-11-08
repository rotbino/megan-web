#!/usr/bin/env node
/** E2E: ادمین پاسخ تیکت می‌دهد → کاربر وارد صفحهٔ چت می‌شود → بج چه می‌شود؟
 *  هدف: یافتن دقیق فراخوانی‌ای که بج ticket/support را پیش از دیدن پیام صفر می‌کند. */
const BASE = 'http://localhost:4000/api/v1';

async function post(path, body, token) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  // ── ادمین ──
  const al = await post('/admin/auth/login', { username: '09196421264', password: '434343' });
  let adminToken = al.json?.data?.token;
  if (!adminToken) {
    const al2 = await post('/admin/auth/login', { username: '09196421264', password: '123456' });
    adminToken = al2.json?.data?.token;
    if (!adminToken) {
      console.log('ADMIN LOGIN FAILED', JSON.stringify(al).slice(0, 300), JSON.stringify(al2).slice(0, 200));
      return;
    }
  }
  console.log('admin login OK');

  // یافتن userId میر علی از لیست تیکت‌ها (یا از پروفایل)
  const userLogin = await post('/auth/login', { phone: '09144133782', password: '434343' });
  const userToken = userLogin.json?.data?.accessToken;
  if (!userToken) { console.log('USER LOGIN FAILED', JSON.stringify(userLogin).slice(0, 300)); return; }
  const prof = await post('/users/getProfile', {}, userToken);
  const userId = prof.json?.data?.user?._id ?? prof.json?.data?._id ?? prof.json?.data?.id ?? prof.json?.data?.user?.id;
  console.log('user id:', userId, '| profile keys:', prof.json?.data ? Object.keys(prof.json.data).slice(0, 8) : prof.json);

  // ── ادمین: پاسخ تازه به تیکت ──
  const send = await post('/admin/support/sendMessage', { userId, text: 'پروب خودکار: پاسخ پشتیبان — تست بج' }, adminToken);
  if (send.json?.status === false) { console.log('ADMIN SEND FAILED', JSON.stringify(send).slice(0, 300)); return; }
  console.log('admin sent reply:', send.json?.data?.text?.slice(0, 30), 'id:', send.json?.data?._id ?? send.json?.data?.id);

  // ── کاربر: وضعیت بج ──
  const u1 = await post('/chat/unreadCount', {}, userToken);
  console.log('\n>> unreadCount پس از پاسخ ادمین:', JSON.stringify(u1.json?.data));

  // شبیه‌سازی دقیق ورود به /panel/messages (ترتیب فراخوانی‌های صفحه):
  console.log('\n-- شبیه‌سازی ورود به صفحهٔ پیام‌ها --');
  const steps = [
    ['getConversations', '/chat/getConversations', {}],
    ['getMyAdminMessages', '/chat/getMyAdminMessages', {}],
    ['getSupportConversation (fetch خالص)', '/support/getConversation', {}],
  ];
  for (const [label, path, body] of steps) {
    await post(path, body, userToken);
    const u = await post('/chat/unreadCount', {}, userToken);
    console.log(`${label} → unreadCount:`, JSON.stringify(u.json?.data));
  }

  // markMyAdminMessagesRead (اتو-اوپن دسکتاپ پشتیبانی در صفحهٔ پیام‌ها این را می‌زند)
  await post('/chat/markMyAdminMessagesRead', {}, userToken);
  const u2 = await post('/chat/unreadCount', {}, userToken);
  console.log('markMyAdminMessagesRead → unreadCount:', JSON.stringify(u2.json?.data));

  // WS رویداد چی؟ (فقط اطلاع) — حالا مکالمهٔ پشتیبانی:
  const sup = await post('/support/getConversation', {}, userToken);
  const msgs = sup.json?.data?.messages ?? [];
  console.log('\nsupport conversation:', msgs.length, 'messages | unreadFromAdmin:', sup.json?.data?.unreadFromAdmin);
  const last = msgs.at(-1);
  console.log('آخرین پیام:', { role: last?.senderRole, text: last?.text?.slice(0, 40), readAt: last?.readAt });
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });
