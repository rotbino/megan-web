#!/usr/bin/env python3
"""اعمال ویرایش‌های دور ۲۵ روی صفحهٔ پیام‌ها — جایگزینی خط‌محور دقیق."""
import sys

P = '/home/z/my-project/src/app/panel/messages/page.tsx'
src = open(P, encoding='utf-8').read()


def replace_once(old: str, new: str, label: str):
    global src
    if old not in src:
        print(f'FAIL: {label}')
        sys.exit(1)
    if src.count(old) != 1:
        print(f'FAIL (non-unique): {label}')
        sys.exit(1)
    src = src.replace(old, new, 1)
    print(f'ok: {label}')


# ── ۱) حذف بلوک burst (دسته‌بندی پاسخ‌ها) → یک پیام به ازای هر پاسخ ──
old_burst = """  // ── دسته‌های پاسخ پشتیبان در گفتگوی تیکت (خواستهٔ مالک ۸-۱۱ دور ۲۴) ──
  // رشتهٔ پیام‌های ادمین پشت‌سرهم (پیام کاربر بینشان نباشد) = یک اعلان
  // «شما N پیام در پنل پشتیبانی دارید» با لینک به /panel/support.
  const ticketMessages = supportConv?.messages ?? [];
  const replyBursts: SupportChatMessage[][] = (() => {
    const groups: SupportChatMessage[][] = [];
    for (const m of ticketMessages) {
      if (m.senderRole === 'user') {
        groups.push([]); // پیام کاربر دستهٔ قبل را می‌شکند
        continue;
      }
      const last = groups[groups.length - 1];
      if (last) last.push(m);
      else groups.push([m]);
    }
    return groups.filter((g) => g.length > 0);
  })();
"""
new_burst = """  // ── پیام‌های سیستمی «پشتیبانی ایمچ» (خواستهٔ مالک ۸-۱۱ دور ۲۵) ──
  // به ازای هر اطلاع‌رسانی پشتیبانی — هر پاسخ تیکت و هر پیام مستقیم ادمین —
  // یک پیام جداگانهٔ لینک‌دار در گفتگو؛ شمارنده روی پیام قدیمی جمع نمی‌شود
  // («به ازای هر پیام یه پیام جدید بیاد، نه اینکه تعداد توی یه پیام زیاد بشه»).
  const ticketMessages = supportConv?.messages ?? [];
  const ticketReplies = ticketMessages.filter((m) => m.senderRole === 'admin');
"""
replace_once(old_burst, new_burst, 'burst-comment+filter')

