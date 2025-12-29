export enum SearchType {
  CHANNEL = 'channel',
  KEYWORD = 'keyword'
}

export enum TimeFrame {
  LAST_HOUR = 'last_hour',
  LAST_3_HOURS = 'last_3_hours',
  LAST_5_HOURS = 'last_5_hours',
  LAST_12_HOURS = 'last_12_hours',
  LAST_24_HOURS = 'last_24_hours',
  TODAY = 'today',
  LAST_2_DAYS = 'last_2_days',
  LAST_3_DAYS = 'last_3_days',
  LAST_4_DAYS = 'last_4_days',
  LAST_5_DAYS = 'last_5_days',
  LAST_6_DAYS = 'last_6_days',
  LAST_WEEK = 'last_week',
  LAST_2_WEEKS = 'last_2_weeks',
  LAST_3_WEEKS = 'last_3_weeks',
  LAST_4_WEEKS = 'last_4_weeks',
  LAST_MONTH = 'last_month',
  LAST_2_MONTHS = 'last_2_months',
  LAST_3_MONTHS = 'last_3_months',
  LAST_4_MONTHS = 'last_4_months',
  LAST_5_MONTHS = 'last_5_months',
  LAST_6_MONTHS = 'last_6_months'
}

/**
 * Legacy-Mapping: ältere Versionen haben deutsche String-Werte im Storage gespeichert.
 * Damit bestehende Nutzer nichts verlieren, mappen wir alte Werte auf die neuen Codes.
 */
export const LEGACY_TIMEFRAME_MAP: Record<string, TimeFrame> = {
  'Letzte Stunde': TimeFrame.LAST_HOUR,
  'Letzte 3 Stunden': TimeFrame.LAST_3_HOURS,
  'Letzte 5 Stunden': TimeFrame.LAST_5_HOURS,
  'Letzte 12 Stunden': TimeFrame.LAST_12_HOURS,
  'Letzte 24 Stunden': TimeFrame.LAST_24_HOURS,
  'Heute': TimeFrame.TODAY,
  'Letzte 2 Tage': TimeFrame.LAST_2_DAYS,
  'Letzte 3 Tage': TimeFrame.LAST_3_DAYS,
  'Letzte 4 Tage': TimeFrame.LAST_4_DAYS,
  'Letzte 5 Tage': TimeFrame.LAST_5_DAYS,
  'Letzte 6 Tage': TimeFrame.LAST_6_DAYS,
  'Letzte Woche': TimeFrame.LAST_WEEK,
  'Letzter Monat': TimeFrame.LAST_MONTH,
  'Letzte 2 Monate': TimeFrame.LAST_2_MONTHS,
  'Letzte 3 Monate': TimeFrame.LAST_3_MONTHS,
  'Letzte 4 Monate': TimeFrame.LAST_4_MONTHS,
  'Letzte 5 Monate': TimeFrame.LAST_5_MONTHS,
  'Letzte 6 Monate': TimeFrame.LAST_6_MONTHS,
};

export function coerceTimeFrame(value: unknown, fallback: TimeFrame = TimeFrame.LAST_24_HOURS): TimeFrame {
  if (typeof value !== 'string') return fallback;
  if ((Object.values(TimeFrame) as string[]).includes(value)) return value as TimeFrame;
  return LEGACY_TIMEFRAME_MAP[value] ?? fallback;
}

export function coerceSearchType(value: unknown, fallback: SearchType = SearchType.CHANNEL): SearchType {
  if (typeof value !== 'string') return fallback;
  if ((Object.values(SearchType) as string[]).includes(value)) return value as SearchType;
  return fallback;
}

export enum SortOption {
  TRENDING_SCORE = 'trending_score'
}

export interface VideoStats {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface YouTubeVideoItem {
  id: string; // The video ID
  snippet: {
    publishedAt: string;
    title: string;
    thumbnails: {
      high?: { url: string; width: number; height: number };
      medium?: { url: string };
      default?: { url: string };
    };
    channelTitle: string;
  };
  statistics?: VideoStats;
}

// Ergebnis einer Kanalabfrage: Videos + Gesamtanzahl im gewählten Zeitraum
export interface ChannelVideosResult {
  videos: YouTubeVideoItem[];
  // Anzahl der Playlist-Items im Zeitraum (ohne garantierte Shorts-Filterung)
  // Dient für UI-Hinweise (z.B. Warnsymbol, wenn Auswahl "Top X" < Gesamtzahl)
  totalInTimeFrame: number;
}

export interface VideoData {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  views: number;
  uploadTime: string;
  publishedTimestamp: number;
  trendingScore: number; // 0-100
  reasoning: string;
  viewsPerHour?: number; // Calculated metric
}

export interface SearchState {
  isLoading: boolean;
  step: 'idle' | 'fetching_youtube' | 'analyzing_ai' | 'complete';
  error: string | null;
  data: VideoData[] | null;
  channelName: string;
  // Optional: YouTube Channel ID (für Links zum Kanal)
  channelId?: string;
}

export interface ChannelSuggestion {
  id: string;
  title: string;
  thumbnailUrl: string;
  handle?: string;
}

// Favoriten: Konfiguration und Cachetypen
export interface FavoriteConfig {
  id: string; // stabiler Schlüssel aus query + timeframe + maxResults + searchType
  query: string; // Kanal-Handle, ID oder Suchtext/Keyword (wie im Analyser eingegeben)
  timeFrame: TimeFrame;
  maxResults: number; // 0 bedeutet „Alle (Kein Limit)“
  searchType: SearchType; // 'channel' oder 'keyword'
  createdAt: number;
  label?: string; // optionaler Anzeigename
}

export interface FavoriteCacheEntry {
  videos: VideoData[]; // bereits berechnete Videos (hier auf Top6 begrenzt)
  fetchedAt: number;   // Zeitstempel der Berechnung
  meta?: {
    totalInTimeFrame?: number;
    // Bester Velocity-Wert (Aufrufe pro Stunde) über alle analysierten Videos des Kanals im gewählten Zeitraum
    topVelocityVph?: number;
    // Optional: aktueller Kanalname/ID aus den Dashboard-Daten (ohne Extra-Fetch in Highlights)
    channelTitle?: string;
    channelId?: string;
  };
}