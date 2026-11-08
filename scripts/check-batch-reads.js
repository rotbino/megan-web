// بررسی وضعیت خوانده‌شدن دستهٔ ارسال گروهی
const { PrismaClient } = require('/home/z/my-project/repos/megan-back/node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  const batches = await p.adminMessage.groupBy({
    by: ['batchId'],
    where: { batchId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { userId: 'desc' } },
    take: 5,
  });
  console.log('batches:', batches.map((b) => ({ id: (b.batchId || '').slice(0, 8), n: b._count._all })));

  // آخرین دستهٔ بزرگ (broadcast ۳۹تایی)
  const big = batches.sort((a, b) => b._count._all - a._count._all)[0];
  if (big?.batchId) {
    const [total, read] = await Promise.all([
      p.adminMessage.count({ where: { batchId: big.batchId } }),
      p.adminMessage.count({ where: { batchId: big.batchId, readAt: { not: null } } }),
    ]);
    console.log(`broadcast batch: total=${total} read=${read}`);
    const sample = await p.adminMessage.findMany({
      where: { batchId: big.batchId, readAt: { not: null } },
      take: 3,
    });
    for (const s of sample) console.log('  read sample:', s.userId, 'at', s.readAt.toISOString());
  }
}

main().finally(() => p.$disconnect());