old_items = """  const lastTicketReply =
    ticketMessages.filter((m) => m.senderRole === 'admin').at(-1) ?? null;
  // آخرین فعالیت پشتیبانی ایمچ — هر کدام از دو منبع (اعلان مستقیم / پاسخ
  // تیکت) جدیدتر باشد، زمانِ ردیف و پیش‌نمایش لیست از همان می‌آید
  const lastAdminMsg = supportMessages[supportMessages.length - 1] ?? null;
  const supportLastMs = Math.max(
    lastAdminMsg ? new Date(lastAdminMsg.createdAt).getTime() : 0,
    lastTicketReply ? new Date(lastTicketReply.createdAt).getTime() : 0,
  );
  const supportPreview =
    ticketUnread > 0
      ? 'پاسخ تازه از پشتیبان — مشاهدهٔ گفتگو'
      : lastTicketReply &&
          (!lastAdminMsg ||
            new Date(lastTicketReply.createdAt) > new Date(lastAdminMsg.createdAt))
        ? `پشتیبان: ${lastTicketReply.text}`
        : (lastAdminMsg?.text ?? '');
  // آیتم‌های مکالمهٔ «پشتیبانی ایمچ» — اعلان‌های مستقیم ادمین + پیام‌های
  // لینک‌دار پاسخ تیکت، به‌ترتیب زمان (خواستهٔ مالک ۸-۱۱ دور ۲۴)
  const supportThreadItems: Array<
    | { key: string; kind: 'admin'; at: string; msg: AdminInboxMessage }
    | { key: string; kind: 'burst'; at: string; messages: SupportChatMessage[] }
  > = (() => {
    const items = [
      ...supportMessages.map((m) => ({ key: `a:${m.id}`, kind: 'admin' as const, at: m.createdAt, msg: m })),
      ...replyBursts.map((messages) => ({
        key: `t:${messages[0].id}`,
        kind: 'burst' as const,
        at: messages[0].createdAt,
        messages,
      })),
    ];
    return items.sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
  })();
"""
new_items = """  const supportThreadItems: Array<
    | { key: string; kind: 'admin'; at: string; msg: AdminInboxMessage }
    | { key: string; kind: 'reply'; at: string; msg: SupportChatMessage }
  > = [
    ...supportMessages.map((m) => ({ key: `a:${m.id}`, kind: 'admin' as const, at: m.createdAt, msg: m })),
    ...ticketReplies.map((m) => ({ key: `t:${m.id}`, kind: 'reply' as const, at: m.createdAt, msg: m })),
  ].sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
  // زمان/پیش‌نمایش ردیف لیست = تازه‌ترین اطلاع‌رسانی (مستقیم یا پاسخ تیکت)
  const supportLastMs = supportThreadItems.length
    ? new Date(supportThreadItems[supportThreadItems.length - 1].at).getTime()
    : 0;
  const supportPreview = (() => {
    const last = supportThreadItems[supportThreadItems.length - 1];
    if (!last) return 'پیام‌های پشتیبانی ایمچ';
    if (last.kind === 'admin') return last.msg.text;
    const text =
      last.msg.text.trim() ||
      (last.msg.kind === 'image' ? '📷 تصویر' : last.msg.kind === 'video' ? '🎬 ویدئو' : '📎 فایل');
    return `پشتیبانی: ${text}`;
  })();
"""
replace_once(old_items, new_items, 'supportThreadItems rewrite')

# ── ۲) حذف باز شدن خودکار پشتیبانی در دسکتاپ ──
old_auto = """  // پشتیبانی: انتخاب صریح کاربر (activeId) در هر دستگاه باز می‌شود؛
  // باز شدن «خودکار» فقط روی دسکتاپ است (پنل مرئی است) — در موبایل بدون
  // انتخاب کاربر نباید پیام‌های پشتیبانی بدون دیدن خوانده شوند.
  const effectiveActive = isSupport
    ? SUPPORT_ID
    : active ?? (isDesktop && !isLoading && supportMessages.length > 0 ? SUPPORT_ID : null);
  const showingSupport = effectiveActive === SUPPORT_ID;
"""
new_auto = """  // پشتیبانی فقط با انتخاب صریح کاربر باز می‌شود: ردیف «پشتیبانی ایمچ» یا
  // لینک ?thread=support (خواستهٔ مالک ۸-۱۱ دور ۲۵). باز شدن خودکارِ قبلیِ
  // دسکتاپ، پیام‌های پشتیبانی را بی‌آنکه کاربر چت را ببیند خوانده می‌زد و
  // بج «بلافاصله با ورود به صفحه غیب می‌شد». اکنون بج — دقیقا مثل بج
  // خوانده‌نشدهٔ چت‌های معمولی — تا باز کردن واقعی مکالمه می‌ماند.
  const showingSupport = isSupport;
"""
replace_once(old_auto, new_auto, 'remove auto-open')

# ── ۳) یادداشت قدیمی lastSupport ──
replace_once(
    """  const myId = active?.myId ?? null;
  // (lastSupport → lastAdminMsg در بالا — همراه پاسخ‌های تیکت محاسبه شد)
""",
    """  const myId = active?.myId ?? null;
""",
    'drop stale note')

