import {TimeFrame} from '../types';

/**
 * Date and time utilities
 */

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get a date N months ago
 */
export function getDateMonthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

/**
 * Calculate cutoff time based on TimeFrame
 */
export function getCutoffTime(timeFrame: TimeFrame): number {
  const now = Date.now();
  const monthsAgo = (n: number) => getDateMonthsAgo(n).getTime();

  switch (timeFrame) {
    case TimeFrame.LAST_HOUR:
      return now - 60 * 60 * 1000;
    case TimeFrame.LAST_3_HOURS:
      return now - 3 * 60 * 60 * 1000;
    case TimeFrame.LAST_5_HOURS:
      return now - 5 * 60 * 60 * 1000;
    case TimeFrame.LAST_12_HOURS:
      return now - 12 * 60 * 60 * 1000;
    case TimeFrame.LAST_24_HOURS:
    case TimeFrame.TODAY:
      return now - 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_2_DAYS:
      return now - 2 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_3_DAYS:
      return now - 3 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_4_DAYS:
      return now - 4 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_5_DAYS:
      return now - 5 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_6_DAYS:
      return now - 6 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_WEEK:
      return now - 7 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_2_WEEKS:
      return now - 14 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_3_WEEKS:
      return now - 21 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_4_WEEKS:
      return now - 28 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_MONTH:
      return monthsAgo(1);
    case TimeFrame.LAST_2_MONTHS:
      return monthsAgo(2);
    case TimeFrame.LAST_3_MONTHS:
      return monthsAgo(3);
    case TimeFrame.LAST_4_MONTHS:
      return monthsAgo(4);
    case TimeFrame.LAST_5_MONTHS:
      return monthsAgo(5);
    case TimeFrame.LAST_6_MONTHS:
      return monthsAgo(6);
    default:
      return now - 24 * 60 * 60 * 1000;
  }
}

/**
 * Get ISO date string for publishedAfter API parameter
 */
export function getPublishedAfterDate(timeFrame: TimeFrame): string {
  const cutoffTime = getCutoffTime(timeFrame);
  return new Date(cutoffTime).toISOString();
}

/**
 * Check if a timestamp is within a given timeframe
 */
export function isWithinTimeFrame(timestamp: number, timeFrame: TimeFrame): boolean {
  const cutoffTime = getCutoffTime(timeFrame);
  return timestamp >= cutoffTime;
}
