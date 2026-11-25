import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { z } from 'zod';
import {
  competitionAttributionSchema,
  competitionListInputSchema,
  competitionRecordSchema,
  editableSiteCopySchema,
  editableUpcomingCompetitionSchema,
  localeSchema,
  newCompetitionSchema,
  newProjectSchema,
  projectListInputSchema,
  projectSchema,
  siteContentSnapshotSchema,
  siteCopyKeySchema,
  type CompetitionAttribution,
  type CompetitionListInput,
  type CompetitionRecord,
  type EditableSiteCopy,
  type EditableUpcomingCompetition,
  type Locale,
  type MutationResult,
  type NewCompetition,
  type NewProject,
  type Page,
  type Project,
  type ProjectListInput,
  type SiteContentSnapshot,
} from '../../src/types/site-content';

export class ContentRevisionConflictError extends Error {
  constructor(readonly expected: number, readonly actual: number) {
    super(`Content revision changed from ${expected} to ${actual}.`);
    this.name = 'ContentRevisionConflictError';
  }
}

export class ContentNotFoundError extends Error {
  constructor(readonly resource: string) {
    super(`${resource} was not found.`);
    this.name = 'ContentNotFoundError';
  }
}

export class ContentLimitError extends Error {
  constructor(readonly resource: string) {
    super(`The maximum number of ${resource} has been reached.`);
    this.name = 'ContentLimitError';
  }
}

const locales: Locale[] = ['en', 'th'];

const revisionRowSchema = z.object({ revision: z.number().int().nonnegative() }).strict();
const countRowSchema = z.object({ count: z.number().int().nonnegative() }).strict();
const contentCopyRowSchema = z.object({
  content_key: siteCopyKeySchema,
  locale: localeSchema,
  value: z.string(),
}).strict();
const eventRowSchema = z.object({
  id: z.string(),
  status: editableUpcomingCompetitionSchema.shape.status,
  registration: editableUpcomingCompetitionSchema.shape.registration,
  start_date: z.string(),
  end_date: z.string(),
  application_deadline: z.string(),
  final_start_date: z.string(),
  final_end_date: z.string(),
  official_url: z.string(),
}).strict();
const eventTranslationRowSchema = z.object({ locale: localeSchema, name: z.string(), branch: z.string(), note: z.string() }).strict();
const projectRowSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  status: projectSchema.shape.status,
  dates: z.string().nullable(),
  updated_at: z.string(),
}).strict();
const projectTranslationRowSchema = z.object({
  project_id: z.string().uuid(),
  locale: localeSchema,
  title: z.string(),
  summary: z.string(),
  problem: z.string().nullable(),
  business_model: z.string().nullable(),
}).strict();
const contributionRowSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  name: z.string(),
  locale: localeSchema,
  description: z.string(),
}).strict();
const projectLinkRowSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  url: z.string(),
  locale: localeSchema,
  label: z.string(),
}).strict();
const competitionRowSchema = z.object({
  id: z.string().uuid(),
  record_type: competitionAttributionSchema,
  year: z.number().int(),
  position: z.number().int().nonnegative(),
  evidence_url: z.string().nullable(),
}).strict();
const competitionTranslationRowSchema = z.object({
  competition_id: z.string().uuid(),
  locale: localeSchema,
  name: z.string(),
  stage: z.string(),
  contribution: z.string().nullable(),
}).strict();
const participantRowSchema = z.object({
  competition_id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  name: z.string(),
}).strict();
const projectPositionRowSchema = z.object({ position: z.number().int().nonnegative() }).strict();
const competitionPositionRowSchema = z.object({
  position: z.number().int().nonnegative(),
  record_type: competitionAttributionSchema,
}).strict();

type ProjectRow = z.infer<typeof projectRowSchema>;
type ProjectTranslationRow = z.infer<typeof projectTranslationRowSchema>;
type ContributionBuilder = {
  id: string;
  position: number;
  name: string;
  descriptions: Partial<Record<Locale, string>>;
};
type ProjectLinkBuilder = {
  id: string;
  position: number;
  url: string;
  labels: Partial<Record<Locale, string>>;
};
type ProjectBuilder = {
  row: ProjectRow;
  translations: Partial<Record<Locale, ProjectTranslationRow>>;
  contributions: Map<string, ContributionBuilder>;
  links: Map<string, ProjectLinkBuilder>;
};
type ProjectEntry = { resource: Project; position: number; updatedAt: string };
type CompetitionBuilder = {
  row: z.infer<typeof competitionRowSchema>;
  translations: Partial<Record<Locale, z.infer<typeof competitionTranslationRowSchema>>>;
  participants: Array<{ position: number; name: string }>;
};
type CompetitionEntry = { resource: CompetitionRecord; position: number };

