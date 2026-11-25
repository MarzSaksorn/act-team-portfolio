import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { defaultSiteContent } from '../src/data/defaultSiteContent';
import { AdminApi } from '../src/admin/admin-api';
import {
  editableSiteCopySchema,
  editableUpcomingCompetitionSchema,
  newCompetitionSchema,
  newProjectSchema,
  projectSchema,
  competitionRecordSchema,
  type CompetitionRecord,
  type EditableSiteCopy,
  type EditableUpcomingCompetition,
  type NewCompetition,
  type NewProject,
  type Project,
} from '../src/types/site-content';

const apiRoot = '/api/v1';
const fakeUsername = 'act-test-admin';
const fakePassword = 'fake-test-password';

type RecordedRequest = { method: string; path: string; headers: Headers; body: unknown };
type FakeAdminOptions = {
  rejectLogin?: boolean;
  conflictOnNextCopySave?: boolean;
  conflictOnNextEventSave?: boolean;
  conflictOnNextProjectUpdate?: boolean;
  conflictOnNextCompetitionUpdate?: boolean;
};

function response(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(new Headers(headers).entries()) },
  });
}

function problem(status: number, title: string, detail: string, errors?: Array<{ field: string; message: string }>): Response {
  return response({ type: 'about:blank', title, status, detail, ...(errors ? { errors } : {}) }, status, {
    'Content-Type': 'application/problem+json',
  });
}

function page<T>(data: T[], pageNumber: number, limit: number, total: number, endpoint: string) {
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const query = (number: number) => `${endpoint}?page=${number}&limit=${limit}`;
  return {
    data,
    pagination: {
      page: pageNumber,
      limit,
      total,
      hasMore: pageNumber < lastPage,
      hasPrevious: pageNumber > 1,
    },
    links: {
      first: query(1),
      previous: pageNumber > 1 ? query(pageNumber - 1) : null,
      next: pageNumber < lastPage ? query(pageNumber + 1) : null,
      last: query(lastPage),
    },
  };
}

