/**
 * Application configuration constants
 */

export const STORAGE_KEYS = {
  API_KEY: 'yt_api_key',
  CHANNEL_CACHE: 'yt_channel_cache',
  // v2: Cache-Key geändert um alte Einträge mit falschen Thumbnail-URLs zu invalidieren
  AUTOCOMPLETE_CACHE: 'yt_autocomplete_cache_v2',
  QUOTA_TRACKING: 'yt_quota_tracking',
  FAVORITES: 'tt.favorites.v1',
  FAVORITES_CACHE: 'tt.favorites.cache.v1',
  DASHBOARD_SORT: 'tt.dashboard.sort.v1',
  DASHBOARD_ORDER: 'tt.dashboard.sortOrder.v1',
  SEARCH_TIMEFRAME: 'tt.search.timeframe',
  SEARCH_MAX_RESULTS: 'tt.search.maxResults',
  SEARCH_HISTORY: 'tt.search.history',
  LANGUAGE: 'tt.lang.explicit',
  HIDDEN_HIGHLIGHTS: 'tt.dashboard.hiddenHighlights.v1',
} as const;

export const CACHE_TTL = {
  AUTOCOMPLETE: 5 * 60 * 1000, // 5 minutes
  FAVORITES: 120 * 60 * 1000, // 2 hours
} as const;

export const API_COSTS = {
  search: 100,
  channels: 1,
  playlistItems: 1,
  videos: 1,
} as const;

export const DEFAULT_DAILY_QUOTA = 10000;

export const PLACEHOLDER_IMAGE = 'https://picsum.photos/640/360';
