import type { Locale } from '../i18n/messages';
export type LocalizedText = Record<Locale, string>;
type CompetitionFields = {
  id: string; name: LocalizedText; year: number; participants: string[];
  stage: LocalizedText; contribution?: LocalizedText; evidenceUrl?: string;
};
export type CompetitionRecord = CompetitionFields & ({ recordType: 'founder-pre-act' } | { recordType: 'act' });
