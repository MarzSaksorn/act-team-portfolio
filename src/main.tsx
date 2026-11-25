import { StrictMode, createElement } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { z } from 'zod';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/ibm-plex-sans-thai/thai-400.css';
import '@fontsource/ibm-plex-sans-thai/thai-500.css';
import '@fontsource/ibm-plex-sans-thai/latin-400.css';
import '@fontsource/ibm-plex-sans-thai/latin-500.css';
import './styles/global.css';
import App from './App';
import { defaultSiteContent } from './data/defaultSiteContent';
import { localeSchema, siteContentSnapshotSchema } from './types/site-content';

const bootstrapSchema = z.object({
  content: siteContentSnapshotSchema,
  locale: localeSchema,
}).strict();

function readBootstrapState() {
  const element = document.getElementById('act-bootstrap-state');
  if (!element?.textContent) return { snapshot: defaultSiteContent, initialLocale: 'en' as const };
  try {
    const input: unknown = JSON.parse(element.textContent);
    const parsed = bootstrapSchema.safeParse(input);
    if (parsed.success) return { snapshot: parsed.data.content, initialLocale: parsed.data.locale };
  } catch {
    // A missing or invalid bootstrap state falls back to the bundled static content.
  }
  return { snapshot: defaultSiteContent, initialLocale: 'en' as const };
}

const root = document.getElementById('root');
if (!root) throw new Error('App root is missing');
const bootstrap = readBootstrapState();
const app = createElement(StrictMode, null,
  createElement(BrowserRouter, null,
    createElement(App, { snapshot: bootstrap.snapshot, initialLocale: bootstrap.initialLocale }),
  ),
);

if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
