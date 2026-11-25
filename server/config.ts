import { isValidPasswordHash } from './auth/password';

export type RuntimeEnvironment = 'development' | 'test' | 'production';

export type RuntimeConfig = {
  environment: RuntimeEnvironment;
  port: number;
  databasePath: string;
  adminUsername: string;
  adminPasswordHash: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  trustProxyHops: number;
  publicOrigin?: string;
};

export class RuntimeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeConfigError';
  }
}

function parseEnvironment(value: string | undefined): RuntimeEnvironment {
  const environment = value ?? 'development';
  if (environment === 'development' || environment === 'test' || environment === 'production') return environment;
  throw new RuntimeConfigError('NODE_ENV must be development, test, or production.');
}

function parseIntegerSetting(
  value: string | undefined,
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return defaultValue;
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new RuntimeConfigError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new RuntimeConfigError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return number;
}

function parsePublicOrigin(value: string | undefined, environment: RuntimeEnvironment): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw new RuntimeConfigError('PUBLIC_ORIGIN must be a valid origin URL.');
  }
  if (
    !['http:', 'https:'].includes(origin.protocol)
    || origin.username !== ''
    || origin.password !== ''
    || origin.pathname !== '/'
    || origin.search !== ''
    || origin.hash !== ''
    || (environment === 'production' && origin.protocol !== 'https:')
  ) {
    throw new RuntimeConfigError('PUBLIC_ORIGIN must be an origin without credentials, path, query, or fragment; production requires HTTPS.');
  }
  return origin.origin;
}

export function loadRuntimeConfig(environmentValues: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const environment = parseEnvironment(environmentValues.NODE_ENV);
  const requiredNames = ['ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'SESSION_SECRET'] as const;
  const missing = requiredNames.filter((name) => !environmentValues[name]?.trim());
  if (missing.length > 0) {
    throw new RuntimeConfigError(`Missing required runtime configuration: ${missing.join(', ')}.`);
  }

  const adminUsername = environmentValues.ADMIN_USERNAME?.trim() ?? '';
  if (adminUsername.length > 120) {
    throw new RuntimeConfigError('ADMIN_USERNAME must not exceed 120 characters.');
  }

  const adminPasswordHash = environmentValues.ADMIN_PASSWORD_HASH?.trim() ?? '';
  if (!isValidPasswordHash(adminPasswordHash)) {
    throw new RuntimeConfigError('ADMIN_PASSWORD_HASH must contain a valid scrypt password hash.');
  }

  const sessionSecret = environmentValues.SESSION_SECRET?.trim() ?? '';
  if (Buffer.byteLength(sessionSecret, 'utf8') < 32) {
    throw new RuntimeConfigError('SESSION_SECRET must contain at least 32 bytes.');
  }

  const databasePath = environmentValues.DATABASE_PATH?.trim()
    || (environment === 'production' ? '/data/act.sqlite' : './data/act.sqlite');
  const publicOrigin = parsePublicOrigin(environmentValues.PUBLIC_ORIGIN, environment);
  const baseConfig = {
    environment,
    port: parseIntegerSetting(environmentValues.PORT, 'PORT', 3000, 1, 65_535),
    databasePath,
    adminUsername,
    adminPasswordHash,
    sessionSecret,
    sessionTtlSeconds: parseIntegerSetting(environmentValues.SESSION_TTL_SECONDS, 'SESSION_TTL_SECONDS', 28_800, 900, 86_400),
    trustProxyHops: parseIntegerSetting(environmentValues.TRUST_PROXY_HOPS, 'TRUST_PROXY_HOPS', 0, 0, 10),
  };

  return publicOrigin === undefined ? baseConfig : { ...baseConfig, publicOrigin };
}
