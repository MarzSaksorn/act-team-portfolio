import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { useLocale } from '../i18n/LocaleProvider';
import {
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
  type EventStatus,
  type NewCompetition,
  type NewProject,
  type Page,
  type Project,
  type ProjectStatus,
  type RegistrationStatus,
  type SiteCopyKey,
} from '../types/site-content';
import { AdminApi, AdminApiError } from './admin-api';
import { getAdminMessages } from './admin-messages';
import LocalizedFields, { type LocalizedDraft } from './LocalizedFields';

const PAGE_LIMIT = 5;
const siteCopyFieldOrder = [
  'homeTitle', 'homeDescription', 'heroLabel', 'heroLine1', 'heroLine2', 'heroBody',
  'forming', 'teamBody', 'teamCount', 'teamCountValue', 'teamStatus', 'focusLabel',
  'focusHeading', 'ai', 'aiText', 'sustainable', 'sustainableText', 'business',
  'businessText', 'joinLabel', 'joinHeading', 'joinBody', 'discord', 'inviteSoon',
  'onboarding',
] satisfies SiteCopyKey[];

type SectionKey = 'siteCopy' | 'upcomingEvent' | 'projects' | 'competitions';
type FieldErrors = Record<string, string>;
type SiteCopyDraft = { [Key in keyof EditableSiteCopy]: LocalizedDraft };
type EventDraft = Omit<EditableUpcomingCompetition, 'name' | 'branch' | 'note'> & {
  name: LocalizedDraft;
  branch: LocalizedDraft;
  note: LocalizedDraft;
};
type ProjectContributionDraft = { name: string; description: LocalizedDraft };
type ProjectLinkDraft = { label: LocalizedDraft; url: string };
type ProjectDraft = {
  title: LocalizedDraft;
  summary: LocalizedDraft;
  status: ProjectStatus;
  problem: LocalizedDraft;
  businessModel: LocalizedDraft;
  dates: string;
  contributions: ProjectContributionDraft[];
  links: ProjectLinkDraft[];
};
type CompetitionDraft = {
  name: LocalizedDraft;
  year: string;
  participants: string;
  stage: LocalizedDraft;
  contribution: LocalizedDraft;
  evidenceUrl: string;
};
type InitialAdminContent = {
  siteCopy: EditableSiteCopy;
  event: EditableUpcomingCompetition;
  projects: Page<Project>;
  founderCompetitions: Page<CompetitionRecord>;
  actCompetitions: Page<CompetitionRecord>;
};

type ContentEditorProps = {
  api: AdminApi;
  onLogout: () => Promise<void>;
  onSessionExpired: () => void;
};

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'url' | 'date' | 'number';
  multiline?: boolean;
  required?: boolean;
  error?: string;
  min?: number;
  max?: number;
};

function emptyLocalized(): LocalizedDraft {
  return { en: '', th: '' };
}

function fieldErrorMap(error: unknown, fallback: string): FieldErrors {
  if (error instanceof AdminApiError) {
    return Object.fromEntries(error.fieldErrors.map((entry) => [entry.field, fallback]));
  }
  if (error instanceof z.ZodError) {
    return Object.fromEntries(error.issues.map((issue) => [issue.path.map(String).join('.'), fallback]));
  }
  return {};
}

function feedbackFor(error: unknown, messages: ReturnType<typeof getAdminMessages>): string {
  if (error instanceof AdminApiError) {
    if (error.status === 412) return messages.feedback.conflict;
    if (error.status === 401) return messages.feedback.sessionExpired;
    if (error.status === 422) return messages.feedback.validationSummary;
  }
  if (error instanceof z.ZodError) return messages.feedback.validationSummary;
  return messages.feedback.saveError;
}

function reportFailure(input: {
  error: unknown;
  messages: ReturnType<typeof getAdminMessages>;
  setAlert: (message: string) => void;
  setErrors: (errors: FieldErrors) => void;
  onSessionExpired: () => void;
}): void {
  input.setAlert(feedbackFor(input.error, input.messages));
  input.setErrors(fieldErrorMap(input.error, input.messages.feedback.fieldInvalid));
  if (input.error instanceof AdminApiError && input.error.status === 401) input.onSessionExpired();
}

function localizedErrors(errors: FieldErrors, path: string): Partial<Record<'en' | 'th', string>> {
  const english = errors[`${path}.en`];
  const thai = errors[`${path}.th`];
  return {
    ...(english ? { en: english } : {}),
    ...(thai ? { th: thai } : {}),
  };
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  multiline = false,
  required = true,
  error,
  min,
  max,
}: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="admin-form-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={3}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          min={min}
          max={max}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
      {error && <span id={errorId} className="admin-field-error">{error}</span>}
    </div>
  );
}

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="admin-form-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const selected = options.find((option) => option.value === event.currentTarget.value);
          if (selected) onChange(selected.value);
        }}
      >
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function ErrorSummary({ message }: { message: string | null }) {
  return message ? <p className="admin-alert" role="alert">{message}</p> : null;
}

