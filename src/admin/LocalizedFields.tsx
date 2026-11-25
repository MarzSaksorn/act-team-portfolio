import type { ChangeEvent } from 'react';
import { useLocale } from '../i18n/LocaleProvider';
import { getAdminMessages } from './admin-messages';

export type LocalizedDraft = { en: string; th: string };

type LocalizedFieldErrors = Partial<Record<'en' | 'th', string>>;

type LocalizedFieldsProps = {
  id: string;
  label: string;
  value: LocalizedDraft;
  onChange: (value: LocalizedDraft) => void;
  errors?: LocalizedFieldErrors;
  multiline?: boolean;
};

export default function LocalizedFields({
  id,
  label,
  value,
  onChange,
  errors = {},
  multiline = false,
}: LocalizedFieldsProps) {
  const { locale } = useLocale();
  const text = getAdminMessages(locale);
  const languageNames = { en: text.localeEnglish, th: text.localeThai };

  const update = (locale: 'en' | 'th', event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ ...value, [locale]: event.currentTarget.value });
  };

  return (
    <fieldset className="admin-localized-fields">
      <legend>{label}</legend>
      {(['en', 'th'] as const).map((locale) => {
        const controlId = `${id}-${locale}`;
        const errorId = `${controlId}-error`;
        const describedBy = errors[locale] ? errorId : undefined;
        const fieldLabel = `${label} — ${languageNames[locale]}`;
        return (
          <div className="admin-form-field" key={locale}>
            <label htmlFor={controlId}>{fieldLabel}</label>
            {multiline ? (
              <textarea
                id={controlId}
                lang={locale}
                value={value[locale]}
                aria-required="true"
                aria-invalid={Boolean(errors[locale])}
                aria-describedby={describedBy}
                rows={3}
                onChange={(event) => update(locale, event)}
              />
            ) : (
              <input
                id={controlId}
                lang={locale}
                value={value[locale]}
                aria-required="true"
                aria-invalid={Boolean(errors[locale])}
                aria-describedby={describedBy}
                onChange={(event) => update(locale, event)}
              />
            )}
            {errors[locale] && <span id={errorId} className="admin-field-error">{errors[locale]}</span>}
          </div>
        );
      })}
    </fieldset>
  );
}
