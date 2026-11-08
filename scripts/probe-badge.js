#!/usr/bin/env node
/** پروب رفتار بک‌اند: بج پشتیبانی چرا با ورود به صفحهٔ چت صفر می‌شود؟ */
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
  // ورود به عنوان میر علی
  const login = await post('/auth/login', { phone: '09144133782', password: '434343' });
  if (!login.json?.data?.accessToken) {
    console.log('LOGIN FAILED', JSON.stringify(login).slice(0, 400));
    return;
  }
  const t = login.json.data.accessToken;
  console.log('login OK, user:', login.json.data.user?.firstName, login.json.data.user?.lastName);

  const show = async (label) => {
    const u = await post('/chat/unreadCount', {}, t);
    console.log(label, '→', JSON.stringify(u.json?.data ?? u.json));
    return u.json?.data;
  };

  await show('1. unreadCount اولیه');

  // شبیه‌سازی ورود به /panel/messages: صفحه چه API هایی می‌زند؟
  const conv = await post('/chat/getConversations', {}, t);
  console.log('2. getConversations →', conv.json?.data?.length, 'threads');

  const admin = await post('/chat/getMyAdminMessages', {}, t);
  console.log('3. getMyAdminMessages →', JSON.stringify({ total: admin.json?.data?.total, unread: admin.json?.data?.unread }));

  await show('4. unreadCount بعد از fetch های صفحهٔ چت');

  // حالا markMyAdminMessagesRead — چی پاک می‌شود؟
  const mark = await post('/chat/markMyAdminMessagesRead', {}, t);
  console.log('5. markMyAdminMessagesRead →', JSON.stringify(mark.json?.data));

  const after = await show('6. unreadCount بعد از markAdminRead');

  // مکالمهٔ پشتیبانی — fetch خالص است؟
  const sup = await post('/support/getConversation', {}, t);
  const msgs = sup.json?.data?.messages ?? [];
  console.log('7. getConversation →', msgs.length, 'messages, unreadFromAdmin =', sup.json?.data?.unreadFromAdmin);
  console.log('   آخرین پیام‌ها:', msgs.slice(-4).map((m) => ({ role: m.senderRole, text: (m.text || '').slice(0, 30), readAt: m.readAt, at: m.createdAt })));

  await show('8. unreadCount بعد از getConversation');

  // اگر ticket هنوز > 0 است، markSupportConversationRead چه می‌کند؟
  if ((after?.ticket ?? 0) > 0) {
    const ms = await post('/support/markRead', {}, t);
    console.log('9. markSupportConversationRead →', JSON.stringify(ms.json?.data));
    await show('10. unreadCount بعد از markSupportRead');
  }
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
