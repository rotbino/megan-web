#!/usr/bin/env python3
"""به‌روزرسانی admin-support: فایل + WS + وب‌پوش + پیش‌نمایش فایل‌دار"""
import re

P = '/home/z/my-project/repos/megan-back/src/admin/admin-support/admin-support.service.ts'
s = open(P).read()

# 1) ایمپورت‌ها
old_imports = """import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.module';
import { USER_SELECT, toUserCard, type UserCard } from '../user-card';
import type { GetSupportThreadListDto } from './dto';"""
new_imports = """import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.module';
import { AppError } from '../../common/errors/app-error';
import { USER_SELECT, toUserCard, type UserCard } from '../user-card';
import { UploadsService } from '../../uploads/uploads.service';
import { buildStorage, type StorageDriver } from '../../uploads/storage';
import { validateConversationUpload } from '../../common/file-upload/rules';
import { SUPPORT_EVENTS, emitToUser, isUserOnline } from '../../chat/io-holder';
import { PushService } from '../../push/push.service';
import { SUPPORT_MESSAGE_SELECT, toSupportDto } from '../../support/support.service';
import type { GetSupportThreadListDto, SendSupportReplyDto } from './dto';"""
assert old_imports in s, 'imports block not found'
s = s.replace(old_imports, new_imports, 1)

# 2) سازنده + storage
old_ctor = """@Injectable()
export class AdminSupportService {
  constructor(private readonly prisma: PrismaService) {}"""
new_ctor = """@Injectable()
export class AdminSupportService {
  private readonly storage: StorageDriver;

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly push: PushService,
  ) {
    this.storage = buildStorage();
  }

  /** متن پیش‌نمایش پیام در لیست گفتگوها — پیام فایل‌دار با ایموجی نوع */
  private previewOf(m: { text: string; kind: string | null }): string {
    const t = m.text.trim();
    if (t) return t;
    if (m.kind === 'image') return '📷 تصویر';
    if (m.kind === 'video') return '🎬 ویدئو';
    if (m.kind === 'file') return '📎 فایل';
    return t;
  }"""
assert old_ctor in s, 'constructor not found'
s = s.replace(old_ctor, new_ctor, 1)

# 3) پیش‌نمایش آخرین پیام — فایل‌دار
old_lm = """        lastMessage: {
          text: m.text,
          at: m.createdAt,"""
new_lm = """        lastMessage: {
          text: this.previewOf(m),
          at: m.createdAt,"""
assert old_lm in s, 'lastMessage block not found'
s = s.replace(old_lm, new_lm, 1)

# 4) getThreadMessages — select فایل‌ها + نگاشت DTO
old_msgs = """    const messages = await this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        senderRole: true,
        adminUsername: true,
        text: true,
        readAt: true,
        createdAt: true,
      },
      take: 200,
    });

    return { user: toUserCard(user), messages };"""
new_msgs = """    const messages = await this.prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: SUPPORT_MESSAGE_SELECT,
      take: 200,
    });

    return { user: toUserCard(user), messages: messages.map(toSupportDto) };"""
assert old_msgs in s, 'getThreadMessages block not found'
s = s.replace(old_msgs, new_msgs, 1)

# 5) sendMessage — فایل + WS + وب‌پوش
old_send = """  /** POST /admin/support/sendMessage — پاسخ پشتیبان به کاربر */
  async sendMessage(adminUsername: string, userId: string, text: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return null;

    // ادمین که پاسخ می‌دهد قطعاً پیام‌های قبلی کاربر را دیده — خوانده علامت می‌خورند
    await this.prisma.supportMessage.updateMany({
      where: { userId, senderRole: 'user', readAt: null },
      data: { readAt: new Date() },
    });

    const msg = await this.prisma.supportMessage.create({
      // readAt: null صریح — فیلد optional حذف‌شده با فیلتر null مچ نمی‌شود (الگوی chat.service)
      data: { userId, senderRole: 'admin', adminUsername, text: text.trim(), readAt: null },
    });
    return {
      id: msg.id,
      senderRole: 'admin' as const,
      adminUsername: msg.adminUsername,
      text: msg.text,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
    };
  }"""
