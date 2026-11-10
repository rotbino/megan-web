import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['scripts/stub-backend.mjs'], { detached: true, stdio: 'ignore', cwd: '/home/z/my-project' });
child.unref();
console.log('stub spawned', child.pid);
