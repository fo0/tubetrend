import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import de from "./locales/de.json";

export const LANG_STORAGE_KEY = "tt.lang.explicit";

const resources = {
  en: { common: en },
  de: { common: de },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "de", "fr", "es", "it", "pt", "nl", "pl", "tr", "ru", "ja", "zh", "ko"],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    ns: ["common"],
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: [],
      excludeCacheFor: ["cimode"],
    },
    interpolation: { escapeValue: false },
  });

// Sync <html lang> attribute with the active language so screen readers
// announce content in the correct language (WCAG 3.1.1).
function syncHtmlLang(lng: string) {
  const short = (lng || "en").split("-")[0].toLowerCase();
  document.documentElement.lang = short;
}

// Set immediately after init
syncHtmlLang(i18n.language);

// Update on every language change
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
