#!/usr/bin/env node
/** آماده‌سازی سناریوی E2E دور ۲۵: ادمین ۲ پاسخ پشت‌سرهم به تیکت می‌فرستد
 *  (کنار پاسخ قبلیِ خوانده‌نشده) + ساخت JSON تزریق نشست مرورگر برای میرعلی. */
const BASE = 'http://localhost:4000/api/v1';
const fs = require('fs');

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
  // ادمین
  const al = await post('/admin/auth/login', { username: '09196421264', password: '434343' });
  const adminToken = al.json?.data?.token;
  if (!adminToken) { console.log('ADMIN LOGIN FAILED', JSON.stringify(al).slice(0, 200)); process.exit(1); }

  // کاربر
  const ul = await post('/auth/login', { phone: '09144133782', password: '434343' });
  const userToken = ul.json?.data?.accessToken;
  const refreshToken = ul.json?.data?.refreshToken;
  if (!userToken) { console.log('USER LOGIN FAILED', JSON.stringify(ul).slice(0, 200)); process.exit(1); }
  const prof = await post('/users/getProfile', {}, userToken);
  const user = prof.json?.data?.user;
  const userId = user?._id ?? user?.id;
  console.log('user:', user?.firstName, user?.lastName, userId);

  // وضعیت فعلی بج
  const u0 = await post('/chat/unreadCount', {}, userToken);
  console.log('unread قبل از ارسال:', JSON.stringify(u0.json?.data));

  // ۲ پاسخ پشت‌سرهم (تست «به ازای هر پاسخ یه پیام جدا»)
  for (const text of ['پاسخ ۱ از ۲ — تست پیام جداگانه', 'پاسخ ۲ از ۲ — تست پیام جداگانه']) {
    const r = await post('/admin/support/sendMessage', { userId, text }, adminToken);
    if (r.json?.status === false) { console.log('SEND FAILED', JSON.stringify(r).slice(0, 200)); process.exit(1); }
    console.log('sent:', text);
  }

  const u1 = await post('/chat/unreadCount', {}, userToken);
  console.log('unread بعد از ارسال:', JSON.stringify(u1.json?.data));

  // JSON تزریق نشست مرورگر
  const session = {
    tokens: { accessToken: userToken, refreshToken },
    user: {
      phone: '09144133782',
      userName: user?.userName ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      avatarUrl: user?.avatarUrl ?? null,
      role: user?.role === 'seller' ? 'seller' : 'buyer',
      hasPassword: true,
    },
  };
  fs.writeFileSync('/tmp/mirali-session.json', JSON.stringify(session, null, 2));
  console.log('session written to /tmp/mirali-session.json');
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });
