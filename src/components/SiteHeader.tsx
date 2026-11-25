import { NavLink, Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';

export default function SiteHeader() {
  const { locale, setLocale, text } = useLocale();
  return <>
    <a className="skip-link" href="#main">{text.skip}</a>
    <header className="site-header glass-panel">
      <Link className="wordmark" to="/" aria-label="ACT — Avoonger Competition Team"><span className="act-mark" aria-hidden="true">A<span>CT</span><i /></span><span className="wordmark-name">Avoonger<br />Competition Team</span></Link>
      <nav aria-label={text.navigation} className="main-nav">
        <NavLink to="/" end>{text.home}</NavLink><NavLink to="/competitions">{text.competitions}</NavLink><NavLink to="/projects">{text.projects}</NavLink>
      </nav>
      <div className="header-actions"><div className="language-switch" role="group" aria-label={text.language}>
        <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')} lang="en">EN</button>
        <button type="button" aria-pressed={locale === 'th'} onClick={() => setLocale('th')} lang="th">ไทย</button>
      </div><Link to="/#join" className="header-join">{text.join}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    </header>
  </>;
}
