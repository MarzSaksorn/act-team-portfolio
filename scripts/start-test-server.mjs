import { mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { scryptSync } from 'node:crypto';
import { startRuntime } from '../dist-server/server/index.js';

const databasePath = join(resolve('test-results'), 'act-admin.sqlite');
await mkdir(resolve('test-results'), { recursive: true });
await Promise.all(['', '-wal', '-shm'].map((suffix) => rm(`${databasePath}${suffix}`, { force: true })));
const salt = Buffer.alloc(16, 19);
const passwordHash = `scrypt$${salt.toString('base64url')}$${scryptSync('fake-test-password', salt, 64).toString('base64url')}`;
const runtime = await startRuntime({
  host: '127.0.0.1',
  config: {
    environment: 'test', port: 3100, databasePath,
    adminUsername: 'act-test-admin', adminPasswordHash: passwordHash,
    sessionSecret: 'fake-test-session-secret-only-not-for-production',
    sessionTtlSeconds: 28800, trustProxyHops: 0,
  },
});
const shutdown = () => { void runtime.shutdown().catch(() => { process.exitCode = 1; }); };
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
process.stdout.write('ACT isolated test runtime listening on port 3100.\n');
