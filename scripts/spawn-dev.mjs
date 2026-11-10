// راه‌انداز dev سرور — الگوی خودِ next.config.ts (spawn detached + unref)
// تا پروسه مثل استاب بک‌اند از پاک‌کنندهٔ پروسه‌های فرمان‌ها جان سالم به در ببرد.
// فقط برای سندباکس — روی ماشین مالک استفاده نمی‌شود.
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';

const logFd = openSync('dev.log', 'a');
const child = spawn(process.execPath, ['node_modules/.bin/next', 'dev', '-p', '3000'], {
  detached: true,
  stdio: ['ignore', logFd, logFd],
  cwd: process.cwd(),
});
child.unref();
console.log('[spawn-dev] next dev spawned, pid', child.pid);
