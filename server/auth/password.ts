import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';

const passwordKeyLength = 64;
const saltLength = 16;
const scryptOptions: ScryptOptions = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

type ParsedPasswordHash = { salt: Buffer; digest: Buffer };

function parsePasswordHash(encodedHash: string): ParsedPasswordHash | null {
  const parts = encodedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return null;
  const saltText = parts[1];
  const digestText = parts[2];
  if (!saltText || !digestText || !base64UrlPattern.test(saltText) || !base64UrlPattern.test(digestText)) return null;

  const salt = Buffer.from(saltText, 'base64url');
  const digest = Buffer.from(digestText, 'base64url');
  if (
    salt.length !== saltLength
    || digest.length !== passwordKeyLength
    || salt.toString('base64url') !== saltText
    || digest.toString('base64url') !== digestText
  ) return null;
  return { salt, digest };
}

function derivePasswordKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, passwordKeyLength, scryptOptions, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export function isValidPasswordHash(encodedHash: string): boolean {
  return parsePasswordHash(encodedHash) !== null;
}

export async function createPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(saltLength);
  const digest = await derivePasswordKey(password, salt);
  return `scrypt$${salt.toString('base64url')}$${digest.toString('base64url')}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parsed = parsePasswordHash(encodedHash);
  if (!parsed) return false;
  const candidate = await derivePasswordKey(password, parsed.salt);
  return candidate.length === parsed.digest.length && timingSafeEqual(candidate, parsed.digest);
}
