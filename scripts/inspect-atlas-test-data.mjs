/**
 * بازرسی دادهٔ تستی روی Atlas — فقط خواندن، هیچ تغییری نمی‌دهد.
 * (تست اشتباه قبلی: کاربر 09150001122 + آواتار localhost)
 */
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const env = readFileSync('/home/z/my-project/megan-back/.env', 'utf8');
const url = env.match(/^DATABASE_URL="?(.+?)"?$/m)?.[1];
if (!url) { console.error('no url'); process.exit(1); }

const client = new MongoClient(url);
await client.connect();
const db = client.db();
const phone = '09150001122';

const user = await db.collection('User').findOne({ phone });
if (!user) {
  console.log('USER: یافت نشد (چیزی برای پاک کردن نیست)');
} else {
  console.log('USER:', JSON.stringify({
    id: String(user._id),
    createdAt: user.created_at ?? user.createdAt ?? null,
    userName: user.user_name ?? null,
    role: user.role ?? null,
  }));
  const uid = user._id;
  const files = await db.collection('File').find({ owner_id: uid }).toArray();
  console.log('FILES:', JSON.stringify(files.map(f => ({
    id: String(f._id), url: f.url, related_model: f.related_model, created: f.created_at ?? f.createdAt ?? null,
  }))));
  for (const col of ['RefreshToken', 'FollowFolder', 'FollowItem', 'ChatThread', 'OtpCode', 'ActivityLog', 'CallLog']) {
    const n = await db.collection(col).countDocuments({
      $or: [{ user_id: uid }, { owner_id: uid }, { user_id: String(uid) }, { owner_id: String(uid) }],
    });
    if (n > 0) console.log(`RELATED ${col}: ${n}`);
  }
}
await client.disconnect();
