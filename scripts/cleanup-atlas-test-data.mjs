/**
 * پاک‌سازی دادهٔ تستی که تست اشتباه قبلی روی Atlas ساخت.
 * فقط ردیف‌هایی با شناسه/زمان دقیق همان تست حذف می‌شوند — هیچ چیز دیگری دست نمی‌خورد.
 */
import { readFileSync } from 'node:fs';
import { MongoClient, ObjectId } from 'mongodb';

const env = readFileSync('/home/z/my-project/megan-back/.env', 'utf8');
const url = env.match(/^DATABASE_URL="?(.+?)"?$/m)?.[1];
const client = new MongoClient(url);
await client.connect();
const db = client.db();

const USER_ID = new ObjectId('6aedaeac9901e51d8c0bdf9a');
const FILE_ID = new ObjectId('6aedaebb9901e51d8c0bdf9d');

// محافظ: فقط وقتی حذف کن که createdAt کاربر دقیقاً زمان تست باشد
const user = await db.collection('User').findOne({ _id: USER_ID });
if (!user || user.phone !== '09150001122' || user.created_at?.toISOString() !== '2026-11-06T10:40:44.919Z') {
  console.log('ABORT: کاربر با مشخصات تست مطابقت ندارد — چیزی حذف نشد');
  process.exit(1);
}

const r1 = await db.collection('File').deleteOne({ _id: FILE_ID, owner_id: USER_ID });
const r2 = await db.collection('RefreshToken').deleteMany({ user_id: USER_ID });
const r3 = await db.collection('User').deleteOne({ _id: USER_ID });
console.log(`File deleted: ${r1.deletedCount} | RefreshToken deleted: ${r2.deletedCount} | User deleted: ${r3.deletedCount}`);

// تأیید نهایی
const left = await db.collection('User').countDocuments({ phone: '09150001122' });
console.log('remaining users with test phone:', left);
await client.close();
