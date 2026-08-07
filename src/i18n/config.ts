import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import de from "./locales/de.json";

// Duplicate of STORAGE_KEYS.LANGUAGE ("tt.lang.explicit", src/shared/constants/config.ts).
// Declared locally so this i18next bootstrap stays free of app-module imports. Nothing links the
// two literals and there is no test suite, so a rename over there does NOT fail typecheck or build
// here — it silently resets every user's saved language. Change both, plus the row in
// agent_docs/api-reference.md.
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
//
// `supportedLngs` lists 13 languages but only `en` and `de` ship resource
// bundles, so selecting e.g. "Français" renders English text via fallbackLng.
// Tagging that page `lang="fr"` makes screen readers pronounce English words
// with French phonetics — worse than no tag at all. `resolvedLanguage` is the
// first language in the fallback chain that actually has translations, i.e.
// the language the user really sees, so tag that instead.
function syncHtmlLang(lng: string) {
  const effective = i18n.resolvedLanguage || lng;
  const short = (effective || "en").split("-")[0].toLowerCase();
  document.documentElement.lang = short;
}

// Set immediately after init
syncHtmlLang(i18n.language);

// Update on every language change
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
