import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

it.each([
  ['rendersHomeRoute', '/', 'Avoonger Competition Team'],
  ['rendersCompetitionsRoute', '/competitions', 'Our competition journey'],
  ['rendersProjectsRoute', '/projects', 'Ideas into action'],
])('%s', (_name, path, heading) => {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
});
