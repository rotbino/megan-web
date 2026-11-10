import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true,
        contactName: true,
        contactStatus: true,
        listingTitle: true,
        listingPrice: true,
        listingIcon: true,
        lastMessage: true,
        lastSender: true,
        lastMessageAt: true,
        unread: true,
      },
    })
    return NextResponse.json({ conversations })
  } catch (e) {
    console.error('GET /api/conversations', e)
    return NextResponse.json({ error: 'خطا در دریافت گفتگوها' }, { status: 500 })
  }
}