function createFakeAdmin(options: FakeAdminOptions = {}) {
  let authenticated = false;
  let revision = defaultSiteContent.revision;
  let siteCopy: EditableSiteCopy = structuredClone(defaultSiteContent.siteCopy);
  let event: EditableUpcomingCompetition = structuredClone(defaultSiteContent.upcomingCompetition);
  const projects: Project[] = [];
  const competitions: CompetitionRecord[] = [];
  const requests: RecordedRequest[] = [];
  let conflictOnNextCopySave = options.conflictOnNextCopySave ?? false;
  let conflictOnNextEventSave = options.conflictOnNextEventSave ?? false;
  let conflictOnNextProjectUpdate = options.conflictOnNextProjectUpdate ?? false;
  let conflictOnNextCompetitionUpdate = options.conflictOnNextCompetitionUpdate ?? false;
  let rejectLogin = options.rejectLogin ?? false;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, window.location.origin);
    const method = init?.method ?? 'GET';
    const headers = new Headers(init?.headers);
    let body: unknown;
    if (typeof init?.body === 'string') body = JSON.parse(init.body);
    requests.push({ method, path: `${url.pathname}${url.search}`, headers, body });

    if (url.pathname === `${apiRoot}/admin/session` && method === 'GET') {
      return response(authenticated
        ? { authenticated: true, csrfToken: 'fake-csrf-token', expiresAt: '2027-01-01T00:00:00.000Z' }
        : { authenticated: false });
    }
    if (url.pathname === `${apiRoot}/admin/session` && method === 'POST') {
      const credentials = body as { username?: string; password?: string };
      if (rejectLogin || credentials.username !== fakeUsername || credentials.password !== fakePassword) {
        return problem(401, 'Sign-in failed', 'The username or password is incorrect.');
      }
      authenticated = true;
      return response({ authenticated: true, csrfToken: 'fake-csrf-token', expiresAt: '2027-01-01T00:00:00.000Z' });
    }
    if (url.pathname === `${apiRoot}/admin/session` && method === 'DELETE') {
      authenticated = false;
      return response({ authenticated: false });
    }
    if (!authenticated) return problem(401, 'Authentication required', 'Sign in to manage ACT content.');

    const etag = { ETag: `"${revision}"` };
    if (url.pathname === `${apiRoot}/admin/site-copy` && method === 'GET') return response(siteCopy, 200, etag);
    if (url.pathname === `${apiRoot}/admin/site-copy` && method === 'PUT') {
      if (conflictOnNextCopySave) {
        conflictOnNextCopySave = false;
        revision += 1;
        siteCopy.heroBody.en = 'Copy saved by a different editor.';
        return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      }
      if (headers.get('If-Match') !== `"${revision}"`) return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      const parsed = editableSiteCopySchema.safeParse(body);
      if (!parsed.success) return problem(422, 'Validation failed', 'The request content is invalid.', [{ field: 'heroLine1.th', message: 'The value is invalid.' }]);
      siteCopy = parsed.data;
      revision += 1;
      return response({ resource: siteCopy, revision }, 200, { ETag: `"${revision}"` });
    }
    if (url.pathname === `${apiRoot}/admin/upcoming-competition` && method === 'GET') return response(event, 200, etag);
    if (url.pathname === `${apiRoot}/admin/upcoming-competition` && method === 'PUT') {
      if (conflictOnNextEventSave) {
        conflictOnNextEventSave = false;
        revision += 1;
        event.name.en = 'Event saved by a different editor.';
        return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      }
      if (headers.get('If-Match') !== `"${revision}"`) return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      const parsed = editableUpcomingCompetitionSchema.safeParse(body);
      if (!parsed.success) return problem(422, 'Validation failed', 'The request content is invalid.');
      event = parsed.data;
      revision += 1;
      return response({ resource: event, revision }, 200, { ETag: `"${revision}"` });
    }
    if (url.pathname === `${apiRoot}/admin/projects` && method === 'GET') {
      const pageNumber = Number(url.searchParams.get('page') ?? '1');
      const limit = Number(url.searchParams.get('limit') ?? '5');
      const start = (pageNumber - 1) * limit;
      return response(page(projects.slice(start, start + limit), pageNumber, limit, projects.length, `${apiRoot}/admin/projects`), 200, etag);
    }
    if (url.pathname === `${apiRoot}/admin/projects` && method === 'POST') {
      if (headers.get('If-Match') !== `"${revision}"`) return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      const parsed = newProjectSchema.safeParse(body);
      if (!parsed.success) return problem(422, 'Validation failed', 'The request content is invalid.');
      const project = projectSchema.parse({ ...parsed.data, id: crypto.randomUUID() });
      projects.push(project);
      revision += 1;
      return response({ resource: project, revision }, 201, { ETag: `"${revision}"` });
    }
    const projectMatch = new RegExp(`^${apiRoot}/admin/projects/([0-9a-f-]+)$`, 'i').exec(url.pathname);
    if (projectMatch?.[1] && method === 'PUT') {
      if (conflictOnNextProjectUpdate) {
        conflictOnNextProjectUpdate = false;
        const index = projects.findIndex((project) => project.id === projectMatch[1]);
        const current = projects[index];
        if (current) projects[index] = { ...current, summary: { ...current.summary, en: 'Remote project edit.' } };
        revision += 1;
        return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      }
      if (headers.get('If-Match') !== `"${revision}"`) return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      const parsed = projectSchema.safeParse(body);
      if (!parsed.success) return problem(422, 'Validation failed', 'The request content is invalid.');
      const index = projects.findIndex((project) => project.id === projectMatch[1]);
      if (index < 0) return problem(404, 'Not found', 'The project was not found.');
      projects[index] = parsed.data;
      revision += 1;
      return response({ resource: parsed.data, revision }, 200, { ETag: `"${revision}"` });
    }
    if (projectMatch?.[1] && method === 'DELETE') {
      if (headers.get('If-Match') !== `"${revision}"`) return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      const index = projects.findIndex((project) => project.id === projectMatch[1]);
      if (index >= 0) projects.splice(index, 1);
      revision += 1;
      return response({ resource: null, revision }, 200, { ETag: `"${revision}"` });
    }
    if (url.pathname === `${apiRoot}/admin/competitions` && method === 'GET') {
      const recordType = url.searchParams.get('recordType');
      const data = competitions.filter((record) => record.recordType === recordType);
      const pageNumber = Number(url.searchParams.get('page') ?? '1');
      const limit = Number(url.searchParams.get('limit') ?? '5');
      const start = (pageNumber - 1) * limit;
      return response(page(data.slice(start, start + limit), pageNumber, limit, data.length, `${apiRoot}/admin/competitions?recordType=${recordType}`), 200, etag);
    }
    if (url.pathname === `${apiRoot}/admin/competitions` && method === 'POST') {
      if (headers.get('If-Match') !== `"${revision}"`) return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      const parsed = newCompetitionSchema.safeParse(body);
      if (!parsed.success) return problem(422, 'Validation failed', 'The request content is invalid.');
      const record = competitionRecordSchema.parse({ ...parsed.data, id: crypto.randomUUID() });
      competitions.push(record);
      revision += 1;
      return response({ resource: record, revision }, 201, { ETag: `"${revision}"` });
    }
    const competitionMatch = new RegExp(`^${apiRoot}/admin/competitions/([0-9a-f-]+)$`, 'i').exec(url.pathname);
    if (competitionMatch?.[1] && method === 'PUT') {
      const index = competitions.findIndex((record) => record.id === competitionMatch[1]);
      const current = competitions[index];
      if (conflictOnNextCompetitionUpdate) {
        conflictOnNextCompetitionUpdate = false;
        if (current) competitions[index] = { ...current, stage: { ...current.stage, en: 'Remote competition edit.' } };
        revision += 1;
        return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      }
      if (headers.get('If-Match') !== `"${revision}"`) return problem(412, 'Content has changed', 'Reload the latest content before saving again.');
      const parsed = competitionRecordSchema.safeParse(body);
      if (!parsed.success) return problem(422, 'Validation failed', 'The request content is invalid.');
      if (index < 0) return problem(404, 'Not found', 'The competition record was not found.');
      competitions[index] = parsed.data;
      revision += 1;
      return response({ resource: parsed.data, revision }, 200, { ETag: `"${revision}"` });
    }
    return problem(404, 'Not found', 'The requested resource was not found.');
  });

  vi.stubGlobal('fetch', fetchMock);
  return {
    requests,
    fetchMock,
    readSiteCopy: () => structuredClone(siteCopy),
    readEvent: () => structuredClone(event),
    readProjectByTitle: (title: string) => structuredClone(projects.find((project) => project.title.en === title) ?? null),
    readCompetitionByName: (name: string) => structuredClone(competitions.find((record) => record.name.en === name) ?? null),
    setRejectLogin: (value: boolean) => { rejectLogin = value; },
    setConflictOnNextCopySave: (value: boolean) => { conflictOnNextCopySave = value; },
  };
}

