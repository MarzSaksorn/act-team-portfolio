import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../server/app';
import { renderPublicPage } from '../../server/render-public';
import type { RuntimeConfig } from '../../server/config';
import {
  createCompetition,
  createProject,
  loadContent,
  updateSiteCopy,
  updateUpcomingCompetition,
} from '../../server/db/content-repository';
import { migrateDatabase } from '../../server/db/migrations';
import { openDatabase } from '../../server/db/open-database';
import { seedDatabase } from '../../server/db/seed-content';
import App from '../../src/App';
import { defaultSiteContent } from '../../src/data/defaultSiteContent';
import { localeSchema, siteContentSnapshotSchema } from '../../src/types/site-content';

const config = {
  environment: 'test',
  port: 3000,
  databasePath: ':memory:',
  adminUsername: 'act-admin',
  adminPasswordHash: 'scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  sessionSecret: 'render-test-session-secret-which-is-long-enough',
  sessionTtlSeconds: 28_800,
  trustProxyHops: 0,
} satisfies RuntimeConfig;

const databases: Array<ReturnType<typeof openDatabase>> = [];

function initializedDatabase(): ReturnType<typeof openDatabase> {
  const db = openDatabase(':memory:');
  databases.push(db);
  migrateDatabase(db);
  seedDatabase(db);
  const initial = loadContent(db);
  const copyResult = updateSiteCopy(db, {
    ...initial.siteCopy,
    homeTitle: { en: 'Saved English ACT title', th: 'ชื่อ ACT ภาษาไทยที่บันทึก' },
    homeDescription: { en: 'Saved English meta description.', th: 'คำอธิบายภาษาไทยที่บันทึก' },
    heroLine1: { en: 'A saved English hero line.', th: 'ข้อความฮีโร่ภาษาไทยที่บันทึก' },
  }, initial.revision);
  const projectResult = createProject(db, {
    title: { en: 'Saved ACT project', th: 'โครงการ ACT ที่บันทึก' },
    summary: { en: 'Saved project summary.', th: 'สรุปโครงการที่บันทึก' },
    status: 'planned',
  }, copyResult.revision);
  const founderResult = createCompetition(db, {
    recordType: 'founder-pre-act',
    name: { en: 'Founder pre-ACT result', th: 'ผลงานก่อน ACT ของผู้ก่อตั้ง' },
    year: 2024,
    participants: ['Founding member'],
    stage: { en: 'Founder finalist', th: 'ผู้เข้ารอบของผู้ก่อตั้ง' },
  }, projectResult.revision);
  createCompetition(db, {
    recordType: 'act',
    name: { en: 'ACT team result', th: 'ผลงานทีม ACT' },
    year: 2025,
    participants: ['ACT team'],
    stage: { en: 'ACT team stage', th: 'สถานะทีม ACT' },
  }, founderResult.revision);
  const current = loadContent(db);
  updateUpcomingCompetition(db, {
    ...current.upcomingCompetition,
    note: { en: 'A saved note for the planned event.', th: 'หมายเหตุการแข่งขันที่บันทึก' },
  }, current.revision);
  return db;
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const db of databases.splice(0)) db.close();
});

