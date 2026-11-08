// بررسی/حذف پاسخ نظرسنجی کاربر آزمایشی
const fs = require('fs');
for (const line of fs.readFileSync('/home/z/my-project/megan-back/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); // حتی اگر محیط پیش‌فرض داشت (DATABASE_URL ساختگی sandbox)
}
const { PrismaClient } = require('/home/z/my-project/megan-back/node_modules/@prisma/client');
const p = new PrismaClient();

const USER_ID = '6ae4a21bdb823ec70c0495a4'; // میر علی 09144133782

async function main() {
  const all = await p.surveyResponse.findMany({ select: { userId: true, score: true, note: true, createdAt: true } });
  console.log('all surveyResponses:', JSON.stringify(all, null, 1));
  const del = await p.surveyResponse.deleteMany({ where: { userId: USER_ID } });
  console.log('deleted for test user:', del.count);
}

main().finally(() => p.$disconnect());