function mountAdmin() {
  return render(<MemoryRouter initialEntries={['/admin']}><App /></MemoryRouter>);
}

async function signIn(user = userEvent.setup()) {
  await user.type(screen.getByLabelText('Username'), fakeUsername);
  await user.type(screen.getByLabelText('Password'), fakePassword);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('heading', { name: 'ACT content editor' });
  return user;
}

afterEach(() => vi.unstubAllGlobals());

it('keeps private editor content hidden until an authenticated session exists', async () => {
  const server = createFakeAdmin();
  mountAdmin();

  expect(await screen.findByRole('heading', { name: 'ACT content studio' })).toBeInTheDocument();
  expect(screen.getByLabelText('Username')).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toBeInTheDocument();
  expect(screen.queryByLabelText('Home title — English')).not.toBeInTheDocument();
  await waitFor(() => expect(server.requests.some((request) => request.path === `${apiRoot}/admin/site-copy`)).toBe(false));
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

it('warns that Preview edits will not be saved when the self-hosted backend is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Backend unavailable')));
  mountAdmin();

  expect(await screen.findByText('The self-hosted admin backend is unavailable here. Preview edits will not be saved.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save site copy' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Home title — English')).not.toBeInTheDocument();
});

it('reports invalid credentials without opening the editor', async () => {
  createFakeAdmin({ rejectLogin: true });
  const user = userEvent.setup();
  mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await user.type(screen.getByLabelText('Username'), fakeUsername);
  await user.type(screen.getByLabelText('Password'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('The username or password is incorrect.');
  expect(screen.queryByRole('heading', { name: 'ACT content editor' })).not.toBeInTheDocument();
});

it('requires both translations and persists bilingual copy after reloading the editor', async () => {
  const server = createFakeAdmin();
  const user = userEvent.setup();
  const firstMount = mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await signIn(user);

  const english = await screen.findByLabelText('Hero headline — English');
  const thai = screen.getByLabelText('Hero headline — Thai');
  await user.clear(thai);
  await user.click(screen.getByRole('button', { name: 'Save site copy' }));
  expect(await screen.findByText('Please complete both language fields before saving.')).toBeInTheDocument();
  expect(server.requests.some((request) => request.method === 'PUT' && request.path === `${apiRoot}/admin/site-copy`)).toBe(false);

  await user.clear(english);
  await user.type(english, 'Ideas start with a question.');
  await user.type(thai, 'ไอเดียเริ่มจากคำถาม');
  await user.click(screen.getByRole('button', { name: 'Save site copy' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Site copy saved.');

  firstMount.unmount();
  mountAdmin();
  expect(await screen.findByLabelText('Hero headline — English')).toHaveValue('Ideas start with a question.');
  expect(screen.getByLabelText('Hero headline — Thai')).toHaveValue('ไอเดียเริ่มจากคำถาม');
  expect(localStorage.getItem('csrfToken')).toBeNull();
  expect(localStorage.getItem('act-admin-csrf')).toBeNull();
});

it('uses the latest global revision when saving a different resource', async () => {
  const server = createFakeAdmin();
  const user = userEvent.setup();
  mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await signIn(user);

  const headline = await screen.findByLabelText('Hero headline — English');
  await user.clear(headline);
  await user.type(headline, 'Updated across resources.');
  await user.click(screen.getByRole('button', { name: 'Save site copy' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Site copy saved.');

  await user.click(screen.getByRole('button', { name: 'Upcoming event' }));
  const eventNote = screen.getByLabelText('Event note — English');
  await user.clear(eventNote);
  await user.type(eventNote, 'The event note was saved after site copy.');
  await user.click(screen.getByRole('button', { name: 'Save upcoming event' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Upcoming event saved.');

  const eventWrite = server.requests.find((request) => request.method === 'PUT' && request.path === `${apiRoot}/admin/upcoming-competition`);
  expect(eventWrite?.headers.get('If-Match')).toBe('"1"');
});

it('requires explicit reload after a paginated project conflict without blessing stale sibling pages', async () => {
  const server = createFakeAdmin({ conflictOnNextProjectUpdate: true });
  const api = new AdminApi();
  const firstPage = { page: 1, limit: 5 };
  const secondPage = { page: 2, limit: 5 };
  await api.login({ username: fakeUsername, password: fakePassword });
  await api.getProjects(firstPage);

  for (let number = 1; number <= 6; number += 1) {
    await api.createProject({
      title: { en: `Project ${number}`, th: `โครงการ ${number}` },
      summary: { en: `Summary ${number}`, th: `สรุป ${number}` },
      status: 'planned',
    }, firstPage);
  }
  await api.getProjects(firstPage);
  const secondPageContent = await api.getProjects(secondPage);
  const project = secondPageContent.data[0];
  expect(project).toBeDefined();

  await expect(api.updateProject(project!, secondPage)).rejects.toMatchObject({ status: 412 });
  await expect(api.updateProject(project!, secondPage)).rejects.toMatchObject({ status: 0 });
  expect(server.requests.filter((request) => request.method === 'PUT' && request.path.endsWith(project!.id))).toHaveLength(1);

  await expect(api.createProject({
    title: { en: 'Unrelated page-one project', th: 'โปรเจกต์หน้าแรก' },
    summary: { en: 'This should still use its stale page-one revision.', th: 'ควรใช้เวอร์ชันเก่าของหน้าแรก' },
    status: 'planned',
  }, firstPage)).rejects.toMatchObject({ status: 412 });
  const createWrites = server.requests.filter((request) => request.method === 'POST' && request.path === `${apiRoot}/admin/projects`);
  expect(createWrites.at(-1)?.headers.get('If-Match')).toBe('"6"');
});

it('keeps stale sibling ETags after recovering another resource from a conflict', async () => {
  const server = createFakeAdmin({ conflictOnNextCopySave: true });
  const api = new AdminApi();
  await api.login({ username: fakeUsername, password: fakePassword });
  const copy = await api.getSiteCopy();
  const event = await api.getUpcomingCompetition();
  await expect(api.saveSiteCopy(copy)).rejects.toMatchObject({ status: 412 });
  await expect(api.saveSiteCopy(copy)).rejects.toMatchObject({ status: 0 });
  const latest = await api.getSiteCopy();
  await api.saveSiteCopy({ ...latest, heroLine1: { ...latest.heroLine1, en: 'Reviewed copy edit.' } });
  await expect(api.saveUpcomingCompetition(event)).rejects.toMatchObject({ status: 412 });
  const eventWrites = server.requests.filter((request) => request.method === 'PUT' && request.path === `${apiRoot}/admin/upcoming-competition`);
  expect(eventWrites.map((request) => request.headers.get('If-Match'))).toEqual(['"0"']);
});

it('blocks stale copy retries until a confirmed reload surfaces concurrent edits', async () => {
  const server = createFakeAdmin({ conflictOnNextCopySave: true });
  const user = userEvent.setup();
  mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await signIn(user);

  const english = await screen.findByLabelText('Hero headline — English');
  await user.clear(english);
  await user.type(english, 'Keep my draft while the server changes.');
  await user.click(screen.getByRole('button', { name: 'Save site copy' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Another save changed this content. Your draft is still here; reload the latest content before saving again.');
  expect(screen.getByLabelText('Hero headline — English')).toHaveValue('Keep my draft while the server changes.');

  await user.click(screen.getByRole('button', { name: 'Save site copy' }));
  expect(screen.getByRole('button', { name: 'Save site copy' })).toBeDisabled();
  expect(server.readSiteCopy().heroBody.en).toBe('Copy saved by a different editor.');
  expect(server.requests.filter((request) => request.method === 'PUT' && request.path === `${apiRoot}/admin/site-copy`)).toHaveLength(1);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await user.click(screen.getByRole('button', { name: 'Reload latest content (discard drafts)' }));
  expect(screen.getByLabelText('Hero headline — English')).toHaveValue('Keep my draft while the server changes.');
  confirm.mockReturnValue(true);
  await user.click(screen.getByRole('button', { name: 'Reload latest content (discard drafts)' }));
  expect(await screen.findByLabelText('Hero description — English')).toHaveValue('Copy saved by a different editor.');
  const reloaded = screen.getByLabelText('Hero headline — English');
  await user.clear(reloaded);
  await user.type(reloaded, 'Keep my draft while the server changes.');
  await user.click(screen.getByRole('button', { name: 'Save site copy' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Site copy saved.');
  expect(server.readSiteCopy().heroBody.en).toBe('Copy saved by a different editor.');
  expect(server.readSiteCopy().heroLine1.en).toBe('Keep my draft while the server changes.');
  const writes = server.requests.filter((request) => request.method === 'PUT' && request.path === `${apiRoot}/admin/site-copy`);
  expect(writes.map((request) => request.headers.get('If-Match'))).toEqual(['"0"', '"1"']);
  expect(writes.every((request) => request.headers.get('X-CSRF-Token') === 'fake-csrf-token')).toBe(true);
});

it('blocks stale event retries and preserves the other editor’s event field after deliberate reload', async () => {
  const server = createFakeAdmin({ conflictOnNextEventSave: true });
  const user = userEvent.setup();
  mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await signIn(user);
  await user.click(screen.getByRole('button', { name: 'Upcoming event' }));
  const note = screen.getByLabelText('Event note — English');
  await user.clear(note);
  await user.type(note, 'Local event note.');
  await user.click(screen.getByRole('button', { name: 'Save upcoming event' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Another save changed this content. Your draft is still here; reload the latest content before saving again.');
  await user.click(screen.getByRole('button', { name: 'Save upcoming event' }));
  expect(screen.getByRole('button', { name: 'Save upcoming event' })).toBeDisabled();
  expect(server.readEvent().name.en).toBe('Event saved by a different editor.');
  expect(server.requests.filter((request) => request.method === 'PUT' && request.path === `${apiRoot}/admin/upcoming-competition`)).toHaveLength(1);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(screen.getByRole('button', { name: 'Reload latest content (discard drafts)' }));
  expect(await screen.findByLabelText('Event name — English')).toHaveValue('Event saved by a different editor.');
  const latestNote = screen.getByLabelText('Event note — English');
  await user.clear(latestNote);
  await user.type(latestNote, 'Local event note.');
  await user.click(screen.getByRole('button', { name: 'Save upcoming event' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Upcoming event saved.');
  expect(server.readEvent().name.en).toBe('Event saved by a different editor.');
  expect(server.readEvent().note.en).toBe('Local event note.');
});

it('blocks a stale project draft until the latest record is deliberately reloaded', async () => {
  const server = createFakeAdmin({ conflictOnNextProjectUpdate: true });
  const user = userEvent.setup();
  mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await signIn(user);
  await user.click(screen.getByRole('button', { name: 'Projects' }));
  await user.click(screen.getByRole('button', { name: 'Add project' }));
  await user.type(screen.getByLabelText('Project title — English'), 'Project to edit');
  await user.type(screen.getByLabelText('Project title — Thai'), 'โปรเจกต์ทดสอบ');
  await user.type(screen.getByLabelText('Project summary — English'), 'Original summary.');
  await user.type(screen.getByLabelText('Project summary — Thai'), 'สรุปเดิม');
  await user.click(screen.getByRole('button', { name: 'Create project' }));
  await screen.findByRole('heading', { name: 'Project to edit' });

  await user.click(screen.getByRole('button', { name: 'Edit project: Project to edit' }));
  const title = screen.getByLabelText('Project title — English');
  await user.clear(title);
  await user.type(title, 'Local project title.');
  await user.click(screen.getByRole('button', { name: 'Save project' }));
  expect((await screen.findAllByRole('alert')).some((alert) => alert.textContent === 'Another save changed this content. Your draft is still here; reload the latest content before saving again.')).toBe(true);
  expect(screen.getByLabelText('Project title — English')).toHaveValue('Local project title.');
  const staleProjectSave = screen.getByRole('button', { name: 'Save project' });
  await user.click(staleProjectSave);
  expect(staleProjectSave).toBeDisabled();
  expect(server.readProjectByTitle('Project to edit')?.summary.en).toBe('Remote project edit.');
  expect(server.requests.filter((request) => request.method === 'PUT' && request.path.startsWith(`${apiRoot}/admin/projects/`))).toHaveLength(1);

  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(screen.getByRole('button', { name: 'Reload latest content (discard drafts)' }));
  await user.click(screen.getByRole('button', { name: 'Edit project: Project to edit' }));
  expect(screen.getByLabelText('Project summary — English')).toHaveValue('Remote project edit.');
  await user.clear(screen.getByLabelText('Project title — English'));
  await user.type(screen.getByLabelText('Project title — English'), 'Local project title.');
  await user.click(screen.getByRole('button', { name: 'Save project' }));
  await screen.findByRole('heading', { name: 'Local project title.' });
  expect(server.readProjectByTitle('Local project title.')?.summary.en).toBe('Remote project edit.');
});

it('blocks a stale competition draft until the latest attribution-group record is deliberately reloaded', async () => {
  const server = createFakeAdmin({ conflictOnNextCompetitionUpdate: true });
  const user = userEvent.setup();
  mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await signIn(user);
  await user.click(screen.getByRole('button', { name: 'Competitions' }));
  const actGroup = screen.getByRole('region', { name: 'ACT competition history' });
  await user.click(within(actGroup).getByRole('button', { name: 'Add ACT competition record' }));
  await user.type(screen.getByLabelText('Competition name — English'), 'ACT test event');
  await user.type(screen.getByLabelText('Competition name — Thai'), 'งานทดสอบ ACT');
  await user.type(screen.getByLabelText('Competition year'), '2026');
  await user.type(screen.getByLabelText('Participants (comma-separated)'), 'ACT Team');
  await user.type(screen.getByLabelText('Competition stage — English'), 'Planning');
  await user.type(screen.getByLabelText('Competition stage — Thai'), 'กำลังวางแผน');
  await user.click(within(actGroup).getByRole('button', { name: 'Create ACT competition record' }));
  await within(actGroup).findByRole('heading', { name: 'ACT test event' });

  await user.click(within(actGroup).getByRole('button', { name: 'Edit competition: ACT test event' }));
  const name = screen.getByLabelText('Competition name — English');
  await user.clear(name);
  await user.type(name, 'Local ACT event title.');
  await user.click(within(actGroup).getByRole('button', { name: 'Save competition record' }));
  expect((await within(actGroup).findAllByRole('alert')).some((alert) => alert.textContent === 'Another save changed this content. Your draft is still here; reload the latest content before saving again.')).toBe(true);
  const staleCompetitionSave = within(actGroup).getByRole('button', { name: 'Save competition record' });
  await user.click(staleCompetitionSave);
  expect(staleCompetitionSave).toBeDisabled();
  expect(server.readCompetitionByName('ACT test event')?.stage.en).toBe('Remote competition edit.');
  expect(server.requests.filter((request) => request.method === 'PUT' && request.path.startsWith(`${apiRoot}/admin/competitions/`))).toHaveLength(1);

  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await user.click(within(actGroup).getByRole('button', { name: 'Reload latest content (discard drafts)' }));
  await user.click(within(actGroup).getByRole('button', { name: 'Edit competition: ACT test event' }));
  expect(screen.getByLabelText('Competition stage — English')).toHaveValue('Remote competition edit.');
  await user.clear(screen.getByLabelText('Competition name — English'));
  await user.type(screen.getByLabelText('Competition name — English'), 'Local ACT event title.');
  await user.click(within(actGroup).getByRole('button', { name: 'Save competition record' }));
  await within(actGroup).findByRole('heading', { name: 'Local ACT event title.' });
  expect(server.readCompetitionByName('Local ACT event title.')?.stage.en).toBe('Remote competition edit.');
});

it('keeps founder pre-ACT and ACT competition groups separate in the editor', async () => {
  createFakeAdmin();
  const user = userEvent.setup();
  mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await signIn(user);
  await user.click(screen.getByRole('button', { name: 'Competitions' }));

  const founderGroup = screen.getByRole('region', { name: 'Founder history before ACT' });
  const actGroup = screen.getByRole('region', { name: 'ACT competition history' });
  expect(within(founderGroup).getByRole('button', { name: 'Add founder pre-ACT record' })).toBeInTheDocument();
  expect(within(actGroup).getByRole('button', { name: 'Add ACT competition record' })).toBeInTheDocument();
});

it('sends the session-bound CSRF token when signing out and returns to the login form', async () => {
  const server = createFakeAdmin();
  const user = userEvent.setup();
  mountAdmin();
  await screen.findByRole('heading', { name: 'ACT content studio' });
  await signIn(user);

  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: 'Sign in to edit ACT content' })).toBeInTheDocument();
  const logout = server.requests.find((request) => request.method === 'DELETE' && request.path === `${apiRoot}/admin/session`);
  expect(logout?.headers.get('X-CSRF-Token')).toBe('fake-csrf-token');
});
