import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import i18n from "@/lib/i18n";

export type Language = "en" | "bn";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language, persist?: boolean) => void;
  t: (section: string, key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "dokan-lang";

const getInitialLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "bn") return stored;
  } catch {}
  return "bn";
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language, persist = true) => {
    setLanguageState(lang);
    void i18n.changeLanguage(lang);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    }
  }, []);

  // Sync i18next with stored language on mount
  useEffect(() => {
    void i18n.changeLanguage(language);
  }, []);

  const t = useCallback((section: string, key: string): string => {
    const result = i18n.t(`${section}.${key}`);
    if (typeof result === "string") return result;
    return key;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
