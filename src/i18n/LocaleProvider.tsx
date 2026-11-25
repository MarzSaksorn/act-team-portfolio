import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { messages, type Locale, type Messages } from './messages';

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; text: Messages };
const LocaleContext = createContext<LocaleContextValue | null>(null);

function storedLocale(): Locale | null {
  try {
    const value = localStorage.getItem('act-locale');
    return value === 'en' || value === 'th' ? value : null;
  } catch {
    return null;
  }
}

function cookieLocale(): Locale | null {
  try {
    const cookie = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('act-locale='));
    const value = cookie?.slice('act-locale='.length);
    return value === 'en' || value === 'th' ? value : null;
  } catch {
    return null;
  }
}

export function LocaleProvider({ children, initialLocale = 'en' }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const firstEffect = useRef(true);

  useEffect(() => {
    if (firstEffect.current) {
      firstEffect.current = false;
      const preferredLocale = cookieLocale() ?? storedLocale();
      if (preferredLocale && preferredLocale !== locale) {
        setLocale(preferredLocale);
        return;
      }
    }

    document.documentElement.lang = locale;
    try {
      localStorage.setItem('act-locale', locale);
    } catch {
      // Storage can be disabled; the switch still works for this page view.
    }
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `act-locale=${locale}; Path=/; SameSite=Lax${secure}`;
  }, [locale]);

  return <LocaleContext.Provider value={{ locale, setLocale, text: messages[locale] }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider');
  return context;
}
