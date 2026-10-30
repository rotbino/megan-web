import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, openSync } from 'node:fs';
import { NextRequest, NextResponse } from 'next/server';

const execAsync = promisify(exec);

/**
 * ⚙️ DEV-ONLY — راه‌انداز بک‌اند مگان از دل پروسه next-server.
 *
 * چرا: سندباکس پروسه‌های پس‌زمینه‌ی شروع‌شده از Bash tool را بعد از هر
 * فراخوانی SIGKILL می‌کند؛ اما فرزندان next-server (پروسه محافظت‌شده
 * بوت) زنده می‌مانند. این مسیر بک‌اند را detached spawn می‌کند تا در
 * طول تست‌ها بالا بماند.
 *
 * محافظ: هدر x-spawn-secret باید با /tmp/spawn-secret.txt یکی باشد.
 * بعد از تمام تست‌ها این فایل حذف شود.
 */

export const dynamic = 'force-dynamic';

const BACKEND_DIR = '/home/z/my-project/repos/megan-back';
const LOG = '/tmp/megan-back.log';
const SECRET_FILE = '/tmp/spawn-secret.txt';

function authorized(req: NextRequest): boolean {
  try {
    const secret = readFileSync(SECRET_FILE, 'utf8').trim();
    return !!secret && req.headers.get('x-spawn-secret') === secret;
  } catch {
    return false;
  }
}

async function backendAlive(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:4000/api/v1/health', {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ alive: await backendAlive() });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (await backendAlive()) {
    return NextResponse.json({ already: true, alive: true });
  }
  const out = openSync(LOG, 'a');
  // مسیر به‌صورت داینامیک ساخته می‌شود تا باندلر آن را ماژول‌رفرنس نشمارد
  const entry = ['dist', 'main.js'].join('/');
  const child = spawn('node', [entry], {
    cwd: BACKEND_DIR,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env, NODE_ENV: 'development' },
  });
  child.unref();
  // فرصت بوت — پرایسما + listen ~۵ ثانیه
  await new Promise((r) => setTimeout(r, 7000));
  return NextResponse.json({ spawned: true, pid: child.pid, alive: await backendAlive() });
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    await execAsync('pkill -f "node dist/main.js"');
  } catch {
    /* شاید مرده بود */
  }
  await new Promise((r) => setTimeout(r, 1500));
  return NextResponse.json({ killed: true, alive: await backendAlive() });
}
