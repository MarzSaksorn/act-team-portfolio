import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createPasswordHash, verifyPassword } from '../../server/auth/password';
import {
  createAdminSession,
  csrfTokenMatches,
  getAdminSession,
  revokeAdminSession,
} from '../../server/auth/session';
import { migrateDatabase } from '../../server/db/migrations';

const sessionSecret = 'auth-test-session-secret-with-more-than-thirty-two-bytes';
const openDatabases: Database.Database[] = [];

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  migrateDatabase(db);
  openDatabases.push(db);
  return db;
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) db.close();
});

describe('administrator authentication primitives', () => {
  it('verifies a scrypt password hash without accepting a different password', async () => {
    const encodedHash = await createPasswordHash('correct horse battery staple');

    await expect(verifyPassword('correct horse battery staple', encodedHash)).resolves.toBe(true);
    await expect(verifyPassword('incorrect password', encodedHash)).resolves.toBe(false);
    await expect(verifyPassword('anything', 'not-a-scrypt-hash')).resolves.toBe(false);
  });

  it('stores only a hash of the session token and derives a session-bound CSRF token', () => {
    const db = createDatabase();
    const created = createAdminSession(db, { sessionSecret, ttlSeconds: 3_600 });
    const stored = z.object({ token_hash: z.string(), csrf_token_hash: z.string() }).parse(
      db.prepare('SELECT token_hash, csrf_token_hash FROM admin_sessions').get(),
    );
    const active = getAdminSession(db, { token: created.token, sessionSecret });

    expect(created.token).not.toBe(stored.token_hash);
    expect(created.csrfToken).not.toBe(stored.csrf_token_hash);
    expect(active).toMatchObject({ csrfToken: created.csrfToken });
    expect(csrfTokenMatches(created.csrfToken, created.csrfToken)).toBe(true);
    expect(csrfTokenMatches(created.csrfToken, 'forged-csrf-token')).toBe(false);
  });

  it('revokes active sessions and expires sessions whose deadline has passed', () => {
    const db = createDatabase();
    const expired = createAdminSession(db, { sessionSecret, ttlSeconds: 3_600 });
    db.prepare('UPDATE admin_sessions SET expires_at = ?').run('2000-01-01T00:00:00.000Z');

    expect(getAdminSession(db, { token: expired.token, sessionSecret })).toBeNull();
    expect(db.prepare('SELECT count(*) AS count FROM admin_sessions').pluck().get()).toBe(0);

    const active = createAdminSession(db, { sessionSecret, ttlSeconds: 3_600 });
    expect(revokeAdminSession(db, active.token)).toBe(true);
    expect(getAdminSession(db, { token: active.token, sessionSecret })).toBeNull();
    expect(revokeAdminSession(db, active.token)).toBe(false);
  });
});
