import { safeRead, safeRemove, safeWrite } from "@/src/shared/lib/storage";
import { dispatchEvent } from "@/src/shared/lib/eventBus";
import { getTodayDateString } from "@/src/shared/lib/dateUtils";
import { API_COSTS, DEFAULT_DAILY_QUOTA, STORAGE_KEYS } from "@/src/shared/constants";
import type { QuotaCallContext, QuotaData, QuotaHistoryEntry, QuotaInfo } from "@/src/shared/types";

// No fixed limit - history resets daily with quota (in getQuotaData when date changes)
// Safety limit only to prevent localStorage overflow (very unlikely to hit)
const MAX_HISTORY_ENTRIES = 10000;

/** True for a history entry the quota panel can render: an object with numeric timestamp and units. */
function isHistoryEntry(value: unknown): value is QuotaHistoryEntry {
  const entry = value as Partial<QuotaHistoryEntry> | null | undefined;
  return typeof entry?.timestamp === "number" && typeof entry.units === "number";
}

/**
 * The stored record is localStorage content, i.e. untrusted on-disk input, and
 * its shape used to be trusted from the cast. A stored `null` threw on
 * `data.date`; a non-array `history` threw on `push` inside `track()`, which
 * runs in `fetchFromApi` *after* a successful response, so a call that had
 * already spent quota surfaced as a raw TypeError; a `null` history entry threw
 * while the header's quota panel rendered, taking the whole app down to the
 * root ErrorBoundary. A record this module cannot have written now counts as
 * no record (the same empty day a date change yields), and history entries
 * that cannot be rendered are dropped. Records this module wrote read exactly
 * as before.
 */
function getQuotaData(): QuotaData {
  const emptyData = (): QuotaData => ({
    date: getTodayDateString(),
    used: 0,
    exhausted: false,
    history: [],
  });

  if (typeof window === "undefined") return emptyData();

  const data = safeRead<Partial<QuotaData> | null>(STORAGE_KEYS.QUOTA_TRACKING, null);
  const today = getTodayDateString();

  // Reset if it's a new day, or if the record is not one this module wrote
  if (
    !data ||
    typeof data !== "object" ||
    data.date !== today ||
    typeof data.used !== "number" ||
    !Number.isFinite(data.used)
  ) {
    return emptyData();
  }

  return {
    date: today,
    used: data.used,
    exhausted: data.exhausted === true,
    detectedLimit:
      typeof data.detectedLimit === "number" && Number.isFinite(data.detectedLimit)
        ? data.detectedLimit
        : undefined,
    history: Array.isArray(data.history) ? data.history.filter(isHistoryEntry) : [],
  };
}

function saveQuotaData(data: QuotaData): void {
  if (typeof window === "undefined") return;
  safeWrite(STORAGE_KEYS.QUOTA_TRACKING, data);
  dispatchEvent("quota-updated", {
    used: data.used,
    limit: data.detectedLimit ?? DEFAULT_DAILY_QUOTA,
    percentage: data.exhausted
      ? 100
      : Math.min(100, Math.round((data.used / (data.detectedLimit ?? DEFAULT_DAILY_QUOTA)) * 100)),
    exhausted: data.exhausted,
  });
}

export const quotaService = {
  track(units: number, endpoint: string = "unknown", context?: QuotaCallContext): void {
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
      percentage: data.exhausted ? 100 : Math.min(100, Math.round((data.used / limit) * 100)),
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
    safeRemove(STORAGE_KEYS.QUOTA_TRACKING);
    // Dispatch event to update UI with empty data
    dispatchEvent("quota-updated", {
      used: 0,
      limit: DEFAULT_DAILY_QUOTA,
      percentage: 0,
      exhausted: false,
    });
  },
};
