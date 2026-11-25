import { z } from 'zod';
import {
  competitionAttributionSchema,
  competitionRecordSchema,
  editableSiteCopySchema,
  editableUpcomingCompetitionSchema,
  newCompetitionSchema,
  newProjectSchema,
  projectSchema,
  type CompetitionAttribution,
  type CompetitionRecord,
  type EditableSiteCopy,
  type EditableUpcomingCompetition,
  type NewCompetition,
  type NewProject,
  type Page,
  type Project,
} from '../types/site-content';

const sessionSchema = z.discriminatedUnion('authenticated', [
  z.object({ authenticated: z.literal(false) }).strict(),
  z.object({
    authenticated: z.literal(true),
    csrfToken: z.string().min(1),
    expiresAt: z.string().datetime(),
  }).strict(),
]);

const fieldProblemSchema = z.object({ field: z.string(), message: z.string() }).strict();
const problemSchema = z.object({
  title: z.string().optional(),
  detail: z.string().optional(),
  status: z.number().int().optional(),
  errors: z.array(fieldProblemSchema).optional(),
}).passthrough();
const mutationResultSchema = <T extends z.ZodType>(resource: T) => z.object({
  resource,
  revision: z.number().int().nonnegative(),
}).strict();
const pageSchema = <T extends z.ZodType>(item: T) => z.object({
  data: z.array(item),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
    hasPrevious: z.boolean(),
  }).strict(),
  links: z.object({
    first: z.string(),
    previous: z.string().nullable(),
    next: z.string().nullable(),
    last: z.string(),
  }).strict(),
}).strict();

const apiProblemMessage = 'The admin backend is unavailable or returned an unreadable response.';

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'AdminApiError';
  }

  get isConflict(): boolean {
    return this.status === 412;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  etagKey?: string;
};

type PagePosition = { page: number; limit: number };

function projectEtagKey(position: PagePosition): string {
  return `projects:${position.page}:${position.limit}`;
}

function resourceEtagKey(resource: 'founder-pre-act' | 'act', position: PagePosition): string {
  return `competitions:${resource}:${position.page}:${position.limit}`;
}

function requiredEtag(headerValue: string | null): string {
  if (!headerValue || !/^"(?:0|[1-9]\d*)"$/.test(headerValue)) {
    throw new AdminApiError(0, 'The admin service did not return a valid content revision. Reload before saving.');
  }
  return headerValue;
}

export class AdminApi {
  private csrfToken: string | null = null;
  private readonly etags = new Map<string, string>();

  private rememberEtag(key: string, etag: string, advancedFrom?: string): void {
    if (advancedFrom) {
      for (const [knownKey, cachedEtag] of this.etags) {
        if (cachedEtag === advancedFrom) this.etags.set(knownKey, etag);
      }
    }
    this.etags.set(key, etag);
  }

  async getSession(): Promise<z.infer<typeof sessionSchema>> {
    const session = await this.request('/admin/session', sessionSchema);
    this.csrfToken = session.authenticated ? session.csrfToken : null;
    if (!session.authenticated) this.etags.clear();
    return session;
  }

