import { ArrowUpRight, MapPin } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
import { upcomingCompetition } from '../data/upcomingCompetition';

export default function UpcomingCompetitionCard() {
  const { text } = useLocale();
  return <div className="upcoming-card glass-panel"><div className="event-heading"><span className="status-chip"><span className="status-dot" aria-hidden="true" />{text.planned}</span><span className="event-season">2026 / 27</span></div><div className="event-body"><div className="event-monogram" aria-hidden="true">B<span>SD</span><ArrowUpRight size={30} strokeWidth={1} /></div><div><h3>{text.eventName}</h3><p className="event-location"><MapPin size={15} aria-hidden="true" />{text.eventBranch}</p><p className="event-date"><time dateTime={upcomingCompetition.startDate}>{text.eventDate}</time></p></div></div><div className="event-details"><div><span>{text.deadlineLabel}</span><time dateTime={upcomingCompetition.applicationDeadline}>{text.deadline}</time></div><div><span>{text.finalLabel}</span><p>{text.finalDate}</p></div></div><div className="event-bottom"><span>{text.notRegistered}</span><a href={upcomingCompetition.officialUrl} target="_blank" rel="noopener noreferrer">{text.officialEvent}<ArrowUpRight size={16} aria-hidden="true" /></a></div></div>;
}
