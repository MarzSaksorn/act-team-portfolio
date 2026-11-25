import { ArrowUpRight } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
import type { CompetitionRecord as RecordData } from '../types/content';
export default function CompetitionRecord({ record }: { record: RecordData }) {
  const { locale, text } = useLocale();
  return <article className="record-card glass-panel"><span className="record-year">{record.year}</span><div><h3>{record.name[locale]}</h3><p className="status-chip">{record.stage[locale]}</p><p><span className="detail-label">{text.participants}: </span>{record.participants.join(', ')}</p>{record.contribution && <p>{text.contribution}: {record.contribution[locale]}</p>}{record.evidenceUrl && <a className="text-link" href={record.evidenceUrl} target="_blank" rel="noopener noreferrer">{text.evidence}<ArrowUpRight size={15} aria-hidden="true" /></a>}</div></article>;
}
