import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { messages } from '../src/i18n/messages';
import { localeSchema, siteContentSnapshotSchema, type Locale, type SiteContentSnapshot } from '../src/types/site-content';
import { renderApp } from '../src/entry-server';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function serializeBootstrap(snapshot: SiteContentSnapshot, locale: Locale): string {
  return JSON.stringify({ content: snapshot, locale })
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function readHtmlTemplate(): string {
  const builtPath = resolve(process.cwd(), 'dist', 'index.html');
  if (existsSync(builtPath)) {
    const builtTemplate = readFileSync(builtPath, 'utf8');
    if (builtTemplate.includes('id="act-bootstrap-state"') && builtTemplate.includes('id="root"')) {
      return builtTemplate;
    }
  }
  return readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
}

function replaceRootContent(html: string, markup: string): string {
  const openingPattern = /<div\b[^>]*\bid=["']root["'][^>]*>/i;
  const opening = openingPattern.exec(html);
  if (!opening || opening.index === undefined) throw new Error('The HTML template is missing its root element.');

  const divTags = /<\/?div\b[^>]*>/gi;
  divTags.lastIndex = opening.index + opening[0].length;
  let depth = 1;
  let tag = divTags.exec(html);
  while (tag) {
    if (/^<\//.test(tag[0])) depth -= 1;
    else if (!/\/>$/.test(tag[0])) depth += 1;
    if (depth === 0) return `${html.slice(0, opening.index)}${opening[0]}${markup}${html.slice(tag.index)}`;
    tag = divTags.exec(html);
  }
  throw new Error('The HTML template root element is not closed.');
}

function pageMetadata(route: string, snapshot: SiteContentSnapshot, locale: Locale): { title: string; description: string } {
  const text = messages[locale];
  if (route === '/') {
    return {
      title: `${text.home} | ACT — Avoonger Competition Team`,
      description: snapshot.siteCopy.homeDescription[locale],
    };
  }
  if (route === '/competitions') {
    return { title: `${text.competitions} | ACT — Avoonger Competition Team`, description: text.competitionDescription };
  }
  if (route === '/projects') {
    return { title: `${text.projects} | ACT — Avoonger Competition Team`, description: text.projectDescription };
  }
  return { title: `${text.notFound} | ACT`, description: text.notFound };
}

function withLocale(html: string, locale: Locale): string {
  const htmlTag = /<html\b[^>]*>/i;
  return html.replace(htmlTag, (tag) => {
    const langAttribute = /\blang\s*=\s*(["'])[^"']*\1/i;
    return langAttribute.test(tag)
      ? tag.replace(langAttribute, `lang="${locale}"`)
      : tag.replace(/>$/, ` lang="${locale}">`);
  });
}

export function renderPublicPage(route: string, snapshot: SiteContentSnapshot, locale: Locale): string {
  const content = siteContentSnapshotSchema.parse(snapshot);
  const selectedLocale = localeSchema.parse(locale);
  const pathname = route === '' ? '/' : route.split(/[?#]/, 1)[0] || '/';
  const metadata = pageMetadata(pathname, content, selectedLocale);
  let html = readHtmlTemplate();
  html = withLocale(html, selectedLocale);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`);
  const bootstrapPattern = /<script\b(?=[^>]*\bid=["']act-bootstrap-state["'])(?=[^>]*\btype=["']application\/json["'])[^>]*>[\s\S]*?<\/script>/i;
  html = html.replace(bootstrapPattern,
    `<script id="act-bootstrap-state" type="application/json">${serializeBootstrap(content, selectedLocale)}</script>`);
  if (!bootstrapPattern.test(readHtmlTemplate())) throw new Error('The HTML template is missing its bootstrap state element.');
  return replaceRootContent(html, renderApp(pathname, content, selectedLocale));
}
