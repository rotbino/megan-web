// شمار کاربران + آخرین AdminMessage ها
const { PrismaClient } = require('/home/z/my-project/repos/megan-back/node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  const [users, admins, msgs] = await Promise.all([
    p.user.count(),
    p.adminUser.count(),
    p.adminMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  console.log('users:', users, '| adminUsers:', admins, '| adminMessages total:');
  for (const m of msgs) {
    console.log(`  - to=${m.userId} from=${m.adminUsername} at=${m.createdAt.toISOString()} text="${m.text.slice(0, 40)}"`);
  }
}

main().finally(() => p.$disconnect());