# ── ۴) خواندن تیکت هم با باز کردن «پشتیبانی ایمچ» ──
old_mark = """    if (showingSupport) {
      if (supportUnread > 0 && !markAdminRead.isPending) markAdminRead.mutate();
      return;
    }
"""
new_mark = """    if (showingSupport) {
      // باز کردن واقعی «پشتیبانی ایمچ» = خواندن — دقیقا مثل چت معمولی
      // (خواستهٔ مالک ۸-۱۱ دور ۲۵): پیام‌های مستقیم ادمین و پاسخ‌های تیکت
      // با هم خوانده می‌شوند و بج ردیف/هدر/منو صفر می‌شود.
      if (supportUnread > 0 && !markAdminRead.isPending) markAdminRead.mutate();
      if (ticketUnread > 0 && !markTicketRead.isPending) markTicketRead.mutate();
      return;
    }
"""
replace_once(old_mark, new_mark, 'mark ticket read too')

replace_once(
    "  }, [chatVisible, showingSupport, active?.id, messages, myId, supportUnread, markRead.isPending, markRead.mutate, markAdminRead.isPending, markAdminRead.mutate]);",
    "  }, [chatVisible, showingSupport, active?.id, messages, myId, supportUnread, ticketUnread, markRead.isPending, markRead.mutate, markAdminRead.isPending, markAdminRead.mutate, markTicketRead.isPending, markTicketRead.mutate]);",
    'mark-read deps')

# ── ۵) اسکرول گفتگوی پشتیبانی روی تازه‌ترین پیام ──
old_cleanup = """  // تعویض مکالمه/خروج از صفحه — تایمر معلق پاک شود
  useEffect(() => {
    return () => {
      if (markTimerRef.current !== null) {
        window.clearTimeout(markTimerRef.current);
        markTimerRef.current = null;
      }
    };
  }, [activeThreadKey]);
"""
new_cleanup = old_cleanup + """
  // ── اسکرول گفتگوی پشتیبانی روی تازه‌ترین پیام (خواستهٔ مالک ۸-۱۱ دور ۲۵) ──
  // باز کردن مکالمه و رسیدن اطلاع‌رسانی تازه هر دو به آخرین پیام می‌روند تا
  // «پیام جدید» همان لحظه دیده شود. اگر کاربر بالا را می‌خواند، پرش نمی‌کنیم.
  const supportListRef = useRef<HTMLDivElement>(null);
  const supportWasVisibleRef = useRef(false);
  const supportItemsCount = supportThreadItems.length;
  const supportVisible = showingSupport && chatVisible;
  useEffect(() => {
    const el = supportListRef.current;
    if (!supportVisible || !el) {
      supportWasVisibleRef.current = false;
      return;
    }
    const firstOpen = !supportWasVisibleRef.current;
    supportWasVisibleRef.current = true;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (firstOpen || nearBottom) el.scrollTop = el.scrollHeight;
  }, [supportVisible, supportItemsCount]);
"""
replace_once(old_cleanup, new_cleanup, 'support scroll effect')

# ── ۶) حذف کارت اعلان بالای لیست ──
replace_once(
    """          {/* اعلان پاسخ پشتیبان — بالای لیست تا بدون باز کردن «پشتیبانی ایمچ»
              هم دیده شود (خواستهٔ مالک ۸-۱۱) */}
          <SupportTicketNotice count={ticketUnread} variant="card" />
          <div className="relative mt-3">
""",
    """          <div className="relative">
""",
    'remove card above list')

