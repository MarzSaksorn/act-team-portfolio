import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { backupDatabase } from '../../server/scripts/backup-database';
import {
  createCompetition,
  createProject,
  deleteCompetition,
  deleteProject,
  listCompetitions,
  listProjects,
  loadContent,
  updateCompetition,
  updateProject,
  updateSiteCopy,
  updateUpcomingCompetition,
} from '../../server/db/content-repository';
import { migrateDatabase } from '../../server/db/migrations';
import { openDatabase } from '../../server/db/open-database';
import { seedDatabase } from '../../server/db/seed-content';
import type { NewCompetition } from '../../src/types/content';
import type { NewProject } from '../../src/types/project';

const openDatabases: Array<ReturnType<typeof openDatabase>> = [];
const temporaryDirectories: string[] = [];

function temporaryDatabasePath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'act-content-test-'));
  temporaryDirectories.push(directory);
  return join(directory, 'act.sqlite');
}

function createInitializedDatabase(path = ':memory:'): ReturnType<typeof openDatabase> {
  const db = openDatabase(path);
  openDatabases.push(db);
  migrateDatabase(db);
  seedDatabase(db);
  return db;
}

function closeDatabase(db: ReturnType<typeof openDatabase>): void {
  const index = openDatabases.indexOf(db);
  if (index !== -1) openDatabases.splice(index, 1);
  db.close();
}

function projectFixture(title = 'Test project'): NewProject {
  return {
    title: { en: title, th: 'โปรเจกต์ทดสอบ' },
    summary: { en: 'Test summary', th: 'สรุปการทดสอบ' },
    status: 'planned',
    problem: { en: 'Test problem', th: 'ปัญหาทดสอบ' },
    businessModel: { en: 'Test model', th: 'โมเดลทดสอบ' },
    contributions: [{ name: 'Test member', description: { en: 'Test work', th: 'งานทดสอบ' } }],
    dates: '2026',
    links: [],
  };
}

