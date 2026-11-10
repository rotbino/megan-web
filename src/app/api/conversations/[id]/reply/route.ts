import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const REPLIES = [
  'بله، همینطوره',
  'حتماً، هر وقت راحت بودید پیام بدید',
  'قیمتش تا حدودی قابل صحبت هست',
  'الان تصویر واقعیش رو براتون می‌فرستم',
  'بله، همچنان موجوده',
  'ممنون از پیگیریتون',
  'کاش تشریف می‌آوردید از نزدیک ببینید',
  'باشه حله، باهاتون تماس می‌گیرم',
  'چشم، حتماً توجه می‌کنم',
  'اگه امروز ثبت‌نام کنید، فردا آماده تحویله',
]

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params

    const conversation = await db.conversation.findUnique({ where: { id } })
    if (!conversation) {
      return NextResponse.json({ error: 'گفتگو پیدا نشد' }, { status: 404 })
    }

    const content = REPLIES[Math.floor(Math.random() * REPLIES.length)]

    const message = await db.message.create({
      data: {
        conversationId: id,
        content,
        sender: 'contact',
        isRead: false,
      },
    })

    await db.message.updateMany({
      where: { conversationId: id, sender: 'user', isRead: false },
      data: { isRead: true },
    })

    await db.conversation.update({
      where: { id },
      data: { lastMessage: content, lastSender: 'contact', lastMessageAt: message.createdAt },
    })

    return NextResponse.json({ message })
  } catch (e) {
    console.error('POST /api/conversations/[id]/reply', e)
    return NextResponse.json({ error: 'خطا در دریافت پاسخ' }, { status: 500 })
  }
}
