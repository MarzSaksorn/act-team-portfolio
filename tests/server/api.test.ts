import Database from 'better-sqlite3';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../server/app';
import { migrateDatabase } from '../../server/db/migrations';
import { openDatabase } from '../../server/db/open-database';
import { seedDatabase } from '../../server/db/seed-content';
import type { RuntimeConfig } from '../../server/config';
import { loadContent } from '../../server/db/content-repository';
import type { NewCompetition, NewProject } from '../../src/types/site-content';

const adminPassword = 'safe-test-password-not-for-production';
const sessionSecret = 'api-test-session-secret-with-at-least-thirty-two-bytes';
const adminPasswordHash = 'scrypt$QUNULWFwaS10ZXN0LXYwMQ$P5ENSb81SswyI2f2PGsrRgD5JcGqP3yu1ZFCu7XBMe2N2cI60Gs4r-u6dtL6c074mxEDsOzTWTa4JTx9uYsrLQ';
const openDatabases: Database.Database[] = [];

function makeApp(overrides: Partial<RuntimeConfig> = {}): { app: Express; db: Database.Database } {
  const db = openDatabase(':memory:');
  migrateDatabase(db);
  seedDatabase(db);
  openDatabases.push(db);

  const config: RuntimeConfig = {
    environment: 'test',
    port: 3000,
    databasePath: ':memory:',
    adminUsername: 'act-admin',
    adminPasswordHash,
    sessionSecret,
    sessionTtlSeconds: 3_600,
    trustProxyHops: 0,
    ...overrides,
  };
  const app = createApp({ db, renderer: () => '<!doctype html><html></html>', config });
  return { app, db };
}

function projectInput(title = 'ACT test project'): NewProject {
  return {
    title: { en: title, th: 'โครงการทดสอบของ ACT' },
    summary: { en: 'A bilingual project summary.', th: 'สรุปโครงการสองภาษา' },
    status: 'planned',
    problem: { en: 'A test problem.', th: 'ปัญหาทดสอบ' },
    businessModel: { en: 'A test business model.', th: 'รูปแบบธุรกิจทดสอบ' },
    contributions: [{ name: 'ACT member', description: { en: 'Research.', th: 'ค้นคว้า' } }],
    dates: '2026',
    links: [{ label: { en: 'Project notes', th: 'บันทึกโครงการ' }, url: 'https://example.test/project' }],
  };
}

function competitionInput(recordType: NewCompetition['recordType'] = 'act'): NewCompetition {
  return {
    recordType,
    name: { en: 'ACT test competition', th: 'การแข่งขันทดสอบ ACT' },
    year: 2026,
    participants: ['ACT member'],
    stage: { en: 'Planned', th: 'วางแผนไว้' },
    contribution: { en: 'Prototype work.', th: 'พัฒนาต้นแบบ' },
    evidenceUrl: 'https://example.test/evidence',
  };
}

async function authenticate(app: Express): Promise<{ agent: ReturnType<typeof request.agent>; csrfToken: string }> {
  const agent = request.agent(app);
  const login = await agent.post('/api/v1/admin/session').send({
    username: 'act-admin',
    password: adminPassword,
  });
  if (login.status !== 200) throw new Error(`Test login failed with status ${login.status}.`);
  const session = await agent.get('/api/v1/admin/session');
  const csrfToken = z.object({ csrfToken: z.string().min(1) }).parse(session.body).csrfToken;
  return { agent, csrfToken };
}

afterEach(() => {
  for (const db of openDatabases.splice(0)) db.close();
});

