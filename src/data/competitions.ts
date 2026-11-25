import { defaultSiteContent } from './defaultSiteContent';
import type { CompetitionRecord } from '../types/content';
// Add only ACT-supplied, member-approved records. Founders' pre-ACT experience is separate.
export const founderHistory: CompetitionRecord[] = defaultSiteContent.competitions.founderPreAct;
export const actHistory: CompetitionRecord[] = defaultSiteContent.competitions.act;
