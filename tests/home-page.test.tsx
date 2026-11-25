import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

function mount() { return render(<MemoryRouter><App /></MemoryRouter>); }
afterEach(() => { vi.unstubAllEnvs(); });
it('showsActIntroductionAndFocus', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Artificial intelligence' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sustainable technology' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Business thinking' })).toBeInTheDocument();
});
it('labelsBsdAsPlannedNotRegistered', () => {
  mount(); expect(screen.getByText('Planning to apply')).toBeInTheDocument(); expect(screen.getByText('Not yet registered')).toBeInTheDocument();
});
it('rendersBsdDatesAndDeadline', () => {
  mount(); expect(screen.getByText('16–17 Jan 2027')).toBeInTheDocument(); expect(screen.getByText('10 Jan 2027')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Official event details' })).toHaveAttribute('href', 'https://futurecenter.ai/hackathon#talk');
});
it('omitsBrokenDiscordAnchorWhenInviteMissing', () => {
  vi.stubEnv('VITE_DISCORD_INVITE_URL', ''); mount();
  expect(screen.getByText('Discord invite coming soon')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Join ACT on Discord' })).not.toBeInTheDocument();
});
it('usesProvidedDiscordInviteWhenAvailable', () => {
  vi.stubEnv('VITE_DISCORD_INVITE_URL', 'https://discord.gg/act-test'); mount();
  expect(screen.getByRole('link', { name: 'Join ACT on Discord' })).toHaveAttribute('href', 'https://discord.gg/act-test');
});
it.each(['javascript:alert(1)', 'https://example.com/invite', 'https://discord.gg.evil.example/x'])('rejectsUnsafeOrNonDiscordInvite %s', invite => {
  vi.stubEnv('VITE_DISCORD_INVITE_URL', invite); mount();
  expect(screen.queryByRole('link', { name: 'Join ACT on Discord' })).not.toBeInTheDocument();
});
it('showsThaiEventAndOnboardingCopy', () => {
  localStorage.setItem('act-locale', 'th'); mount();
  expect(screen.getByText('ยังไม่ได้สมัคร')).toBeInTheDocument();
  expect(screen.getByText('16–17 ม.ค. 2570')).toBeInTheDocument();
});
