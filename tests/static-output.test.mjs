import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pages = [
  { file: 'dist/index.html', title: 'Home | ACT — Avoonger Competition Team', body: 'Think boldly.' },
  { file: 'dist/competitions/index.html', title: 'Competitions | ACT — Avoonger Competition Team', body: 'Founders before ACT' },
  { file: 'dist/projects/index.html', title: 'Projects | ACT — Avoonger Competition Team', body: 'Our first chapter is still taking shape.' },
];

for (const page of pages) {
  test(`initial HTML exposes public content and route metadata: ${page.file}`, async () => {
    const html = await readFile(page.file, 'utf8');
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(page.body));
    assert.ok(html.includes('meta name="description"'));
    assert.ok(html.includes('href="/competitions"'));
    assert.ok(html.includes('href="/projects"'));
    assert.ok(!html.includes('>undefined<'));
  });
}
