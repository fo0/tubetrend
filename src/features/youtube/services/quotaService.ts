import {safeRead, safeWrite} from '@/src/shared/lib/storage';
import {dispatchEvent} from '@/src/shared/lib/eventBus';
import {getTodayDateString} from '@/src/shared/lib/dateUtils';
import {API_COSTS, DEFAULT_DAILY_QUOTA, STORAGE_KEYS} from '@/src/shared/constants';
import type {QuotaCallContext, QuotaData, QuotaHistoryEntry, QuotaInfo} from '@/src/shared/types';

// No fixed limit - history resets daily with quota (in getQuotaData when date changes)
// Safety limit only to prevent localStorage overflow (very unlikely to hit)
const MAX_HISTORY_ENTRIES = 10000;

function getQuotaData(): QuotaData {
  const emptyData = (): QuotaData => ({
    date: getTodayDateString(),
    used: 0,
    exhausted: false,
    history: [],
  });

  if (typeof window === 'undefined') return emptyData();

  const data = safeRead<QuotaData>(STORAGE_KEYS.QUOTA_TRACKING, emptyData());

  // Reset if it's a new day
  if (data.date !== getTodayDateString()) {
    return emptyData();
  }

  // Ensure history array exists
  if (!data.history) data.history = [];
  return data;
}

function saveQuotaData(data: QuotaData): void {
  if (typeof window === 'undefined') return;
  safeWrite(STORAGE_KEYS.QUOTA_TRACKING, data);
  dispatchEvent('quota-updated', {
    used: data.used,
    limit: data.detectedLimit ?? DEFAULT_DAILY_QUOTA,
    percentage: data.exhausted
      ? 100
      : Math.min(100, Math.round((data.used / (data.detectedLimit ?? DEFAULT_DAILY_QUOTA)) * 100)),
    exhausted: data.exhausted,
  });
}

export const quotaService = {
  track(units: number, endpoint: string = 'unknown', context?: QuotaCallContext): void {
    const data = getQuotaData();
    data.used += units;

    // Add history entry
    const entry: QuotaHistoryEntry = {
      timestamp: Date.now(),
      units,
      endpoint,
      context,
    };
    data.history = data.history || [];
    data.history.push(entry);

    // Limit history size
    if (data.history.length > MAX_HISTORY_ENTRIES) {
      data.history = data.history.slice(-MAX_HISTORY_ENTRIES);
    }

    saveQuotaData(data);
  },

  markExhausted(): void {
    const data = getQuotaData();
    data.exhausted = true;
    data.detectedLimit = data.used;
    saveQuotaData(data);
  },

  getInfo(): QuotaInfo {
    const data = getQuotaData();
    const limit = data.detectedLimit ?? DEFAULT_DAILY_QUOTA;
    return {
      used: data.used,
      limit,
      percentage: data.exhausted
        ? 100
        : Math.min(100, Math.round((data.used / limit) * 100)),
      exhausted: data.exhausted,
    };
  },

  getHistory(): QuotaHistoryEntry[] {
    const data = getQuotaData();
    return data.history || [];
  },

  getCost(endpoint: keyof typeof API_COSTS): number {
    return API_COSTS[endpoint];
  },

  reset(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.QUOTA_TRACKING);
    // Dispatch event to update UI with empty data
    dispatchEvent('quota-updated', {
      used: 0,
      limit: DEFAULT_DAILY_QUOTA,
      percentage: 0,
      exhausted: false,
    });
  },
};
