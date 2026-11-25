import { z } from 'zod';

const requiredTextSchema = z.string().trim().min(1).max(2_000);
const optionalTextSchema = z.string().trim().max(2_000);

export const localeSchema = z.enum(['en', 'th']);
export type Locale = z.infer<typeof localeSchema>;

export const localizedTextSchema = z.object({
  en: requiredTextSchema,
  th: requiredTextSchema,
}).strict();
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const siteCopyKeySchema = z.enum([
  'homeTitle',
  'homeDescription',
  'heroLabel',
  'heroLine1',
  'heroLine2',
  'heroBody',
  'forming',
  'teamBody',
  'teamCount',
  'teamCountValue',
  'teamStatus',
  'focusLabel',
  'focusHeading',
  'ai',
  'aiText',
  'sustainable',
  'sustainableText',
  'business',
  'businessText',
  'joinLabel',
  'joinHeading',
  'joinBody',
  'discord',
  'inviteSoon',
  'onboarding',
]);
export type SiteCopyKey = z.infer<typeof siteCopyKeySchema>;

export const editableSiteCopySchema = z.object({
  homeTitle: localizedTextSchema,
  homeDescription: localizedTextSchema,
  heroLabel: localizedTextSchema,
  heroLine1: localizedTextSchema,
  heroLine2: localizedTextSchema,
  heroBody: localizedTextSchema,
  forming: localizedTextSchema,
  teamBody: localizedTextSchema,
  teamCount: localizedTextSchema,
  teamCountValue: localizedTextSchema,
  teamStatus: localizedTextSchema,
  focusLabel: localizedTextSchema,
  focusHeading: localizedTextSchema,
  ai: localizedTextSchema,
  aiText: localizedTextSchema,
  sustainable: localizedTextSchema,
  sustainableText: localizedTextSchema,
  business: localizedTextSchema,
  businessText: localizedTextSchema,
  joinLabel: localizedTextSchema,
  joinHeading: localizedTextSchema,
  joinBody: localizedTextSchema,
  discord: localizedTextSchema,
  inviteSoon: localizedTextSchema,
  onboarding: localizedTextSchema,
}).strict();
export type EditableSiteCopy = z.infer<typeof editableSiteCopySchema>;

export const competitionAttributionSchema = z.enum(['founder-pre-act', 'act']);
export type CompetitionAttribution = z.infer<typeof competitionAttributionSchema>;

const participantSchema = z.string().trim().min(1).max(120);
const httpsUrlSchema = z.string().url().refine((value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'Must be an HTTPS URL.' });

export const competitionRecordSchema = z.object({
  id: z.string().uuid(),
  recordType: competitionAttributionSchema,
  name: localizedTextSchema,
  year: z.number().int().min(1900).max(2100),
  participants: z.array(participantSchema).max(50).default([]),
  stage: localizedTextSchema,
  contribution: localizedTextSchema.optional(),
  evidenceUrl: httpsUrlSchema.optional(),
}).strict();
export type CompetitionRecord = z.infer<typeof competitionRecordSchema>;

export const newCompetitionSchema = competitionRecordSchema.omit({ id: true });
export type NewCompetition = z.infer<typeof newCompetitionSchema>;

const contributionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: localizedTextSchema,
}).strict();

const projectLinkSchema = z.object({
  label: localizedTextSchema,
  url: httpsUrlSchema,
}).strict();

export const projectStatusSchema = z.enum(['planned', 'in-progress', 'completed']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = z.object({
  id: z.string().uuid(),
  title: localizedTextSchema,
  summary: localizedTextSchema,
  status: projectStatusSchema,
  problem: localizedTextSchema.optional(),
  businessModel: localizedTextSchema.optional(),
  contributions: z.array(contributionSchema).max(50).optional(),
  dates: optionalTextSchema.optional(),
  links: z.array(projectLinkSchema).max(50).optional(),
}).strict();
export type Project = z.infer<typeof projectSchema>;

export const newProjectSchema = projectSchema.omit({ id: true });
export type NewProject = z.infer<typeof newProjectSchema>;

export const eventStatusSchema = z.enum(['planned', 'confirmed', 'completed', 'postponed', 'cancelled']);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const registrationStatusSchema = z.enum(['not-registered', 'registered', 'registration-closed']);
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isCalendarDate, {
  message: 'Must be a real ISO calendar date.',
});

export const editableUpcomingCompetitionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: localizedTextSchema,
  branch: localizedTextSchema,
  note: localizedTextSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  applicationDeadline: isoDateSchema,
  finalStartDate: isoDateSchema,
  finalEndDate: isoDateSchema,
  status: eventStatusSchema,
  registration: registrationStatusSchema,
  officialUrl: httpsUrlSchema,
}).strict().superRefine((event, context) => {
  if (event.startDate > event.endDate) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'The event end must not precede its start.' });
  }
  if (event.applicationDeadline > event.startDate) {
    context.addIssue({ code: 'custom', path: ['applicationDeadline'], message: 'The application deadline must not follow the event start.' });
  }
  if (event.endDate > event.finalStartDate) {
    context.addIssue({ code: 'custom', path: ['finalStartDate'], message: 'The final round must not precede the first event.' });
  }
  if (event.finalStartDate > event.finalEndDate) {
    context.addIssue({ code: 'custom', path: ['finalEndDate'], message: 'The final round end must not precede its start.' });
  }
});
export type EditableUpcomingCompetition = z.infer<typeof editableUpcomingCompetitionSchema>;

export const siteContentSnapshotSchema = z.object({
  revision: z.number().int().nonnegative(),
  siteCopy: editableSiteCopySchema,
  upcomingCompetition: editableUpcomingCompetitionSchema,
  projects: z.array(projectSchema).max(100),
  competitions: z.object({
    founderPreAct: z.array(competitionRecordSchema.extend({ recordType: z.literal('founder-pre-act') })).max(100),
    act: z.array(competitionRecordSchema.extend({ recordType: z.literal('act') })).max(100),
  }).strict(),
}).strict();
export type SiteContentSnapshot = z.infer<typeof siteContentSnapshotSchema>;

export const projectListInputSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  sort: z.enum(['position', 'updatedAt']),
  order: z.enum(['asc', 'desc']),
}).strict();
export type ProjectListInput = z.infer<typeof projectListInputSchema>;

export const competitionListInputSchema = z.object({
  recordType: competitionAttributionSchema,
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  sort: z.enum(['position', 'year']),
  order: z.enum(['asc', 'desc']),
}).strict();
export type CompetitionListInput = z.infer<typeof competitionListInputSchema>;

export type Page<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    hasPrevious: boolean;
  };
  links: {
    first: string;
    previous: string | null;
    next: string | null;
    last: string;
  };
};

export type MutationResult<T> = { resource: T; revision: number };