function SaveStatus({ message }: { message: string | null }) {
  return message ? <p className="admin-save-status" role="status">{message}</p> : null;
}

function ConflictReloadButton({ visible, busy, onReload }: { visible: boolean; busy: boolean; onReload: () => void }) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  if (!visible) return null;
  return (
    <button className="admin-button admin-button-secondary" type="button" disabled={busy} onClick={onReload}>
      {messages.actions.reloadLatest}
    </button>
  );
}

function SiteCopyPanel({
  api,
  initialCopy,
  onSessionExpired,
}: {
  api: AdminApi;
  initialCopy: EditableSiteCopy;
  onSessionExpired: () => void;
}) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  const [copy, setCopy] = useState<SiteCopyDraft>(initialCopy);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [conflicted, setConflicted] = useState(false);

  useEffect(() => setCopy(initialCopy), [initialCopy]);

  const updateField = (key: SiteCopyKey, value: LocalizedDraft) => {
    setCopy((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[`${key}.en`];
      delete next[`${key}.th`];
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (conflicted) return;
    setAlert(null);
    setStatus(null);
    const parsed = editableSiteCopySchema.safeParse(copy);
    if (!parsed.success) {
      setErrors(fieldErrorMap(parsed.error, messages.feedback.fieldInvalid));
      setAlert(messages.feedback.validationSummary);
      return;
    }
    setBusy(true);
    try {
      const saved = await api.saveSiteCopy(parsed.data);
      setCopy(saved.resource);
      setErrors({});
      setStatus(messages.feedback.siteCopySaved);
    } catch (error) {
      if (error instanceof AdminApiError && error.isConflict) setConflicted(true);
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const reloadLatest = async () => {
    if (!window.confirm(messages.feedback.reloadConflictPrompt)) return;
    setBusy(true);
    try {
      const latest = await api.getSiteCopy();
      setCopy(latest);
      setErrors({});
      setAlert(null);
      setConflicted(false);
      setStatus(messages.feedback.latestReloaded);
    } catch (error) {
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-form admin-copy-form" onSubmit={submit} noValidate>
      <p className="admin-section-intro">{messages.sections.siteCopy}</p>
      <div className="admin-localized-grid">
        {siteCopyFieldOrder.map((key) => (
          <LocalizedFields
            key={key}
            id={`copy-${key}`}
            label={messages.siteCopyFields[key]}
            value={copy[key]}
            multiline={['homeDescription', 'heroBody', 'teamBody', 'aiText', 'sustainableText', 'businessText', 'joinBody', 'onboarding'].includes(key)}
            errors={localizedErrors(errors, key)}
            onChange={(value) => updateField(key, value)}
          />
        ))}
      </div>
      <ErrorSummary message={alert} />
      <SaveStatus message={status} />
      <div className="admin-form-actions">
        <button className="admin-button admin-button-primary" type="submit" disabled={busy || conflicted}>
          {messages.actions.saveSiteCopy}
        </button>
        <ConflictReloadButton visible={conflicted} busy={busy} onReload={() => void reloadLatest()} />
      </div>
    </form>
  );
}

function EventPanel({
  api,
  initialEvent,
  onSessionExpired,
}: {
  api: AdminApi;
  initialEvent: EditableUpcomingCompetition;
  onSessionExpired: () => void;
}) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  const [event, setEvent] = useState<EventDraft>(initialEvent);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [conflicted, setConflicted] = useState(false);

  useEffect(() => setEvent(initialEvent), [initialEvent]);

  const updateLocalized = (key: 'name' | 'branch' | 'note', value: LocalizedDraft) => {
    setEvent((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[`${key}.en`];
      delete next[`${key}.th`];
      return next;
    });
  };

  const submit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (conflicted) return;
    setAlert(null);
    setStatus(null);
    const parsed = editableUpcomingCompetitionSchema.safeParse(event);
    if (!parsed.success) {
      setErrors(fieldErrorMap(parsed.error, messages.feedback.fieldInvalid));
      setAlert(messages.feedback.validationSummary);
      return;
    }
    setBusy(true);
    try {
      const saved = await api.saveUpcomingCompetition(parsed.data);
      setEvent(saved.resource);
      setErrors({});
      setStatus(messages.feedback.eventSaved);
    } catch (error) {
      if (error instanceof AdminApiError && error.isConflict) setConflicted(true);
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const reloadLatest = async () => {
    if (!window.confirm(messages.feedback.reloadConflictPrompt)) return;
    setBusy(true);
    try {
      const latest = await api.getUpcomingCompetition();
      setEvent(latest);
      setErrors({});
      setAlert(null);
      setConflicted(false);
      setStatus(messages.feedback.latestReloaded);
    } catch (error) {
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const statusOptions: Array<{ value: EventStatus; label: string }> = [
    { value: 'planned', label: messages.values.planned },
    { value: 'confirmed', label: messages.values.confirmed },
    { value: 'completed', label: messages.values.completed },
    { value: 'postponed', label: messages.values.postponed },
    { value: 'cancelled', label: messages.values.cancelled },
  ];
  const registrationOptions: Array<{ value: RegistrationStatus; label: string }> = [
    { value: 'not-registered', label: messages.values.notRegistered },
    { value: 'registered', label: messages.values.registered },
    { value: 'registration-closed', label: messages.values.registrationClosed },
  ];

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <p className="admin-section-intro">{messages.sections.upcomingEvent}</p>
      <div className="admin-localized-grid">
        <LocalizedFields id="event-name" label={messages.eventFields.name} value={event.name} errors={localizedErrors(errors, 'name')} onChange={(value) => updateLocalized('name', value)} />
        <LocalizedFields id="event-branch" label={messages.eventFields.branch} value={event.branch} errors={localizedErrors(errors, 'branch')} onChange={(value) => updateLocalized('branch', value)} />
        <LocalizedFields id="event-note" label={messages.eventFields.note} value={event.note} multiline errors={localizedErrors(errors, 'note')} onChange={(value) => updateLocalized('note', value)} />
      </div>
      <div className="admin-form-grid">
        <TextField id="event-start-date" label={messages.eventFields.startDate} type="date" value={event.startDate} onChange={(value) => setEvent((current) => ({ ...current, startDate: value }))} error={errors.startDate} />
        <TextField id="event-end-date" label={messages.eventFields.endDate} type="date" value={event.endDate} onChange={(value) => setEvent((current) => ({ ...current, endDate: value }))} error={errors.endDate} />
        <TextField id="event-application-deadline" label={messages.eventFields.applicationDeadline} type="date" value={event.applicationDeadline} onChange={(value) => setEvent((current) => ({ ...current, applicationDeadline: value }))} error={errors.applicationDeadline} />
        <TextField id="event-final-start-date" label={messages.eventFields.finalStartDate} type="date" value={event.finalStartDate} onChange={(value) => setEvent((current) => ({ ...current, finalStartDate: value }))} error={errors.finalStartDate} />
        <TextField id="event-final-end-date" label={messages.eventFields.finalEndDate} type="date" value={event.finalEndDate} onChange={(value) => setEvent((current) => ({ ...current, finalEndDate: value }))} error={errors.finalEndDate} />
        <SelectField id="event-status" label={messages.eventFields.status} value={event.status} options={statusOptions} onChange={(value) => setEvent((current) => ({ ...current, status: value }))} />
        <SelectField id="event-registration" label={messages.eventFields.registration} value={event.registration} options={registrationOptions} onChange={(value) => setEvent((current) => ({ ...current, registration: value }))} />
        <TextField id="event-official-url" label={messages.eventFields.officialUrl} type="url" value={event.officialUrl} onChange={(value) => setEvent((current) => ({ ...current, officialUrl: value }))} error={errors.officialUrl} />
      </div>
      <ErrorSummary message={alert} />
      <SaveStatus message={status} />
      <div className="admin-form-actions">
        <button className="admin-button admin-button-primary" type="submit" disabled={busy || conflicted}>{messages.actions.saveEvent}</button>
        <ConflictReloadButton visible={conflicted} busy={busy} onReload={() => void reloadLatest()} />
      </div>
    </form>
  );
}

function emptyProjectDraft(): ProjectDraft {
  return {
    title: emptyLocalized(),
    summary: emptyLocalized(),
    status: 'planned',
    problem: emptyLocalized(),
    businessModel: emptyLocalized(),
    dates: '',
    contributions: [],
    links: [],
  };
}

function projectDraftFrom(project: Project): ProjectDraft {
  return {
    title: project.title,
    summary: project.summary,
    status: project.status,
    problem: project.problem ?? emptyLocalized(),
    businessModel: project.businessModel ?? emptyLocalized(),
    dates: project.dates ?? '',
    contributions: (project.contributions ?? []).map((entry) => ({ name: entry.name, description: entry.description })),
    links: (project.links ?? []).map((entry) => ({ label: entry.label, url: entry.url })),
  };
}

function projectInputFromDraft(draft: ProjectDraft): unknown {
  const hasOptional = (value: LocalizedDraft) => Boolean(value.en.trim() || value.th.trim());
  return {
    title: draft.title,
    summary: draft.summary,
    status: draft.status,
    ...(hasOptional(draft.problem) ? { problem: draft.problem } : {}),
    ...(hasOptional(draft.businessModel) ? { businessModel: draft.businessModel } : {}),
    ...(draft.dates.trim() ? { dates: draft.dates } : {}),
    ...(draft.contributions.length > 0 ? { contributions: draft.contributions } : {}),
    ...(draft.links.length > 0 ? { links: draft.links } : {}),
  };
}

function ProjectsPanel({
  api,
  initialPage,
  onSessionExpired,
}: {
  api: AdminApi;
  initialPage: Page<Project>;
  onSessionExpired: () => void;
}) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  const [page, setPage] = useState(initialPage);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [conflicted, setConflicted] = useState(false);

  useEffect(() => setPage(initialPage), [initialPage]);

  const refresh = async (pageNumber: number) => {
    const updated = await api.getProjects({ page: pageNumber, limit: PAGE_LIMIT });
    setPage(updated);
    return updated;
  };

  const reloadLatest = async () => {
    if (!window.confirm(messages.feedback.reloadConflictPrompt)) return;
    setBusy(true);
    try {
      await refresh(page.pagination.page);
      setDraft(null);
      setEditingId(null);
      setErrors({});
      setAlert(null);
      setConflicted(false);
      setStatus(messages.feedback.latestReloaded);
    } catch (error) {
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const openNew = () => {
    setDraft(emptyProjectDraft());
    setEditingId(null);
    setErrors({});
    setAlert(null);
    setStatus(null);
  };

  const openEdit = (project: Project) => {
    setDraft(projectDraftFrom(project));
    setEditingId(project.id);
    setErrors({});
    setAlert(null);
    setStatus(null);
  };

  const cancelForm = () => {
    setDraft(null);
    setEditingId(null);
    setErrors({});
    setAlert(null);
  };

  const changeDraft = (next: ProjectDraft) => {
    setDraft(next);
    setErrors({});
    setAlert(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || conflicted) return;
    setAlert(null);
    setStatus(null);
    const parsed = newProjectSchema.safeParse(projectInputFromDraft(draft));
    if (!parsed.success) {
      setErrors(fieldErrorMap(parsed.error, messages.feedback.fieldInvalid));
      setAlert(messages.feedback.validationSummary);
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        const editable = projectSchema.parse({ ...parsed.data, id: editingId });
        await api.updateProject(editable, { page: page.pagination.page, limit: page.pagination.limit });
        setStatus(messages.feedback.projectSaved);
      } else {
        await api.createProject(parsed.data, { page: page.pagination.page, limit: page.pagination.limit });
        setStatus(messages.feedback.projectCreated);
      }
      const latest = await refresh(page.pagination.page);
      if (latest.data.some((project) => project.id === editingId) || editingId === null) {
        setDraft(null);
        setEditingId(null);
      }
      setErrors({});
    } catch (error) {
      if (error instanceof AdminApiError && error.isConflict) setConflicted(true);
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (project: Project) => {
    if (!window.confirm(messages.feedback.deleteProjectPrompt)) return;
    setAlert(null);
    setStatus(null);
    setBusy(true);
    try {
      await api.deleteProject(project.id, { page: page.pagination.page, limit: page.pagination.limit });
      const nextTotal = Math.max(0, page.pagination.total - 1);
      const nextPage = Math.min(page.pagination.page, Math.max(1, Math.ceil(nextTotal / PAGE_LIMIT)));
      await refresh(nextPage);
      setStatus(messages.feedback.projectDeleted);
    } catch (error) {
      if (error instanceof AdminApiError && error.isConflict) setConflicted(true);
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const movePage = async (number: number) => {
    setBusy(true);
    setAlert(null);
    try {
      await refresh(number);
    } catch (error) {
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
    { value: 'planned', label: messages.values.projectPlanned },
    { value: 'in-progress', label: messages.values.inProgress },
    { value: 'completed', label: messages.values.projectCompleted },
  ];
  const totalPages = Math.max(1, Math.ceil(page.pagination.total / PAGE_LIMIT));

  return (
    <div className="admin-record-manager">
      <div className="admin-manager-heading">
        <p>{messages.sections.projects}</p>
        <button className="admin-button admin-button-secondary" type="button" disabled={busy || conflicted} onClick={openNew}>{messages.actions.addProject}</button>
      </div>
      {draft && (
        <form className="admin-form admin-record-form" onSubmit={submit} noValidate>
          <div className="admin-form-heading"><h3>{editingId ? messages.actions.saveProject : messages.actions.createProject}</h3></div>
          <div className="admin-localized-grid">
            <LocalizedFields id="project-title" label={messages.projectFields.title} value={draft.title} errors={localizedErrors(errors, 'title')} onChange={(value) => changeDraft({ ...draft, title: value })} />
            <LocalizedFields id="project-summary" label={messages.projectFields.summary} value={draft.summary} multiline errors={localizedErrors(errors, 'summary')} onChange={(value) => changeDraft({ ...draft, summary: value })} />
            <LocalizedFields id="project-problem" label={messages.projectFields.problem} value={draft.problem} multiline errors={localizedErrors(errors, 'problem')} onChange={(value) => changeDraft({ ...draft, problem: value })} />
            <LocalizedFields id="project-business-model" label={messages.projectFields.businessModel} value={draft.businessModel} multiline errors={localizedErrors(errors, 'businessModel')} onChange={(value) => changeDraft({ ...draft, businessModel: value })} />
          </div>
          <div className="admin-form-grid">
            <SelectField id="project-status" label={messages.projectFields.status} value={draft.status} options={projectStatusOptions} onChange={(value) => changeDraft({ ...draft, status: value })} />
            <TextField id="project-dates" label={messages.projectFields.dates} value={draft.dates} required={false} onChange={(value) => changeDraft({ ...draft, dates: value })} error={errors.dates} />
          </div>
          <fieldset className="admin-repeater">
            <legend>{messages.projectFields.contributionDescription}</legend>
            {draft.contributions.map((contribution, index) => (
              <div className="admin-repeater-row" key={`contribution-${index}`}>
                <TextField
                  id={`contribution-name-${index}`}
                  label={messages.projectFields.contributionName}
                  value={contribution.name}
                  onChange={(name) => changeDraft({ ...draft, contributions: draft.contributions.map((row, rowIndex) => rowIndex === index ? { ...row, name } : row) })}
                  error={errors[`contributions.${index}.name`]}
                />
                <LocalizedFields
                  id={`contribution-description-${index}`}
                  label={messages.projectFields.contributionDescription}
                  value={contribution.description}
                  errors={localizedErrors(errors, `contributions.${index}.description`)}
                  onChange={(description) => changeDraft({ ...draft, contributions: draft.contributions.map((row, rowIndex) => rowIndex === index ? { ...row, description } : row) })}
                />
                <button className="admin-button admin-button-quiet" type="button" onClick={() => changeDraft({ ...draft, contributions: draft.contributions.filter((_, rowIndex) => rowIndex !== index) })} aria-label={`${messages.actions.removeContribution} ${index + 1}`}>{messages.actions.removeContribution}</button>
              </div>
            ))}
            <button className="admin-button admin-button-quiet" type="button" disabled={draft.contributions.length >= 50} onClick={() => changeDraft({ ...draft, contributions: [...draft.contributions, { name: '', description: emptyLocalized() }] })}>{messages.actions.addContribution}</button>
          </fieldset>
          <fieldset className="admin-repeater">
            <legend>{messages.projectFields.linkLabel}</legend>
            {draft.links.map((link, index) => (
              <div className="admin-repeater-row" key={`link-${index}`}>
                <LocalizedFields
                  id={`project-link-label-${index}`}
                  label={messages.projectFields.linkLabel}
                  value={link.label}
                  errors={localizedErrors(errors, `links.${index}.label`)}
                  onChange={(label) => changeDraft({ ...draft, links: draft.links.map((row, rowIndex) => rowIndex === index ? { ...row, label } : row) })}
                />
                <TextField
                  id={`project-link-url-${index}`}
                  label={messages.projectFields.linkUrl}
                  type="url"
                  value={link.url}
                  onChange={(url) => changeDraft({ ...draft, links: draft.links.map((row, rowIndex) => rowIndex === index ? { ...row, url } : row) })}
                  error={errors[`links.${index}.url`]}
                />
                <button className="admin-button admin-button-quiet" type="button" onClick={() => changeDraft({ ...draft, links: draft.links.filter((_, rowIndex) => rowIndex !== index) })} aria-label={`${messages.actions.removeLink} ${index + 1}`}>{messages.actions.removeLink}</button>
              </div>
            ))}
            <button className="admin-button admin-button-quiet" type="button" disabled={draft.links.length >= 50} onClick={() => changeDraft({ ...draft, links: [...draft.links, { label: emptyLocalized(), url: '' }] })}>{messages.actions.addLink}</button>
          </fieldset>
          <ErrorSummary message={alert} />
          <div className="admin-form-actions">
            <button className="admin-button admin-button-primary" type="submit" disabled={busy || conflicted}>{editingId ? messages.actions.saveProject : messages.actions.createProject}</button>
            <button className="admin-button admin-button-quiet" type="button" onClick={cancelForm}>{messages.actions.cancel}</button>
          </div>
        </form>
      )}
      <ConflictReloadButton visible={conflicted} busy={busy} onReload={() => void reloadLatest()} />
      {page.data.length === 0 ? <p className="admin-empty-state">{messages.feedback.noProjects}</p> : (
        <div className="admin-record-list">
          {page.data.map((project) => (
            <article className="admin-record-card" key={project.id}>
              <div>
                <h3>{project.title[locale]}</h3>
                <p>{project.summary[locale]}</p>
                <span className="admin-record-status">{project.status === 'planned' ? messages.values.projectPlanned : project.status === 'in-progress' ? messages.values.inProgress : messages.values.projectCompleted}</span>
              </div>
              <div className="admin-record-actions">
                <button className="admin-button admin-button-quiet" type="button" disabled={busy || conflicted} onClick={() => openEdit(project)}>{messages.actions.editProject(project.title[locale])}</button>
                <button className="admin-button admin-button-danger" type="button" disabled={busy || conflicted} onClick={() => void remove(project)}>{messages.actions.deleteProject(project.title[locale])}</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <ErrorSummary message={alert} />
      <SaveStatus message={status} />
      <PaginationControls
        current={page.pagination.page}
        total={totalPages}
        hasPrevious={page.pagination.hasPrevious}
        hasNext={page.pagination.hasMore}
        previousLabel={messages.actions.previousProjects}
        nextLabel={messages.actions.nextProjects}
        onPrevious={() => void movePage(page.pagination.page - 1)}
        onNext={() => void movePage(page.pagination.page + 1)}
        busy={busy || draft !== null || conflicted}
      />
    </div>
  );
}

function emptyCompetitionDraft(): CompetitionDraft {
  return {
    name: emptyLocalized(),
    year: '',
    participants: '',
    stage: emptyLocalized(),
    contribution: emptyLocalized(),
    evidenceUrl: '',
  };
}

function competitionDraftFrom(record: CompetitionRecord): CompetitionDraft {
  return {
    name: record.name,
    year: String(record.year),
    participants: record.participants.join(', '),
    stage: record.stage,
    contribution: record.contribution ?? emptyLocalized(),
    evidenceUrl: record.evidenceUrl ?? '',
  };
}

function PaginationControls({
  current,
  total,
  hasPrevious,
  hasNext,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  busy,
}: {
  current: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  busy: boolean;
}) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  return (
    <nav className="admin-pagination" aria-label={locale === 'en' ? 'Record pages' : 'หน้ารายการ'}>
      <p aria-live="polite">{messages.feedback.pageLabel(current, total)}</p>
      <div>
        <button className="admin-button admin-button-quiet" type="button" disabled={!hasPrevious || busy} onClick={onPrevious}>{previousLabel}</button>
        <button className="admin-button admin-button-quiet" type="button" disabled={!hasNext || busy} onClick={onNext}>{nextLabel}</button>
      </div>
    </nav>
  );
}

function CompetitionForm({
  recordType,
  initialRecord,
  busy,
  onCancel,
  onSave,
  onSessionExpired,
}: {
  recordType: CompetitionAttribution;
  initialRecord: CompetitionRecord | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (record: NewCompetition | CompetitionRecord) => Promise<void>;
  onSessionExpired: () => void;
}) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  const [draft, setDraft] = useState<CompetitionDraft>(() => initialRecord ? competitionDraftFrom(initialRecord) : emptyCompetitionDraft());
  const [alert, setAlert] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const change = (next: CompetitionDraft) => {
    setDraft(next);
    setErrors({});
    setAlert(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlert(null);
    const contributionIncluded = Boolean(draft.contribution.en.trim() || draft.contribution.th.trim());
    const evidenceUrl = draft.evidenceUrl.trim();
    const candidate = {
      recordType,
      name: draft.name,
      year: Number(draft.year),
      participants: draft.participants.split(',').map((name) => name.trim()).filter(Boolean),
      stage: draft.stage,
      ...(contributionIncluded ? { contribution: draft.contribution } : {}),
      ...(evidenceUrl ? { evidenceUrl } : {}),
    };
    const parsed = newCompetitionSchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors(fieldErrorMap(parsed.error, messages.feedback.fieldInvalid));
      setAlert(messages.feedback.validationSummary);
      return;
    }
    if (initialRecord) {
      const updated = competitionRecordSchema.safeParse({ ...parsed.data, id: initialRecord.id });
      if (!updated.success) {
        setErrors(fieldErrorMap(updated.error, messages.feedback.fieldInvalid));
        setAlert(messages.feedback.validationSummary);
        return;
      }
      try {
        await onSave(updated.data);
      } catch (error) {
        reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
      }
      return;
    }
    try {
      await onSave(parsed.data);
    } catch (error) {
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    }
  };

  return (
    <form className="admin-form admin-record-form" onSubmit={submit} noValidate>
      <div className="admin-localized-grid">
        <LocalizedFields id="competition-name" label={messages.competitionFields.name} value={draft.name} errors={localizedErrors(errors, 'name')} onChange={(value) => change({ ...draft, name: value })} />
        <LocalizedFields id="competition-stage" label={messages.competitionFields.stage} value={draft.stage} errors={localizedErrors(errors, 'stage')} onChange={(value) => change({ ...draft, stage: value })} />
        <LocalizedFields id="competition-contribution" label={messages.competitionFields.contribution} value={draft.contribution} errors={localizedErrors(errors, 'contribution')} onChange={(value) => change({ ...draft, contribution: value })} />
      </div>
      <div className="admin-form-grid">
        <TextField id="competition-year" label={messages.competitionFields.year} type="number" min={1900} max={2100} value={draft.year} onChange={(value) => change({ ...draft, year: value })} error={errors.year} />
        <TextField id="competition-participants" label={messages.competitionFields.participants} value={draft.participants} onChange={(value) => change({ ...draft, participants: value })} error={errors.participants} />
        <TextField id="competition-evidence-url" label={messages.competitionFields.evidenceUrl} type="url" value={draft.evidenceUrl} required={false} onChange={(value) => change({ ...draft, evidenceUrl: value })} error={errors.evidenceUrl} />
      </div>
      <ErrorSummary message={alert} />
      <div className="admin-form-actions">
        <button className="admin-button admin-button-primary" type="submit" disabled={busy}>
          {initialRecord ? messages.actions.saveCompetition : recordType === 'founder-pre-act' ? messages.actions.createFounderRecord : messages.actions.createActRecord}
        </button>
        <button className="admin-button admin-button-quiet" type="button" onClick={onCancel}>{messages.actions.cancel}</button>
      </div>
    </form>
  );
}

function CompetitionGroup({
  recordType,
  initialPage,
  onSessionExpired,
  api,
}: {
  recordType: CompetitionAttribution;
  initialPage: Page<CompetitionRecord>;
  onSessionExpired: () => void;
  api: AdminApi;
}) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  const isFounder = recordType === 'founder-pre-act';
  const groupTitle = isFounder ? messages.groups.founderTitle : messages.groups.actTitle;
  const groupDescription = isFounder ? messages.groups.founderDescription : messages.groups.actDescription;
  const groupRegion = isFounder ? messages.groups.founderRegion : messages.groups.actRegion;
  const addLabel = isFounder ? messages.actions.addFounderRecord : messages.actions.addActRecord;
  const previousLabel = isFounder ? messages.actions.previousFounderRecords : messages.actions.previousActRecords;
  const nextLabel = isFounder ? messages.actions.nextFounderRecords : messages.actions.nextActRecords;
  const [page, setPage] = useState(initialPage);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CompetitionRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [conflicted, setConflicted] = useState(false);

  useEffect(() => setPage(initialPage), [initialPage]);

  const refresh = async (pageNumber: number) => {
    const updated = await api.getCompetitions({ recordType, page: pageNumber, limit: PAGE_LIMIT });
    setPage(updated);
    return updated;
  };

  const reloadLatest = async () => {
    if (!window.confirm(messages.feedback.reloadConflictPrompt)) return;
    setBusy(true);
    try {
      await refresh(page.pagination.page);
      setEditingRecord(null);
      setIsCreating(false);
      setErrors({});
      setAlert(null);
      setConflicted(false);
      setStatus(messages.feedback.latestReloaded);
    } catch (error) {
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const saveRecord = async (record: NewCompetition | CompetitionRecord) => {
    if (conflicted) return;
    setAlert(null);
    setStatus(null);
    setBusy(true);
    try {
      if ('id' in record) {
        await api.updateCompetition(record, { page: page.pagination.page, limit: page.pagination.limit });
        setStatus(messages.feedback.competitionSaved);
      } else {
        await api.createCompetition(record, { page: page.pagination.page, limit: page.pagination.limit });
        setStatus(messages.feedback.competitionCreated);
      }
      await refresh(page.pagination.page);
      setEditingRecord(null);
      setIsCreating(false);
      setErrors({});
    } catch (error) {
      if (error instanceof AdminApiError && error.isConflict) setConflicted(true);
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (record: CompetitionRecord) => {
    if (!window.confirm(messages.feedback.deleteCompetitionPrompt)) return;
    setAlert(null);
    setStatus(null);
    setBusy(true);
    try {
      await api.deleteCompetition(record.id, recordType, { page: page.pagination.page, limit: page.pagination.limit });
      const nextTotal = Math.max(0, page.pagination.total - 1);
      const nextPage = Math.min(page.pagination.page, Math.max(1, Math.ceil(nextTotal / PAGE_LIMIT)));
      await refresh(nextPage);
      setStatus(messages.feedback.competitionDeleted);
    } catch (error) {
      if (error instanceof AdminApiError && error.isConflict) setConflicted(true);
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const movePage = async (number: number) => {
    setBusy(true);
    setAlert(null);
    try {
      await refresh(number);
    } catch (error) {
      reportFailure({ error, messages, setAlert: (value) => setAlert(value), setErrors, onSessionExpired });
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(page.pagination.total / PAGE_LIMIT));

  return (
    <section className="admin-competition-group" aria-label={groupRegion}>
      <div className="admin-group-heading">
        <div>
          <h3>{groupTitle}</h3>
          <p>{groupDescription}</p>
        </div>
        <button
          className="admin-button admin-button-secondary"
          type="button"
          disabled={busy || conflicted}
          onClick={() => {
            setIsCreating(true);
            setEditingRecord(null);
            setErrors({});
            setAlert(null);
          }}
        >{addLabel}</button>
      </div>
      <ConflictReloadButton visible={conflicted} busy={busy} onReload={() => void reloadLatest()} />
      {isCreating && (
        <CompetitionForm
          key={`${recordType}-new`}
          recordType={recordType}
          initialRecord={null}
          busy={busy || conflicted}
          onCancel={() => setIsCreating(false)}
          onSave={saveRecord}
          onSessionExpired={onSessionExpired}
        />
      )}
      {editingRecord && (
        <CompetitionForm
          key={`${recordType}-${editingRecord.id}`}
          recordType={recordType}
          initialRecord={editingRecord}
          busy={busy || conflicted}
          onCancel={() => setEditingRecord(null)}
          onSave={saveRecord}
          onSessionExpired={onSessionExpired}
        />
      )}
      {page.data.length === 0 ? <p className="admin-empty-state">{isFounder ? messages.feedback.noFounderRecords : messages.feedback.noActRecords}</p> : (
        <div className="admin-record-list">
          {page.data.map((record) => (
            <article className="admin-record-card" key={record.id}>
              <div>
                <h4>{record.name[locale]}</h4>
                <p>{record.year} · {record.stage[locale]}</p>
                <p>{record.participants.join(', ')}</p>
              </div>
              <div className="admin-record-actions">
                <button className="admin-button admin-button-quiet" type="button" disabled={busy || conflicted} onClick={() => { setEditingRecord(record); setIsCreating(false); setAlert(null); setErrors({}); }}>{messages.actions.editCompetition(record.name[locale])}</button>
                <button className="admin-button admin-button-danger" type="button" disabled={busy || conflicted} onClick={() => void remove(record)}>{messages.actions.deleteCompetition(record.name[locale])}</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <ErrorSummary message={alert} />
      <SaveStatus message={status} />
      <PaginationControls
        current={page.pagination.page}
        total={totalPages}
        hasPrevious={page.pagination.hasPrevious}
        hasNext={page.pagination.hasMore}
        previousLabel={previousLabel}
        nextLabel={nextLabel}
        onPrevious={() => void movePage(page.pagination.page - 1)}
        onNext={() => void movePage(page.pagination.page + 1)}
        busy={busy || conflicted || isCreating || editingRecord !== null}
      />
    </section>
  );
}

export default function ContentEditor({ api, onLogout, onSessionExpired }: ContentEditorProps) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  const [activeSection, setActiveSection] = useState<SectionKey>('siteCopy');
  const [content, setContent] = useState<InitialAdminContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getSiteCopy(),
      api.getUpcomingCompetition(),
      api.getProjects({ page: 1, limit: PAGE_LIMIT }),
      api.getCompetitions({ recordType: 'founder-pre-act', page: 1, limit: PAGE_LIMIT }),
      api.getCompetitions({ recordType: 'act', page: 1, limit: PAGE_LIMIT }),
    ]).then(([siteCopy, event, projects, founderCompetitions, actCompetitions]) => {
      if (!active) return;
      setContent({ siteCopy, event, projects, founderCompetitions, actCompetitions });
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof AdminApiError && error.status === 401) onSessionExpired();
      setLoadError(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, [api, onSessionExpired]);

  const logout = async () => {
    setLogoutBusy(true);
    try {
      await onLogout();
    } finally {
      setLogoutBusy(false);
    }
  };

  const sections: Array<{ key: SectionKey; label: string }> = [
    { key: 'siteCopy', label: messages.sections.siteCopy },
    { key: 'upcomingEvent', label: messages.sections.upcomingEvent },
    { key: 'projects', label: messages.sections.projects },
    { key: 'competitions', label: messages.sections.competitions },
  ];

  return (
    <section className="admin-editor glass-panel" aria-labelledby="admin-editor-title">
      <div className="admin-editor-header">
        <div>
          <span className="admin-kicker">{messages.studioTitle}</span>
          <h2 id="admin-editor-title">{messages.editorTitle}</h2>
        </div>
        <button className="admin-button admin-button-quiet" type="button" disabled={logoutBusy} onClick={() => void logout()}>{messages.signOut}</button>
      </div>
      <nav className="admin-section-tabs" aria-label={locale === 'en' ? 'Editor sections' : 'ส่วนแก้ไข'}>
        {sections.map((section) => (
          <button
            className="admin-tab"
            type="button"
            key={section.key}
            aria-pressed={activeSection === section.key}
            onClick={() => setActiveSection(section.key)}
          >{section.label}</button>
        ))}
      </nav>
      {loading && <p className="admin-loading" role="status">{messages.loadingContent}</p>}
      {loadError && <p className="admin-alert" role="alert">{messages.editorLoadFailed}</p>}
      {content && (
        <div className="admin-panels">
          <section className="admin-section-content" aria-labelledby="admin-copy-panel-title" hidden={activeSection !== 'siteCopy'}>
            <h3 id="admin-copy-panel-title" className="admin-visually-hidden">{messages.sections.siteCopy}</h3>
            <SiteCopyPanel api={api} initialCopy={content.siteCopy} onSessionExpired={onSessionExpired} />
          </section>
          <section className="admin-section-content" aria-labelledby="admin-event-panel-title" hidden={activeSection !== 'upcomingEvent'}>
            <h3 id="admin-event-panel-title" className="admin-visually-hidden">{messages.sections.upcomingEvent}</h3>
            <EventPanel api={api} initialEvent={content.event} onSessionExpired={onSessionExpired} />
          </section>
          <section className="admin-section-content" aria-labelledby="admin-projects-panel-title" hidden={activeSection !== 'projects'}>
            <h3 id="admin-projects-panel-title" className="admin-visually-hidden">{messages.sections.projects}</h3>
            <ProjectsPanel api={api} initialPage={content.projects} onSessionExpired={onSessionExpired} />
          </section>
          <section className="admin-section-content" aria-labelledby="admin-competitions-panel-title" hidden={activeSection !== 'competitions'}>
            <h3 id="admin-competitions-panel-title" className="admin-visually-hidden">{messages.sections.competitions}</h3>
            <div className="admin-competition-groups">
              <CompetitionGroup api={api} recordType="founder-pre-act" initialPage={content.founderCompetitions} onSessionExpired={onSessionExpired} />
              <CompetitionGroup api={api} recordType="act" initialPage={content.actCompetitions} onSessionExpired={onSessionExpired} />
            </div>
          </section>
        </div>
      )}
      <ErrorSummary message={null} />
    </section>
  );
}