function readRevision(db: Database.Database): number {
  const row = db.prepare('SELECT revision FROM content_state WHERE singleton_id = 1').get();
  if (!row) throw new Error('The content state has not been seeded.');
  return revisionRowSchema.parse(row).revision;
}

function readSiteCopy(db: Database.Database): EditableSiteCopy {
  const grouped: Record<string, Partial<Record<Locale, string>>> = {};
  const rows = db.prepare('SELECT content_key, locale, value FROM site_copy ORDER BY content_key, locale').all();
  for (const untrustedRow of rows) {
    const row = contentCopyRowSchema.parse(untrustedRow);
    const pair = grouped[row.content_key] ?? {};
    pair[row.locale] = row.value;
    grouped[row.content_key] = pair;
  }
  return editableSiteCopySchema.parse(grouped);
}

function localizedText(en: string | undefined, th: string | undefined): { en: string; th: string } {
  return editableSiteCopySchema.shape.heroBody.parse({ en, th });
}

function readUpcomingCompetition(db: Database.Database): EditableUpcomingCompetition {
  const untrustedEvent = db.prepare(`
    SELECT id, status, registration, start_date, end_date, application_deadline,
      final_start_date, final_end_date, official_url
    FROM upcoming_competitions WHERE singleton_id = 1
  `).get();
  if (!untrustedEvent) throw new Error('The upcoming competition has not been seeded.');
  const event = eventRowSchema.parse(untrustedEvent);
  const translations = db.prepare(`
    SELECT locale, name, branch, note FROM upcoming_competition_translations
    WHERE singleton_id = 1 ORDER BY locale
  `).all().map((row) => eventTranslationRowSchema.parse(row));
  const en = translations.find((translation) => translation.locale === 'en');
  const th = translations.find((translation) => translation.locale === 'th');

  return editableUpcomingCompetitionSchema.parse({
    id: event.id,
    name: localizedText(en?.name, th?.name),
    branch: localizedText(en?.branch, th?.branch),
    note: localizedText(en?.note, th?.note),
    startDate: event.start_date,
    endDate: event.end_date,
    applicationDeadline: event.application_deadline,
    finalStartDate: event.final_start_date,
    finalEndDate: event.final_end_date,
    status: event.status,
    registration: event.registration,
    officialUrl: event.official_url,
  });
}

function localizedNullableText(en: string | null, th: string | null): { en: string; th: string } | undefined {
  if (en === null && th === null) return undefined;
  return localizedText(en ?? undefined, th ?? undefined);
}

