import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import type { Locale, SiteContentSnapshot } from './types/site-content';

export function renderApp(route: string, snapshot: SiteContentSnapshot, locale: Locale): string {
  return renderToString(
    <StaticRouter location={route}>
      <App snapshot={snapshot} initialLocale={locale} />
    </StaticRouter>,
  );
}
