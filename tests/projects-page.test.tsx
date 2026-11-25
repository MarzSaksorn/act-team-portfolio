import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import ProjectsPage from '../src/pages/ProjectsPage';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
function mount() { render(<MemoryRouter initialEntries={['/projects']}><App /></MemoryRouter>); }
it('projectsRouteRemainsVisibleWhenEmpty', () => {
  mount(); expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
  expect(screen.getByText('Our first chapter is still taking shape.')).toBeInTheDocument();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});
it('showsTranslatedEmptyState', () => {
  localStorage.setItem('act-locale', 'th'); mount();
  expect(screen.getByText('บทแรกของเรากำลังก่อตัว')).toBeInTheDocument();
});
it('rendersCardsOnlyForSuppliedProjects', () => {
  render(<MemoryRouter><LocaleProvider><ProjectsPage records={[{ id: 'fixture', title: { en: 'Example project', th: 'โปรเจกต์ทดสอบ' }, summary: { en: 'Supplied summary', th: 'คำอธิบายทดสอบ' }, status: 'in-progress' }]} /></LocaleProvider></MemoryRouter>);
  expect(screen.getByRole('article')).toHaveTextContent('Example project');
  expect(screen.getByText('In progress')).toBeInTheDocument();
  expect(screen.queryByText('Our first chapter is still taking shape.')).not.toBeInTheDocument();
});
