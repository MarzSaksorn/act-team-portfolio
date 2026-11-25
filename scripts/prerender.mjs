import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ mode: 'production', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { publicPages } = await server.ssrLoadModule('/src/prerender.tsx');
  const { renderPublicPage } = await server.ssrLoadModule('/server/render-public.ts');
  const { defaultSiteContent } = await server.ssrLoadModule('/src/data/defaultSiteContent.ts');
  const builtTemplate = await readFile('dist/index.html', 'utf8');
  if (!builtTemplate.includes('id="act-bootstrap-state"') || !builtTemplate.includes('id="root"')) {
    throw new Error('The built index template is missing the required SSR placeholders.');
  }

  for (const page of publicPages) {
    const html = renderPublicPage(page.route, defaultSiteContent, 'en');
    const directory = page.route === '/' ? 'dist' : `dist${page.route}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/index.html`, html);
    console.log(`Static HTML ready: ${page.route}`);
  }
} finally {
  await server.close();
}