describe('database-backed public rendering', () => {
  it('rendersSavedContentAndMetadataOnFirstRequest', async () => {
    const db = initializedDatabase();
    const app = createApp({ db, renderer: renderPublicPage, config });
    const englishHome = await request(app).get('/');
    const thaiHome = await request(app).get('/').set('Cookie', 'act-locale=th');
    const englishProjects = await request(app).get('/projects');
    const thaiCompetitions = await request(app).get('/competitions').set('Cookie', 'act-locale=th');
    const englishCompetitions = await request(app).get('/competitions');

    expect(englishHome.status).toBe(200);
    expect(englishHome.text).toContain('<html lang="en">');
    expect(englishHome.text).toContain('<title>Home | ACT — Avoonger Competition Team</title>');
    expect(englishHome.text).toContain('Saved English meta description.');
    expect(englishHome.text).toContain('Saved English ACT title');
    expect(englishHome.text).toContain('A saved English hero line.');
    expect(englishHome.text).toContain('A saved note for the planned event.');
    expect(englishHome.text).toContain('Planning to apply');
    expect(thaiHome.text).toContain('<html lang="th">');
    expect(thaiHome.text).toContain('ชื่อ ACT ภาษาไทยที่บันทึก');
    expect(thaiHome.text).toContain('ข้อความฮีโร่ภาษาไทยที่บันทึก');
    expect(thaiHome.text).toContain('หมายเหตุการแข่งขันที่บันทึก');
    expect(thaiHome.text).toContain('วางแผนสมัคร');
    expect(englishProjects.text).toContain('Saved ACT project');
    expect(englishCompetitions.text).toContain('ACT team result');
    expect(englishCompetitions.text).toContain('Founder pre-ACT result');
    expect(thaiCompetitions.text).toContain('ผลงานทีม ACT');
    expect(thaiCompetitions.text).toContain('ผลงานก่อน ACT ของผู้ก่อตั้ง');
    const competitionMarkup = englishCompetitions.text.slice(englishCompetitions.text.indexOf('<main'));
    expect(competitionMarkup.indexOf('ACT team result')).toBeLessThan(
      competitionMarkup.indexOf('Founder pre-ACT result'),
    );
  });

  it('hydratesTheSameContentSnapshot', async () => {
    const db = initializedDatabase();
    const app = createApp({ db, renderer: renderPublicPage, config });
    const response = await request(app).get('/projects').set('Cookie', 'act-locale=th');
    const match = /<script id="act-bootstrap-state" type="application\/json">([\s\S]*?)<\/script>/.exec(response.text);
    expect(match?.[1]).toBeDefined();
    const bootstrapSchema = z.object({
      content: siteContentSnapshotSchema,
      locale: localeSchema,
    }).strict();
    const bootstrap = bootstrapSchema.parse(JSON.parse(match?.[1] ?? 'null'));
    expect(bootstrap.content).toEqual(loadContent(db));
    expect(bootstrap.locale).toBe('th');

    const dom = new JSDOM(response.text, { url: 'http://act.test/projects', pretendToBeVisual: true });
    const recoveredErrors: unknown[] = [];
    const window = dom.window;
    const root = window.document.getElementById('root');
    if (!root) throw new Error('Expected the server-rendered app root.');
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
    const stubs: Array<[string, unknown]> = [
      ['window', window],
      ['document', window.document],
      ['navigator', window.navigator],
      ['HTMLElement', window.HTMLElement],
      ['Node', window.Node],
      ['Element', window.Element],
      ['localStorage', window.localStorage],
      ['requestAnimationFrame', window.requestAnimationFrame.bind(window)],
      ['cancelAnimationFrame', window.cancelAnimationFrame.bind(window)],
    ];
    for (const [name, value] of stubs) vi.stubGlobal(name, value);
    let hydratedRoot: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        hydratedRoot = hydrateRoot(
          root,
          createElement(BrowserRouter, null,
            createElement(App, { snapshot: bootstrap.content, initialLocale: bootstrap.locale }),
          ),
          { onRecoverableError: (error) => recoveredErrors.push(error) },
        );
      });
      expect(recoveredErrors).toEqual([]);
      expect(root.textContent).toContain('โครงการ ACT ที่บันทึก');
      expect(root.textContent).toContain('สรุปโครงการที่บันทึก');
    } finally {
      if (hydratedRoot) await act(async () => hydratedRoot?.unmount());
      window.close();
    }
  });

  it('staticPreviewFallsBackWithoutBackend', () => {
    const html = renderPublicPage('/', defaultSiteContent, 'en');
    expect(html).toContain('Avoonger Competition Team');
    expect(html).toContain('Think boldly.');
    expect(html).toContain('This is our planned target');
    expect(html).toContain('https://futurecenter.ai/hackathon#talk');
    expect(html).toContain('"projects":[]');
    expect(html).toContain('"founderPreAct":[]');
    expect(html).toContain('"act":[]');
  });

  it('rendersUserTextWithoutExecutingMarkup', () => {
    const snapshot = siteContentSnapshotSchema.parse(structuredClone(defaultSiteContent));
    snapshot.siteCopy.heroBody.en = '</script><script>window.__actInjected = true</script>';
    const html = renderPublicPage('/', snapshot, 'en');
    expect(html).toContain('\\u003c/script\\u003e\\u003cscript\\u003ewindow.__actInjected = true\\u003c/script\\u003e');
    expect(html).not.toContain('</script><script>window.__actInjected');

    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://act.test' });
    expect(Reflect.get(dom.window, '__actInjected')).toBeUndefined();
    dom.window.close();
  });
});
