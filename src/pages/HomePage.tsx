import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDown, Cpu, Sprout, ChartNoAxesCombined } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
import { useSiteContent } from '../content/ContentContext';
import UpcomingCompetitionCard from '../components/UpcomingCompetitionCard';
import JoinActLink from '../components/JoinActLink';
import { usePageMeta } from '../hooks/usePageMeta';
import AsciiHeroArt from '../components/AsciiHeroArt';

export default function HomePage() {
  const { locale, text } = useLocale();
  const { siteCopy, upcomingCompetition } = useSiteContent();
  usePageMeta(`${text.home} | ACT — Avoonger Competition Team`, siteCopy.homeDescription[locale]);
  return <>
    <section className="hero"><div className="hero-copy"><h1 className="hero-team"><span aria-hidden="true" />{siteCopy.homeTitle[locale]}</h1><p className="hero-display">{siteCopy.heroLine1[locale]}<br /><span>{siteCopy.heroLine2[locale]}</span></p><p className="hero-body">{siteCopy.heroBody[locale]}</p><div className="hero-actions"><Link to="/competitions" className="button button-primary">{text.viewCompetitions}<ArrowUpRight size={19} aria-hidden="true" /></Link><Link to="/projects" className="text-link">{text.seeProjects}<ArrowUpRight size={17} aria-hidden="true" /></Link></div><a className="hero-scroll" href="#about"><span><ArrowDown size={14} aria-hidden="true" /></span>{text.scroll}</a></div>
      <AsciiHeroArt />
    </section>
    <section className="about-strip" id="about"><div><span className="eyebrow">ACT</span><h2>{siteCopy.forming[locale]}</h2></div><p>{siteCopy.teamBody[locale]}</p><div className="founder-count"><strong>{siteCopy.teamCountValue[locale]}</strong><span>{siteCopy.teamCount[locale]}</span><span className="recruiting"><span aria-hidden="true" />{siteCopy.teamStatus[locale]}</span></div></section>
    <section className="focus-section"><div className="section-title"><span className="eyebrow">{siteCopy.focusLabel[locale]}</span><h2>{siteCopy.focusHeading[locale]}</h2></div><div className="focus-list"><div><Cpu size={25} strokeWidth={1.4} aria-hidden="true" /><span className="focus-number">01</span><h3>{siteCopy.ai[locale]}</h3><p>{siteCopy.aiText[locale]}</p></div><div><Sprout size={25} strokeWidth={1.4} aria-hidden="true" /><span className="focus-number">02</span><h3>{siteCopy.sustainable[locale]}</h3><p>{siteCopy.sustainableText[locale]}</p></div><div><ChartNoAxesCombined size={25} strokeWidth={1.4} aria-hidden="true" /><span className="focus-number">03</span><h3>{siteCopy.business[locale]}</h3><p>{siteCopy.businessText[locale]}</p></div></div></section>
    <section className="next-section"><div className="section-title"><span className="eyebrow">{text.nextLabel}</span><h2>{text.nextHeading}</h2><p>{upcomingCompetition.note[locale]}</p></div><UpcomingCompetitionCard /></section>
    <section className="join-section glass-panel" id="join"><div><span className="eyebrow">{siteCopy.joinLabel[locale]}</span><h2>{siteCopy.joinHeading[locale]}</h2><p>{siteCopy.joinBody[locale]}</p></div><div className="join-action"><JoinActLink /><p>{siteCopy.onboarding[locale]}</p></div></section>
  </>;
}
