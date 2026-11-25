import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import Database from 'better-sqlite3';
import { z } from 'zod';

export type CreatedAdminSession = { token: string; csrfToken: string; expiresAt: string };
export type ActiveAdminSession = { csrfToken: string; expiresAt: string };
export type CreateAdminSessionOptions = { sessionSecret: string; ttlSeconds: number; now?: Date };
export type GetAdminSessionOptions = { token: string; sessionSecret: string; now?: Date };

type AuthenticatedAdminSession = ActiveAdminSession & { token: string };

declare global {
  namespace Express {
    interface Locals {
      adminSession?: AuthenticatedAdminSession;
    }
  }
}

const sessionRowSchema = z.object({ csrf_token_hash: z.string(), expires_at: z.string() }).strict();
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function csrfForSession(token: string, sessionSecret: string): string {
  return createHmac('sha256', sessionSecret).update(`act-admin-csrf:${token}`, 'utf8').digest('base64url');
}

function csrfHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function constantHashMatches(expectedHash: string, actualHash: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(expectedHash) || !/^[a-f0-9]{64}$/.test(actualHash)) return false;
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');
  return timingSafeEqual(expected, actual);
}

function validateSessionOptions(sessionSecret: string, ttlSeconds: number): void {
  if (Buffer.byteLength(sessionSecret, 'utf8') < 32) {
    throw new RangeError('The session secret must contain at least 32 bytes.');
  }
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 900 || ttlSeconds > 86_400) {
    throw new RangeError('The session TTL must be between 900 and 86400 seconds.');
  }
}

export function createAdminSession(
  db: Database.Database,
  options: CreateAdminSessionOptions,
): CreatedAdminSession {
  validateSessionOptions(options.sessionSecret, options.ttlSeconds);
  const now = options.now ?? new Date();
  const expiresAt = new Date(now.getTime() + options.ttlSeconds * 1_000);
  const token = randomBytes(32).toString('base64url');
  const csrfToken = csrfForSession(token, options.sessionSecret);
  const createdAt = now.toISOString();
  const expiry = expiresAt.toISOString();

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(createdAt);
    db.prepare(`
      INSERT INTO admin_sessions (token_hash, csrf_token_hash, created_at, expires_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(tokenHash(token), csrfHash(csrfToken), createdAt, expiry, createdAt);
  });
  transaction.immediate();
  return { token, csrfToken, expiresAt: expiry };
}

export function getAdminSession(
  db: Database.Database,
  options: GetAdminSessionOptions,
): ActiveAdminSession | null {
  if (!tokenPattern.test(options.token) || Buffer.byteLength(options.sessionSecret, 'utf8') < 32) return null;
  const hashedToken = tokenHash(options.token);
  const row = db.prepare(`
    SELECT csrf_token_hash, expires_at FROM admin_sessions WHERE token_hash = ?
  `).get(hashedToken);
  if (!row) return null;
  const stored = sessionRowSchema.parse(row);
  const now = options.now ?? new Date();
  const expiry = Date.parse(stored.expires_at);
  if (!Number.isFinite(expiry) || expiry <= now.getTime()) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashedToken);
    return null;
  }

  const csrfToken = csrfForSession(options.token, options.sessionSecret);
  if (!constantHashMatches(stored.csrf_token_hash, csrfHash(csrfToken))) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashedToken);
    return null;
  }

  db.prepare('UPDATE admin_sessions SET last_seen_at = ? WHERE token_hash = ?')
    .run(now.toISOString(), hashedToken);
  return { csrfToken, expiresAt: stored.expires_at };
}

export function revokeAdminSession(db: Database.Database, token: string): boolean {
  if (!tokenPattern.test(token)) return false;
  return db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash(token)).changes === 1;
}

export function csrfTokenMatches(expected: string, actual: string): boolean {
  if (!tokenPattern.test(expected) || !tokenPattern.test(actual)) return false;
  return constantHashMatches(csrfHash(expected), csrfHash(actual));
}
