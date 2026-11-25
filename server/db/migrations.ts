import Database from 'better-sqlite3';
import { z } from 'zod';

const migrationRowSchema = z.object({ version: z.number().int().positive() }).strict();

const initialSchema = `
  CREATE TABLE content_state (
    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
    revision INTEGER NOT NULL CHECK (revision >= 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ) STRICT;

  CREATE TABLE site_copy (
    content_key TEXT NOT NULL,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'th')),
    value TEXT NOT NULL CHECK (length(trim(value)) BETWEEN 1 AND 2000),
    PRIMARY KEY (content_key, locale)
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE upcoming_competitions (
    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
    id TEXT NOT NULL UNIQUE CHECK (length(trim(id)) BETWEEN 1 AND 120),
    status TEXT NOT NULL CHECK (status IN ('planned', 'confirmed', 'completed', 'postponed', 'cancelled')),
    registration TEXT NOT NULL CHECK (registration IN ('not-registered', 'registered', 'registration-closed')),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    application_deadline TEXT NOT NULL,
    final_start_date TEXT NOT NULL,
    final_end_date TEXT NOT NULL,
    official_url TEXT NOT NULL CHECK (official_url LIKE 'https://%')
  ) STRICT;

  CREATE TABLE upcoming_competition_translations (
    singleton_id INTEGER NOT NULL REFERENCES upcoming_competitions(singleton_id) ON DELETE CASCADE,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'th')),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 2000),
    branch TEXT NOT NULL CHECK (length(trim(branch)) BETWEEN 1 AND 2000),
    note TEXT NOT NULL CHECK (length(trim(note)) BETWEEN 1 AND 2000),
    PRIMARY KEY (singleton_id, locale)
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL UNIQUE CHECK (position >= 0),
    status TEXT NOT NULL CHECK (status IN ('planned', 'in-progress', 'completed')),
    dates TEXT CHECK (dates IS NULL OR length(dates) <= 2000),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE project_translations (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'th')),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 2000),
    summary TEXT NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 2000),
    problem TEXT CHECK (problem IS NULL OR length(trim(problem)) BETWEEN 1 AND 2000),
    business_model TEXT CHECK (business_model IS NULL OR length(trim(business_model)) BETWEEN 1 AND 2000),
    PRIMARY KEY (project_id, locale)
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE project_contributions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 0),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    UNIQUE (project_id, position)
  ) STRICT;

  CREATE TABLE project_contribution_translations (
    contribution_id TEXT NOT NULL REFERENCES project_contributions(id) ON DELETE CASCADE,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'th')),
    description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 2000),
    PRIMARY KEY (contribution_id, locale)
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE project_links (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 0),
    url TEXT NOT NULL CHECK (url LIKE 'https://%'),
    UNIQUE (project_id, position)
  ) STRICT;

  CREATE TABLE project_link_translations (
    link_id TEXT NOT NULL REFERENCES project_links(id) ON DELETE CASCADE,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'th')),
    label TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 2000),
    PRIMARY KEY (link_id, locale)
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE competitions (
    id TEXT PRIMARY KEY,
    record_type TEXT NOT NULL CHECK (record_type IN ('founder-pre-act', 'act')),
    year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
    position INTEGER NOT NULL CHECK (position >= 0),
    evidence_url TEXT CHECK (evidence_url IS NULL OR evidence_url LIKE 'https://%'),
    updated_at TEXT NOT NULL,
    UNIQUE (record_type, position)
  ) STRICT;

  CREATE TABLE competition_translations (
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'th')),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 2000),
    stage TEXT NOT NULL CHECK (length(trim(stage)) BETWEEN 1 AND 2000),
    contribution TEXT CHECK (contribution IS NULL OR length(trim(contribution)) BETWEEN 1 AND 2000),
    PRIMARY KEY (competition_id, locale)
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE competition_participants (
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 0),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    PRIMARY KEY (competition_id, position)
  ) STRICT, WITHOUT ROWID;

  CREATE TABLE admin_sessions (
    token_hash TEXT PRIMARY KEY,
    csrf_token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  ) STRICT;

  CREATE INDEX projects_updated_at_idx ON projects(updated_at, id);
  CREATE INDEX competitions_type_year_idx ON competitions(record_type, year, id);
  CREATE INDEX admin_sessions_expiry_idx ON admin_sessions(expires_at);

  CREATE TRIGGER projects_max_100_insert
  BEFORE INSERT ON projects
  WHEN (SELECT count(*) FROM projects) >= 100
  BEGIN
    SELECT RAISE(ABORT, 'project record limit exceeded');
  END;

  CREATE TRIGGER competitions_max_100_insert
  BEFORE INSERT ON competitions
  WHEN (SELECT count(*) FROM competitions WHERE record_type = NEW.record_type) >= 100
  BEGIN
    SELECT RAISE(ABORT, 'competition attribution limit exceeded');
  END;

  CREATE TRIGGER competitions_max_100_update
  BEFORE UPDATE OF record_type ON competitions
  WHEN NEW.record_type <> OLD.record_type
    AND (SELECT count(*) FROM competitions WHERE record_type = NEW.record_type) >= 100
  BEGIN
    SELECT RAISE(ABORT, 'competition attribution limit exceeded');
  END;
`;

type Migration = { version: number; apply: (db: Database.Database) => void };

const migrations: Migration[] = [
  { version: 1, apply: (db) => db.exec(initialSchema) },
];

export function migrateDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY CHECK (version > 0),
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT;
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
  const appliedVersions = new Set(appliedRows.map((row) => migrationRowSchema.parse(row).version));
  const highestApplied = Math.max(0, ...appliedVersions);
  const latestMigration = Math.max(0, ...migrations.map((migration) => migration.version));
  if (highestApplied > latestMigration) {
    throw new Error('The database schema is newer than this application supports.');
  }

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;
    const apply = db.transaction(() => {
      const alreadyApplied = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(migration.version);
      if (alreadyApplied) return;
      migration.apply(db);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(migration.version);
    });
    apply.immediate();
  }
}
