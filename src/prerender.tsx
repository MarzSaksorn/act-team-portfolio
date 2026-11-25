import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import { messages } from './i18n/messages';

export const publicPages = [
  { route: '/', label: messages.en.home, description: messages.en.homeDescription },
  { route: '/competitions', label: messages.en.competitions, description: messages.en.competitionDescription },
  { route: '/projects', label: messages.en.projects, description: messages.en.projectDescription },
];

export function renderPage(route: string): string {
  return renderToString(<StaticRouter location={route}><App /></StaticRouter>);
}
