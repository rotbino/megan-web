#!/usr/bin/env python3
"""جایگزینی بخش آپلود ChatService با نسخهٔ مبتنی بر ماژول مشترک"""
import re

P = '/home/z/my-project/repos/megan-back/src/chat/chat.service.ts'
src = open(P).read()

# 1) افزودن ایمپورت
src = src.replace(
    "import { buildStorage, type StorageDriver } from '../uploads/storage';",
    "import { buildStorage, type StorageDriver } from '../uploads/storage';\nimport { validateConversationUpload } from '../common/file-upload/rules';",
    1,
)

# 2) حذف FILE_RULES (از private static readonly FILE_RULES تا } as const;)
m = re.search(r'\n  /\*\* پسوندهای مجاز به تفکیک نوع.*?\} as const;\n', src, re.S)
assert m, 'FILE_RULES block not found'
src = src.replace(m.group(0), '\n', 1)

# 3) حذف sniffKind (از /** بایتهای جادویی تا انتهای متد)
m = re.search(r'\n  /\*\* بایتهای جادویی رایج.*?\n  private static sniffKind\(buf: Buffer\): string \| null \{.*?\n  \}\n', src, re.S)
assert m, 'sniffKind block not found'
src = src.replace(m.group(0), '\n', 1)

# 4) بدنهٔ uploadFile — از «const { buffer, mimetype, filename } = file;» تا «return { url, key, name: safeName, size: buffer.length, mime: mimetype, kind };»
old_body = re.search(
    r"    const \{ buffer, mimetype, filename \} = file;\n.*?    return \{ url, key, name: safeName, size: buffer\.length, mime: mimetype, kind \};\n",
    src, re.S,
)
assert old_body, 'uploadFile body not found'
new_body = """    const { buffer, mimetype, filename } = file;
    const { kind, ext, safeName } = validateConversationUpload(buffer, mimetype, filename);

    const stamp = Date.now().toString(36);
    const rand = randomBytes(5).toString('hex');
    const key = `chat/${user.id}/${stamp}-${rand}.${ext}`;
    const url = await this.storage.put(key, buffer, mimetype);

    return { url, key, name: safeName, size: buffer.length, mime: mimetype, kind };
"""
src = src.replace(old_body.group(0), new_body, 1)

# 5) کامنت سقف حجم — ارجاع به ماژول مشترک
src = src.replace(
    '/** سقف حجم فایل چت — ۵ مگابایت */',
    '/** سقف حجم فایل چت — ۵ مگابایت (قواعد مشترک در common/file-upload/rules) */',
    1,
)

open(P, 'w').write(src)
print('OK — ChatService migrated to shared rules')
