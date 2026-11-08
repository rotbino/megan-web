#!/usr/bin/env node
/**
 * شبیه‌سازی پاسخ پشتیبان برای تست E2E — درج SupportMessage ادمین برای
 * کاربر تست (09144133782 / میر علی سید زاده) مستقیماً در دیتابیس Atlas.
 * استفاده: node scripts/insert-admin-reply.mjs [متن پیام]
 * توجه: نام فیلدها عین @map های schema.prisma (senderRole بدون map = camelCase).
 */
import { MongoClient } from '/home/z/my-project/repos/megan-back/node_modules/mongodb/lib/index.js';
import { effectiveDbUrl } from '/home/z/my-project/repos/megan-back/scripts/lib/profile.mjs';

const text = process.argv[2] ?? 'پاسخ تستی پشتیبان — دور ۲۲';
const client = await MongoClient.connect(effectiveDbUrl());
const db = client.db();

// پاک‌سازی درج‌های خراب تست قبلی (فیلد نادرست sender_role)
await db.collection('SupportMessage').deleteMany({ sender_role: { $exists: true } });

const user = await db.collection('User').findOne({ phone: '09144133782' });
if (!user) throw new Error('test user not found');
// read_at null صریح (قانون Prisma+MongoDB — RULES §۱۱)
const doc = {
  user_id: user._id,
  senderRole: 'admin',
  admin_username: 'test-support-admin',
  text,
  kind: 'text',
  read_at: null,
  created_at: new Date(),
};
const res = await db.collection('SupportMessage').insertOne(doc);
console.log(JSON.stringify({ inserted: String(res.insertedId), userId: String(user._id), text }));
await client.close();
