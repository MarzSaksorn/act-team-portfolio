import { Flag, History, ArrowDownRight } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
import { founderHistory, actHistory } from '../data/competitions';
import type { CompetitionRecord as RecordData } from '../types/content';
import CompetitionRecord from '../components/CompetitionRecord';
import { usePageMeta } from '../hooks/usePageMeta';

type Props = { founderRecords?: RecordData[]; teamRecords?: RecordData[] };
export default function CompetitionsPage({ founderRecords = founderHistory, teamRecords = actHistory }: Props) {
  const { text } = useLocale();
  usePageMeta(`${text.competitions} | ACT — Avoonger Competition Team`, text.competitionDescription);
  return <div className="inner-page"><header className="page-intro"><span className="eyebrow">{text.competitionLabel}</span><h1>{text.competitionTitle}</h1><p>{text.competitionDescription}</p><ArrowDownRight className="intro-arrow" size={66} strokeWidth={1} aria-hidden="true" /></header>
    <section className="archive-section" aria-labelledby="act-history"><div className="section-heading"><span className="section-index">01</span><div><h2 id="act-history">{text.actHistory}</h2><p>{text.actHistorySub}</p></div></div>{teamRecords.filter(r => r.recordType === 'act').length ? teamRecords.filter(r => r.recordType === 'act').map(record => <CompetitionRecord key={record.id} record={record} />) : <div className="empty-record glass-panel"><Flag size={28} strokeWidth={1.3} aria-hidden="true" /><div><h3>{text.actEmpty}</h3><p>{text.actEmptyBody}</p></div><span className="empty-line" aria-hidden="true" /></div>}</section>
    <section className="archive-section" aria-labelledby="founder-history"><div className="section-heading"><span className="section-index">02</span><div><h2 id="founder-history">{text.founders}</h2><p>{text.foundersSub}</p></div></div>{founderRecords.filter(r => r.recordType === 'founder-pre-act').length ? founderRecords.filter(r => r.recordType === 'founder-pre-act').map(record => <CompetitionRecord key={record.id} record={record} />) : <div className="empty-record glass-panel"><History size={28} strokeWidth={1.3} aria-hidden="true" /><div><h3>{text.foundersEmpty}</h3><p>{text.foundersEmptyBody}</p></div><span className="empty-line" aria-hidden="true" /></div>}</section>
    <p className="archive-note">{text.historyNote}</p>
  </div>;
}
