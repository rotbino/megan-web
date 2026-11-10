import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    await db.conversation.updateMany({ where: { id }, data: { unread: 0 } })
    await db.message.updateMany({
      where: { conversationId: id, sender: 'contact', isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/conversations/[id]/read', e)
    return NextResponse.json({ error: 'خطا' }, { status: 500 })
  }
}
