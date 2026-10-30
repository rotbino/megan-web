// دِو سرور نکست — دوفورک (مثل daemon-start.mjs بک‌اند)
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
const log = openSync('/home/z/my-project/dev.log', 'a');
const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: '/home/z/my-project',
  detached: true,
  stdio: ['ignore', log, log],
  env: process.env,
});
child.unref();
console.log('dev pid:', child.pid);