new_send = """  /**
   * POST /admin/support/uploadFile — پیوست پاسخ پشتیبان (multipart، سقف ۵MB،
   * قواعد مشترک). بایت‌ها زیر support-admin/<adminId>/ — مالکیت در sendMessage.
   */
  async uploadFile(adminId: string, req: FastifyRequest): Promise<{
    url: string;
    key: string;
    name: string;
    size: number;
    mime: string;
    kind: 'image' | 'video' | 'file';
  }> {
    const { file } = await this.uploads.readMultipart(req);
    if (!file) throw AppError.badRequest('فایل ارسال نشده است.', 'FILE_REQUIRED');

    const { buffer, mimetype, filename } = file;
    const { kind, ext, safeName } = validateConversationUpload(buffer, mimetype, filename);

    const stamp = Date.now().toString(36);
    const rand = randomBytes(5).toString('hex');
    const key = `support-admin/${adminId}/${stamp}-${rand}.${ext}`;
    const url = await this.storage.put(key, buffer, mimetype);

    return { url, key, name: safeName, size: buffer.length, mime: mimetype, kind };
  }

  /** POST /admin/support/sendMessage — پاسخ پشتیبان به کاربر (متن یا فایل + کپشن) */
  async sendMessage(adminUsername: string, adminId: string, userId: string, dto: SendSupportReplyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return null;

    const kind = dto.kind ?? 'text';
    const hasFile = kind !== 'text';
    const text = (dto.text ?? '').trim();
    if (!hasFile && text.length < 1) return null; // با input فرانت نمی‌رسد — محافظ
    if (hasFile && !dto.fileUrl) {
      throw AppError.badRequest('اطلاعات فایل ناقص است.', 'FILE_META_REQUIRED');
    }
    // مالکیت فایل — کلید باید زیر پوشهٔ خود ادمین باشد (از uploadFile خودش)
    if (hasFile && !dto.fileKey!.startsWith(`support-admin/${adminId}/`)) {
      throw AppError.forbidden('این فایل به شما تعلق ندارد.');
    }

    // ادمین که پاسخ می‌دهد قطعاً پیام‌های قبلی کاربر را دیده — خوانده علامت می‌خورند
    await this.prisma.supportMessage.updateMany({
      where: { userId, senderRole: 'user', readAt: null },
      data: { readAt: new Date() },
    });

    const msg = await this.prisma.supportMessage.create({
      // readAt: null صریح — فیلد optional حذف‌شده با فیلتر null مچ نمی‌شود (الگوی chat.service)
      data: {
        userId,
        senderRole: 'admin',
        adminUsername,
        text,
        readAt: null,
        ...(hasFile
          ? {
              kind,
              fileUrl: dto.fileUrl,
              fileKey: dto.fileKey,
              fileName: dto.fileName?.slice(0, 190) ?? 'فایل',
              fileSize: dto.fileSize ?? 0,
              fileMime: dto.fileMime?.slice(0, 120) ?? 'application/octet-stream',
            }
          : {}),
      },
      select: SUPPORT_MESSAGE_SELECT,
    });

    const message = toSupportDto(msg);

    // ریل‌تایم به کاربر (خواسته مالک ۸-۱۱): صفحهٔ پشتیبانی، بج منو و پیام
    // لینک‌دار «شما یک پیام در پنل پشتیبانی دارید» در چت، همان لحظه تازه می‌شوند
    emitToUser(userId, SUPPORT_EVENTS.NEW_MESSAGE, { message });

    // کاربر آنلاین نیست (سوکت وصل نیست) → اعلان سیستمی وب‌پوش (B10)
    if (!isUserOnline(userId)) {
      const preview = hasFile
        ? kind === 'image'
          ? '📷 تصویر'
          : kind === 'video'
            ? '🎬 ویدئو'
            : '📎 فایل'
        : text.length > 90
          ? `${text.slice(0, 90)}…`
          : text;
      void this.push
        .sendToUser(userId, {
          title: 'پاسخ جدید از پشتیبانی ایمچ',
          body: preview,
          url: '/panel/support',
        })
        .catch(() => undefined); // آتش‌وفراموش — اعلان هرگز پاسخ را نمی‌شکند
    }

    return message;
  }"""
assert old_send in s, 'sendMessage block not found'
s = s.replace(old_send, new_send, 1)

open(P, 'w').write(s)
print('admin-support.service OK')
