import { Flag, History, ArrowDownRight } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
import { useSiteContent } from '../content/ContentContext';
import type { CompetitionRecord } from '../types/content';
import CompetitionRecordCard from '../components/CompetitionRecord';
import { usePageMeta } from '../hooks/usePageMeta';

type Props = { founderRecords?: CompetitionRecord[]; teamRecords?: CompetitionRecord[] };

export default function CompetitionsPage({ founderRecords, teamRecords }: Props) {
  const { text } = useLocale();
  const { competitions } = useSiteContent();
  const actRecords = teamRecords ?? competitions.act;
  const preActRecords = founderRecords ?? competitions.founderPreAct;
  usePageMeta(`${text.competitions} | ACT — Avoonger Competition Team`, text.competitionDescription);
  return <div className="inner-page"><header className="page-intro"><span className="eyebrow">{text.competitionLabel}</span><h1>{text.competitionTitle}</h1><p>{text.competitionDescription}</p><ArrowDownRight className="intro-arrow" size={66} strokeWidth={1} aria-hidden="true" /></header>
    <section className="archive-section" aria-labelledby="act-history"><div className="section-heading"><span className="section-index">01</span><div><h2 id="act-history">{text.actHistory}</h2><p>{text.actHistorySub}</p></div></div>{actRecords.length ? actRecords.map(record => <CompetitionRecordCard key={record.id} record={record} />) : <div className="empty-record glass-panel"><Flag size={28} strokeWidth={1.3} aria-hidden="true" /><div><h3>{text.actEmpty}</h3><p>{text.actEmptyBody}</p></div><span className="empty-line" aria-hidden="true" /></div>}</section>
    <section className="archive-section" aria-labelledby="founder-history"><div className="section-heading"><span className="section-index">02</span><div><h2 id="founder-history">{text.founders}</h2><p>{text.foundersSub}</p></div></div>{preActRecords.length ? preActRecords.map(record => <CompetitionRecordCard key={record.id} record={record} />) : <div className="empty-record glass-panel"><History size={28} strokeWidth={1.3} aria-hidden="true" /><div><h3>{text.foundersEmpty}</h3><p>{text.foundersEmptyBody}</p></div><span className="empty-line" aria-hidden="true" /></div>}</section>
    <p className="archive-note">{text.historyNote}</p>
  </div>;
}
