import { mkdirSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { dirname, resolve } from 'node:path';
import type Database from 'better-sqlite3';
import { createApp } from './app';
import type { RuntimeConfig } from './config';
import { openDatabase } from './db/open-database';
import { migrateDatabase } from './db/migrations';
import { seedDatabase } from './db/seed-content';
import { renderPublicPage } from './render-public';

type Runtime = { db: Database.Database; server: Server; shutdown: () => Promise<void> };

export async function startRuntime(input: { config: RuntimeConfig; host?: string; assetsDirectory?: string }): Promise<Runtime> {
  const { config } = input;
  if (config.databasePath !== ':memory:') mkdirSync(dirname(resolve(config.databasePath)), { recursive: true, mode: 0o700 });
  const db = openDatabase(config.databasePath);
  const server = createServer();
  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = new Promise<void>((resolveClose, rejectClose) => {
      const finish = (error?: Error) => {
        try { if (db.open) db.close(); } catch { error ??= new Error('Database shutdown failed.'); }
        if (error) rejectClose(error); else resolveClose();
      };
      if (!server.listening) { finish(); return; }
      const timer = setTimeout(() => server.closeAllConnections(), 10_000);
      timer.unref();
      server.close((error) => { clearTimeout(timer); finish(error); });
      server.closeIdleConnections();
    });
    return shutdownPromise;
  };
  try {
    migrateDatabase(db);
    seedDatabase(db);
    const app = createApp({ db, config, renderer: renderPublicPage, assetsDirectory: input.assetsDirectory ?? resolve('dist') });
    server.on('request', app);
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once('error', rejectListen);
      server.listen(config.port, input.host ?? '0.0.0.0', () => {
        server.off('error', rejectListen);
        resolveListen();
      });
    });
    return { db, server, shutdown };
  } catch (error) {
    await shutdown();
    throw error;
  }
}
