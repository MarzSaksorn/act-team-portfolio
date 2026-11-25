import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import dockerignore from '@balena/dockerignore';
import { parse } from 'yaml';

const readOptional = (path) => readFile(path, 'utf8').catch((error) => {
  if (error.code === 'ENOENT') return '';
  throw error;
});

test('public competition HTML omits private school-stage details', async () => {
  const html = await readFile('dist/competitions/index.html', 'utf8');
  assert.doesNotMatch(html, /\bM\.1\b|ม\.1/u);
});

const pages = [
  { file: 'dist/index.html', title: 'Home | ACT — Avoonger Competition Team', body: 'Think boldly.' },
  { file: 'dist/competitions/index.html', title: 'Competitions | ACT — Avoonger Competition Team', body: 'Founders before ACT' },
  { file: 'dist/projects/index.html', title: 'Projects | ACT — Avoonger Competition Team', body: 'Our first chapter is still taking shape.' },
];

for (const page of pages) {
  test(`initial HTML exposes public content and route metadata: ${page.file}`, async () => {
    const html = await readFile(page.file, 'utf8');
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(page.body));
    assert.ok(html.includes('meta name="description"'));
    assert.ok(html.includes('href="/competitions"'));
    assert.ok(html.includes('href="/projects"'));
    assert.ok(!html.includes('>undefined<'));
  });
}

test('Docker build context excludes secrets, databases, backups, Git, and generated artifacts but keeps runtime sources', async () => {
  const ignored = dockerignore().add(await readOptional('.dockerignore'));
  for (const path of ['.env', '.env.local', '.env.example', 'nested/.env.production', 'act.sqlite', 'data/act.sqlite-wal', 'data/act.sqlite-shm', 'saved.db', 'backups/saved.sqlite', 'archive.tar.gz', '.git/config', '.superpowers/sdd/notes.md', 'node_modules/pkg/index.js', 'dist/index.html', 'dist-server/server/index.js', 'test-results/act-admin.sqlite']) {
    assert.equal(ignored.ignores(path), true, `Build context leaks ${path}`);
  }
  for (const path of ['server/index.ts', 'server/db/migrations.ts', 'src/entry-server.tsx', 'src/assets/fonts/AquaGrotesque.ttf', 'public/favicon.svg', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'index.html']) {
    assert.equal(ignored.ignores(path), false, `Build context loses ${path}`);
  }
});

test('local Compose publishes only loopback and separates writable data and backup volumes', async () => {
  const compose = parse(await readOptional('docker-compose.yml')) ?? {};
  assert.equal(Object.keys(compose.services ?? {}).length, 1, 'Expected one application service');
  const app = compose.services.app;
  assert.ok(app, 'Missing app service');
  assert.deepEqual(app.ports, ['127.0.0.1:3000:3000']);
  const mounts = app.volumes.map((value) => value.split(':'));
  const data = mounts.find((value) => value[1] === '/data');
  const backups = mounts.find((value) => value[1] === '/backups');
  assert.ok(data && backups, 'Missing persistent data or backup mount');
  assert.notEqual(data[0], backups[0]);
  assert.ok(Object.hasOwn(compose.volumes, data[0]));
  assert.ok(Object.hasOwn(compose.volumes, backups[0]));
  assert.equal(app.environment.DATABASE_PATH, '/data/act.sqlite');
  assert.equal(app.environment.NODE_ENV, 'development');
  assert.match(app.environment.ADMIN_PASSWORD_HASH, /\$\{ADMIN_PASSWORD_HASH:\?/);
  assert.match(app.environment.SESSION_SECRET, /\$\{SESSION_SECRET:\?/);
});

test('compiled production entry refuses missing secrets without logging secret values', () => {
  const result = spawnSync(process.execPath, ['dist-server/server/index.js'], { encoding: 'utf8', env: { PATH: process.env.PATH, NODE_ENV: 'production' } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required runtime configuration/);
  assert.doesNotMatch(result.stderr, /\.ts:\d|at loadRuntimeConfig/);
});

test('admin hash CLI refuses non-interactive plaintext input', () => {
  const password = 'secret-test-password-never-echo';
  const result = spawnSync(process.execPath, ['dist-server/server/scripts/create-admin-hash.js'], { encoding: 'utf8', input: `${password}\n` });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /interactive terminal/i);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(password));
});

test('admin hash CLI hides password input and creates a valid scrypt hash in a real terminal', () => {
  const output = execFileSync('python3', ['tests/helpers/hash-pty.py', 'dist-server/server/scripts/create-admin-hash.js'], { encoding: 'utf8', timeout: 10000 });
  assert.match(output, /scrypt\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}/);
  assert.ok(!output.includes('hidden-test-password-123'));
});
