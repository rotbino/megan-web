import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000)
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000)

async function main() {
  await db.message.deleteMany()
  await db.conversation.deleteMany()

  await db.conversation.create({
    data: {
      contactName: 'مریم احمدی',
      contactStatus: 'آنلاین',
      listingTitle: 'آپارتمان ۸۵ متری، سعادت‌آباد',
      listingPrice: '۵٬۸۰۰٬۰۰۰٬۰۰۰ تومان',
      listingIcon: 'home',
      lastMessage: 'باشه، فردا ساعت ۱۱ تشریف بیارید',
      lastSender: 'contact',
      lastMessageAt: minutesAgo(4),
      unread: 2,
      messages: {
        create: [
          { content: 'سلام، وقتتون بخیر. آپارتمان هنوز موجوده؟', sender: 'user', createdAt: daysAgo(1), isRead: true },
          { content: 'سلام، بخیر. بله همچنان موجوده', sender: 'contact', createdAt: daysAgo(1), isRead: true },
          { content: 'امکانش هست فردا برای بازدید بیام؟', sender: 'user', createdAt: hoursAgo(5), isRead: true },
          { content: 'بله حتماً، از ساعت ۱۰ به بعد خونه هستیم', sender: 'contact', createdAt: hoursAgo(4), isRead: true },
          { content: 'ممنون. قیمت هم همونیه که تو آگهی نوشتید؟', sender: 'user', createdAt: hoursAgo(2), isRead: true },
          { content: 'قیمت قابل صحبت هست، اگه واقعاً بخواید کمی پایین‌تر میام', sender: 'contact', createdAt: minutesAgo(30), isRead: true },
          { content: 'باشه، فردا ساعت ۱۱ تشریف بیارید', sender: 'contact', createdAt: minutesAgo(4), isRead: false },
        ],
      },
    },
  })

  await db.conversation.create({
    data: {
      contactName: 'رضا کریمی',
      contactStatus: 'آخرین بازدید ۲ ساعت پیش',
      listingTitle: 'پراید ۱۴۱ مدل ۱۴۰۲، کارکرد صفر',
      listingPrice: '۴۸۵٬۰۰۰٬۰۰۰ تومان',
      listingIcon: 'car',
      lastMessage: 'بله، بیمه‌ی کامل تا آخر سال داره',
      lastSender: 'contact',
      lastMessageAt: minutesAgo(45),
      unread: 0,
      messages: {
        create: [
          { content: 'سلام. پراید مدلت کارکردش چقدره؟', sender: 'user', createdAt: daysAgo(2), isRead: true },
          { content: 'سلام. کارکرد واقعی ۱۵ هزار کیلومتره، بی‌رنگ و سالمه', sender: 'contact', createdAt: daysAgo(2), isRead: true },
          { content: 'معاینه فنی و بیمه داره؟', sender: 'user', createdAt: hoursAgo(20), isRead: true },
          { content: 'بله، بیمه‌ی کامل تا آخر سال داره', sender: 'contact', createdAt: minutesAgo(45), isRead: true },
        ],
      },
    },
  })

  await db.conversation.create({
    data: {
      contactName: 'علی محمدی',
      contactStatus: 'آنلاین',
      listingTitle: 'آیفون ۱۴ پرو مکس ۲۵۶ گیگ',
      listingPrice: '۹۲٬۰۰۰٬۰۰۰ تومان',
      listingIcon: 'phone',
      lastMessage: 'سلام، سلامت باشید. من پس گرفتمش',
      lastSender: 'user',
      lastMessageAt: hoursAgo(3),
      unread: 0,
      messages: {
        create: [
          { content: 'سلام. گوشی سلامته؟ خط و خش نداره؟', sender: 'user', createdAt: daysAgo(3), isRead: true },
          { content: 'سلام. کاملاً سالمه، فقط پشتش یه خط ریز داره', sender: 'contact', createdAt: daysAgo(3), isRead: true },
          { content: 'باکس و فاکتور داره؟', sender: 'user', createdAt: daysAgo(2), isRead: true },
          { content: 'بله، همه چیز کامل هست', sender: 'contact', createdAt: daysAgo(2), isRead: true },
          { content: 'قیمتش رو آخرین می‌بینم ۸۵ زده بودن، شما ۹۲ گفتید', sender: 'user', createdAt: daysAgo(1), isRead: true },
          { content: 'اون ۱۲۸ گیگ بود، این ۲۵۶ گیگه', sender: 'contact', createdAt: daysAgo(1), isRead: true },
          { content: 'باشه، سلامت باشید. من پس گرفتمش', sender: 'user', createdAt: hoursAgo(3), isRead: true },
        ],
      },
    },
  })

  await db.conversation.create({
    data: {
      contactName: 'سارا موسوی',
      contactStatus: 'آخرین بازدید دیروز',
      listingTitle: 'مبل راحتی هشت نفره رویال',
      listingPrice: '۳۴٬۵۰۰٬۰۰۰ تومان',
      listingIcon: 'sofa',
      lastMessage: 'تا آخر هفته تحویل می‌دیم، رایگون هم داریم',
      lastSender: 'contact',
      lastMessageAt: hoursAgo(26),
      unread: 0,
      messages: {
        create: [
          { content: 'سلام. مبل پارچه‌ش شسته‌شو میشه؟', sender: 'user', createdAt: daysAgo(4), isRead: true },
          { content: 'سلام. بله، پارچه‌ش قابل شستشو و تعویضه', sender: 'contact', createdAt: daysAgo(4), isRead: true },
          { content: 'رنگ دیگه‌ای هم داره؟', sender: 'user', createdAt: daysAgo(2), isRead: true },
          { content: 'تا آخر هفته تحویل می‌دیم، رایگون هم داریم', sender: 'contact', createdAt: hoursAgo(26), isRead: true },
        ],
      },
    },
  })

  await db.conversation.create({
    data: {
      contactName: 'حسین قاسمی',
      contactStatus: 'آخرین بازدید ۳ روز پیش',
      listingTitle: 'دوچرخه کوهستان اسکات',
      listingPrice: '۱۸٬۰۰۰٬۰۰۰ تومان',
      listingIcon: 'bike',
      lastMessage: 'دم سیلندرش فورک تازه عوض شده',
      lastSender: 'contact',
      lastMessageAt: daysAgo(3),
      unread: 0,
      messages: {
        create: [
          { content: 'سلام. دوچرخه چنده؟', sender: 'user', createdAt: daysAgo(5), isRead: true },
          { content: 'دم سیلندرش فورک تازه عوض شده', sender: 'contact', createdAt: daysAgo(3), isRead: true },
        ],
      },
    },
  })

  await db.conversation.create({
    data: {
      contactName: 'نگار رضایی',
      contactStatus: 'آخرین بازدید هفته پیش',
      listingTitle: 'کنسول بازی PS5 Slim',
      listingPrice: '۳۲٬۰۰۰٬۰۰۰ تومان',
      listingIcon: 'gamepad',
      lastMessage: 'دو دسته داره، هر دو اورجینال',
      lastSender: 'contact',
      lastMessageAt: daysAgo(6),
      unread: 0,
      messages: {
        create: [
          { content: 'سلام. کنسول ریجن ژاپنه یا امریکا؟', sender: 'user', createdAt: daysAgo(7), isRead: true },
          { content: 'سلام. ریجن امریکا هست، هیچ محدودیتی نداره', sender: 'contact', createdAt: daysAgo(7), isRead: true },
          { content: 'دسته‌ها اورجینالن؟', sender: 'user', createdAt: daysAgo(6), isRead: true },
          { content: 'دو دسته داره، هر دو اورجینال', sender: 'contact', createdAt: daysAgo(6), isRead: true },
        ],
      },
    },
  })
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
