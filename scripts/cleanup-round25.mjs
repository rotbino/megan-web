#!/usr/bin/env node
/** پاکسازی پیام‌های تستی دور ۲۵ از گفتگوی واقعی میرعلی —
 *  ۵ پاسخ تیکت (SupportMessage) + ۱ پیام مستقیم (AdminMessage). */
import { MongoClient } from '/home/z/my-project/repos/megan-back/node_modules/mongodb/lib/index.js';
import { effectiveDbUrl } from '/home/z/my-project/repos/megan-back/scripts/lib/profile.mjs';

const TEXTS = [
  'پروب خودکار: پاسخ پشتیبان — تست بج',
  'پاسخ ۱ از ۲ — تست پیام جداگانه',
  'پاسخ ۲ از ۲ — تست پیام جداگانه',
  'پاسخ زنده WS — تست لحظه‌ای دور ۲۵',
  'تست ورود مستقیم با لینک thread=support',
];

const DIRECT = 'پیام مستقیم تست دور ۲۵ — از منوی پیام به کاربران';

const client = await MongoClient.connect(effectiveDbUrl());
const db = client.db();

const sup = await db.collection('SupportMessage').deleteMany({ text: { $in: TEXTS } });
const dir = await db.collection('AdminMessage').deleteMany({ text: DIRECT });

console.log(JSON.stringify({ supportDeleted: sup.deletedCount, directDeleted: dir.deletedCount }));
await client.close();