function readProjects(db: Database.Database): ProjectEntry[] {
  const untrustedRows = db.prepare(`
    SELECT id, position, status, dates, updated_at FROM projects ORDER BY position, id
  `).all();
  const builders = new Map<string, ProjectBuilder>();
  for (const untrustedRow of untrustedRows) {
    const row = projectRowSchema.parse(untrustedRow);
    builders.set(row.id, { row, translations: {}, contributions: new Map(), links: new Map() });
  }

  const translationRows = db.prepare(`
    SELECT project_id, locale, title, summary, problem, business_model
    FROM project_translations ORDER BY project_id, locale
  `).all().map((row) => projectTranslationRowSchema.parse(row));
  for (const row of translationRows) {
    const builder = builders.get(row.project_id);
    if (!builder) throw new Error('A project translation has no parent project.');
    builder.translations[row.locale] = row;
  }

  const contributionRows = db.prepare(`
    SELECT c.id, c.project_id, c.position, c.name, t.locale, t.description
    FROM project_contributions c
    JOIN project_contribution_translations t ON t.contribution_id = c.id
    ORDER BY c.project_id, c.position, t.locale
  `).all().map((row) => contributionRowSchema.parse(row));
  for (const row of contributionRows) {
    const projectBuilder = builders.get(row.project_id);
    if (!projectBuilder) throw new Error('A project contribution has no parent project.');
    const contribution = projectBuilder.contributions.get(row.id) ?? {
      id: row.id,
      position: row.position,
      name: row.name,
      descriptions: {},
    };
    contribution.descriptions[row.locale] = row.description;
    projectBuilder.contributions.set(row.id, contribution);
  }

  const linkRows = db.prepare(`
    SELECT l.id, l.project_id, l.position, l.url, t.locale, t.label
    FROM project_links l
    JOIN project_link_translations t ON t.link_id = l.id
    ORDER BY l.project_id, l.position, t.locale
  `).all().map((row) => projectLinkRowSchema.parse(row));
  for (const row of linkRows) {
    const projectBuilder = builders.get(row.project_id);
    if (!projectBuilder) throw new Error('A project link has no parent project.');
    const link = projectBuilder.links.get(row.id) ?? {
      id: row.id,
      position: row.position,
      url: row.url,
      labels: {},
    };
    link.labels[row.locale] = row.label;
    projectBuilder.links.set(row.id, link);
  }

  return Array.from(builders.values(), (builder) => {
    const en = builder.translations.en;
    const th = builder.translations.th;
    const project = projectSchema.parse({
      id: builder.row.id,
      title: localizedText(en?.title, th?.title),
      summary: localizedText(en?.summary, th?.summary),
      status: builder.row.status,
      ...(en?.problem !== null || th?.problem !== null
        ? { problem: localizedNullableText(en?.problem ?? null, th?.problem ?? null) }
        : {}),
      ...(en?.business_model !== null || th?.business_model !== null
        ? { businessModel: localizedNullableText(en?.business_model ?? null, th?.business_model ?? null) }
        : {}),
      contributions: Array.from(builder.contributions.values())
        .sort((left, right) => left.position - right.position)
        .map((contribution) => ({
          name: contribution.name,
          description: localizedText(contribution.descriptions.en, contribution.descriptions.th),
        })),
      ...(builder.row.dates === null ? {} : { dates: builder.row.dates }),
      links: Array.from(builder.links.values())
        .sort((left, right) => left.position - right.position)
        .map((link) => ({ label: localizedText(link.labels.en, link.labels.th), url: link.url })),
    });
    return { resource: project, position: builder.row.position, updatedAt: builder.row.updated_at };
  });
}

function readCompetitions(db: Database.Database): CompetitionEntry[] {
  const untrustedRows = db.prepare(`
    SELECT id, record_type, year, position, evidence_url FROM competitions ORDER BY position, id
  `).all();
  const builders = new Map<string, CompetitionBuilder>();
  for (const untrustedRow of untrustedRows) {
    const row = competitionRowSchema.parse(untrustedRow);
    builders.set(row.id, { row, translations: {}, participants: [] });
  }

  const translationRows = db.prepare(`
    SELECT competition_id, locale, name, stage, contribution
    FROM competition_translations ORDER BY competition_id, locale
  `).all().map((row) => competitionTranslationRowSchema.parse(row));
  for (const row of translationRows) {
    const builder = builders.get(row.competition_id);
    if (!builder) throw new Error('A competition translation has no parent record.');
    builder.translations[row.locale] = row;
  }

  const participantRows = db.prepare(`
    SELECT competition_id, position, name FROM competition_participants ORDER BY competition_id, position
  `).all().map((row) => participantRowSchema.parse(row));
  for (const row of participantRows) {
    const builder = builders.get(row.competition_id);
    if (!builder) throw new Error('A competition participant has no parent record.');
    builder.participants.push({ position: row.position, name: row.name });
  }

  return Array.from(builders.values(), (builder) => {
    const en = builder.translations.en;
    const th = builder.translations.th;
    const resource = competitionRecordSchema.parse({
      id: builder.row.id,
      recordType: builder.row.record_type,
      name: localizedText(en?.name, th?.name),
      year: builder.row.year,
      participants: builder.participants.sort((left, right) => left.position - right.position).map((item) => item.name),
      stage: localizedText(en?.stage, th?.stage),
      ...(en?.contribution !== null || th?.contribution !== null
        ? { contribution: localizedNullableText(en?.contribution ?? null, th?.contribution ?? null) }
        : {}),
      ...(builder.row.evidence_url === null ? {} : { evidenceUrl: builder.row.evidence_url }),
    });
    return { resource, position: builder.row.position };
  });
}

