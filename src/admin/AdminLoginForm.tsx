import { useState, type FormEvent } from 'react';
import { useLocale } from '../i18n/LocaleProvider';
import { getAdminMessages } from './admin-messages';

type AdminLoginFormProps = {
  busy: boolean;
  error: string | null;
  onSubmit: (credentials: { username: string; password: string }) => Promise<void>;
};

export default function AdminLoginForm({ busy, error, onSubmit }: AdminLoginFormProps) {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const credentials = { username, password };
    setPassword('');
    await onSubmit(credentials);
  };

  return (
    <section className="admin-login glass-panel" aria-labelledby="admin-login-title">
      <span className="admin-kicker">{messages.studioTitle}</span>
      <h2 id="admin-login-title">{messages.loginTitle}</h2>
      <p>{messages.loginHelp}</p>
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-form-field">
          <label htmlFor="admin-username">{messages.username}</label>
          <input
            id="admin-username"
            name="username"
            autoComplete="username"
            required
            maxLength={120}
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
          />
        </div>
        <div className="admin-form-field">
          <label htmlFor="admin-password">{messages.password}</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
        </div>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        <button className="admin-button admin-button-primary" type="submit" disabled={busy}>
          {busy ? messages.signingIn : messages.signIn}
        </button>
      </form>
    </section>
  );
}
