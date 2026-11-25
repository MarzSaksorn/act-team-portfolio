import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';

if (process.argv.includes('--help')) {
  process.stdout.write('Usage: node scripts/container-smoke.mjs [image-tag]\nBuilds a local image if no tag is supplied. Uses only disposable loopback containers and volumes.\n');
  process.exit(0);
}
if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  process.stderr.write('Docker Engine is unavailable. Container smoke testing was NOT run.\n');
  process.exit(1);
}
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000 }).trim();
const suffix = randomUUID();
const name = `act-smoke-${suffix}`;
const dataVolume = `${name}-data`;
const backupVolume = `${name}-backups`;
const image = process.argv[2] ?? 'actfolio:smoke';
const createdVolumes = [];
let createdContainer = false;
const password = `fake-smoke-only-${suffix}`;
const salt = randomBytes(16);
const hash = `scrypt$${salt.toString('base64url')}$${scryptSync(password, salt, 64).toString('base64url')}`;
let origin;
let cookie;
let csrfToken;

async function healthy() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(2000) })).ok) return;
    } catch { /* Startup is still in progress. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Local container did not become healthy.');
}
async function api(path, options = {}) {
  return fetch(`${origin}/api/v1${path}`, { ...options, headers: { Cookie: cookie ?? '', 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken ?? '', ...options.headers } });
}
async function login() {
  const response = await api('/admin/session', { method: 'POST', body: JSON.stringify({ username: 'smoke-admin', password }) });
  assert.equal(response.status, 200);
  cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  const session = await api('/admin/session');
  csrfToken = (await session.json()).csrfToken;
  assert.ok(csrfToken);
}
async function saveHeadline(headline) {
  const current = await api('/admin/site-copy');
  assert.equal(current.status, 200);
  const copy = await current.json();
  copy.heroLine1.en = headline;
  const saved = await api('/admin/site-copy', { method: 'PUT', headers: { 'If-Match': current.headers.get('etag') }, body: JSON.stringify(copy) });
  assert.equal(saved.status, 200);
}
async function headlineIs(headline) {
  const snapshot = await (await api('/public/content')).json();
  assert.equal(snapshot.siteCopy.heroLine1.en, headline);
  assert.ok((await (await fetch(`${origin}/`)).text()).includes(headline));
}

try {
  if (!process.argv[2]) {
    process.stdout.write('Building disposable local smoke image...\n');
    execFileSync('docker', ['build', '-t', image, '.'], { stdio: 'inherit', timeout: 1200000 });
  }
  for (const volume of [dataVolume, backupVolume]) { docker('volume', 'create', volume); createdVolumes.push(volume); }
  docker('run', '-d', '--name', name, '--init', '-p', '127.0.0.1::3000',
    '-v', `${dataVolume}:/data`, '-v', `${backupVolume}:/backups`,
    '-e', 'NODE_ENV=test', '-e', 'ADMIN_USERNAME=smoke-admin', '-e', `ADMIN_PASSWORD_HASH=${hash}`,
    '-e', `SESSION_SECRET=fake-smoke-session-${suffix}`, '-e', 'TRUST_PROXY_HOPS=0', image);
  createdContainer = true;
  const mapping = docker('port', name, '3000/tcp');
  assert.match(mapping, /^127\.0\.0\.1:\d+$/);
  origin = `http://${mapping}`;
  await healthy();
  assert.equal((await api('/admin/site-copy', { method: 'PUT', body: '{}' })).status, 401);
  await login();
  await saveHeadline('Smoke test saved content.');
  docker('restart', '--timeout', '15', name);
  await healthy();
  await headlineIs('Smoke test saved content.');
  await login();
  docker('exec', name, 'node', 'dist-server/server/scripts/backup-database.js', '/backups/smoke.sqlite');
  await saveHeadline('Later change, not in backup.');
  docker('stop', '--timeout', '15', name);
  const restore = "const fs=require('node:fs'),Database=require('better-sqlite3'); const db=new Database('/backups/smoke.sqlite',{readonly:true,fileMustExist:true});if(db.pragma('integrity_check',{simple:true})!=='ok')process.exit(1);db.close();for(const suffix of ['','-wal','-shm'])fs.rmSync('/data/act.sqlite'+suffix,{force:true});fs.copyFileSync('/backups/smoke.sqlite','/data/act.sqlite');fs.chmodSync('/data/act.sqlite',0o600);";
  docker('run', '--rm', '-v', `${dataVolume}:/data`, '-v', `${backupVolume}:/backups:ro`, '--entrypoint', 'node', image, '-e', restore);
  docker('start', name);
  await healthy();
  await headlineIs('Smoke test saved content.');
  process.stdout.write('PASS: local container health, login, live save, restart persistence, and backup restore.\n');
} catch {
  process.stderr.write('Container smoke test failed. Inspect the local build/runtime without publishing any service.\n');
  process.exitCode = 1;
} finally {
  if (createdContainer) { try { docker('rm', '-f', name); } catch { process.exitCode = 1; } }
  for (const volume of createdVolumes) { try { docker('volume', 'rm', volume); } catch { process.exitCode = 1; } }
}
