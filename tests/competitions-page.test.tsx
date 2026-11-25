import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import CompetitionsPage from '../src/pages/CompetitionsPage';
import { LocaleProvider } from '../src/i18n/LocaleProvider';

function mount() { return render(<MemoryRouter initialEntries={['/competitions']}><App /></MemoryRouter>); }
it('separatesFounderHistoryFromActHistory', () => {
  mount();
  expect(screen.getByRole('region', { name: 'ACT competition record' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Founders before ACT' })).toBeInTheDocument();
});
it('showsFounderEmptyStateWhenNoRecordsExist', () => { mount(); expect(screen.getByText('Before ACT, there was curiosity.')).toBeInTheDocument(); });
it('showsActEmptyStateWhenNoEntriesExist', () => { mount(); expect(screen.getByText('Our team record starts here.')).toBeInTheDocument(); });
it('doesNotRenderUnverifiedClaims', () => {
  mount(); expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(screen.queryByText(/winner|champion|finalist/i)).not.toBeInTheDocument();
});
it('showsThaiEmptyStates', () => {
  localStorage.setItem('act-locale', 'th'); mount();
  expect(screen.getByText('ก่อนมี ACT เราเริ่มจากความอยากรู้')).toBeInTheDocument();
  expect(screen.getByText('บันทึกของทีมเริ่มต้นที่นี่')).toBeInTheDocument();
});
it('creditsSuppliedFounderEntryOnlyToFounderSection', () => {
  render(<MemoryRouter><LocaleProvider><CompetitionsPage founderRecords={[{
    id: 'fixture', recordType: 'founder-pre-act', name: { en: 'Test event', th: 'งานทดสอบ' }, year: 2023,
    participants: ['Example Founder'], stage: { en: 'Participated', th: 'เข้าร่วม' },
  }]} /></LocaleProvider></MemoryRouter>);
  const founders = screen.getByRole('region', { name: 'Founders before ACT' });
  expect(within(founders).getByText('Example Founder')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'ACT competition record' })).queryByText('Test event')).not.toBeInTheDocument();
});
