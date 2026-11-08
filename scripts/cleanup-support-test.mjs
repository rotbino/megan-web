#!/usr/bin/env node
/** پاکسازی دادهٔ تست E2E پشتیبانی — ادمین تست + پیام‌های گفتگوی کاربر تست */
import { MongoClient } from '/home/z/my-project/repos/megan-back/node_modules/mongodb/lib/index.js';
import { effectiveDbUrl } from '/home/z/my-project/repos/megan-back/scripts/lib/profile.mjs';

const client = await MongoClient.connect(effectiveDbUrl());
const db = client.db();

// 1) حذف ادمین تست (رمز مشخص — نباید بماند)
const delAdmin = await db.collection('AdminUser').deleteOne({ username: 'test-support-admin' });

// 2) حذف پیام‌های گفتگوی پشتیبانی کاربر تست (09123456789)
const user = await db.collection('User').findOne({ phone: '09123456789' });
let delMsgs = { deletedCount: 0 };
if (user) {
  delMsgs = await db.collection('SupportMessage').deleteMany({ $or: [{ userId: user._id }, { userId: String(user._id) }] });
}

console.log(JSON.stringify({ adminDeleted: delAdmin.deletedCount, supportMessagesDeleted: delMsgs.deletedCount }));
await client.close();