function readSnapshot(db: Database.Database): SiteContentSnapshot {
  const competitions = readCompetitions(db);
  return siteContentSnapshotSchema.parse({
    revision: readRevision(db),
    siteCopy: readSiteCopy(db),
    upcomingCompetition: readUpcomingCompetition(db),
    projects: readProjects(db).map((entry) => entry.resource),
    competitions: {
      founderPreAct: competitions.filter((entry) => entry.resource.recordType === 'founder-pre-act').map((entry) => entry.resource),
      act: competitions.filter((entry) => entry.resource.recordType === 'act').map((entry) => entry.resource),
    },
  });
}

function currentRevisionOrConflict(db: Database.Database, expectedRevision: number): number {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new RangeError('Expected content revision must be a non-negative safe integer.');
  }
  const actual = readRevision(db);
  if (actual !== expectedRevision) throw new ContentRevisionConflictError(expectedRevision, actual);
  return actual;
}

function mutate<T>(
  db: Database.Database,
  expectedRevision: number,
  write: () => T,
): MutationResult<T> {
  const transaction = db.transaction(() => {
    const current = currentRevisionOrConflict(db, expectedRevision);
    const resource = write();
    const revision = current + 1;
    db.prepare(`
      UPDATE content_state SET revision = ?, updated_at = ? WHERE singleton_id = 1
    `).run(revision, new Date().toISOString());
    return { resource, revision };
  });
  return transaction.immediate();
}

function writeLocalizedCopy(db: Database.Database, copy: EditableSiteCopy): void {
  db.prepare('DELETE FROM site_copy').run();
  const insert = db.prepare('INSERT INTO site_copy (content_key, locale, value) VALUES (?, ?, ?)');
  for (const [untrustedKey, translations] of Object.entries(copy)) {
    const contentKey = siteCopyKeySchema.parse(untrustedKey);
    for (const locale of locales) insert.run(contentKey, locale, translations[locale]);
  }
}

function insertProject(db: Database.Database, project: Project, position: number, now: string): void {
  db.prepare(`
    INSERT INTO projects (id, position, status, dates, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(project.id, position, project.status, project.dates ?? null, now, now);
  const insertTranslation = db.prepare(`
    INSERT INTO project_translations (project_id, locale, title, summary, problem, business_model)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const locale of locales) {
    insertTranslation.run(
      project.id,
      locale,
      project.title[locale],
      project.summary[locale],
      project.problem?.[locale] ?? null,
      project.businessModel?.[locale] ?? null,
    );
  }

  const insertContribution = db.prepare(`
    INSERT INTO project_contributions (id, project_id, position, name) VALUES (?, ?, ?, ?)
  `);
  const insertContributionText = db.prepare(`
    INSERT INTO project_contribution_translations (contribution_id, locale, description) VALUES (?, ?, ?)
  `);
  (project.contributions ?? []).forEach((contribution, positionIndex) => {
    const contributionId = randomUUID();
    insertContribution.run(contributionId, project.id, positionIndex, contribution.name);
    for (const locale of locales) {
      insertContributionText.run(contributionId, locale, contribution.description[locale]);
    }
  });

  const insertLink = db.prepare('INSERT INTO project_links (id, project_id, position, url) VALUES (?, ?, ?, ?)');
  const insertLinkText = db.prepare('INSERT INTO project_link_translations (link_id, locale, label) VALUES (?, ?, ?)');
  (project.links ?? []).forEach((link, positionIndex) => {
    const linkId = randomUUID();
    insertLink.run(linkId, project.id, positionIndex, link.url);
    for (const locale of locales) insertLinkText.run(linkId, locale, link.label[locale]);
  });
}

function nextProjectPosition(db: Database.Database): number {
  const row = db.prepare('SELECT COALESCE(MAX(position) + 1, 0) AS position FROM projects').get();
  if (!row) throw new Error('Could not determine the next project position.');
  return projectPositionRowSchema.parse(row).position;
}

