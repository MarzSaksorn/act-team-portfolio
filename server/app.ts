import Database from 'better-sqlite3';
import { rateLimit } from 'express-rate-limit';
import express, { type Express, type Request, type RequestHandler } from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import type { RuntimeConfig } from './config';
import { localeSchema, type Locale, type SiteContentSnapshot } from '../src/types/site-content';
import { loadContent } from './db/content-repository';
import { createContentRouter } from './routes/content';
import { createSessionRouter } from './routes/session';
import { ApiProblemError, problemErrorHandler, sendProblemResponse } from './errors';

export type CreateAppInput = {
  db: Database.Database;
  renderer: (route: string, snapshot: SiteContentSnapshot, locale: Locale) => string;
  config: RuntimeConfig;
  assetsDirectory?: string;
};

const revisionRowSchema = z.object({ revision: z.number().int().nonnegative() }).strict();

function localeFromRequest(request: Request): Locale {
  const cookieHeader = request.get('cookie');
  if (!cookieHeader) return 'en';
  const cookie = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith('act-locale='));
  const parsed = localeSchema.safeParse(cookie?.slice('act-locale='.length));
  return parsed.success ? parsed.data : 'en';
}

function apiRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (request, response) => {
      sendProblemResponse(response, request, new ApiProblemError(
        429,
        'rate-limit-exceeded',
        'Too many requests',
        'Wait before making more API requests.',
      ));
    },
  });
}

export function createApp(input: CreateAppInput): Express {
  const app = express();
  const { db, config } = input;
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(helmet({
    contentSecurityPolicy: false,
    xFrameOptions: false,
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: config.environment === 'production' ? undefined : false,
  }));

  app.get('/healthz', (_request, response) => {
    try {
      const row = db.prepare('SELECT revision FROM content_state WHERE singleton_id = 1').get();
      if (!row) throw new Error('Content state has not been initialized.');
      revisionRowSchema.parse(row);
      response.set('Cache-Control', 'no-store').json({ status: 'ok' });
    } catch {
      response
        .status(503)
        .set('Cache-Control', 'no-store')
        .json({ status: 'unavailable' });
    }
  });

  app.use(
    '/api/v1',
    (request, response, next) => {
      response.set('Cache-Control', 'no-store');
      next();
    },
    express.json({ limit: '512kb', strict: true }),
    apiRateLimiter(),
    createSessionRouter(db, config),
    createContentRouter(db, config),
    (request, response) => {
      sendProblemResponse(response, request, new ApiProblemError(
        404,
        'not-found',
        'Resource not found',
        'The requested API resource was not found.',
      ));
    },
  );

  app.get(['/', '/competitions', '/projects', '/admin'], (request, response, next) => {
    try {
      const snapshot = loadContent(db);
      if (request.path === '/admin') response.set('X-Robots-Tag', 'noindex, nofollow');
      response
        .set('Cache-Control', 'no-store')
        .type('html')
        .send(input.renderer(request.path, snapshot, localeFromRequest(request)));
    } catch (error) {
      next(error);
    }
  });

  if (input.assetsDirectory) app.use(express.static(input.assetsDirectory, { index: false, dotfiles: 'ignore' }));
  app.use((request, response, next) => {
    try {
      response.status(404).set('Cache-Control', 'no-store').set('X-Robots-Tag', 'noindex').type('html')
        .send(input.renderer(request.path, loadContent(db), localeFromRequest(request)));
    } catch (error) { next(error); }
  });
  app.use(problemErrorHandler);
  return app;
}
