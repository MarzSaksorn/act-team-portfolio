import Database from 'better-sqlite3';
import { open, realpath, rm } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { isMainModule } from './is-main';

function within(directory: string, candidate: string): boolean {
  const path = relative(directory, candidate);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith('../'));
}

export async function backupDatabase(input: { source: string; destination: string }): Promise<void> {
  const source = await realpath(resolve(input.source));
  const destinationDirectory = await realpath(dirname(resolve(input.destination)));
  if (within(dirname(source), destinationDirectory) || within('/data', destinationDirectory)) {
    throw new Error('Backups must be outside the live database directory and /data.');
  }
  const destination = join(destinationDirectory, basename(input.destination));
  const db = new Database(source, { readonly: true, fileMustExist: true });
  let reserved = false;
  try {
    const file = await open(destination, 'wx', 0o600);
    reserved = true;
    await file.close();
    await db.backup(destination);
    const verification = new Database(destination, { readonly: true, fileMustExist: true });
    try {
      if (verification.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Backup integrity verification failed.');
    } finally { verification.close(); }
  } catch (error) {
    if (reserved) await rm(destination, { force: true });
    throw error;
  } finally { db.close(); }
}

if (isMainModule(import.meta.url)) {
  const args = process.argv.slice(2).filter((argument) => argument !== '--');
  const destination = args[0];
  if (args.length !== 1 || !destination) {
    process.stderr.write('Usage: pnpm db:backup -- <destination outside /data>\n');
    process.exitCode = 1;
  } else {
    try {
      await backupDatabase({ source: process.env.DATABASE_PATH || '/data/act.sqlite', destination });
      process.stdout.write('Database backup completed and integrity verified. Copy it off-host.\n');
    } catch {
      process.stderr.write('Database backup failed. Check source, destination, permissions, and whether the destination already exists.\n');
      process.exitCode = 1;
    }
  }
}
