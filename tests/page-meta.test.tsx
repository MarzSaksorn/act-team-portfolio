import { beforeEach, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

beforeEach(() => {
  document.title = 'Old page';
  document.querySelector('meta[name="description"]')?.remove();
});

const cases = [
  { route: '/', english: 'Home', thai: 'หน้าแรก', englishDescription: 'sustainable technology', thaiDescription: 'เทคโนโลยียั่งยืน' },
  { route: '/competitions', english: 'Competitions', thai: 'การแข่งขัน', englishDescription: 'experiences', thaiDescription: 'ประสบการณ์' },
  { route: '/projects', english: 'Projects', thai: 'โปรเจกต์', englishDescription: 'Our work', thaiDescription: 'ผลงาน' },
];

for (const page of cases) {
  it(`setsLocalizedTitleAndDescriptionPerRoute ${page.route}`, async () => {
    render(<MemoryRouter initialEntries={[page.route]}><App /></MemoryRouter>);
    expect(document.title).toBe(`${page.english} | ACT — Avoonger Competition Team`);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(page.englishDescription);
    await userEvent.setup().click(screen.getByRole('button', { name: 'ไทย' }));
    expect(document.title).toBe(`${page.thai} | ACT — Avoonger Competition Team`);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(page.thaiDescription);
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });
}

it('updatesDocumentLanguageAttribute', async () => {
  render(<MemoryRouter><App /></MemoryRouter>);
  expect(document.documentElement.lang).toBe('en');
  await userEvent.setup().click(screen.getByRole('button', { name: 'ไทย' }));
  expect(document.documentElement.lang).toBe('th');
});

it('replacesStaleMetadataWhenNavigatingBetweenPages', async () => {
  render(<MemoryRouter><App /></MemoryRouter>);
  await userEvent.setup().click(screen.getByRole('link', { name: 'Projects' }));
  expect(document.title).toBe('Projects | ACT — Avoonger Competition Team');
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('Our work');
});

it('doesNotKeepPortfolioMetadataOnAnUnknownRoute', () => {
  render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>);
  expect(document.title).toContain('This page isn’t in our portfolio.');
});
