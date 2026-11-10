#!/usr/bin/env bun
/**
 * آماده‌سازی دیتای تست بصری اولویت/یادآور (خواسته مالک ۷-۱۱)
 * روی Atlas: برای کاربر تست 09150000001 — سه آیتم با اولویت‌های 1/2/3 و
 * یادآورهای امروز/آینده. آیتم سررسیده (دیروز) برای فیلتر «پیگیری‌های امروز».
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PHONE = '09150000001';

async function main() {
  const user = await prisma.user.findFirst({ where: { phone: PHONE } });
  if (!user) throw new Error('test user not found');
  console.log('user:', user.id, user.firstName, user.lastName, 'role:', user.role);

  const items = await prisma.followItem.findMany({
    where: { userId: user.id },
    include: { notes: true },
    orderBy: { updatedAt: 'desc' },
  });
  console.log('follow items:', items.length);

  if (items.length === 0) throw new Error('no follow items to decorate — run API test first');

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 3600 * 1000);

  // آیتم ۰ → اولویت بالا + سررسیده (دیروز) → باید بالای لیست + بج «پیگیری امروز»
  await prisma.followItem.update({
    where: { id: items[0].id },
    data: { priority: 1, nextFollowAt: yesterday, status: 'negotiating' },
  });
  // آیتم ۱ (اگر هست) → اولویت متوسط + یادآور ۳ روز دیگر
  if (items[1]) {
    await prisma.followItem.update({
      where: { id: items[1].id },
      data: { priority: 2, nextFollowAt: inThreeDays, status: 'reviewing' },
    });
  }
  // آیتم ۲ (اگر هست) → اولویت کم بدون یادآور
  if (items[2]) {
    await prisma.followItem.update({
      where: { id: items[2].id },
      data: { priority: 3, nextFollowAt: null, status: 'contacted' },
    });
  }

  const after = await prisma.followItem.findMany({
    where: { userId: user.id },
    select: { id: true, priority: true, nextFollowAt: true, status: true },
  });
  console.log('after:', JSON.stringify(after, null, 1));
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
