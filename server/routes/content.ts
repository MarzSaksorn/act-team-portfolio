import type Database from 'better-sqlite3';
import { rateLimit } from 'express-rate-limit';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  competitionListInputSchema,
  competitionRecordSchema,
  editableSiteCopySchema,
  editableUpcomingCompetitionSchema,
  newCompetitionSchema,
  newProjectSchema,
  projectListInputSchema,
  projectSchema,
  type CompetitionAttribution,
  type Locale,
  type SiteContentSnapshot,
} from '../../src/types/site-content';
import {
  createCompetition,
  createProject,
  deleteCompetition,
  deleteProject,
  listCompetitions,
  listProjects,
  loadContent,
  updateCompetition,
  updateProject,
  updateSiteCopy,
  updateUpcomingCompetition,
} from '../db/content-repository';
import type { RuntimeConfig } from '../config';
import { ApiProblemError, sendProblemResponse } from '../errors';
import { requireAdminSession, requireCsrfToken, requireTrustedOrigin } from './session';

const recordIdSchema = z.string().uuid();
const markupPattern = /<\s*\/?\s*[a-z][^>]*>/i;

type ContentSchema<T> = z.ZodType<T>;

function findMarkupIssues(value: unknown, path: Array<string | number>, issues: z.ZodIssue[]): void {
  if (typeof value === 'string') {
    if (markupPattern.test(value)) {
      issues.push({ code: 'custom', path, message: 'Markup is not allowed.' });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => findMarkupIssues(entry, [...path, index], issues));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) findMarkupIssues(entry, [...path, key], issues);
  }
}

function parseSafeContent<T>(schema: ContentSchema<T>, input: unknown): T {
  const content = schema.parse(input);
  const issues: z.ZodIssue[] = [];
  findMarkupIssues(content, [], issues);
  if (issues.length > 0) throw new z.ZodError(issues);
  return content;
}

function queryValues(request: Request, allowed: string[]): Record<string, string> {
  const url = new URL(request.originalUrl, 'http://relative.invalid');
  const values: Record<string, string> = {};
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key)) {
      throw new z.ZodError([{ code: 'custom', path: [key], message: 'Unknown query parameter.' }]);
    }
    const entries = url.searchParams.getAll(key);
    if (entries.length !== 1) {
      throw new z.ZodError([{ code: 'custom', path: [key], message: 'The query parameter must be specified once.' }]);
    }
    const value = entries[0];
    if (value !== undefined) values[key] = value;
  }
  return values;
}

function queryInteger(values: Record<string, string>, name: string, defaultValue: number): number {
  const value = values[name];
  if (value === undefined) return defaultValue;
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new z.ZodError([{ code: 'custom', path: [name], message: 'The value must be an integer.' }]);
  }
  return Number(value);
}

function projectListInput(request: Request) {
  const values = queryValues(request, ['page', 'limit', 'sort', 'order']);
  return projectListInputSchema.parse({
    page: queryInteger(values, 'page', 1),
    limit: queryInteger(values, 'limit', 20),
    sort: values.sort ?? 'position',
    order: values.order ?? 'asc',
  });
}

function competitionListInput(request: Request) {
  const values = queryValues(request, ['recordType', 'page', 'limit', 'sort', 'order']);
  return competitionListInputSchema.parse({
    recordType: values.recordType,
    page: queryInteger(values, 'page', 1),
    limit: queryInteger(values, 'limit', 20),
    sort: values.sort ?? 'position',
    order: values.order ?? 'asc',
  });
}

function expectedRevision(request: Request): number {
  const header = request.get('if-match');
  if (header === undefined) {
    throw new ApiProblemError(428, 'precondition-required', 'Precondition required', 'Send the current content ETag in the If-Match header.');
  }
  const match = /^"(0|[1-9]\d*)"$/.exec(header);
  const revision = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new ApiProblemError(400, 'invalid-if-match', 'Invalid If-Match header', 'Use the quoted revision returned in the resource ETag.');
  }
  return revision;
}

function setRevisionEtag(response: Response, revision: number): void {
  response.set('ETag', `"${revision}"`);
}

