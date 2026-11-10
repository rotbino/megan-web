// ادمین موقت برای تست مرورگر پنل مدیریت — «aimch-browser-test» با رمز Test@2600
// بعد از تست: node tmp-admin.mjs cleanup
import { config } from '/home/z/my-project/megan-back/node_modules/dotenv/dist/index.cjs';
config({ path: '/home/z/my-project/megan-back/.env', override: true });
const { PrismaClient } = await import('/home/z/my-project/megan-back/node_modules/@prisma/client/default.js');
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
const scryptAsync = promisify(scrypt);

const p = new PrismaClient();
const USERNAME = 'aimch-browser-test';
const PASSWORD = 'Test@2600';

async function hashPassword(plain) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scryptAsync(plain.normalize('NFKC'), salt, 64);
  return `scrypt:${salt}:${key.toString('base64')}`;
}

if (process.argv[2] === 'cleanup') {
  const r = await p.adminUser.deleteMany({ where: { username: USERNAME } });
  console.log('cleanup:', r.count, 'deleted');
} else {
  await p.adminUser.deleteMany({ where: { username: USERNAME } });
  const a = await p.adminUser.create({
    data: { username: USERNAME, passwordHash: await hashPassword(PASSWORD), name: 'تست مرورگر', role: 'SUPER_ADMIN', isActive: true },
  });
  console.log('temp admin created:', a.username, a.role);
}
await p.$disconnect();