# ── ۷) حذف نوار بالای گفتگوی پشتیبانی + رف + رندر پیام‌های تکی ──
old_sup = """              {/* اعلان پاسخ پشتیبان — نوار بالای گفتگو (خواستهٔ مالک ۸-۱۱) */}
              <SupportTicketNotice count={ticketUnread} variant="strip" className="mt-2" />

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain touch-pan-y bg-secondary px-0.5 py-3 sm:px-1 sm:py-4 sm:space-y-3 sm:bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] sm:[background-size:18px_18px]">
                {supportThreadItems.length === 0 ? (
                  <p className="py-8 text-center text-xs leading-6 text-muted-foreground">
                    هنوز پیامی از پشتیبانی ندارید.
                  </p>
                ) : (
                  supportThreadItems.map((item) =>
                    item.kind === 'admin' ? (
                      <AdminAnnounceBubble key={item.key} m={item.msg} />
                    ) : (
                      <SupportReplyNotice key={item.key} messages={item.messages} />
                    ),
                  )
                )}
              </div>
"""
new_sup = """              <div
                ref={supportListRef}
                className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain touch-pan-y bg-secondary px-0.5 py-3 sm:px-1 sm:py-4 sm:space-y-3 sm:bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] sm:[background-size:18px_18px]"
              >
                {supportThreadItems.length === 0 ? (
                  <p className="py-8 text-center text-xs leading-6 text-muted-foreground">
                    هنوز پیامی از پشتیبانی ندارید.
                  </p>
                ) : (
                  supportThreadItems.map((item) =>
                    item.kind === 'admin' ? (
                      <AdminAnnounceBubble key={item.key} m={item.msg} />
                    ) : (
                      <SupportReplyMessage key={item.key} m={item.msg} />
                    ),
                  )
                )}
              </div>
"""
replace_once(old_sup, new_sup, 'support thread render')

# ── ۸) حذف نوار بالای مکالمهٔ معمولی ──
replace_once(
    """              {/* اعلان پاسخ پشتیبان — نوار بالای مکالمهٔ باز (خواستهٔ مالک ۸-۱۱) */}
              <SupportTicketNotice count={ticketUnread} variant="strip" className="mt-2" />

              {/* پیام‌ها — پیجینگ معکوس؛ ورود: توقف روی اولین پیام خوانده‌نشده
""",
    """              {/* پیام‌ها — پیجینگ معکوس؛ ورود: توقف روی اولین پیام خوانده‌نشده
""",
    'remove strip above normal chat')

