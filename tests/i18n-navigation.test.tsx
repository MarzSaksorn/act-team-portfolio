import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

function mount() { return render(<MemoryRouter><App /></MemoryRouter>); }
it('startsInEnglishByDefault', () => {
  mount();
  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Competitions' })).toHaveAttribute('href', '/competitions');
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
});
it('switchesAllNavigationLabelsToThai', async () => {
  const user = userEvent.setup(); mount();
  await user.click(screen.getByRole('button', { name: 'ไทย' }));
  expect(screen.getByRole('link', { name: 'หน้าแรก' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'การแข่งขัน' })).toHaveAttribute('href', '/competitions');
  expect(screen.getByRole('link', { name: 'โปรเจกต์' })).toHaveAttribute('href', '/projects');
  expect(document.documentElement.lang).toBe('th');
});
it('persistsSelectedLocaleAcrossReloads', async () => {
  const user = userEvent.setup(); const first = mount();
  await user.click(screen.getByRole('button', { name: 'ไทย' }));
  expect(localStorage.getItem('act-locale')).toBe('th');
  first.unmount(); mount();
  expect(screen.getByRole('button', { name: 'ไทย' })).toHaveAttribute('aria-pressed', 'true');
});
it('fallsBackForUnsupportedStoredLocale', () => {
  localStorage.setItem('act-locale', 'xx'); mount();
  expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
});
it('keepsTheSelectorUsableWhenStorageIsDenied', async () => {
  const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
  try {
    mount(); await userEvent.setup().click(screen.getByRole('button', { name: 'ไทย' }));
    expect(screen.getByRole('link', { name: 'หน้าแรก' })).toBeInTheDocument();
  } finally { denied.mockRestore(); }
});
