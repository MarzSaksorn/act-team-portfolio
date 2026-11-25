import Database from 'better-sqlite3';
import { defaultSiteContent } from '../../src/data/defaultSiteContent';
import {
  localeSchema,
  siteContentSnapshotSchema,
  siteCopyKeySchema,
} from '../../src/types/site-content';

export function seedDatabase(db: Database.Database): void {
  const defaults = siteContentSnapshotSchema.parse(defaultSiteContent);
  const seed = db.transaction(() => {
    const existingState = db.prepare('SELECT singleton_id FROM content_state WHERE singleton_id = 1').get();
    if (existingState) return;

    db.prepare('INSERT INTO content_state (singleton_id, revision) VALUES (1, 0)').run();
    const insertCopy = db.prepare('INSERT INTO site_copy (content_key, locale, value) VALUES (?, ?, ?)');
    for (const [untrustedKey, translations] of Object.entries(defaults.siteCopy)) {
      const contentKey = siteCopyKeySchema.parse(untrustedKey);
      for (const untrustedLocale of ['en', 'th']) {
        const locale = localeSchema.parse(untrustedLocale);
        insertCopy.run(contentKey, locale, translations[locale]);
      }
    }

    const event = defaults.upcomingCompetition;
    db.prepare(`
      INSERT INTO upcoming_competitions (
        singleton_id, id, status, registration, start_date, end_date,
        application_deadline, final_start_date, final_end_date, official_url
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    const insertEventText = db.prepare(`
      INSERT INTO upcoming_competition_translations (singleton_id, locale, name, branch, note)
      VALUES (1, ?, ?, ?, ?)
    `);
    for (const untrustedLocale of ['en', 'th']) {
      const locale = localeSchema.parse(untrustedLocale);
      insertEventText.run(
        locale,
        event.name[locale],
        event.branch[locale],
        event.note[locale],
      );
    }
  });
  seed.immediate();
}
