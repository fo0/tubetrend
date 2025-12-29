import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import de from './locales/de.json';

export const LANG_STORAGE_KEY = 'tt.lang.explicit';

const resources = {
  en: { common: en },
  de: { common: de },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'tr', 'ru', 'ja', 'zh', 'ko'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    ns: ['common'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: [],
      excludeCacheFor: ['cimode'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
