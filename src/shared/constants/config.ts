/**
 * Application configuration constants
 */

export const STORAGE_KEYS = {
  API_KEY: "yt_api_key",
  // v2: Cache key changed when entries gained a timestamp. v1 entries were bare
  // ChannelInfo objects with nothing to expire them, so a renamed channel stayed
  // stale forever; the new key makes them unreachable instead of feeding a shape
  // they do not satisfy.
  CHANNEL_CACHE: "yt_channel_cache_v2",
  // v2: Cache key changed to invalidate old entries with incorrect thumbnail URLs
  AUTOCOMPLETE_CACHE: "yt_autocomplete_cache_v2",
  QUOTA_TRACKING: "yt_quota_tracking",
  FAVORITES: "tt.favorites.v1",
  FAVORITES_CACHE: "tt.favorites.cache.v1",
  DASHBOARD_SORT: "tt.dashboard.sort.v1",
  DASHBOARD_ORDER: "tt.dashboard.sortOrder.v1",
  SEARCH_TIMEFRAME: "tt.search.timeframe",
  SEARCH_MAX_RESULTS: "tt.search.maxResults",
  SEARCH_QUERY: "tt.search.query",
  SEARCH_HISTORY: "tt.search.history",
  LANGUAGE: "tt.lang.explicit",
  HIDDEN_HIGHLIGHTS: "tt.dashboard.hiddenHighlights.v1",
  ANALYSER_SORT_MODE: "tt.analyser.sortMode",
  ANALYSER_TOP_N: "tt.analyser.topN",
  ANALYSER_TABLE_SORT: "tt.analyser.tableSort.v1",
  ANALYSER_LAST_RESULT: "tt.analyser.lastResult.v1",
  ACTIVE_PAGE: "tt.activePage",
  THEME: "tt.theme",
} as const;

export const CACHE_TTL = {
  AUTOCOMPLETE: 5 * 60 * 1000, // 5 minutes
  // Channel names change rarely and the uploads playlist ID is stable, so a day
  // bounds how long a rename can stay invisible while keeping the refetch cost
  // low (1 quota unit for a handle/ID lookup, 100 for a name that falls back to
  // the search endpoint) against the 10000-unit daily quota.
  CHANNEL: 24 * 60 * 60 * 1000, // 24 hours
  FAVORITES: 120 * 60 * 1000, // 2 hours
  // Restore the last analyser result on reload only while it is reasonably fresh.
  ANALYSER_RESULT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const API_COSTS = {
  search: 100,
  channels: 1,
  playlistItems: 1,
  videos: 1,
} as const;

export const DEFAULT_DAILY_QUOTA = 10000;

/**
 * Videos shorter than this threshold (in seconds) are classified as Shorts
 * and filtered out of channel/keyword results.
 */
export const SHORTS_DURATION_THRESHOLD_SECONDS = 180;
