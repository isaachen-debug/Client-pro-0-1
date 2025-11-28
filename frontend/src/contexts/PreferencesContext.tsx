import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LanguageOption, ThemeOption } from '../types';
import { useAuth } from './AuthContext';

const THEME_STORAGE_KEY = 'clientpro:theme';
const LANGUAGE_STORAGE_KEY = 'clientpro:language';

type TranslationDictionary = Record<
  LanguageOption,
  {
    layout: {
      brandSubtitle: string;
      preferencesTitle: string;
      themeLabel: string;
      languageLabel: string;
      lightOption: string;
      darkOption: string;
    };
    nav: {
      dashboard: string;
      today: string;
      clients: string;
      agenda: string;
      finance: string;
      profile: string;
    };
  }
>;

const translations: TranslationDictionary = {
  pt: {
    layout: {
      brandSubtitle: 'Gestão de clientes e agenda',
      preferencesTitle: 'Preferências rápidas',
      themeLabel: 'Tema',
      languageLabel: 'Idioma',
      lightOption: 'Claro',
      darkOption: 'Escuro',
    },
    nav: {
      dashboard: 'Dashboard',
      today: 'Hoje',
      clients: 'Clientes',
      agenda: 'Agenda',
      finance: 'Financeiro',
      profile: 'Perfil',
    },
  },
  en: {
    layout: {
      brandSubtitle: 'Client and schedule management',
      preferencesTitle: 'Quick preferences',
      themeLabel: 'Theme',
      languageLabel: 'Language',
      lightOption: 'Light',
      darkOption: 'Dark',
    },
    nav: {
      dashboard: 'Dashboard',
      today: 'Today',
      clients: 'Clients',
      agenda: 'Agenda',
      finance: 'Finance',
      profile: 'Profile',
    },
  },
  es: {
    layout: {
      brandSubtitle: 'Gestión de clientes y agenda',
      preferencesTitle: 'Preferencias rápidas',
      themeLabel: 'Tema',
      languageLabel: 'Idioma',
      lightOption: 'Claro',
      darkOption: 'Oscuro',
    },
    nav: {
      dashboard: 'Panel',
      today: 'Hoy',
      clients: 'Clientes',
      agenda: 'Agenda',
      finance: 'Finanzas',
      profile: 'Perfil',
    },
  },
};

interface PreferencesContextValue {
  theme: ThemeOption;
  language: LanguageOption;
  setThemePreference: (theme: ThemeOption) => Promise<void>;
  setLanguagePreference: (language: LanguageOption) => Promise<void>;
  t: (path: string) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const getInitialValue = <T extends string>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const stored = window.localStorage.getItem(key);
  return (stored as T) || fallback;
};

const resolveTranslation = (language: LanguageOption, path: string) => {
  const dictionary = translations[language] ?? translations.pt;
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dictionary);
};

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user, updateProfile } = useAuth();
  const [theme, setTheme] = useState<ThemeOption>(() => user?.preferredTheme || getInitialValue(THEME_STORAGE_KEY, 'light'));
  const [language, setLanguage] = useState<LanguageOption>(
    () => user?.preferredLanguage || getInitialValue(LANGUAGE_STORAGE_KEY, 'pt'),
  );

  useEffect(() => {
    if (user?.preferredTheme && user.preferredTheme !== theme) {
      setTheme(user.preferredTheme as ThemeOption);
    }
  }, [user?.preferredTheme]);

  useEffect(() => {
    if (user?.preferredLanguage && user.preferredLanguage !== language) {
      setLanguage(user.preferredLanguage as LanguageOption);
    }
  }, [user?.preferredLanguage]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', language);
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  const setThemePreference = useCallback(
    async (nextTheme: ThemeOption) => {
      setTheme(nextTheme);
      if (user && user.preferredTheme !== nextTheme) {
        try {
          await updateProfile({ preferredTheme: nextTheme });
        } catch (error) {
          console.error('Erro ao salvar tema preferido:', error);
        }
      }
    },
    [user, updateProfile],
  );

  const setLanguagePreference = useCallback(
    async (nextLanguage: LanguageOption) => {
      setLanguage(nextLanguage);
      if (user && user.preferredLanguage !== nextLanguage) {
        try {
          await updateProfile({ preferredLanguage: nextLanguage });
        } catch (error) {
          console.error('Erro ao salvar idioma preferido:', error);
        }
      }
    },
    [user, updateProfile],
  );

  const t = useCallback(
    (path: string) => {
      const value = resolveTranslation(language, path) ?? resolveTranslation('pt', path);
      if (typeof value === 'string') {
        return value;
      }
      return path;
    },
    [language],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      language,
      setThemePreference,
      setLanguagePreference,
      t,
    }),
    [theme, language, setThemePreference, setLanguagePreference, t],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences deve ser usado dentro de PreferencesProvider');
  }
  return context;
};

