import { config } from '/home/z/my-project/megan-back/node_modules/dotenv/dist/index.cjs';
config({ path: '/home/z/my-project/megan-back/.env', override: true });
const { PrismaClient } = await import('/home/z/my-project/megan-back/node_modules/@prisma/client/default.js');
const p = new PrismaClient();
const models = Object.keys(p).filter(k => !k.startsWith('_') && !k.startsWith('$'));
const adminish = models.filter(m => m.toLowerCase().includes('admin'));
console.log('admin models:', adminish);
for (const m of adminish) {
  const row = await p[m].findFirst({}).catch(e => null);
  if (row) console.log(m, JSON.stringify({ id: row.id, userName: row.userName ?? row.username ?? row.name, role: row.role }).slice(0, 120));
}
await p.$disconnect();