function insertCompetition(db: Database.Database, competition: CompetitionRecord, position: number, now: string): void {
  db.prepare(`
    INSERT INTO competitions (id, record_type, year, position, evidence_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(competition.id, competition.recordType, competition.year, position, competition.evidenceUrl ?? null, now);
  const insertTranslation = db.prepare(`
    INSERT INTO competition_translations (competition_id, locale, name, stage, contribution)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const locale of locales) {
    insertTranslation.run(
      competition.id,
      locale,
      competition.name[locale],
      competition.stage[locale],
      competition.contribution?.[locale] ?? null,
    );
  }
  const insertParticipant = db.prepare(`
    INSERT INTO competition_participants (competition_id, position, name) VALUES (?, ?, ?)
  `);
  competition.participants.forEach((participant, positionIndex) => {
    insertParticipant.run(competition.id, positionIndex, participant);
  });
}

function nextCompetitionPosition(db: Database.Database, recordType: CompetitionAttribution): number {
  const row = db.prepare(`
    SELECT COALESCE(MAX(position) + 1, 0) AS position FROM competitions WHERE record_type = ?
  `).get(recordType);
  if (!row) throw new Error('Could not determine the next competition position.');
  return projectPositionRowSchema.parse(row).position;
}

function countRecords(db: Database.Database, table: 'projects' | 'competitions', recordType?: CompetitionAttribution): number {
  const row = table === 'projects'
    ? db.prepare('SELECT count(*) AS count FROM projects').get()
    : db.prepare('SELECT count(*) AS count FROM competitions WHERE record_type = ?').get(recordType);
  if (!row) throw new Error('Could not count content records.');
  return countRowSchema.parse(row).count;
}

function localizedPair(en: string | undefined, th: string | undefined): { en: string; th: string } {
  return editableSiteCopySchema.shape.heroBody.parse({ en, th });
}

function eventTranslations(db: Database.Database, event: EditableUpcomingCompetition): void {
  db.prepare('DELETE FROM upcoming_competition_translations WHERE singleton_id = 1').run();
  const insert = db.prepare(`
    INSERT INTO upcoming_competition_translations (singleton_id, locale, name, branch, note)
    VALUES (1, ?, ?, ?, ?)
  `);
  for (const locale of locales) insert.run(locale, event.name[locale], event.branch[locale], event.note[locale]);
}

function sortProjects(entries: ProjectEntry[], input: ProjectListInput): Project[] {
  const sorted = [...entries].sort((left, right) => {
    const compared = input.sort === 'position'
      ? left.position - right.position
      : left.updatedAt.localeCompare(right.updatedAt);
    return (input.order === 'asc' ? compared : -compared) || left.resource.id.localeCompare(right.resource.id);
  });
  return sorted.map((entry) => entry.resource);
}

function sortCompetitions(entries: CompetitionEntry[], input: CompetitionListInput): CompetitionRecord[] {
  const sorted = [...entries].sort((left, right) => {
    const compared = input.sort === 'position'
      ? left.position - right.position
      : left.resource.year - right.resource.year;
    return (input.order === 'asc' ? compared : -compared) || left.resource.id.localeCompare(right.resource.id);
  });
  return sorted.map((entry) => entry.resource);
}

function pageLink(path: string, page: number, limit: number, values: Record<string, string>): string {
  const query = new URLSearchParams({ ...values, page: String(page), limit: String(limit) });
  return `${path}?${query.toString()}`;
}

function createPage<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  path: string,
  values: Record<string, string>,
): Page<T> {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError('Page must be positive and limit must be between 1 and 100.');
  }
  const lastPage = Math.max(1, Math.ceil(total / limit));
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      hasMore: page * limit < total,
      hasPrevious: page > 1,
    },
    links: {
      first: pageLink(path, 1, limit, values),
      previous: page > 1 ? pageLink(path, page - 1, limit, values) : null,
      next: page < lastPage ? pageLink(path, page + 1, limit, values) : null,
      last: pageLink(path, lastPage, limit, values),
    },
  };
}

export function loadContent(db: Database.Database): SiteContentSnapshot {
  const read = db.transaction(() => readSnapshot(db));
  return read();
}

export function listProjects(
  db: Database.Database,
  input: ProjectListInput,
): Page<Project> {
  const validated = projectListInputSchema.parse(input);
  const entries = readProjects(db);
  const sorted = sortProjects(entries, validated);
  const offset = (validated.page - 1) * validated.limit;
  const data = sorted.slice(offset, offset + validated.limit);
  return createPage(data, entries.length, validated.page, validated.limit, '/api/v1/admin/projects', {
    sort: validated.sort,
    order: validated.order,
  });
}