function sendMutation<T>(response: Response, result: { resource: T; revision: number }): void {
  setRevisionEtag(response, result.revision);
  response.json(result);
}

function adminRateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    limit: 90,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (request, response) => {
      sendProblemResponse(response, request, new ApiProblemError(
        429,
        'rate-limit-exceeded',
        'Too many requests',
        'Wait before making more administrator API requests.',
      ));
    },
  });
}

export function createContentRouter(db: Database.Database, config: RuntimeConfig): Router {
  const router = Router();
  const checkOrigin = requireTrustedOrigin(config);
  router.use('/admin', adminRateLimiter());
  router.use('/admin', requireAdminSession(db, config));

  router.get('/public/content', (_request, response) => {
    const snapshot: SiteContentSnapshot = loadContent(db);
    response.json(snapshot);
  });

  router.get('/admin/site-copy', (_request, response) => {
    const snapshot = loadContent(db);
    setRevisionEtag(response, snapshot.revision);
    response.json(snapshot.siteCopy);
  });

  router.put('/admin/site-copy', checkOrigin, requireCsrfToken, (request, response) => {
    const copy = parseSafeContent(editableSiteCopySchema, request.body);
    sendMutation(response, updateSiteCopy(db, copy, expectedRevision(request)));
  });

  router.get('/admin/upcoming-competition', (_request, response) => {
    const snapshot = loadContent(db);
    setRevisionEtag(response, snapshot.revision);
    response.json(snapshot.upcomingCompetition);
  });

  router.put('/admin/upcoming-competition', checkOrigin, requireCsrfToken, (request, response) => {
    const event = parseSafeContent(editableUpcomingCompetitionSchema, request.body);
    sendMutation(response, updateUpcomingCompetition(db, event, expectedRevision(request)));
  });

  router.get('/admin/projects', (request, response) => {
    const page = listProjects(db, projectListInput(request));
    setRevisionEtag(response, loadContent(db).revision);
    response.json(page);
  });

  router.post('/admin/projects', checkOrigin, requireCsrfToken, (request, response) => {
    const input = parseSafeContent(newProjectSchema, request.body);
    const result = createProject(db, input, expectedRevision(request));
    setRevisionEtag(response, result.revision);
    response.location(`/api/v1/admin/projects/${result.resource.id}`);
    response.status(201).json(result);
  });

  router.put('/admin/projects/:projectId', checkOrigin, requireCsrfToken, (request, response) => {
    const id = recordIdSchema.parse(request.params.projectId);
    const project = parseSafeContent(projectSchema, request.body);
    sendMutation(response, updateProject(db, id, project, expectedRevision(request)));
  });

  router.delete('/admin/projects/:projectId', checkOrigin, requireCsrfToken, (request, response) => {
    const id = recordIdSchema.parse(request.params.projectId);
    sendMutation(response, deleteProject(db, id, expectedRevision(request)));
  });

  router.get('/admin/competitions', (request, response) => {
    const page = listCompetitions(db, competitionListInput(request));
    setRevisionEtag(response, loadContent(db).revision);
    response.json(page);
  });

  router.post('/admin/competitions', checkOrigin, requireCsrfToken, (request, response) => {
    const input = parseSafeContent(newCompetitionSchema, request.body);
    const result = createCompetition(db, input, expectedRevision(request));
    setRevisionEtag(response, result.revision);
    response.location(`/api/v1/admin/competitions/${result.resource.id}`);
    response.status(201).json(result);
  });

  router.put('/admin/competitions/:competitionId', checkOrigin, requireCsrfToken, (request, response) => {
    const id = recordIdSchema.parse(request.params.competitionId);
    const competition = parseSafeContent(competitionRecordSchema, request.body);
    sendMutation(response, updateCompetition(db, id, competition, expectedRevision(request)));
  });

  router.delete('/admin/competitions/:competitionId', checkOrigin, requireCsrfToken, (request, response) => {
    const id = recordIdSchema.parse(request.params.competitionId);
    sendMutation(response, deleteCompetition(db, id, expectedRevision(request)));
  });

  return router;
}
