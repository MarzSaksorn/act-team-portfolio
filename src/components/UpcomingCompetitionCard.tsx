import { ArrowUpRight, MapPin } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
import { useSiteContent } from '../content/ContentContext';
import type { EventStatus, RegistrationStatus } from '../types/site-content';

function formatDateRange(startDate: string, endDate: string, locale: 'en' | 'th'): string {
  const tag = locale === 'th' ? 'th-TH-u-ca-buddhist' : 'en-GB';
  const formatter = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return formatter.formatRange(start, end).replace(/\s*–\s*/u, '–');
}

export default function UpcomingCompetitionCard() {
  const { locale, text } = useLocale();
  const { upcomingCompetition: event } = useSiteContent();
  const eventStatuses: Record<EventStatus, string> = {
    planned: text.planned,
    confirmed: text.eventConfirmed,
    completed: text.eventCompleted,
    postponed: text.eventPostponed,
    cancelled: text.eventCancelled,
  };
  const registrationStatuses: Record<RegistrationStatus, string> = {
    'not-registered': text.notRegistered,
    registered: text.registered,
    'registration-closed': text.registrationClosed,
  };
  const seasonYear = new Intl.DateTimeFormat(locale === 'th' ? 'th-TH-u-ca-buddhist' : 'en', {
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${event.startDate}T00:00:00.000Z`));

  return <div className="upcoming-card glass-panel"><div className="event-heading"><span className="status-chip"><span className="status-dot" aria-hidden="true" />{eventStatuses[event.status]}</span><span className="event-season">{seasonYear}</span></div><div className="event-body"><div className="event-monogram" aria-hidden="true">B<span>SD</span><ArrowUpRight size={30} strokeWidth={1} /></div><div><h3>{event.name[locale]}</h3><p className="event-location"><MapPin size={15} aria-hidden="true" />{event.branch[locale]}</p><p className="event-date"><time dateTime={event.startDate}>{formatDateRange(event.startDate, event.endDate, locale)}</time></p></div></div><div className="event-details"><div><span>{text.deadlineLabel}</span><time dateTime={event.applicationDeadline}>{formatDateRange(event.applicationDeadline, event.applicationDeadline, locale)}</time></div><div><span>{text.finalLabel}</span><time dateTime={event.finalStartDate}>{formatDateRange(event.finalStartDate, event.finalEndDate, locale)}</time></div></div><div className="event-bottom"><span>{registrationStatuses[event.registration]}</span><a href={event.officialUrl} target="_blank" rel="noopener noreferrer">{text.officialEvent}<ArrowUpRight size={16} aria-hidden="true" /></a></div></div>;
}
