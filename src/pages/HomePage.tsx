import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDown, Cpu, Sprout, ChartNoAxesCombined } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
import UpcomingCompetitionCard from '../components/UpcomingCompetitionCard';
import JoinActLink from '../components/JoinActLink';
import { usePageMeta } from '../hooks/usePageMeta';

export default function HomePage() {
  const { text } = useLocale();
  usePageMeta(`${text.home} | ACT — Avoonger Competition Team`, text.homeDescription);
  return <>
    <section className="hero"><div className="hero-copy"><h1 className="hero-team"><span aria-hidden="true" />{text.homeTitle}</h1><p className="hero-display">{text.heroLine1}<br /><span>{text.heroLine2}</span></p><p className="hero-body">{text.heroBody}</p><div className="hero-actions"><Link to="/competitions" className="button button-primary">{text.viewCompetitions}<ArrowUpRight size={19} aria-hidden="true" /></Link><Link to="/projects" className="text-link">{text.seeProjects}<ArrowUpRight size={17} aria-hidden="true" /></Link></div><a className="hero-scroll" href="#about"><span><ArrowDown size={14} aria-hidden="true" /></span>{text.scroll}</a></div>
      <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-glass glass-panel"><span className="art-topline">ACT / Collective</span><div className="art-wordmark">ACT<span>.</span></div><div className="art-bottomline"><span>AI × SUSTAINABILITY</span><ArrowUpRight size={32} strokeWidth={1} /></div></div><div className="art-caption">Avoonger Competition Team</div><div className="art-stamp glass-panel"><Sprout size={20} strokeWidth={1.4} /><span>Think • Build • ACT</span></div></div>
    </section>
    <section className="about-strip" id="about"><div><span className="eyebrow">ACT</span><h2>{text.forming}</h2></div><p>{text.teamBody}</p><div className="founder-count"><strong>{text.teamCountValue}</strong><span>{text.teamCount}</span><span className="recruiting"><span aria-hidden="true" />{text.teamStatus}</span></div></section>
    <section className="focus-section"><div className="section-title"><span className="eyebrow">{text.focusLabel}</span><h2>{text.focusHeading}</h2></div><div className="focus-list"><div><Cpu size={25} strokeWidth={1.4} aria-hidden="true" /><span className="focus-number">01</span><h3>{text.ai}</h3><p>{text.aiText}</p></div><div><Sprout size={25} strokeWidth={1.4} aria-hidden="true" /><span className="focus-number">02</span><h3>{text.sustainable}</h3><p>{text.sustainableText}</p></div><div><ChartNoAxesCombined size={25} strokeWidth={1.4} aria-hidden="true" /><span className="focus-number">03</span><h3>{text.business}</h3><p>{text.businessText}</p></div></div></section>
    <section className="next-section"><div className="section-title"><span className="eyebrow">{text.nextLabel}</span><h2>{text.nextHeading}</h2><p>{text.eventNote}</p></div><UpcomingCompetitionCard /></section>
    <section className="join-section glass-panel" id="join"><div><span className="eyebrow">{text.joinLabel}</span><h2>{text.joinHeading}</h2><p>{text.joinBody}</p></div><div className="join-action"><JoinActLink /><p>{text.onboarding}</p></div></section>
  </>;
}