export function listCompetitions(
  db: Database.Database,
  input: CompetitionListInput,
): Page<CompetitionRecord> {
  const validated = competitionListInputSchema.parse(input);
  const entries = readCompetitions(db).filter((entry) => entry.resource.recordType === validated.recordType);
  const sorted = sortCompetitions(entries, validated);
  const offset = (validated.page - 1) * validated.limit;
  const data = sorted.slice(offset, offset + validated.limit);
  return createPage(data, entries.length, validated.page, validated.limit, '/api/v1/admin/competitions', {
    recordType: validated.recordType,
    sort: validated.sort,
    order: validated.order,
  });
}

export function updateSiteCopy(
  db: Database.Database,
  untrustedCopy: EditableSiteCopy,
  expectedRevision: number,
): MutationResult<EditableSiteCopy> {
  const copy = editableSiteCopySchema.parse(untrustedCopy);
  return mutate(db, expectedRevision, () => {
    writeLocalizedCopy(db, copy);
    return copy;
  });
}

export function updateUpcomingCompetition(
  db: Database.Database,
  untrustedEvent: EditableUpcomingCompetition,
  expectedRevision: number,
): MutationResult<EditableUpcomingCompetition> {
  const event = editableUpcomingCompetitionSchema.parse(untrustedEvent);
  return mutate(db, expectedRevision, () => {
    const result = db.prepare(`
      UPDATE upcoming_competitions SET id = ?, status = ?, registration = ?, start_date = ?,
        end_date = ?, application_deadline = ?, final_start_date = ?, final_end_date = ?, official_url = ?
      WHERE singleton_id = 1
    `).run(
      event.id,
      event.status,
      event.registration,
      event.startDate,
      event.endDate,
      event.applicationDeadline,
      event.finalStartDate,
      event.finalEndDate,
      event.officialUrl,
    );
    if (result.changes !== 1) throw new ContentNotFoundError('Upcoming competition');
    eventTranslations(db, event);
    return event;
  });
}

export function createProject(
  db: Database.Database,
  untrustedInput: NewProject,
  expectedRevision: number,
): MutationResult<Project> {
  const input = newProjectSchema.parse(untrustedInput);
  return mutate(db, expectedRevision, () => {
    if (countRecords(db, 'projects') >= 100) throw new ContentLimitError('projects');
    const project = projectSchema.parse({ ...input, id: randomUUID() });
    insertProject(db, project, nextProjectPosition(db), new Date().toISOString());
    return project;
  });
}

export function updateProject(
  db: Database.Database,
  id: string,
  untrustedInput: Project,
  expectedRevision: number,
): MutationResult<Project> {
  const project = projectSchema.parse(untrustedInput);
  if (project.id !== id) throw new z.ZodError([{
    code: 'custom',
    path: ['id'],
    message: 'The project id must match the requested resource.',
  }]);
  return mutate(db, expectedRevision, () => {
    const untrustedRow = db.prepare('SELECT position FROM projects WHERE id = ?').get(id);
    if (!untrustedRow) throw new ContentNotFoundError('Project');
    const position = projectPositionRowSchema.parse(untrustedRow).position;
    db.prepare('DELETE FROM project_translations WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM project_contributions WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM project_links WHERE project_id = ?').run(id);
    db.prepare(`UPDATE projects SET status = ?, dates = ?, updated_at = ? WHERE id = ?`)
      .run(project.status, project.dates ?? null, new Date().toISOString(), id);
    insertProjectTranslationsAndChildren(db, project);
    return project;
  });
}

