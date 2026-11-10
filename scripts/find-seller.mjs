// پیدا کردن فروشندهٔ نمونه (با پیشنهاد تامین + آگهی) برای تست مرورگر
import { config } from '/home/z/my-project/megan-back/node_modules/dotenv/dist/index.cjs';
config({ path: '/home/z/my-project/megan-back/.env', override: true });
const { PrismaClient } = await import('/home/z/my-project/megan-back/node_modules/@prisma/client/default.js');
const p = new PrismaClient();

const offer = await p.supplyOffer.findFirst({ orderBy: { createdAt: 'desc' }, select: { sellerId: true } });
let sellerId = offer?.sellerId;
if (!sellerId) {
  const prod = await p.product.findFirst({ where: { status: 'confirmed' }, select: { userId: true } });
  sellerId = prod?.userId;
}
const u = await p.user.findUnique({ where: { id: sellerId }, select: { phone: true, firstName: true, lastName: true, isActive: true } });
const offers = await p.supplyOffer.count({ where: { sellerId } });
const products = await p.product.count({ where: { userId: sellerId, status: 'confirmed' } });
const prod = await p.product.findFirst({
  where: { userId: sellerId, status: 'confirmed' },
  select: { id: true, productName: true, subCategoryId: true },
});
const admin = await p.adminUser.findFirst({ select: { userName: true } }).catch(() => null);
console.log(JSON.stringify({ sellerId, phone: u?.phone, name: `${u?.firstName} ${u?.lastName}`, offers, products, sampleProduct: prod, admin: admin?.userName }, null, 1));
await p.$disconnect();
