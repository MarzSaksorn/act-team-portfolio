import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider';
export default function SiteFooter() {
  const { text } = useLocale();
  return <footer className="site-footer"><Link className="footer-act" to="/">ACT<span aria-hidden="true">.</span></Link><p>{text.footerLine}</p><span>{text.footerNote}</span></footer>;
}
