import { Link } from 'react-router-dom';
import { ArrowUpRight, MoveUpRight, Shapes } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';
import { useSiteContent } from '../content/ContentContext';
import type { Project } from '../types/project';
import ProjectCard from '../components/ProjectCard';
import { usePageMeta } from '../hooks/usePageMeta';

type Props = { records?: Project[] };

export default function ProjectsPage({ records }: Props) {
  const { text } = useLocale();
  const content = useSiteContent();
  const projects = records ?? content.projects;
  usePageMeta(`${text.projects} | ACT — Avoonger Competition Team`, text.projectDescription);
  return <div className="inner-page"><header className="page-intro"><span className="eyebrow">{text.projectLabel}</span><h1>{text.projectTitle}</h1><p>{text.projectDescription}</p><MoveUpRight className="intro-arrow" size={66} strokeWidth={1} aria-hidden="true" /></header>{projects.length ? <div className="project-grid">{projects.map(project => <ProjectCard key={project.id} project={project} />)}</div> : <section className="project-empty glass-panel"><div className="empty-project-mark" aria-hidden="true"><Shapes size={62} strokeWidth={.9} /><span className="empty-ring" /></div><span className="eyebrow">ACT / 01</span><h2>{text.projectsEmpty}</h2><p>{text.projectsEmptyBody}</p><Link to="/competitions" className="text-link">{text.viewCompetitions}<ArrowUpRight size={18} aria-hidden="true" /></Link></section>}</div>;
}