# ── ۹) بازنویسی SupportReplyNotice → SupportReplyMessage (یک پیام به ازای هر پاسخ) ──
old_notice_doc = """/**
 * پیام لینک‌دارِ ماندگار پاسخ پشتیبان — خواستهٔ مالک ۸-۱۱ دور ۲۴:
 * «هیچ پیامی داخل پشتیبانی ایمچ نیست که شامل لینک پنل پشتیبانی باشد».
 * هر دستهٔ پاسخ پشتیبان در گفتگوی تیکت = یک پیام «شما N پیام در پنل
 * پشتیبانی دارید» + لینک «مشاهدهٔ گفتگو با پشتیبان» → /panel/support.
 * حلقهٔ کامل: بج هدر → لیست چت (بج روی پشتیبانی ایمچ) → همین پیام → تیکت.
 * ماندگار است — خواندن تیکت فقط رنگ قرمز را آرام می‌کند؛ پیام در
 * تاریخچهٔ چت می‌ماند (برخلاف کارت/نوار موقتِ شمارنده‌محور).
 */
function SupportReplyNotice({ messages }: { messages: SupportChatMessage[] }) {
  const last = messages[messages.length - 1];
  const unread = messages.some((m) => m.readAt === null);
  const count = messages.length;
  // پیش‌نمایش یک‌خطی آخرین پاسخ — کارت‌های تاریخی از هم قابل تشخیص شوند
  const previewOf = (m: SupportChatMessage) =>
    m.text.trim() ||
    (m.kind === 'image' ? '📷 تصویر' : m.kind === 'video' ? '🎬 ویدئو' : m.kind === 'file' ? '📎 فایل' : '');
  return (
    <div className="flex w-full justify-end">
      <Link
        href="/panel/support"
        className={cn(
          'group block w-fit max-w-[85%] rounded-2xl rounded-se-md border px-3.5 py-2.5 shadow-sm transition-colors sm:max-w-[75%] sm:px-4',
          'animate-in fade-in slide-in-from-bottom-1 duration-200',
          unread
            ? 'border-red-200 bg-red-50 hover:bg-red-100'
            : 'border-border/70 bg-card hover:bg-secondary/60',
        )}
      >
        <p
          className={cn(
            'text-[13px] font-bold leading-6',
            unread ? 'text-red-700' : 'text-foreground',
          )}
        >
          شما {count === 1 ? 'یک' : toFa(count)} پیام در پنل پشتیبانی دارید
        </p>
        {previewOf(last) && (
          <p dir="auto" className="mt-0.5 line-clamp-1 max-w-60 text-[11px] leading-5 text-muted-foreground">
            آخرین پاسخ: {previewOf(last)}
          </p>
        )}
        <p className="mt-0.5 text-[11px] font-bold leading-5 text-primary underline underline-offset-2">
          مشاهدهٔ گفتگو با پشتیبان
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <span>پشتیبانی ایمچ</span>
          {last.adminUsername ? (
            <>
              ·<span>{last.adminUsername}</span>
            </>
          ) : null}
          ·<span><RelativeTime date={last.createdAt} /></span>
        </p>
      </Link>
    </div>
  );
}
"""
new_notice_doc = """/**
 * پیام سیستمی «پاسخ پشتیبانی» — خواستهٔ مالک ۸-۱۱ دور ۲۵: به ازای هر
 * پاسخ پشتیبان در گفتگوی تیکت یک پیام جداگانه و ماندگار در «پشتیبانی
 * ایمچ»: «شما یک پیام در پنل پشتیبانی دارید» + پیش‌نمایش همان پاسخ +
 * لینک «مشاهدهٔ گفتگو با پشتیبان» → /panel/support. قرمز تا خواندن
 * (خواندن = باز کردن همین مکالمه)، بعد خاکستری؛ برای همیشه در تاریخچه
 * می‌ماند. شمارنده روی پیام قدیمی جمع نمی‌شود — هر پاسخ، پیام خودش را دارد.
 */
function SupportReplyMessage({ m }: { m: SupportChatMessage }) {
  const unread = m.readAt === null;
  const preview =
    m.text.trim() ||
    (m.kind === 'image' ? '📷 تصویر' : m.kind === 'video' ? '🎬 ویدئو' : '📎 فایل');
  return (
    <div className="flex w-full justify-end">
      <Link
        href="/panel/support"
        className={cn(
          'group block w-fit max-w-[85%] rounded-2xl rounded-se-md border px-3.5 py-2.5 shadow-sm transition-colors sm:max-w-[75%] sm:px-4',
          'animate-in fade-in slide-in-from-bottom-1 duration-200',
          unread
            ? 'border-red-200 bg-red-50 hover:bg-red-100'
            : 'border-border/70 bg-card hover:bg-secondary/60',
        )}
      >
        <p
          className={cn(
            'text-[13px] font-bold leading-6',
            unread ? 'text-red-700' : 'text-foreground',
          )}
        >
          شما یک پیام در پنل پشتیبانی دارید
        </p>
        {preview && (
          <p dir="auto" className="mt-0.5 line-clamp-1 max-w-60 text-[11px] leading-5 text-muted-foreground">
            پاسخ پشتیبان: {preview}
          </p>
        )}
        <p className="mt-0.5 text-[11px] font-bold leading-5 text-primary underline underline-offset-2">
          مشاهدهٔ گفتگو با پشتیبان
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[9px] text-muted-foreground">
          <span>پشتیبانی ایمچ</span>
          {m.adminUsername ? (
            <>
              ·<span>{m.adminUsername}</span>
            </>
          ) : null}
          ·<span><RelativeTime date={m.createdAt} /></span>
        </p>
      </Link>
    </div>
  );
}
"""
replace_once(old_notice_doc, new_notice_doc, 'SupportReplyMessage rewrite')

# ── ۱۰) ارجاع کامنت AdminAnnounceBubble ──
replace_once(
    " *  همان رندر قبلی، استخراج‌شده تا کنار SupportReplyNotice ادغام زمانی شود */",
    " *  همان رندر قبلی، استخراج‌شده تا کنار SupportReplyMessage ادغام زمانی شود */",
    'announce comment ref')

open(P, 'w', encoding='utf-8').write(src)
print('ALL OK — file written')
