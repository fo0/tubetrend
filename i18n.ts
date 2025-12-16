import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const LANG_STORAGE_KEY = 'tt.lang.explicit';

const resources = {
  en: {
    common: {
      appTitle: 'TubeTrend',
      // Actions
      actions: {
        search: 'Search',
        resetApiKey: 'Delete API key',
        refreshAll: 'Refresh all',
        remove: 'Remove',
      },
      // Labels & inputs
      labels: {
        channelName: 'Channel name',
        timeFrame: 'Time frame',
        maxResults: 'Max results',
      },
      input: {
        channelPlaceholder: 'Enter channel name or @handle',
      },
      modal: {
        apiKey: {
          title: 'YouTube API key',
          description: 'Enter your YouTube Data API key to continue.',
          save: 'Save',
          cancel: 'Cancel',
        }
      },
      confirm: {
        deleteApiKey: 'Do you really want to delete the API key?',
      },
      empty: {
        title: 'Analyze YouTube channels',
        desc: 'Search a channel and get trend insights for different time frames.'
      }
    }
  },
  de: {
    common: {
      appTitle: 'TubeTrend',
      actions: {
        search: 'Suchen',
        resetApiKey: 'API-Schlüssel löschen',
        refreshAll: 'Alle aktualisieren',
        remove: 'Entfernen',
      },
      labels: {
        channelName: 'Kanalname',
        timeFrame: 'Zeitraum',
        maxResults: 'Max. Ergebnisse',
      },
      input: {
        channelPlaceholder: 'Kanalnamen oder @handle eingeben',
      },
      modal: {
        apiKey: {
          title: 'YouTube API-Schlüssel',
          description: 'Gib deinen YouTube Data API-Schlüssel ein, um fortzufahren.',
          save: 'Speichern',
          cancel: 'Abbrechen',
        }
      },
      confirm: {
        deleteApiKey: 'Möchtest du den API Key wirklich löschen?',
      },
      empty: {
        title: 'YouTube-Kanäle analysieren',
        desc: 'Suche einen Kanal und erhalte Trend-Einblicke für verschiedene Zeiträume.'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    // default namespace
    ns: ['common'],
    defaultNS: 'common',
    detection: {
      // first check explicit user choice, then system/browser
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
      excludeCacheFor: ['cimode']
    },
    interpolation: { escapeValue: false }
  });

export default i18n;
