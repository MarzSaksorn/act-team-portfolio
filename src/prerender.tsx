import { renderApp } from './entry-server';
import { defaultSiteContent } from './data/defaultSiteContent';
import type { Locale, SiteContentSnapshot } from './types/site-content';

export const publicPages = [
  { route: '/' },
  { route: '/competitions' },
  { route: '/projects' },
];

export function renderPage(
  route: string,
  snapshot: SiteContentSnapshot = defaultSiteContent,
  locale: Locale = 'en',
): string {
  return renderApp(route, snapshot, locale);
}