function competitionFixture(
  recordType: NewCompetition['recordType'] = 'founder-pre-act',
  name = 'Test competition',
): NewCompetition {
  return {
    recordType,
    name: { en: name, th: 'การแข่งขันทดสอบ' },
    year: 2024,
    participants: ['Test participant'],
    stage: { en: 'Finalist', th: 'ผู้เข้ารอบสุดท้าย' },
    contribution: { en: 'Test contribution', th: 'ผลงานทดสอบ' },
    evidenceUrl: 'https://example.test/evidence',
  };
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) db.close();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('SQLite content repository', () => {
  it('seeds only current facts on first boot', () => {
    const db = createInitializedDatabase();
    const snapshot = loadContent(db);

    expect(snapshot.revision).toBe(0);
    expect(snapshot.projects).toEqual([]);
    expect(snapshot.competitions).toEqual({ founderPreAct: [], act: [] });
    expect(snapshot.siteCopy.heroLine1).toEqual({ en: 'Think boldly.', th: 'กล้าคิดให้ต่าง' });
    expect(snapshot.siteCopy.heroLine2).toEqual({ en: 'Build responsibly.', th: 'สร้างอย่างรับผิดชอบ' });
    expect(snapshot.siteCopy.teamBody.en).toBe(
      'ACT brings three founders together to explore what technology can do for a more sustainable future. We’re building our team and preparing for our next competition.',
    );
    expect(snapshot.siteCopy.teamBody.th).toBe(
      'ACT รวมสมาชิกผู้ก่อตั้งสามคนเพื่อสำรวจว่าเทคโนโลยีจะช่วยสร้างอนาคตที่ยั่งยืนได้อย่างไร ตอนนี้เรากำลังสร้างทีมและเตรียมพร้อมสำหรับการแข่งขันครั้งต่อไป',
    );
    expect(snapshot.upcomingCompetition).toMatchObject({
      id: 'bsd-saraburi-2027',
      name: { en: 'Build Something Different Hackathon', th: 'Build Something Different Hackathon' },
      branch: { en: 'BSD The White Garden · Saraburi', th: 'BSD The White Garden · สระบุรี' },
      status: 'planned',
      registration: 'not-registered',
      startDate: '2027-01-16',
      endDate: '2027-01-17',
      applicationDeadline: '2027-01-10',
      finalStartDate: '2027-01-23',
      finalEndDate: '2027-01-24',
      officialUrl: 'https://futurecenter.ai/hackathon#talk',
    });
  });

  it('keeps founder and ACT competitions in their own groups', () => {
    const db = createInitializedDatabase();
    const founderRecord = competitionFixture('founder-pre-act', 'Test founder entry');
    const actRecord = competitionFixture('act', 'Test ACT entry');

    createCompetition(db, founderRecord, 0);
    createCompetition(db, actRecord, 1);
    const snapshot = loadContent(db);
    const founderPage = listCompetitions(db, {
      recordType: 'founder-pre-act', page: 1, limit: 20, sort: 'position', order: 'asc',
    });
    const actPage = listCompetitions(db, {
      recordType: 'act', page: 1, limit: 20, sort: 'position', order: 'asc',
    });

    expect(snapshot.competitions.founderPreAct).toHaveLength(1);
    expect(snapshot.competitions.founderPreAct[0]?.recordType).toBe('founder-pre-act');
    expect(snapshot.competitions.act).toHaveLength(1);
    expect(snapshot.competitions.act[0]?.recordType).toBe('act');
    expect(founderPage.data[0]?.recordType).toBe('founder-pre-act');
    expect(actPage.data[0]?.recordType).toBe('act');
  });

  it('keeps migrations idempotent without overwriting edited copy', () => {
    const db = createInitializedDatabase();
    const editedCopy = structuredClone(loadContent(db).siteCopy);
    editedCopy.heroLine1.en = 'A saved English headline.';
    editedCopy.heroLine1.th = 'พาดหัวภาษาไทยที่บันทึกแล้ว';

    const saved = updateSiteCopy(db, editedCopy, 0);
    migrateDatabase(db);
    migrateDatabase(db);
    seedDatabase(db);
    seedDatabase(db);

    expect(saved.revision).toBe(1);
    expect(loadContent(db).revision).toBe(1);
    expect(loadContent(db).siteCopy.heroLine1).toEqual({
      en: 'A saved English headline.',
      th: 'พาดหัวภาษาไทยที่บันทึกแล้ว',
    });
  });

  it('keeps saved content after the database is reopened', () => {
    const path = temporaryDatabasePath();
    const first = createInitializedDatabase(path);
    const editedCopy = structuredClone(loadContent(first).siteCopy);
    editedCopy.heroBody.en = 'Saved content survives a process restart.';
    editedCopy.heroBody.th = 'เนื้อหาที่บันทึกยังอยู่หลังเริ่มระบบใหม่';
    updateSiteCopy(first, editedCopy, 0);
    closeDatabase(first);

    const reopened = createInitializedDatabase(path);
    const snapshot = loadContent(reopened);

    expect(snapshot.revision).toBe(1);
    expect(snapshot.siteCopy.heroBody).toEqual({
      en: 'Saved content survives a process restart.',
      th: 'เนื้อหาที่บันทึกยังอยู่หลังเริ่มระบบใหม่',
    });
    expect(snapshot.upcomingCompetition.status).toBe('planned');
  });

  it('creates, updates, lists, and deletes a project with one revision per save', () => {
    const db = createInitializedDatabase();
    const created = createProject(db, projectFixture(), 0);
    const second = createProject(db, projectFixture('Second test project'), 1);
    const firstPage = listProjects(db, { page: 1, limit: 1, sort: 'position', order: 'asc' });
    const edited = {
      ...created.resource,
      summary: { en: 'Edited summary', th: 'สรุปที่แก้ไข' },
    };
    const updated = updateProject(db, created.resource.id, edited, 2);
    const removed = deleteProject(db, second.resource.id, 3);

    expect(firstPage.data).toHaveLength(1);
    expect(firstPage.data[0]?.title.en).toBe('Test project');
    expect(firstPage.pagination).toMatchObject({ page: 1, limit: 1, total: 2, hasMore: true });
    expect(updated.resource.summary).toEqual({ en: 'Edited summary', th: 'สรุปที่แก้ไข' });
    expect(updated.revision).toBe(3);
    expect(removed).toEqual({ resource: null, revision: 4 });
    expect(loadContent(db).projects.map((project) => project.id)).toEqual([created.resource.id]);
  });

  it('creates, updates, and deletes a competition without changing its attribution', () => {
    const db = createInitializedDatabase();
    const created = createCompetition(db, competitionFixture(), 0);
    const edited = {
      ...created.resource,
      name: { en: 'Edited founder history', th: 'ประวัติผู้ก่อตั้งที่แก้ไข' },
    };
    const updated = updateCompetition(db, created.resource.id, edited, 1);
    const removed = deleteCompetition(db, created.resource.id, 2);

    expect(updated.resource.name).toEqual({ en: 'Edited founder history', th: 'ประวัติผู้ก่อตั้งที่แก้ไข' });
    expect(updated.resource.recordType).toBe('founder-pre-act');
    expect(removed).toEqual({ resource: null, revision: 3 });
    expect(loadContent(db).competitions.founderPreAct).toEqual([]);
    expect(loadContent(db).competitions.act).toEqual([]);
  });

  it('rejects invalid required translations without partially saving copy', () => {
    const db = createInitializedDatabase();
    const original = loadContent(db);
    const invalidCopy = structuredClone(original.siteCopy);
    invalidCopy.heroBody.th = '   ';

    expect(() => updateSiteCopy(db, invalidCopy, original.revision)).toThrow();
    expect(loadContent(db).revision).toBe(original.revision);
    expect(loadContent(db).siteCopy.heroBody).toEqual(original.siteCopy.heroBody);
  });

  it('rejects malformed event dates without partially saving the event', () => {
    const db = createInitializedDatabase();
    const original = loadContent(db).upcomingCompetition;
    const invalidEvent = { ...original, finalEndDate: '2027-02-30' };

    expect(() => updateUpcomingCompetition(db, invalidEvent, 0)).toThrow();
    expect(loadContent(db).revision).toBe(0);
    expect(loadContent(db).upcomingCompetition).toEqual(original);
  });

  it('rejects a stale revision without writing content', () => {
    const db = createInitializedDatabase();
    const copy = structuredClone(loadContent(db).siteCopy);
    copy.heroLine1.en = 'This stale edit must not persist.';

    expect(() => updateSiteCopy(db, copy, 1)).toThrow();
    expect(loadContent(db).revision).toBe(0);
    expect(loadContent(db).siteCopy.heroLine1.en).toBe('Think boldly.');
  });

  it('rolls back a project and revision when one localized insert fails', () => {
    const db = createInitializedDatabase();
    db.exec(`
      CREATE TRIGGER fail_thai_project_translation
      BEFORE INSERT ON project_translations
      WHEN NEW.locale = 'th'
      BEGIN
        SELECT RAISE(ABORT, 'intentional test failure');
      END;
    `);

    expect(() => createProject(db, projectFixture(), 0)).toThrow();
    expect(loadContent(db).projects).toEqual([]);
    expect(loadContent(db).revision).toBe(0);
  });

  it('caps projects and each competition attribution at 100 records', () => {
    const db = createInitializedDatabase();
    for (let index = 0; index < 100; index += 1) {
      createProject(db, projectFixture(`Test project ${index}`), index);
    }
    expect(() => createProject(db, projectFixture('Overflow project'), 100)).toThrow();
    expect(loadContent(db).projects).toHaveLength(100);
    expect(loadContent(db).revision).toBe(100);

    for (let index = 0; index < 100; index += 1) {
      createCompetition(db, competitionFixture('founder-pre-act', `Founder entry ${index}`), 100 + index);
    }
    createCompetition(db, competitionFixture('act', 'ACT entry within its own cap'), 200);
    expect(() => createCompetition(db, competitionFixture('founder-pre-act', 'Founder overflow'), 201)).toThrow();
    expect(loadContent(db).competitions.founderPreAct).toHaveLength(100);
    expect(loadContent(db).competitions.act).toHaveLength(1);
    expect(loadContent(db).revision).toBe(201);
  });

  it('enables foreign-key enforcement and WAL for file-backed databases', () => {
    const db = createInitializedDatabase(temporaryDatabasePath());

    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
  });

  it('backupRestoresEditedContentAfterReopen', async () => {
    const root = dirname(temporaryDatabasePath());
    const source = join(root, 'data', 'act.sqlite');
    mkdirSync(dirname(source));
    mkdirSync(join(root, 'backups'));
    const db = createInitializedDatabase(source);
    const copy = structuredClone(loadContent(db).siteCopy);
    copy.heroLine1 = { en: 'Restored from an online backup.', th: 'กู้คืนจากสำรองข้อมูล' };
    updateSiteCopy(db, copy, 0);
    const destination = join(root, 'backups', 'saved.sqlite');
    await backupDatabase({ source, destination });
    expect(statSync(destination).mode & 0o777).toBe(0o600);
    copy.heroLine1.en = 'This later edit is not in the backup.';
    updateSiteCopy(db, copy, 1);
    closeDatabase(db);
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${source}${suffix}`, { force: true });
    copyFileSync(destination, source);
    const restored = createInitializedDatabase(source);
    expect(loadContent(restored).revision).toBe(1);
    expect(loadContent(restored).siteCopy.heroLine1).toEqual({ en: 'Restored from an online backup.', th: 'กู้คืนจากสำรองข้อมูล' });
    expect(restored.pragma('integrity_check', { simple: true })).toBe('ok');
  });

  it('refuses live-directory backups, symlink aliases, overwrites, and nonexistent source databases', async () => {
    const root = dirname(temporaryDatabasePath());
    const dataDirectory = join(root, 'data');
    mkdirSync(dataDirectory);
    const source = join(dataDirectory, 'act.sqlite');
    createInitializedDatabase(source);
    const backupDirectory = join(root, 'backups');
    mkdirSync(backupDirectory);
    await expect(backupDatabase({ source, destination: join(dataDirectory, 'same-volume.sqlite') })).rejects.toThrow(/outside/);
    symlinkSync(dataDirectory, join(backupDirectory, 'alias'), 'dir');
    await expect(backupDatabase({ source, destination: join(backupDirectory, 'alias', 'aliased.sqlite') })).rejects.toThrow(/outside/);
    const destination = join(backupDirectory, 'saved.sqlite');
    await backupDatabase({ source, destination });
    await expect(backupDatabase({ source, destination })).rejects.toThrow();
    const missing = join(root, 'missing.sqlite');
    await expect(backupDatabase({ source: missing, destination: join(backupDirectory, 'missing.sqlite') })).rejects.toThrow();
    expect(existsSync(missing)).toBe(false);
  });
});