  async login(input: { username: string; password: string }): Promise<void> {
    this.csrfToken = null;
    this.etags.clear();
    const session = await this.request('/admin/session', sessionSchema, { method: 'POST', body: input });
    if (!session.authenticated) throw new AdminApiError(401, 'Sign in to manage ACT content.');
    this.csrfToken = session.csrfToken;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/admin/session', z.object({ authenticated: z.literal(false) }).strict(), { method: 'DELETE' });
    } finally {
      this.csrfToken = null;
      this.etags.clear();
    }
  }

  getSiteCopy(): Promise<EditableSiteCopy> {
    return this.request('/admin/site-copy', editableSiteCopySchema, { etagKey: 'site-copy' });
  }

  saveSiteCopy(copy: EditableSiteCopy): Promise<{ resource: EditableSiteCopy; revision: number }> {
    return this.request('/admin/site-copy', mutationResultSchema(editableSiteCopySchema), {
      method: 'PUT',
      body: copy,
      etagKey: 'site-copy',
    });
  }

  getUpcomingCompetition(): Promise<EditableUpcomingCompetition> {
    return this.request('/admin/upcoming-competition', editableUpcomingCompetitionSchema, { etagKey: 'upcoming-competition' });
  }

  saveUpcomingCompetition(event: EditableUpcomingCompetition): Promise<{ resource: EditableUpcomingCompetition; revision: number }> {
    return this.request('/admin/upcoming-competition', mutationResultSchema(editableUpcomingCompetitionSchema), {
      method: 'PUT',
      body: event,
      etagKey: 'upcoming-competition',
    });
  }

  getProjects(input: { page: number; limit: number }): Promise<Page<Project>> {
    const query = new URLSearchParams({
      page: String(input.page),
      limit: String(input.limit),
      sort: 'position',
      order: 'asc',
    });
    return this.request(`/admin/projects?${query.toString()}`, pageSchema(projectSchema), { etagKey: projectEtagKey(input) });
  }

  createProject(project: NewProject, position: PagePosition): Promise<{ resource: Project; revision: number }> {
    const key = projectEtagKey(position);
    return this.request('/admin/projects', mutationResultSchema(projectSchema), {
      method: 'POST',
      body: project,
      etagKey: key,
    });
  }

  updateProject(project: Project, position: PagePosition): Promise<{ resource: Project; revision: number }> {
    const key = projectEtagKey(position);
    return this.request(`/admin/projects/${encodeURIComponent(project.id)}`, mutationResultSchema(projectSchema), {
      method: 'PUT',
      body: project,
      etagKey: key,
    });
  }

  deleteProject(id: string, position: PagePosition): Promise<{ resource: null; revision: number }> {
    const key = projectEtagKey(position);
    return this.request(`/admin/projects/${encodeURIComponent(id)}`, mutationResultSchema(z.null()), {
      method: 'DELETE',
      etagKey: key,
    });
  }

  getCompetitions(input: { recordType: CompetitionAttribution; page: number; limit: number }): Promise<Page<CompetitionRecord>> {
    const query = new URLSearchParams({
      recordType: input.recordType,
      page: String(input.page),
      limit: String(input.limit),
      sort: 'position',
      order: 'asc',
    });
    return this.request(`/admin/competitions?${query.toString()}`, pageSchema(competitionRecordSchema), {
      etagKey: resourceEtagKey(input.recordType, input),
    });
  }

  createCompetition(record: NewCompetition, position: PagePosition): Promise<{ resource: CompetitionRecord; revision: number }> {
    const key = resourceEtagKey(record.recordType, position);
    return this.request('/admin/competitions', mutationResultSchema(competitionRecordSchema), {
      method: 'POST',
      body: record,
      etagKey: key,
    });
  }

  updateCompetition(record: CompetitionRecord, position: PagePosition): Promise<{ resource: CompetitionRecord; revision: number }> {
    const key = resourceEtagKey(record.recordType, position);
    return this.request(`/admin/competitions/${encodeURIComponent(record.id)}`, mutationResultSchema(competitionRecordSchema), {
      method: 'PUT',
      body: record,
      etagKey: key,
    });
  }

  deleteCompetition(id: string, recordType: CompetitionAttribution, position: PagePosition): Promise<{ resource: null; revision: number }> {
    const key = resourceEtagKey(recordType, position);
    return this.request(`/admin/competitions/${encodeURIComponent(id)}`, mutationResultSchema(z.null()), {
      method: 'DELETE',
      etagKey: key,
    });
  }

  private async request<T>(path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const headers = new Headers({ Accept: 'application/json' });
    let usedIfMatch: string | null = null;
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');

    const isLoginRequest = method === 'POST' && path === '/admin/session';
    if (method !== 'GET' && !isLoginRequest) {
      if (!this.csrfToken) throw new AdminApiError(401, 'Your admin session has expired. Sign in again.');
      headers.set('X-CSRF-Token', this.csrfToken);
      if (path !== '/admin/session') {
        const etagKey = options.etagKey;
        if (!etagKey) throw new AdminApiError(0, 'Reload this content before saving.');
        const currentEtag = this.etags.get(etagKey);
        if (!currentEtag) throw new AdminApiError(0, 'Reload this content before saving.');
        headers.set('If-Match', currentEtag);
        usedIfMatch = currentEtag;
      }
    }

    let response: Response;
    try {
      response = await fetch(`/api/v1${path}`, {
        method,
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
    } catch {
      throw new AdminApiError(0, apiProblemMessage);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AdminApiError(0, apiProblemMessage);
    }

    if (!response.ok) {
      const parsedProblem = problemSchema.safeParse(payload);
      const detail = parsedProblem.success
        ? parsedProblem.data.detail ?? parsedProblem.data.title ?? 'The request could not be completed.'
        : 'The request could not be completed.';
      const fieldErrors = parsedProblem.success ? parsedProblem.data.errors ?? [] : [];
      if (response.status === 412 && options.etagKey && this.etags.get(options.etagKey) === usedIfMatch) {
        this.etags.delete(options.etagKey);
      }
      throw new AdminApiError(response.status, detail, fieldErrors);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new AdminApiError(0, apiProblemMessage);

    if (options.etagKey) {
      const etag = requiredEtag(response.headers.get('ETag'));
      this.rememberEtag(options.etagKey, etag, usedIfMatch ?? undefined);
    }
    return parsed.data;
  }
}

export { competitionAttributionSchema, newCompetitionSchema, newProjectSchema };
