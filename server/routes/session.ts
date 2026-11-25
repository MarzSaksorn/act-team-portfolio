import type Database from 'better-sqlite3';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { Router, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import type { RuntimeConfig } from '../config';
import { createAdminSession, csrfTokenMatches, getAdminSession, revokeAdminSession } from '../auth/session';
import { verifyPassword } from '../auth/password';
import { ApiProblemError, sendProblemResponse } from '../errors';

const sessionCookieName = 'act_session';
const loginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(1_024),
}).strict();

function normalizedUsername(username: string): string {
  return username.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function sessionCookieOptions(config: RuntimeConfig) {
  return {
    httpOnly: true,
    secure: config.environment === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: config.sessionTtlSeconds * 1_000,
  };
}

function clearSessionCookie(response: Response, config: RuntimeConfig): void {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: config.environment === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

function readSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;
  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== sessionCookieName) continue;
    const value = item.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}

export function requireTrustedOrigin(config: RuntimeConfig): RequestHandler {
  return (request, _response, next) => {
    const providedOrigin = request.get('origin');
    if (providedOrigin === undefined && config.publicOrigin === undefined) {
      next();
      return;
    }
    if (providedOrigin === undefined) {
      next(new ApiProblemError(403, 'origin-forbidden', 'Request origin rejected', 'The request must come from the configured public origin.'));
      return;
    }

    let actualOrigin: string;
    try {
      actualOrigin = new URL(providedOrigin).origin;
    } catch {
      next(new ApiProblemError(403, 'origin-forbidden', 'Request origin rejected', 'The request origin is not allowed.'));
      return;
    }

    const expectedOrigin = config.publicOrigin ?? `${request.protocol}://${request.get('host') ?? ''}`;
    if (actualOrigin !== expectedOrigin) {
      next(new ApiProblemError(403, 'origin-forbidden', 'Request origin rejected', 'The request origin is not allowed.'));
      return;
    }
    next();
  };
}

export function requireAdminSession(db: Database.Database, config: RuntimeConfig): RequestHandler {
  return (request, response, next) => {
    const token = readSessionCookie(request);
    if (!token) {
      next(new ApiProblemError(401, 'authentication-required', 'Authentication required', 'Sign in to manage ACT content.'));
      return;
    }
    const session = getAdminSession(db, { token, sessionSecret: config.sessionSecret });
    if (!session) {
      clearSessionCookie(response, config);
      next(new ApiProblemError(401, 'authentication-required', 'Authentication required', 'Sign in to manage ACT content.'));
      return;
    }
    response.locals.adminSession = { ...session, token };
    next();
  };
}

export const requireCsrfToken: RequestHandler = (request, response, next) => {
  const session = response.locals.adminSession;
  const suppliedToken = request.get('x-csrf-token');
  if (!session || !suppliedToken || !csrfTokenMatches(session.csrfToken, suppliedToken)) {
    next(new ApiProblemError(403, 'csrf-rejected', 'Request verification failed', 'A valid session-bound CSRF token is required.'));
    return;
  }
  next();
};

function loginRateLimiter(config: RuntimeConfig): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1_000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (request) => {
      const candidate = loginSchema.safeParse(request.body);
      const username = candidate.success ? normalizedUsername(candidate.data.username) : 'invalid';
      const address = ipKeyGenerator(request.ip || 'unknown');
      return `${address}:username:${username}`;
    },
    handler: (_request, response) => {
      sendProblemResponse(response, _request, new ApiProblemError(
        429,
        'rate-limit-exceeded',
        'Too many login attempts',
        'Wait before trying to sign in again.',
      ));
    },
  });
}

export function createSessionRouter(db: Database.Database, config: RuntimeConfig): Router {
  const router = Router();
  const checkOrigin = requireTrustedOrigin(config);
  const authenticate = requireAdminSession(db, config);

  router.get('/admin/session', (request, response, next) => {
    try {
      const token = readSessionCookie(request);
      if (!token) {
        response.json({ authenticated: false });
        return;
      }
      const session = getAdminSession(db, { token, sessionSecret: config.sessionSecret });
      if (!session) {
        clearSessionCookie(response, config);
        response.json({ authenticated: false });
        return;
      }
      response.json({ authenticated: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin/session', checkOrigin, loginRateLimiter(config), async (request, response, next) => {
    try {
      const credentials = loginSchema.parse(request.body);
      const passwordMatches = await verifyPassword(credentials.password, config.adminPasswordHash);
      const usernameMatches = normalizedUsername(credentials.username) === normalizedUsername(config.adminUsername);
      if (!passwordMatches || !usernameMatches) {
        throw new ApiProblemError(401, 'invalid-credentials', 'Sign-in failed', 'The username or password is incorrect.');
      }

      const session = createAdminSession(db, {
        sessionSecret: config.sessionSecret,
        ttlSeconds: config.sessionTtlSeconds,
      });
      response.cookie(sessionCookieName, session.token, sessionCookieOptions(config));
      response.json({ authenticated: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/admin/session', checkOrigin, authenticate, requireCsrfToken, (request, response, next) => {
    try {
      const session = response.locals.adminSession;
      if (!session) {
        next(new ApiProblemError(401, 'authentication-required', 'Authentication required', 'Sign in to manage ACT content.'));
        return;
      }
      revokeAdminSession(db, session.token);
      clearSessionCookie(response, config);
      response.json({ authenticated: false });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
