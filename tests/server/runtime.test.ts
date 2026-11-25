import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startRuntime } from '../../server/runtime';
import { loadRuntimeConfig } from '../../server/config';
import { loadContent, updateSiteCopy } from '../../server/db/content-repository';

const directories: string[] = [];
const runtimes: Array<Awaited<ReturnType<typeof startRuntime>>> = [];
const passwordHash = `scrypt$${Buffer.alloc(16, 7).toString('base64url')}$${Buffer.alloc(64, 9).toString('base64url')}`;

async function startTestRuntime(directory: string) {
  const config = loadRuntimeConfig({
    NODE_ENV: 'test', DATABASE_PATH: join(directory, 'data', 'act.sqlite'),
    ADMIN_USERNAME: 'test-admin', ADMIN_PASSWORD_HASH: passwordHash,
    SESSION_SECRET: 'runtime-test-only-session-secret-not-production',
  });
  const assetsDirectory = join(directory, 'client');
  mkdirSync(assetsDirectory, { recursive: true });
  writeFileSync(join(assetsDirectory, 'test.txt'), 'test public asset');
  writeFileSync(join(assetsDirectory, '.env'), 'must-not-be-served');
  const runtime = await startRuntime({ config: { ...config, port: 0 }, host: '127.0.0.1', assetsDirectory });
  runtimes.push(runtime);
  const address = runtime.server.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no TCP address.');
  return { runtime, origin: `http://127.0.0.1:${address.port}` };
}

function testDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'act-runtime-'));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  for (const runtime of runtimes.splice(0)) await runtime.shutdown();
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('production runtime wiring', () => {
  it('serves live HTML, a noindex admin shell, static assets, and real HTTP 404s', async () => {
    const { origin } = await startTestRuntime(testDirectory());
    const health = await fetch(`${origin}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok' });
    const home = await fetch(`${origin}/`);
    expect(await home.text()).toContain('Think boldly.');
    const admin = await fetch(`${origin}/admin`);
    expect(admin.status).toBe(200);
    expect(admin.headers.get('x-robots-tag')).toContain('noindex');
    expect(admin.headers.get('cache-control')).toContain('no-store');
    expect(admin.headers.get('x-frame-options')).toBeNull();
    const html = await admin.text();
    expect(html).toContain('ACT content studio');
    expect(html).not.toContain('Home title — English');
    expect(html).not.toContain(passwordHash);
    const asset = await fetch(`${origin}/test.txt`);
    expect(await asset.text()).toBe('test public asset');
    expect((await fetch(`${origin}/.env`)).status).toBe(404);
    const missing = await fetch(`${origin}/not-a-page`);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain('This page isn’t in our portfolio.');
  });

  it('preserves edits across runtime restart and closes SQLite on an idempotent shutdown', async () => {
    const directory = testDirectory();
    const { runtime } = await startTestRuntime(directory);
    const copy = structuredClone(loadContent(runtime.db).siteCopy);
    copy.heroLine1.en = 'Saved before restart.';
    updateSiteCopy(runtime.db, copy, 0);
    await runtime.shutdown();
    await runtime.shutdown();
    expect(runtime.db.open).toBe(false);
    const reopened = await startTestRuntime(directory);
    expect(await (await fetch(`${reopened.origin}/`)).text()).toContain('Saved before restart.');
    expect(loadContent(reopened.runtime.db).revision).toBe(1);
  });
});
