import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = (await req.json().catch(() => null)) as { content?: string } | null
    const content = body?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: 'متن پیام خالی است' }, { status: 400 })
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: 'پیام بیش از حد طولانی است' }, { status: 400 })
    }

    const conversation = await db.conversation.findUnique({ where: { id } })
    if (!conversation) {
      return NextResponse.json({ error: 'گفتگو پیدا نشد' }, { status: 404 })
    }

    const message = await db.message.create({
      data: {
        conversationId: id,
        content,
        sender: 'user',
        isRead: true,
      },
    })

    await db.conversation.update({
      where: { id },
      data: { lastMessage: content, lastSender: 'user', lastMessageAt: message.createdAt, unread: 0 },
    })

    return NextResponse.json({ message })
  } catch (e) {
    console.error('POST /api/conversations/[id]/messages', e)
    return NextResponse.json({ error: 'خطا در ارسال پیام' }, { status: 500 })
  }
}
