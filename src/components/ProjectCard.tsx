import { ArrowUpRight } from 'lucide-react';
import type { Project } from '../types/project';
import { useLocale } from '../i18n/LocaleProvider';
export default function ProjectCard({ project }: { project: Project }) {
  const { locale, text } = useLocale();
  const status = { planned: text.projectPlanned, 'in-progress': text.projectProgress, completed: text.projectCompleted };
  return <article className="project-card glass-panel"><span className="status-chip">{status[project.status]}</span><h2>{project.title[locale]}</h2><p>{project.summary[locale]}</p>{project.problem && <p><strong>{text.problem}: </strong>{project.problem[locale]}</p>}{project.businessModel && <p><strong>{text.businessModel}: </strong>{project.businessModel[locale]}</p>}{project.dates && <p>{project.dates}</p>}{project.contributions?.map(credit => <p key={credit.name}>{credit.name}: {credit.description[locale]}</p>)}{project.links?.map(link => <a className="text-link" key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label[locale]}<ArrowUpRight size={16} aria-hidden="true" /></a>)}</article>;
}
