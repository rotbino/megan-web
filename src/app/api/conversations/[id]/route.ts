import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!conversation) {
      return NextResponse.json({ error: 'گفتگو پیدا نشد' }, { status: 404 })
    }
    return NextResponse.json({ conversation })
  } catch (e) {
    console.error('GET /api/conversations/[id]', e)
    return NextResponse.json({ error: 'خطا در دریافت گفتگو' }, { status: 500 })
  }
}
