import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const server = await createServer({ mode: 'production', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { publicPages, renderPage } = await server.ssrLoadModule('/src/prerender.tsx');
  const template = await readFile('dist/index.html', 'utf8');
  for (const page of publicPages) {
    const title = `${page.label} | ACT — Avoonger Competition Team`;
    const html = template
      .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
      .replace('<div id="root"></div>', `<div id="root">${renderPage(page.route)}</div>`);
    const directory = page.route === '/' ? 'dist' : `dist${page.route}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/index.html`, html);
    console.log(`Static HTML ready: ${page.route}`);
  }
} finally {
  await server.close();
}