describe('versioned content API', () => {
  it('returns only the allowlisted public snapshot and disables caching', async () => {
    const { app } = makeApp();
    const response = await request(app).get('/api/v1/public/content');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(Object.keys(response.body).sort()).toEqual([
      'competitions', 'projects', 'revision', 'siteCopy', 'upcomingCompetition',
    ]);
    expect(response.body).toMatchObject({
      revision: 0,
      projects: [],
      competitions: { founderPreAct: [], act: [] },
      upcomingCompetition: { status: 'planned', registration: 'not-registered' },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/admin_sessions|csrfToken|token_hash/);
  });

  it('authenticates the administrator and sets an HttpOnly SameSite cookie', async () => {
    const { app } = makeApp();
    const agent = request.agent(app);
    const login = await agent.post('/api/v1/admin/session').send({
      username: 'act-admin',
      password: adminPassword,
    });
    const cookie = String(login.headers['set-cookie'] ?? '');
    const session = await agent.get('/api/v1/admin/session');

    expect(login.status).toBe(200);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(session.body).toMatchObject({ authenticated: true });
    expect(session.body.csrfToken).toEqual(expect.any(String));
    expect(login.headers['cache-control']).toContain('no-store');
  });

  it('sets Secure on administrator cookies in production', async () => {
    const { app } = makeApp({ environment: 'production' });
    const response = await request(app).post('/api/v1/admin/session').send({
      username: 'act-admin',
      password: adminPassword,
    });

    expect(response.status).toBe(200);
    expect(String(response.headers['set-cookie'] ?? '')).toMatch(/Secure/i);
  });

  it('returns a generic problem response for invalid credentials and rejects extra secret fields', async () => {
    const { app } = makeApp();
    const invalid = await request(app).post('/api/v1/admin/session').send({
      username: 'act-admin',
      password: 'wrong-password',
    });
    const extra = await request(app).post('/api/v1/admin/session').send({
      username: 'act-admin',
      password: adminPassword,
      sessionSecret,
    });

    expect(invalid.status).toBe(401);
    expect(invalid.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(JSON.stringify(invalid.body)).not.toContain('wrong-password');
    expect(extra.status).toBe(422);
  });

  it('blocks writes without an administrator session or a valid CSRF token', async () => {
    const { app, db } = makeApp();
    const unauthenticated = await request(app)
      .put('/api/v1/admin/site-copy')
      .set('If-Match', '"0"')
      .send({});
    const { agent, csrfToken } = await authenticate(app);
    const missingCsrf = await agent.put('/api/v1/admin/site-copy')
      .set('If-Match', '"0"')
      .send(loadContent(db).siteCopy);
    const missingPrecondition = await agent.put('/api/v1/admin/site-copy')
      .set('X-CSRF-Token', csrfToken)
      .send(loadContent(db).siteCopy);

    expect(unauthenticated.status).toBe(401);
    expect(missingCsrf.status).toBe(403);
    expect(missingPrecondition.status).toBe(428);
  });

  it('rejects invalid translations, unsafe links, malformed dates, and markup without partial writes', async () => {
    const { app, db } = makeApp();
    const { agent, csrfToken } = await authenticate(app);
    const copy = structuredClone(loadContent(db).siteCopy);
    copy.heroBody.th = '';
    const missingTranslation = await agent.put('/api/v1/admin/site-copy')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"0"')
      .send(copy);

    const unsafeMarkup = structuredClone(loadContent(db).siteCopy);
    unsafeMarkup.heroBody.en = '<script>alert(1)</script>';
    const markup = await agent.put('/api/v1/admin/site-copy')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"0"')
      .send(unsafeMarkup);

    const event = loadContent(db).upcomingCompetition;
    const malformedEvent = await agent.put('/api/v1/admin/upcoming-competition')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"0"')
      .send({ ...event, finalEndDate: '2027-02-30', officialUrl: 'javascript:alert(1)' });

    expect(missingTranslation.status).toBe(422);
    expect(markup.status).toBe(422);
    expect(malformedEvent.status).toBe(422);
    expect(missingTranslation.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(missingTranslation.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'heroBody.th' }),
    ]));
    expect(JSON.stringify(markup.body)).not.toContain('<script>');
    expect(loadContent(db).revision).toBe(0);
    expect(loadContent(db).siteCopy.heroBody.th).not.toBe('');
  });

  it('uses ETags and rejects missing or stale If-Match revisions', async () => {
    const { app, db } = makeApp();
    const { agent, csrfToken } = await authenticate(app);
    const resource = await agent.get('/api/v1/admin/site-copy');
    const edited = structuredClone(loadContent(db).siteCopy);
    edited.heroLine1.en = 'Saved through the versioned API.';
    edited.heroLine1.th = 'บันทึกผ่าน API ที่กำหนดเวอร์ชัน';

    const missing = await agent.put('/api/v1/admin/site-copy')
      .set('X-CSRF-Token', csrfToken)
      .send(edited);
    const stale = await agent.put('/api/v1/admin/site-copy')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"23"')
      .send(edited);
    const saved = await agent.put('/api/v1/admin/site-copy')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"0"')
      .send(edited);

    expect(resource.headers.etag).toBe('"0"');
    expect(missing.status).toBe(428);
    expect(stale.status).toBe(412);
    expect(saved.status).toBe(200);
    expect(saved.headers.etag).toBe('"1"');
    expect(saved.body.resource.heroLine1.en).toBe('Saved through the versioned API.');
  });

  it('creates, updates, lists, and deletes projects and competitions with separate attribution', async () => {
    const { app } = makeApp();
    const { agent, csrfToken } = await authenticate(app);
    const projectCreated = await agent.post('/api/v1/admin/projects')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"0"')
      .send(projectInput());
    const projectSecond = await agent.post('/api/v1/admin/projects')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"1"')
      .send(projectInput('Second ACT test project'));
    const firstPage = await agent.get('/api/v1/admin/projects?page=1&limit=1');
    const emptyPage = await agent.get('/api/v1/admin/projects?page=99&limit=1');
    const invalidPage = await agent.get('/api/v1/admin/projects?page=0&limit=101');

    expect(projectCreated.status).toBe(201);
    expect(projectCreated.headers.location).toMatch(/^\/api\/v1\/admin\/projects\//);
    expect(projectCreated.headers.etag).toBe('"1"');
    expect(projectSecond.status).toBe(201);
    expect(firstPage.body.data).toHaveLength(1);
    expect(firstPage.body.pagination).toMatchObject({ page: 1, limit: 1, total: 2, hasMore: true });
    expect(firstPage.body.links.next).toBe('/api/v1/admin/projects?sort=position&order=asc&page=2&limit=1');
    expect(emptyPage.body.data).toEqual([]);
    expect(emptyPage.body.pagination.total).toBe(2);
    expect(invalidPage.status).toBe(422);

    const project = z.object({
      id: z.string(),
      title: z.object({ en: z.string(), th: z.string() }),
    }).parse(projectCreated.body.resource);
    const projectEdit = { ...projectInput('Edited ACT project'), id: project.id };
    const projectUpdated = await agent.put(`/api/v1/admin/projects/${project.id}`)
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"2"')
      .send(projectEdit);
    const competitionCreated = await agent.post('/api/v1/admin/competitions')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"3"')
      .send(competitionInput('act'));
    const actPage = await agent.get('/api/v1/admin/competitions?recordType=act');
    const founderPage = await agent.get('/api/v1/admin/competitions?recordType=founder-pre-act');
    const missingAttribution = await agent.get('/api/v1/admin/competitions');

    expect(projectUpdated.status).toBe(200);
    expect(projectUpdated.body.resource.title.en).toBe('Edited ACT project');
    expect(competitionCreated.status).toBe(201);
    expect(competitionCreated.body.resource.recordType).toBe('act');
    expect(actPage.body.data[0].recordType).toBe('act');
    expect(founderPage.body.data).toEqual([]);
    expect(missingAttribution.status).toBe(422);

    const competition = z.object({
      id: z.string(),
      name: z.object({ en: z.string(), th: z.string() }),
    }).parse(competitionCreated.body.resource);
    const competitionUpdated = await agent.put(`/api/v1/admin/competitions/${competition.id}`)
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"4"')
      .send({ ...competitionInput('act'), id: competition.id, name: { en: 'Edited ACT history', th: 'ประวัติ ACT ที่แก้ไข' } });
    const competitionDeleted = await agent.delete(`/api/v1/admin/competitions/${competition.id}`)
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"5"');
    const projectDeleted = await agent.delete(`/api/v1/admin/projects/${project.id}`)
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"6"');

    expect(competitionUpdated.status).toBe(200);
    expect(competitionUpdated.body.resource.name.en).toBe('Edited ACT history');
    expect(competitionDeleted.status).toBe(200);
    expect(competitionDeleted.body).toMatchObject({ resource: null, revision: 6 });
    expect(projectDeleted.status).toBe(200);
    expect(projectDeleted.body).toMatchObject({ resource: null, revision: 7 });
  });

  it('limits JSON bodies to 512 KiB and returns RFC 7807 details', async () => {
    const { app } = makeApp();
    const { agent, csrfToken } = await authenticate(app);
    const tooLarge = await agent.put('/api/v1/admin/site-copy')
      .set('X-CSRF-Token', csrfToken)
      .set('If-Match', '"0"')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ oversized: 'x'.repeat(512 * 1024) }));

    expect(tooLarge.status).toBe(413);
    expect(tooLarge.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(tooLarge.body).toMatchObject({ status: 413, title: expect.any(String) });
  });

  it('rate-limits repeated failed logins and uses problem details for the limit response', async () => {
    const { app } = makeApp();
    const agent = request.agent(app);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await agent.post('/api/v1/admin/session').send({ username: 'attacker', password: 'wrong' });
      expect(failed.status).toBe(401);
    }
    const limited = await agent.post('/api/v1/admin/session').send({ username: 'attacker', password: 'wrong' });

    expect(limited.status).toBe(429);
    expect(limited.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it('enforces a configured public origin for state-changing browser requests', async () => {
    const { app } = makeApp({ publicOrigin: 'https://act.example.test' });
    const response = await request(app)
      .post('/api/v1/admin/session')
      .set('Origin', 'https://attacker.example')
      .send({ username: 'act-admin', password: adminPassword });

    expect(response.status).toBe(403);
    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('returns healthy only while SQLite is available and keeps preview framing enabled', async () => {
    const { app, db } = makeApp();
    const healthy = await request(app).get('/healthz');

    expect(healthy.status).toBe(200);
    expect(healthy.body.status).toBe('ok');
    expect(healthy.headers['x-frame-options']).toBeUndefined();
    expect(healthy.headers['content-security-policy']).toBeUndefined();

    db.close();
    const unavailable = await request(app).get('/healthz');
    expect(unavailable.status).toBe(503);
    expect(unavailable.body.status).toBe('unavailable');
  });
});
