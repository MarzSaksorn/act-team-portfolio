import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { messages, type Locale, type Messages } from './messages';

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; text: Messages };
const LocaleContext = createContext<LocaleContextValue | null>(null);
function storedLocale(): Locale {
  try { return localStorage.getItem('act-locale') === 'th' ? 'th' : 'en'; } catch { return 'en'; }
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(storedLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem('act-locale', locale); } catch { /* Storage can be disabled; the switch still works. */ }
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, text: messages[locale] }}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}
