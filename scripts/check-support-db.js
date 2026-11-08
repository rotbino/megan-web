// بررسی وضعیت گفتگوی پشتیبانی میرعلی در دیتابیس واقعی
const { PrismaClient } = require('/home/z/my-project/repos/megan-back/node_modules/@prisma/client');
const p = new PrismaClient();

const USER_ID = '6ae4a21bdb823ec70c0495a4'; // میر علی 09144133782

async function main() {
  const user = await p.user.findUnique({ where: { id: USER_ID } });
  console.log('user:', user ? `${user.firstName} ${user.lastName} (${user.userName})` : 'NOT FOUND');

  const msgs = await p.supportMessage.findMany({
    where: { userId: USER_ID },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\nsupportMessages: ${msgs.length}`);
  for (const m of msgs) {
    console.log(
      `  - role=${m.senderRole} admin=${m.adminUsername ?? '-'} readAt=${m.readAt ? m.readAt.toISOString() : 'NULL'} at=${m.createdAt.toISOString()}`,
      `text="${m.text?.slice(0, 60)}"`,
    );
  }

  const unread = await p.supportMessage.count({
    where: { userId: USER_ID, senderRole: 'admin', readAt: null },
  });
  console.log(`\nunread admin replies (ticket): ${unread}`);
}

main().finally(() => p.$disconnect());
