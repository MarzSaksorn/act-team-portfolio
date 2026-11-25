import { messages, type Messages } from '../i18n/messages';
import type { LocalizedText, SiteContentSnapshot } from '../types/site-content';

function localize(key: keyof Messages): LocalizedText {
  return { en: messages.en[key], th: messages.th[key] };
}

export const defaultSiteContent = {
  revision: 0,
  siteCopy: {
    homeTitle: localize('homeTitle'),
    homeDescription: localize('homeDescription'),
    heroLabel: localize('heroLabel'),
    heroLine1: localize('heroLine1'),
    heroLine2: localize('heroLine2'),
    heroBody: localize('heroBody'),
    forming: localize('forming'),
    teamBody: localize('teamBody'),
    teamCount: localize('teamCount'),
    teamCountValue: localize('teamCountValue'),
    teamStatus: localize('teamStatus'),
    focusLabel: localize('focusLabel'),
    focusHeading: localize('focusHeading'),
    ai: localize('ai'),
    aiText: localize('aiText'),
    sustainable: localize('sustainable'),
    sustainableText: localize('sustainableText'),
    business: localize('business'),
    businessText: localize('businessText'),
    joinLabel: localize('joinLabel'),
    joinHeading: localize('joinHeading'),
    joinBody: localize('joinBody'),
    discord: localize('discord'),
    inviteSoon: localize('inviteSoon'),
    onboarding: localize('onboarding'),
  },
  upcomingCompetition: {
    id: 'bsd-saraburi-2027',
    name: localize('eventName'),
    branch: localize('eventBranch'),
    note: localize('eventNote'),
    startDate: '2027-01-16',
    endDate: '2027-01-17',
    applicationDeadline: '2027-01-10',
    finalStartDate: '2027-01-23',
    finalEndDate: '2027-01-24',
    status: 'planned',
    registration: 'not-registered',
    officialUrl: 'https://futurecenter.ai/hackathon#talk',
  },
  projects: [],
  competitions: {
    founderPreAct: [],
    act: [],
  },
} satisfies SiteContentSnapshot;
