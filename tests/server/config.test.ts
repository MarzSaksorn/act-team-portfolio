import { describe, expect, it } from 'vitest';
import { loadRuntimeConfig } from '../../server/config';

const passwordHash = `scrypt$${Buffer.alloc(16, 7).toString('base64url')}$${Buffer.alloc(64, 9).toString('base64url')}`;

function productionEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    PORT: '3000',
    DATABASE_PATH: '/data/act.sqlite',
    ADMIN_USERNAME: 'act-admin',
    ADMIN_PASSWORD_HASH: passwordHash,
    SESSION_SECRET: 'session-secret-that-is-at-least-thirty-two-bytes-long',
    SESSION_TTL_SECONDS: '28800',
    TRUST_PROXY_HOPS: '1',
    PUBLIC_ORIGIN: 'https://act.example.test',
  };
}

describe('runtime configuration', () => {
  it('loads validated production settings and preserves configured proxy and origin values', () => {
    expect(loadRuntimeConfig(productionEnvironment())).toEqual({
      environment: 'production',
      port: 3000,
      databasePath: '/data/act.sqlite',
      adminUsername: 'act-admin',
      adminPasswordHash: passwordHash,
      sessionSecret: 'session-secret-that-is-at-least-thirty-two-bytes-long',
      sessionTtlSeconds: 28800,
      trustProxyHops: 1,
      publicOrigin: 'https://act.example.test',
    });
  });

  it('refuses production startup when administrator credentials or session secrets are missing', () => {
    const environment = productionEnvironment();
    delete environment.ADMIN_USERNAME;
    delete environment.ADMIN_PASSWORD_HASH;
    delete environment.SESSION_SECRET;

    expect(() => loadRuntimeConfig(environment)).toThrow(/ADMIN_USERNAME|ADMIN_PASSWORD_HASH|SESSION_SECRET/);
  });

  it('uses the eight-hour session default and trusts no proxy unless explicitly configured', () => {
    const environment = productionEnvironment();
    delete environment.SESSION_TTL_SECONDS;
    delete environment.TRUST_PROXY_HOPS;
    delete environment.PUBLIC_ORIGIN;

    expect(loadRuntimeConfig(environment)).toMatchObject({
      sessionTtlSeconds: 28_800,
      trustProxyHops: 0,
    });
  });

  it.each([
    ['invalid port', { PORT: '70000' }, /PORT/],
    ['invalid session duration', { SESSION_TTL_SECONDS: '899' }, /SESSION_TTL_SECONDS/],
    ['invalid proxy hop count', { TRUST_PROXY_HOPS: '-1' }, /TRUST_PROXY_HOPS/],
    ['malformed password hash', { ADMIN_PASSWORD_HASH: 'plain-text-password' }, /ADMIN_PASSWORD_HASH/],
    ['short session secret', { SESSION_SECRET: 'short' }, /SESSION_SECRET/],
    ['non-HTTPS production origin', { PUBLIC_ORIGIN: 'http://act.example.test' }, /PUBLIC_ORIGIN/],
    ['origin with a path', { PUBLIC_ORIGIN: 'https://act.example.test/admin' }, /PUBLIC_ORIGIN/],
  ])('rejects %s rather than silently coercing it', (_caseName, override, error) => {
    expect(() => loadRuntimeConfig({ ...productionEnvironment(), ...override })).toThrow(error);
  });

  it('rejects unknown runtime environments and non-integer numeric settings', () => {
    expect(() => loadRuntimeConfig({ ...productionEnvironment(), NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => loadRuntimeConfig({ ...productionEnvironment(), PORT: '30.5' })).toThrow(/PORT/);
    expect(() => loadRuntimeConfig({ ...productionEnvironment(), TRUST_PROXY_HOPS: '1.5' })).toThrow(/TRUST_PROXY_HOPS/);
  });

  it('defaults production containers to port 3000 and the persistent data path without build-time secrets', () => {
    const environment = productionEnvironment();
    delete environment.PORT;
    delete environment.DATABASE_PATH;
    expect(loadRuntimeConfig(environment)).toMatchObject({ port: 3000, databasePath: '/data/act.sqlite' });
    expect(() => loadRuntimeConfig({ NODE_ENV: 'production' })).toThrow(/Missing required runtime configuration/);
  });
});
