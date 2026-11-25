import { Route, Routes, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CompetitionsPage from './pages/CompetitionsPage';
import ProjectsPage from './pages/ProjectsPage';
import AdminPage from './admin/AdminPage';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import RouteEffects from './components/RouteEffects';
import { LocaleProvider, useLocale } from './i18n/LocaleProvider';
import { usePageMeta } from './hooks/usePageMeta';
import { ContentProvider } from './content/ContentContext';
import { defaultSiteContent } from './data/defaultSiteContent';
import type { Locale, SiteContentSnapshot } from './types/site-content';

function MissingPage() {
  const { text } = useLocale();
  usePageMeta(`${text.notFound} | ACT`, text.notFound);
  return <><h1>{text.notFound}</h1><Link to="/">{text.goHome}</Link></>;
}

export type AppProps = {
  snapshot?: SiteContentSnapshot;
  initialLocale?: Locale;
};

export default function App({ snapshot = defaultSiteContent, initialLocale = 'en' }: AppProps) {
  return <ContentProvider snapshot={snapshot}><LocaleProvider initialLocale={initialLocale}><RouteEffects /><div className="site-backdrop" aria-hidden="true" /><div className="app-shell"><SiteHeader /><main id="main" tabIndex={-1}><Routes>
    <Route path="/" element={<HomePage />} /><Route path="/competitions" element={<CompetitionsPage />} /><Route path="/projects" element={<ProjectsPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="*" element={<MissingPage />} />
  </Routes></main><SiteFooter /></div></LocaleProvider></ContentProvider>;
}
