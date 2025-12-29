/**
 * Common types used across the application
 */

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

export enum SortOption {
  TRENDING_SCORE = 'trending_score'
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

export type DashboardSortMode = 'alpha' | 'velocity';
export type SortOrder = 'asc' | 'desc';
