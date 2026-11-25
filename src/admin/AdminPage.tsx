import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../i18n/LocaleProvider';
import { usePageMeta } from '../hooks/usePageMeta';
import { AdminApi, AdminApiError } from './admin-api';
import AdminLoginForm from './AdminLoginForm';
import ContentEditor from './ContentEditor';
import { getAdminMessages } from './admin-messages';
import './admin.css';

type AdminPhase = 'checking' | 'offline' | 'login' | 'editor';

export default function AdminPage() {
  const { locale } = useLocale();
  const messages = getAdminMessages(locale);
  const api = useMemo(() => new AdminApi(), []);
  const [phase, setPhase] = useState<AdminPhase>('checking');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  usePageMeta(`${messages.studioTitle} | ACT`, messages.loginHelp);

  useEffect(() => {
    let active = true;
    api.getSession().then((session) => {
      if (active) setPhase(session.authenticated ? 'editor' : 'login');
    }).catch(() => {
      if (active) setPhase('offline');
    });
    return () => { active = false; };
  }, [api]);

  const onSessionExpired = useCallback(() => {
    setLoginError(messages.feedback.sessionExpired);
    setPhase('login');
  }, [api, messages.feedback.sessionExpired]);

  const signIn = async (credentials: { username: string; password: string }) => {
    setLoginBusy(true);
    setLoginError(null);
    try {
      await api.login(credentials);
      setPhase('editor');
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setLoginError(messages.feedback.invalidCredentials);
      } else if (error instanceof AdminApiError && error.status === 0) {
        setPhase('offline');
      } else {
        setLoginError(messages.feedback.saveError);
      }
    } finally {
      setLoginBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await api.logout();
      setLoginError(null);
      setPhase('login');
    } catch {
      setLoginError(messages.feedback.saveError);
      setPhase('login');
    }
  };

  const retrySession = () => {
    setPhase('checking');
    setLoginError(null);
    api.getSession().then((session) => {
      setPhase(session.authenticated ? 'editor' : 'login');
    }).catch(() => setPhase('offline'));
  };

  return (
    <div className="admin-page inner-page">
      <meta name="robots" content="noindex, nofollow" />
      <header className="admin-page-heading">
        <span className="admin-kicker">Avoonger Competition Team</span>
        <h1>{messages.studioTitle}</h1>
        <p>{messages.loginHelp}</p>
      </header>
      {phase === 'checking' && <p className="admin-loading" role="status">{messages.checkingSession}</p>}
      {phase === 'offline' && (
        <section className="admin-offline glass-panel" aria-label={messages.studioTitle}>
          <p>{messages.backendUnavailable}</p>
          <button className="admin-button admin-button-secondary" type="button" onClick={retrySession}>
            {locale === 'en' ? 'Retry connection' : 'ลองเชื่อมต่ออีกครั้ง'}
          </button>
        </section>
      )}
      {phase === 'login' && <AdminLoginForm busy={loginBusy} error={loginError} onSubmit={signIn} />}
      {phase === 'editor' && <ContentEditor api={api} onLogout={signOut} onSessionExpired={onSessionExpired} />}
    </div>
  );
}
