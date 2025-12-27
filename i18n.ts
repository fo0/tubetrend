import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const LANG_STORAGE_KEY = 'tt.lang.explicit';

const resources = {
  en: {
    common: {
      appTitle: 'TubeTrend',
      language: {
        label: 'Language:',
        system: 'System',
      },
      // Actions
      actions: {
        search: 'Search',
        resetApiKey: 'Delete API key',
        refreshAll: 'Refresh all',
        remove: 'Remove',
        refresh: 'Refresh',
        importDashboard: 'Import',
        exportDashboard: 'Export',
      },
      // Labels & inputs
      labels: {
        search: 'Search',
        channelName: 'Channel name',
        keyword: 'Keyword',
        searchType: 'Search type',
        timeFrame: 'Time frame',
        maxResults: 'Max results',
      },
      searchType: {
        channel: 'Channel',
        keyword: 'Keyword',
      },
      history: {
        recent: 'Recently searched',
      },
      timeFrames: {
        lastHour: 'Last hour',
        last3Hours: 'Last 3 hours',
        last5Hours: 'Last 5 hours',
        last12Hours: 'Last 12 hours',
        last24Hours: 'Last 24 hours',
        today: 'Today',
        last2Days: 'Last 2 days',
        last3Days: 'Last 3 days',
        last4Days: 'Last 4 days',
        last5Days: 'Last 5 days',
        last6Days: 'Last 6 days',
        lastWeek: 'Last 7 days',
        lastMonth: 'Last month',
        last2Months: 'Last 2 months',
        last3Months: 'Last 3 months',
        last4Months: 'Last 4 months',
        last5Months: 'Last 5 months',
        last6Months: 'Last 6 months',
      },
      maxResultsText: {
        // used for compact badges/buttons
        all: 'All',
        topN: 'Top {{n}}',
      },
      input: {
        searchPlaceholder: 'Channel name, @handle or #searchtext',
        channelPlaceholder: 'Enter channel name or @handle',
        keywordPlaceholder: 'Enter search keyword (e.g. "React tutorial")',
      },
      maxResults: {
        all: 'All',
        allNoLimit: 'All (no limit)',
        topN: 'Top {{n}}',
      },
      favorites: {
        alreadySaved: 'Already saved as favorite',
        saveTitle: 'Save as favorite',
        saveButton: 'Favorite',
        saved: 'Saved',
        favorite: 'Favorite',
        changeTimeFrame: 'Change time frame',
        changeMaxResults: 'Change max results',
        overflowWarning: 'There are {{total}} videos in this time frame – showing only {{shown}}.',
        status: {
          refreshing: 'Refreshing…',
          asOf: 'As of: {{time}}',
          asOfUnknown: 'As of: —',
        },
        refresh: 'Refresh channel',
        remove: 'Remove favorite',
      },
      dashboard: {
        noFavorites: 'No favorites yet. Create a favorite from the analyzer.',
        highlights: {
          title: 'Highlights',
          subtitle: 'Top videos across all favorites (click to open)',
          count_one: '{{count}} highlight',
          count_other: '{{count}} highlights',
          hide: 'Hide this highlight',
          hiddenCount_one: '{{count}} hidden',
          hiddenCount_other: '{{count}} hidden',
          showHidden: 'Show hidden',
          clearHidden: 'Show all hidden',
          hiddenButton: 'Hidden',
          showHiddenList: 'Show hidden videos',
          hiddenModalTitle: 'Hidden Videos',
          noHiddenItems: 'No hidden videos.',
          unhide: 'Show',
          delete: 'Delete',
          empty: 'No highlights available yet. Highlights will appear once your favorites have loaded videos.',
        },
        sorting: {
          label: 'Sorting:',
          alphaTitle: 'Sort alphabetically (click again to reverse order)',
          velocityTitle: 'Sort by activity (velocity = views per hour, best video in time frame) – click again to reverse order',
          activity: 'Activity',
        },
      },
      results: {
        openChannelTitle: 'Open YouTube channel: {{channel}}',
        resultsFor: 'Results for',
        videosCount_one: '{{count}} video',
        videosCount_other: '{{count}} videos',
        sortedBy: 'Sorted by',
        sortModes: {
          trend: 'Trend score (velocity)',
          views: 'Views',
        },
        sortTitles: {
          trend: 'Sort by trend score',
          views: 'Sort by views',
        },
        sortButtons: {
          trendScore: 'Trend score',
          views: 'Views',
        },
        highlightTopN: 'Highlight top {{n}}',
        topPerformance: 'Top {{n}} performance',
        moreVideos: 'More videos',
      },
      timeAgo: {
        justNow: 'just now',
        seconds_one: '{{count}}s ago',
        seconds_other: '{{count}}s ago',
        minutes_one: '{{count}}m ago',
        minutes_other: '{{count}}m ago',
        hours_one: '{{count}}h ago',
        hours_other: '{{count}}h ago',
        days_one: '{{count}}d ago',
        days_other: '{{count}}d ago',
        weeks_one: '{{count}}w ago',
        weeks_other: '{{count}}w ago',
        months_one: '{{count}}mo ago',
        months_other: '{{count}}mo ago',
        years_one: '{{count}}y ago',
        years_other: '{{count}}y ago',
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
        importDashboardReplace: 'Import will replace your current dashboard favorites and cache ({{count}} favorites). Continue?',
      },
      backup: {
        exportSuccess: 'Backup downloaded.',
        importSuccess: 'Import completed. {{count}} favorites restored.',
        importInvalid: 'Invalid backup file.',
        importFailedStorage: 'Import failed (could not write to browser storage).',
      },
      errors: {
        favoriteLoad: 'Failed to load favorite data.',
      },
      loading: 'Loading…',
      empty: {
        title: 'Analyze YouTube channels',
        desc: 'Search a channel and get trend insights for different time frames.'
      }
    }
  },
  de: {
    common: {
      appTitle: 'TubeTrend',
      language: {
        label: 'Sprache:',
        system: 'System',
      },
      actions: {
        search: 'Suchen',
        resetApiKey: 'API-Schlüssel löschen',
        refreshAll: 'Alle aktualisieren',
        remove: 'Entfernen',
        refresh: 'Aktualisieren',
        importDashboard: 'Importieren',
        exportDashboard: 'Exportieren',
      },
      labels: {
        search: 'Suche',
        channelName: 'Kanalname',
        keyword: 'Schlagwort',
        searchType: 'Suchtyp',
        timeFrame: 'Zeitraum',
        maxResults: 'Max. Ergebnisse',
      },
      searchType: {
        channel: 'Kanal',
        keyword: 'Schlagwort',
      },
      history: {
        recent: 'Zuletzt gesucht',
      },
      timeFrames: {
        lastHour: 'Letzte Stunde',
        last3Hours: 'Letzte 3 Stunden',
        last5Hours: 'Letzte 5 Stunden',
        last12Hours: 'Letzte 12 Stunden',
        last24Hours: 'Letzte 24 Stunden',
        today: 'Heute',
        last2Days: 'Letzte 2 Tage',
        last3Days: 'Letzte 3 Tage',
        last4Days: 'Letzte 4 Tage',
        last5Days: 'Letzte 5 Tage',
        last6Days: 'Letzte 6 Tage',
        lastWeek: 'Letzte 7 Tage',
        lastMonth: 'Letzter Monat',
        last2Months: 'Letzte 2 Monate',
        last3Months: 'Letzte 3 Monate',
        last4Months: 'Letzte 4 Monate',
        last5Months: 'Letzte 5 Monate',
        last6Months: 'Letzte 6 Monate',
      },
      maxResultsText: {
        all: 'Alle',
        topN: 'Top {{n}}',
      },
      input: {
        searchPlaceholder: 'Kanalname, @handle oder #suchtext',
        channelPlaceholder: 'Kanalnamen oder @handle eingeben',
        keywordPlaceholder: 'Suchbegriff eingeben (z.B. "React Tutorial")',
      },
      maxResults: {
        all: 'Alle',
        allNoLimit: 'Alle (Kein Limit)',
        topN: 'Top {{n}}',
      },
      favorites: {
        alreadySaved: 'Bereits als Favorit gespeichert',
        saveTitle: 'Als Favorit speichern',
        saveButton: 'Als Favorit',
        saved: 'Gespeichert',
        favorite: 'Favorit',
        changeTimeFrame: 'Zeitraum ändern',
        changeMaxResults: 'Max. Ergebnisse ändern',
        overflowWarning: 'Es gibt {{total}} Videos im Zeitraum – angezeigt werden nur {{shown}}.',
        status: {
          refreshing: 'Aktualisiere…',
          asOf: 'Stand: {{time}}',
          asOfUnknown: 'Stand: —',
        },
        refresh: 'Kanal aktualisieren',
        remove: 'Favorit entfernen',
      },
      dashboard: {
        noFavorites: 'Noch keine Favoriten. Lege im Analyser eine Suche als Favorit an.',
        highlights: {
          title: 'Highlights',
          subtitle: 'Top-Videos aus allen Favoriten (klickbar)',
          count_one: '{{count}} Highlight',
          count_other: '{{count}} Highlights',
          hide: 'Dieses Highlight ausblenden',
          hiddenCount_one: '{{count}} ausgeblendet',
          hiddenCount_other: '{{count}} ausgeblendet',
          showHidden: 'Ausgeblendete anzeigen',
          clearHidden: 'Alle wieder einblenden',
          hiddenButton: 'Ausgeblendet',
          showHiddenList: 'Ausgeblendete Videos anzeigen',
          hiddenModalTitle: 'Ausgeblendete Videos',
          noHiddenItems: 'Keine ausgeblendeten Videos.',
          unhide: 'Einblenden',
          delete: 'Löschen',
          empty: 'Noch keine Highlights verfügbar. Highlights erscheinen, sobald deine Favoriten Videos geladen haben.',
        },
        sorting: {
          label: 'Sortierung:',
          alphaTitle: 'Alphabetisch sortieren (erneut klicken: Reihenfolge umkehren)',
          velocityTitle: 'Nach Aktivität (Velocity = Aufrufe pro Stunde, bestes Video im Zeitraum) sortieren – erneut klicken: Reihenfolge umkehren',
          activity: 'Aktivität',
        },
      },
      results: {
        openChannelTitle: 'YouTube-Kanal öffnen: {{channel}}',
        resultsFor: 'Ergebnisse für',
        videosCount_one: '{{count}} Video',
        videosCount_other: '{{count}} Videos',
        sortedBy: 'Sortiert nach',
        sortModes: {
          trend: 'Trend Score (Velocity)',
          views: 'Views',
        },
        sortTitles: {
          trend: 'Nach Trend Score sortieren',
          views: 'Nach Views sortieren',
        },
        sortButtons: {
          trendScore: 'Trend Score',
          views: 'Views',
        },
        highlightTopN: 'Top {{n}} hervorheben',
        topPerformance: 'Top {{n}} Performance',
        moreVideos: 'Weitere Videos',
      },
      timeAgo: {
        justNow: 'gerade eben',
        seconds_one: 'vor {{count}} Sek.',
        seconds_other: 'vor {{count}} Sek.',
        minutes_one: 'vor {{count}} Min.',
        minutes_other: 'vor {{count}} Min.',
        hours_one: 'vor {{count}} Std.',
        hours_other: 'vor {{count}} Std.',
        days_one: 'vor {{count}} Tg.',
        days_other: 'vor {{count}} Tg.',
        weeks_one: 'vor {{count}} Wo.',
        weeks_other: 'vor {{count}} Wo.',
        months_one: 'vor {{count}} Mon.',
        months_other: 'vor {{count}} Mon.',
        years_one: 'vor {{count}} J.',
        years_other: 'vor {{count}} J.',
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
        importDashboardReplace: 'Import ersetzt deine aktuellen Dashboard-Favoriten und den Cache ({{count}} Favoriten). Fortfahren?',
      },
      backup: {
        exportSuccess: 'Backup-Datei wurde heruntergeladen.',
        importSuccess: 'Import abgeschlossen. {{count}} Favoriten wurden wiederhergestellt.',
        importInvalid: 'Ungültige Backup-Datei.',
        importFailedStorage: 'Import fehlgeschlagen (konnte nicht in den Browser-Speicher schreiben).',
      },
      errors: {
        favoriteLoad: 'Fehler beim Laden der Favoriten-Daten.',
      },
      loading: 'Lädt…',
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
    supportedLngs: ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'tr', 'ru', 'ja', 'zh', 'ko'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    // default namespace
    ns: ['common'],
    defaultNS: 'common',
    detection: {
      // first check explicit user choice, then system/browser
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      // Wichtig: wir speichern NUR die explizite Nutzerwahl in `LANG_STORAGE_KEY`.
      // i18next-language-detector würde sonst die System-Sprache automatisch in diesen Key schreiben
      // und damit den "System"-Modus ungewollt in "explicit" verwandeln.
      caches: [],
      excludeCacheFor: ['cimode']
    },
    interpolation: { escapeValue: false }
  });

export default i18n;
