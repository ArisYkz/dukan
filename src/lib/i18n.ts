import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translations from "@/constants/translations";
import type { Language } from "@/contexts/LanguageContext";

const supportedLngs: Language[] = ["en", "ru", "kk"];

void i18n.use(initReactI18next).init({
  // Our translations.ts already uses the { lang: { section: { key: value } } } shape,
  // which matches i18next resources when we treat each section as a namespace.
  // We bundle them as a single "translation" namespace so existing code still works.
  resources: supportedLngs.reduce(
    (acc, lng) => {
      acc[lng] = { translation: translations[lng] };
      return acc;
    },
    {} as Record<string, { translation: Record<string, unknown> }>,
  ),
  lng: "kk",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnObjects: true,
  // Use localStorage to persist language choice
  detection: undefined, // We handle persistence ourselves in LanguageContext
});

export default i18n;
