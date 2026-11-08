// ریست رمز «test_browser_admin» به مقدار مشخص برای تست پنل ادمین
// (همان scrypt پروژه: src/common/password.ts)
const fs = require('fs');
const { randomBytes, scrypt } = require('node:crypto');
const { promisify } = require('node:util');
const scryptAsync = promisify(scrypt);

for (const line of fs.readFileSync('/home/z/my-project/megan-back/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

(async () => {
  const { PrismaClient } = require('/home/z/my-project/megan-back/node_modules/@prisma/client');
  const p = new PrismaClient();
  const username = 'test_browser_admin';
  const pass = 'browser434343';
  const salt = randomBytes(16).toString('base64url');
  const key = await scryptAsync(pass.normalize('NFKC'), salt, 64);
  const hash = `scrypt:${salt}:${key.toString('base64')}`;
  await p.adminUser.update({ where: { username }, data: { passwordHash: hash, isActive: true } });
  console.log('✔ password reset for', username);
  await p.$disconnect();
})();