function insertProjectTranslationsAndChildren(db: Database.Database, project: Project): void {
  const insertTranslation = db.prepare(`
    INSERT INTO project_translations (project_id, locale, title, summary, problem, business_model)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const locale of locales) {
    insertTranslation.run(
      project.id,
      locale,
      project.title[locale],
      project.summary[locale],
      project.problem?.[locale] ?? null,
      project.businessModel?.[locale] ?? null,
    );
  }
  const insertContribution = db.prepare('INSERT INTO project_contributions (id, project_id, position, name) VALUES (?, ?, ?, ?)');
  const insertContributionText = db.prepare('INSERT INTO project_contribution_translations (contribution_id, locale, description) VALUES (?, ?, ?)');
  (project.contributions ?? []).forEach((contribution, position) => {
    const contributionId = randomUUID();
    insertContribution.run(contributionId, project.id, position, contribution.name);
    for (const locale of locales) insertContributionText.run(contributionId, locale, contribution.description[locale]);
  });
  const insertLink = db.prepare('INSERT INTO project_links (id, project_id, position, url) VALUES (?, ?, ?, ?)');
  const insertLinkText = db.prepare('INSERT INTO project_link_translations (link_id, locale, label) VALUES (?, ?, ?)');
  (project.links ?? []).forEach((link, position) => {
    const linkId = randomUUID();
    insertLink.run(linkId, project.id, position, link.url);
    for (const locale of locales) insertLinkText.run(linkId, locale, link.label[locale]);
  });
}

export function deleteProject(
  db: Database.Database,
  id: string,
  expectedRevision: number,
): MutationResult<null> {
  return mutate(db, expectedRevision, () => {
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    if (result.changes !== 1) throw new ContentNotFoundError('Project');
    return null;
  });
}

export function createCompetition(
  db: Database.Database,
  untrustedInput: NewCompetition,
  expectedRevision: number,
): MutationResult<CompetitionRecord> {
  const input = newCompetitionSchema.parse(untrustedInput);
  return mutate(db, expectedRevision, () => {
    if (countRecords(db, 'competitions', input.recordType) >= 100) {
      throw new ContentLimitError(`${input.recordType} competition records`);
    }
    const competition = competitionRecordSchema.parse({ ...input, id: randomUUID() });
    insertCompetition(db, competition, nextCompetitionPosition(db, competition.recordType), new Date().toISOString());
    return competition;
  });
}

export function updateCompetition(
  db: Database.Database,
  id: string,
  untrustedInput: CompetitionRecord,
  expectedRevision: number,
): MutationResult<CompetitionRecord> {
  const competition = competitionRecordSchema.parse(untrustedInput);
  if (competition.id !== id) throw new z.ZodError([{
    code: 'custom',
    path: ['id'],
    message: 'The competition id must match the requested resource.',
  }]);
  return mutate(db, expectedRevision, () => {
    const untrustedRow = db.prepare('SELECT position, record_type FROM competitions WHERE id = ?').get(id);
    if (!untrustedRow) throw new ContentNotFoundError('Competition');
    const row = competitionPositionRowSchema.parse(untrustedRow);
    const position = row.record_type === competition.recordType
      ? row.position
      : nextCompetitionPosition(db, competition.recordType);
    db.prepare(`
      UPDATE competitions SET record_type = ?, year = ?, position = ?, evidence_url = ?, updated_at = ?
      WHERE id = ?
    `).run(competition.recordType, competition.year, position, competition.evidenceUrl ?? null, new Date().toISOString(), id);
    db.prepare('DELETE FROM competition_translations WHERE competition_id = ?').run(id);
    db.prepare('DELETE FROM competition_participants WHERE competition_id = ?').run(id);
    insertCompetitionTranslationsAndParticipants(db, competition);
    return competition;
  });
}

function insertCompetitionTranslationsAndParticipants(db: Database.Database, competition: CompetitionRecord): void {
  const insertTranslation = db.prepare(`
    INSERT INTO competition_translations (competition_id, locale, name, stage, contribution)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const locale of locales) {
    insertTranslation.run(
      competition.id,
      locale,
      competition.name[locale],
      competition.stage[locale],
      competition.contribution?.[locale] ?? null,
    );
  }
  const insertParticipant = db.prepare('INSERT INTO competition_participants (competition_id, position, name) VALUES (?, ?, ?)');
  competition.participants.forEach((participant, position) => insertParticipant.run(competition.id, position, participant));
}

export function deleteCompetition(
  db: Database.Database,
  id: string,
  expectedRevision: number,
): MutationResult<null> {
  return mutate(db, expectedRevision, () => {
    const result = db.prepare('DELETE FROM competitions WHERE id = ?').run(id);
    if (result.changes !== 1) throw new ContentNotFoundError('Competition');
    return null;
  });
}
