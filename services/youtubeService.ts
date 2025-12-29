import {ChannelSuggestion, TimeFrame, YouTubeVideoItem, ChannelVideosResult, SearchType} from "../types";

const STORAGE_KEY = 'yt_api_key';
const CHANNEL_CACHE_KEY = 'yt_channel_cache';
const AUTOCOMPLETE_CACHE_KEY = 'yt_autocomplete_cache';
const QUOTA_TRACKING_KEY = 'yt_quota_tracking';
const AUTOCOMPLETE_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten TTL
const DEFAULT_DAILY_QUOTA = 10000; // YouTube API default quota

// =============================================================================
// LOGGING SYSTEM für YouTube API Transparenz
// =============================================================================
// Strukturiertes Logging für Analyse und Optimierung der API-Nutzung
// Alle Logs folgen dem Format: [KATEGORIE] Aktion | Details

const LOG_STYLES = {
  api: 'color: #4CAF50; font-weight: bold',      // Grün für API-Calls
  cache: 'color: #2196F3; font-weight: bold',    // Blau für Cache
  quota: 'color: #FF9800; font-weight: bold',    // Orange für Quota
  error: 'color: #f44336; font-weight: bold',    // Rot für Fehler
  info: 'color: #9E9E9E',                        // Grau für Info
  success: 'color: #8BC34A; font-weight: bold',  // Hellgrün für Erfolg
};

const logApi = (message: string, data?: any) => {
  if (data) {
    console.log(`%c[YT-API] ${message}`, LOG_STYLES.api, data);
  } else {
    console.log(`%c[YT-API] ${message}`, LOG_STYLES.api);
  }
};

const logCache = (message: string, data?: any) => {
  if (data) {
    console.log(`%c[YT-CACHE] ${message}`, LOG_STYLES.cache, data);
  } else {
    console.log(`%c[YT-CACHE] ${message}`, LOG_STYLES.cache);
  }
};

const logQuota = (message: string, data?: any) => {
  if (data) {
    console.log(`%c[YT-QUOTA] ${message}`, LOG_STYLES.quota, data);
  } else {
    console.log(`%c[YT-QUOTA] ${message}`, LOG_STYLES.quota);
  }
};

const logError = (message: string, error?: any) => {
  console.error(`%c[YT-ERROR] ${message}`, LOG_STYLES.error, error || '');
};

const logInfo = (message: string, data?: any) => {
  if (data) {
    console.log(`%c[YT-INFO] ${message}`, LOG_STYLES.info, data);
  } else {
    console.log(`%c[YT-INFO] ${message}`, LOG_STYLES.info);
  }
};

const logSuccess = (message: string, data?: any) => {
  if (data) {
    console.log(`%c[YT-SUCCESS] ${message}`, LOG_STYLES.success, data);
  } else {
    console.log(`%c[YT-SUCCESS] ${message}`, LOG_STYLES.success);
  }
};

// Performance-Tracking Helper
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// History entry for API usage tracking
interface QuotaHistoryEntry {
  timestamp: number; // Unix timestamp in ms
  units: number;
  endpoint: string;
}

// Quota tracking interface - dynamically adapts based on actual usage
interface QuotaData {
  date: string; // YYYY-MM-DD
  used: number;
  exhausted: boolean; // True when API returns quota exceeded error
  detectedLimit?: number; // Actual limit detected when exhausted
  history?: QuotaHistoryEntry[]; // History of API calls for timeline
}

const MAX_HISTORY_ENTRIES = 100; // Limit history to prevent excessive storage

// Get today's date as YYYY-MM-DD
const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get current quota data
const getQuotaData = (): QuotaData => {
  const emptyData = (): QuotaData => ({ date: getTodayDateString(), used: 0, exhausted: false, history: [] });
  if (typeof window === 'undefined') return emptyData();
  try {
    const item = localStorage.getItem(QUOTA_TRACKING_KEY);
    if (!item) return emptyData();
    const data: QuotaData = JSON.parse(item);
    // Reset if it's a new day
    if (data.date !== getTodayDateString()) {
      return emptyData();
    }
    // Ensure history array exists
    if (!data.history) data.history = [];
    return data;
  } catch { return emptyData(); }
};

// Save quota data
const saveQuotaData = (data: QuotaData) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUOTA_TRACKING_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('quota-updated', { detail: data }));
  } catch (e) { console.warn("Quota tracking failed", e); }
};

// Track quota usage with history
const trackQuotaUsage = (units: number, endpoint: string = 'unknown') => {
  const data = getQuotaData();
  const previousUsed = data.used;
  data.used += units;

  // Add history entry
  const entry: QuotaHistoryEntry = {
    timestamp: Date.now(),
    units,
    endpoint
  };
  data.history = data.history || [];
  data.history.push(entry);

  // Limit history size
  if (data.history.length > MAX_HISTORY_ENTRIES) {
    data.history = data.history.slice(-MAX_HISTORY_ENTRIES);
  }

  saveQuotaData(data);

  // Logging: Quota-Verbrauch
  const limit = data.detectedLimit || DEFAULT_DAILY_QUOTA;
  const percentage = Math.round((data.used / limit) * 100);
  logQuota(`+${units} Units (${endpoint}) | Gesamt: ${data.used}/${limit} (${percentage}%)`, {
    endpoint,
    units,
    previousUsed,
    newTotal: data.used,
    limit,
    percentage,
    remaining: limit - data.used
  });
};

// Mark quota as exhausted (called when API returns quota error)
const markQuotaExhausted = () => {
  const data = getQuotaData();
  data.exhausted = true;
  // The current usage becomes our detected limit
  data.detectedLimit = data.used;
  saveQuotaData(data);

  logError(`⚠️ QUOTA ERSCHÖPFT! Erkanntes Limit: ${data.used} Units`, {
    detectedLimit: data.used,
    date: data.date
  });
};

// Export quota info for UI - dynamically calculates based on actual data
export const getQuotaInfo = (): { used: number; limit: number; percentage: number; exhausted: boolean } => {
  const data = getQuotaData();
  // Use detected limit if we've hit quota before, otherwise use default
  const limit = data.detectedLimit || DEFAULT_DAILY_QUOTA;
  return {
    used: data.used,
    limit: limit,
    percentage: data.exhausted ? 100 : Math.min(100, Math.round((data.used / limit) * 100)),
    exhausted: data.exhausted
  };
};

// Export quota history for timeline UI
export const getQuotaHistory = (): QuotaHistoryEntry[] => {
  const data = getQuotaData();
  return data.history || [];
};

// Export type for use in components
export type { QuotaHistoryEntry };

// API cost constants (YouTube Data API v3)
const API_COSTS = {
  search: 100,
  channels: 1,
  playlistItems: 1,
  videos: 1
} as const;

// Helper to access channel cache
const getChannelCache = (): Record<string, any> => {
  if (typeof window === 'undefined') return {};
  try {
    const item = localStorage.getItem(CHANNEL_CACHE_KEY);
    return item ? JSON.parse(item) : {};
  } catch { return {}; }
};

const saveChannelToCache = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    const cache = getChannelCache();
    cache[key] = data;
    localStorage.setItem(CHANNEL_CACHE_KEY, JSON.stringify(cache));
    logCache(`💾 Channel gespeichert: "${key}"`, {
      channelName: data.name,
      channelId: data.id,
      cacheSize: Object.keys(cache).length
    });
  } catch (e) { console.warn("Cache save failed", e); }
};

// Autocomplete Cache mit TTL
interface AutocompleteCacheEntry {
  results: ChannelSuggestion[];
  timestamp: number;
}

const getAutocompleteCache = (): Record<string, AutocompleteCacheEntry> => {
  if (typeof window === 'undefined') return {};
  try {
    const item = localStorage.getItem(AUTOCOMPLETE_CACHE_KEY);
    return item ? JSON.parse(item) : {};
  } catch { return {}; }
};

const getAutocompleteFromCache = (query: string): ChannelSuggestion[] | null => {
  const cache = getAutocompleteCache();
  const entry = cache[query.toLowerCase()];
  if (!entry) {
    logCache(`❌ Autocomplete MISS: "${query}"`);
    return null;
  }

  // Prüfe TTL
  const age = Date.now() - entry.timestamp;
  if (age > AUTOCOMPLETE_CACHE_TTL) {
    logCache(`⏰ Autocomplete EXPIRED: "${query}" (${formatDuration(age)} alt)`);
    return null; // Abgelaufen
  }

  logCache(`✅ Autocomplete HIT: "${query}" | ${entry.results.length} Ergebnisse | ${formatDuration(age)} alt`, {
    query,
    results: entry.results.length,
    ageMs: age,
    savedUnits: 100 // Search-API würde 100 Units kosten
  });
  return entry.results;
};

const saveAutocompleteToCache = (query: string, results: ChannelSuggestion[]) => {
  if (typeof window === 'undefined') return;
  try {
    const cache = getAutocompleteCache();

    // Alte Einträge bereinigen (älter als TTL)
    const now = Date.now();
    let cleanedCount = 0;
    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > AUTOCOMPLETE_CACHE_TTL) {
        delete cache[key];
        cleanedCount++;
      }
    });

    cache[query.toLowerCase()] = { results, timestamp: now };
    localStorage.setItem(AUTOCOMPLETE_CACHE_KEY, JSON.stringify(cache));

    logCache(`💾 Autocomplete gespeichert: "${query}" | ${results.length} Ergebnisse`, {
      query,
      results: results.length,
      cacheSize: Object.keys(cache).length,
      expiredCleaned: cleanedCount,
      ttlMinutes: AUTOCOMPLETE_CACHE_TTL / 60000
    });
  } catch (e) { console.warn("Autocomplete cache save failed", e); }
};

// Load key immediately from storage if available
let API_KEY = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || "" : "";

export const setYoutubeApiKey = (key: string) => {
  API_KEY = key;
  // Also save to storage to keep in sync
  if (key) {
    localStorage.setItem(STORAGE_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const fetchFromApi = async (endpoint: string, params: Record<string, string>) => {
  if (!API_KEY) throw new Error("YouTube API Key fehlt.");

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.searchParams.append("key", API_KEY);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  // Berechne Kosten für diesen Endpoint
  const cost = API_COSTS[endpoint as keyof typeof API_COSTS] || 1;

  // Logging: API Request Start
  const startTime = performance.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  logApi(`→ REQUEST [${requestId}] ${endpoint.toUpperCase()}`, {
    endpoint,
    params: { ...params, key: '***' }, // API-Key ausblenden
    estimatedCost: `${cost} Units`
  });

  const response = await fetch(url.toString());
  const data = await response.json();
  const duration = performance.now() - startTime;

  if (!response.ok) {
    // Handle specific API errors
    if (data.error) {
      const msg = data.error.message;

      // Logging: Fehler
      logError(`← ERROR [${requestId}] ${endpoint.toUpperCase()} | ${formatDuration(duration)}`, {
        status: response.status,
        error: msg,
        cost: response.status >= 400 && response.status < 500 ? `${cost} Units (4xx = charged)` : '0 Units (5xx = free)'
      });

      if (msg.includes("API key not valid")) throw new Error("Der eingegebene API Key ist ungültig.");
      if (msg.includes("quota")) {
        // Mark quota as exhausted for dynamic UI update
        // Bei Quota-Fehler: Aktuelle Nutzung ist das Limit
        markQuotaExhausted();
        throw new Error("YouTube API Quota überschritten.");
      }
      // Bei anderen 4xx-Fehlern: YouTube berechnet trotzdem Quota
      // (außer bei 5xx Server-Fehlern)
      if (response.status >= 400 && response.status < 500) {
        trackQuotaUsage(cost, endpoint);
      }
      throw new Error(`YouTube API Fehler: ${msg}`);
    }
    // Bei HTTP-Fehlern ohne error-Objekt: 4xx kosten Quota
    if (response.status >= 400 && response.status < 500) {
      trackQuotaUsage(cost, endpoint);
    }
    logError(`← ERROR [${requestId}] ${endpoint.toUpperCase()} | HTTP ${response.status} | ${formatDuration(duration)}`);
    throw new Error(`HTTP Fehler: ${response.status}`);
  }

  // Track quota usage on successful API calls
  trackQuotaUsage(cost, endpoint);

  // Logging: Erfolgreiche Response
  const itemCount = data.items?.length || 0;
  const totalResults = data.pageInfo?.totalResults || itemCount;
  logSuccess(`← RESPONSE [${requestId}] ${endpoint.toUpperCase()} | ${formatDuration(duration)} | ${itemCount} Items`, {
    duration: formatDuration(duration),
    itemsReturned: itemCount,
    totalResults,
    hasNextPage: !!data.nextPageToken,
    cost: `${cost} Units`
  });

  return data;
};

/**
 * Extracts a channel handle or ID from a given input string (URL or text).
 */
export const extractChannelIdentifier = (input: string): string => {
  const trimmed = input.trim();

  // Handle full URLs
  if (trimmed.includes('youtube.com/') || trimmed.includes('youtu.be/')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const path = url.pathname;

      // Case 1: /@handle
      if (path.startsWith('/@')) {
        return path.substring(1); // Return "handle" (without @ is usually safer for search, but with @ is specific)
      }

      // Case 2: /channel/ID
      if (path.startsWith('/channel/')) {
        return path.split('/')[2];
      }

      // Case 3: /c/CustomName or /user/UserName
      if (path.startsWith('/c/') || path.startsWith('/user/')) {
        return path.split('/')[2];
      }
    } catch (e) {
      // If URL parsing fails, treat as normal text
      console.warn("URL parsing failed, treating as text", e);
    }
  }

  return trimmed;
};

/**
 * Autocomplete search for channels
 * Optimierung: 5-Minuten Cache um wiederholte Suchen zu vermeiden (spart 100 Units pro Cache-Hit)
 */
export const searchChannels = async (query: string): Promise<ChannelSuggestion[]> => {
  if (!query || query.length < 2) return [];

  // Don't autocomplete if we don't have a key yet to avoid errors
  if (!API_KEY) return [];

  // Prüfe Cache zuerst
  const cached = getAutocompleteFromCache(query);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchFromApi("search", {
      part: "snippet", q: query, type: "channel", maxResults: "5"
    });

    if (!data.items) return [];

    const results = data.items.map((item: any) => ({
      id: item.snippet.channelId,
      title: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.default?.url || "",
      handle: item.snippet.customUrl
    }));

    // Speichere im Cache
    saveAutocompleteToCache(query, results);

    return results;
  } catch (error) {
    console.warn("Autocomplete failed", error);
    return [];
  }
};

export const findChannelInfo = async (channelName: string): Promise<{
  id: string, name: string, uploadsPlaylistId: string
}> => {
  const query = channelName.trim();
  const startTime = performance.now();

  logInfo(`🔍 Kanal-Suche gestartet: "${query}"`);

  // 1. Check Cache
  const cache = getChannelCache();
  if (cache[query.toLowerCase()]) {
    const cached = cache[query.toLowerCase()];
    logCache(`✅ Channel CACHE HIT: "${query}" → ${cached.name}`, {
      channelId: cached.id,
      channelName: cached.name,
      savedUnits: 'min. 1 Unit (bis zu 101 Units bei Search-Fallback)'
    });
    return cached;
  }

  let channelId: string;
  let channelTitle: string;

  // Optimierung: Erkennung ob @handle oder Channel-ID (UC...) vorliegt
  // Bei @handle: Nutze channels?forHandle= (1 Unit statt 100 Units für search)
  // Bei UC...: Nutze channels?id= direkt (1 Unit statt 100 Units für search)
  // Bei Fehler: Fallback auf Search API um Fuzzy-Matching zu ermöglichen
  const isHandle = query.startsWith('@');
  const isChannelId = query.startsWith('UC') && query.length >= 20;

  if (isHandle || isChannelId) {
    // Optimierter Pfad: Direkter channels-Endpoint (nur 1 Unit!)
    const params: Record<string, string> = {
      part: "snippet,contentDetails"
    };

    const lookupType = isHandle ? 'Handle (@)' : 'Channel-ID (UC...)';
    logInfo(`⚡ Optimierter Pfad: ${lookupType} erkannt → Nutze channels-Endpoint (1 Unit)`, {
      query,
      lookupType,
      expectedCost: '1 Unit (statt 100+ für Search)'
    });

    if (isHandle) {
      // forHandle erwartet den Handle MIT @ Zeichen
      params.forHandle = query;
    } else {
      params.id = query;
    }

    try {
      const channelData = await fetchFromApi("channels", params);

      if (channelData.items && channelData.items.length > 0) {
        channelId = channelData.items[0].id;
        channelTitle = channelData.items[0].snippet.title;
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        const result = { id: channelId, name: channelTitle, uploadsPlaylistId };
        saveChannelToCache(query.toLowerCase(), result);

        const duration = performance.now() - startTime;
        logSuccess(`✅ Kanal gefunden (optimiert): "${channelTitle}" | ${formatDuration(duration)} | 1 Unit`, {
          channelId,
          channelName: channelTitle,
          uploadsPlaylistId,
          method: 'direct-lookup',
          totalCost: '1 Unit',
          duration: formatDuration(duration)
        });

        return result;
      }
      // Kein Ergebnis → Fallback auf Search API (siehe unten)
      logInfo(`⚠️ Direkter Lookup fehlgeschlagen für "${query}" → Fallback auf Search API`);
    } catch (e) {
      // Bei Fehler (z.B. ungültiger Handle) → Fallback auf Search API
      logInfo(`⚠️ Direkter Lookup Fehler für "${query}" → Fallback auf Search API`, e);
    }
  } else {
    logInfo(`🔎 Standard-Pfad: Kein Handle/ID erkannt → Nutze Search API (100 Units)`, {
      query,
      expectedCost: '101 Units (100 Search + 1 Channel-Details)'
    });
  }

  // Fallback: Search API für Namen/URLs ohne @handle (100 Units)
  const searchData = await fetchFromApi("search", {
    part: "snippet", q: query, type: "channel", maxResults: "1"
  });

  if (!searchData.items || searchData.items.length === 0) {
    logError(`❌ Kanal nicht gefunden: "${channelName}"`);
    throw new Error(`Kanal "${channelName}" nicht gefunden.`);
  }

  channelId = searchData.items[0].snippet.channelId;
  channelTitle = searchData.items[0].snippet.channelTitle;

  // Get Channel Details to find "Uploads" playlist (Cost: 1 unit)
  const channelDetails = await fetchFromApi("channels", {
    part: "contentDetails", id: channelId
  });

  if (!channelDetails.items || channelDetails.items.length === 0) {
    logError(`❌ Kanaldetails nicht gefunden für: ${channelId}`);
    throw new Error("Kanaldetails konnten nicht geladen werden.");
  }

  const uploadsPlaylistId = channelDetails.items[0].contentDetails.relatedPlaylists.uploads;

  const result = { id: channelId, name: channelTitle, uploadsPlaylistId };
  saveChannelToCache(query.toLowerCase(), result);

  const duration = performance.now() - startTime;
  logSuccess(`✅ Kanal gefunden (Search): "${channelTitle}" | ${formatDuration(duration)} | 101 Units`, {
    channelId,
    channelName: channelTitle,
    uploadsPlaylistId,
    method: 'search-fallback',
    totalCost: '101 Units',
    duration: formatDuration(duration)
  });

  return result;
};

export const getVideosFromChannel = async (uploadsPlaylistId: string, timeFrame: TimeFrame, maxResults: number): Promise<ChannelVideosResult> => {
  const functionStartTime = performance.now();

  logInfo(`📺 Video-Abruf gestartet | Zeitraum: ${timeFrame} | Max: ${maxResults || 'Alle'}`, {
    playlistId: uploadsPlaylistId,
    timeFrame,
    maxResults: maxResults || 'unbegrenzt'
  });

  const now = Date.now();
  // Helper for calendar-month based cutoffs
  const monthsAgo = (n: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - n);
    return d.getTime();
  };
  let cutoffTime = 0;

  switch (timeFrame) {
    case TimeFrame.LAST_HOUR:
      cutoffTime = now - (60 * 60 * 1000);
      break;
    case TimeFrame.LAST_3_HOURS:
      cutoffTime = now - (3 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_5_HOURS:
      cutoffTime = now - (5 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_12_HOURS:
      cutoffTime = now - (12 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_24_HOURS:
    case TimeFrame.TODAY:
      cutoffTime = now - (24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_2_DAYS:
      cutoffTime = now - (2 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_3_DAYS:
      cutoffTime = now - (3 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_4_DAYS:
      cutoffTime = now - (4 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_5_DAYS:
      cutoffTime = now - (5 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_6_DAYS:
      cutoffTime = now - (6 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_WEEK:
      cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_2_WEEKS:
      cutoffTime = now - (14 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_3_WEEKS:
      cutoffTime = now - (21 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_4_WEEKS:
      cutoffTime = now - (28 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_MONTH:
      cutoffTime = monthsAgo(1);
      break;
    case TimeFrame.LAST_2_MONTHS:
      cutoffTime = monthsAgo(2);
      break;
    case TimeFrame.LAST_3_MONTHS:
      cutoffTime = monthsAgo(3);
      break;
    case TimeFrame.LAST_4_MONTHS:
      cutoffTime = monthsAgo(4);
      break;
    case TimeFrame.LAST_5_MONTHS:
      cutoffTime = monthsAgo(5);
      break;
    case TimeFrame.LAST_6_MONTHS:
      cutoffTime = monthsAgo(6);
      break;
    default:
      cutoffTime = now - (24 * 60 * 60 * 1000);
  }

  let allVideos: any[] = [];
  let nextPageToken = "";
  let shouldContinue = true;
  // Safety break: 100 pages * 50 videos = 5000 videos max depth
  const MAX_PAGES = 100;
  let pageCount = 0;

  while (shouldContinue && pageCount < MAX_PAGES) {
    // 1. Get latest videos from the uploads playlist (Cost: 1 unit per page)
    const params: any = {
      part: "snippet,contentDetails", playlistId: uploadsPlaylistId, maxResults: "50" // Max allowed by API per page
    };

    if (nextPageToken) params.pageToken = nextPageToken;

    const playlistData = await fetchFromApi("playlistItems", params);

    if (!playlistData.items || playlistData.items.length === 0) {
      shouldContinue = false;
      break;
    }

    const items = playlistData.items;

    // Check if the oldest video in this batch is still within our timeframe
    // If ANY video in this batch is valid, we keep it. 
    // If ALL videos are too old, we stop.
    let validItemsInBatch = 0;

    for (const item of items) {
      const publishedAt = new Date(item.snippet.publishedAt).getTime();
      if (publishedAt >= cutoffTime) {
        allVideos.push(item);
        validItemsInBatch++;
      }
    }

    // If we found 0 valid items in a full batch, it means we passed the date threshold
    if (validItemsInBatch === 0 && items.length > 0) {
      shouldContinue = false;
    } else {
      nextPageToken = playlistData.nextPageToken;
      if (!nextPageToken) shouldContinue = false;
    }

    pageCount++;
  }

  if (allVideos.length === 0) {
    logInfo(`📺 Keine Videos im Zeitraum gefunden | ${pageCount} Seite(n) durchsucht`);
    return { videos: [], totalInTimeFrame: 0 };
  }

  logInfo(`📺 Playlist-Scan abgeschlossen | ${pageCount} Seite(n) | ${allVideos.length} Videos im Zeitraum`, {
    pagesScanned: pageCount,
    videosInTimeframe: allVideos.length,
    playlistCost: `${pageCount} Units`
  });

  // Optimierung: Limitierung der Videos
  // Wir nutzen mindestens 50 Items (1 Batch), auch wenn maxResults < 50 ist,
  // um mehr Chancen zu haben, Shorts herauszufiltern, ohne mehr zu bezahlen.
  let processingLimit = allVideos.length;
  if (maxResults > 0) {
    const effectiveLimit = Math.max(maxResults, 50);
    if (allVideos.length > effectiveLimit) {
      processingLimit = effectiveLimit;
      allVideos = allVideos.slice(0, processingLimit);
    }
  }

  const totalInTimeFrame = allVideos.length;

  // Optimierung: Parallele Batch-Abfragen für Video-Stats
  // Statt sequentiell (langsam) werden alle Batches gleichzeitig abgefragt
  const batches: any[][] = [];
  for (let i = 0; i < allVideos.length; i += 50) {
    batches.push(allVideos.slice(i, i + 50));
  }

  const batchPromises = batches.map(async (batch) => {
    const videoIds = batch.map((item: any) => item.contentDetails.videoId).join(",");

    // Optimierung: 'snippet' entfernt, da wir es schon haben.
    const statsData = await fetchFromApi("videos", {
      part: "statistics,contentDetails", id: videoIds
    });

    if (!statsData.items) return [];

    return statsData.items.filter((item: any) => {
      const duration = item.contentDetails?.duration;
      if (!duration) return true;

      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      let seconds = 0;
      if (match) {
        const h = parseInt(match[1]?.replace('H', '') || '0');
        const m = parseInt(match[2]?.replace('M', '') || '0');
        const s = parseInt(match[3]?.replace('S', '') || '0');
        seconds = h * 3600 + m * 60 + s;
      }
      // Filter: Nur Videos behalten, die mindestens 180 Sekunden (3 Minuten) lang sind
      return seconds >= 180; // Shorts-Filter (alles < 180s wird ausgeschlossen)
    }).map((item: any) => {
      // Snippet aus dem Batch wiederverwenden
      const originalItem = batch.find((b: any) => b.contentDetails.videoId === item.id);
      return {
        id: item.id,
        snippet: originalItem ? originalItem.snippet : {},
        statistics: item.statistics
      };
    });
  });

  const batchResults = await Promise.all(batchPromises);
  let finalVideoItems: YouTubeVideoItem[] = batchResults.flat();
  const shortsFiltered = totalInTimeFrame - finalVideoItems.length;

  // Am Ende nochmal strikt auf maxResults kürzen
  if (maxResults > 0 && finalVideoItems.length > maxResults) {
    finalVideoItems = finalVideoItems.slice(0, maxResults);
  }

  const totalDuration = performance.now() - functionStartTime;
  const totalCost = pageCount + batches.length; // playlistItems + videos Batches

  logSuccess(`✅ Video-Abruf (Channel) abgeschlossen | ${finalVideoItems.length} Videos | ${formatDuration(totalDuration)} | ${totalCost} Units`, {
    videosReturned: finalVideoItems.length,
    totalInTimeFrame,
    shortsFiltered,
    playlistPages: pageCount,
    statsBatches: batches.length,
    totalApiCost: `${totalCost} Units`,
    breakdown: {
      playlistItems: `${pageCount} Units`,
      videoStats: `${batches.length} Units`
    },
    duration: formatDuration(totalDuration)
  });

  return { videos: finalVideoItems, totalInTimeFrame };
};

/**
 * Helper: Berechnet den ISO-Zeitstempel für publishedAfter basierend auf TimeFrame
 */
const getPublishedAfterDate = (timeFrame: TimeFrame): string => {
  const now = Date.now();
  const monthsAgo = (n: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - n);
    return d.toISOString();
  };

  let cutoffTime: number;

  switch (timeFrame) {
    case TimeFrame.LAST_HOUR:
      cutoffTime = now - (60 * 60 * 1000);
      break;
    case TimeFrame.LAST_3_HOURS:
      cutoffTime = now - (3 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_5_HOURS:
      cutoffTime = now - (5 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_12_HOURS:
      cutoffTime = now - (12 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_24_HOURS:
    case TimeFrame.TODAY:
      cutoffTime = now - (24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_2_DAYS:
      cutoffTime = now - (2 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_3_DAYS:
      cutoffTime = now - (3 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_4_DAYS:
      cutoffTime = now - (4 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_5_DAYS:
      cutoffTime = now - (5 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_6_DAYS:
      cutoffTime = now - (6 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_WEEK:
      cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_2_WEEKS:
      cutoffTime = now - (14 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_3_WEEKS:
      cutoffTime = now - (21 * 24 * 60 * 60 * 1000);
      break;
    case TimeFrame.LAST_4_WEEKS:
      cutoffTime = now - (28 * 24 * 60 * 60 * 1000);
      break;
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
      cutoffTime = now - (24 * 60 * 60 * 1000);
  }

  return new Date(cutoffTime).toISOString();
};

/**
 * Keyword-Suche: Sucht Videos nach Schlagwort/Keyword
 */
export const searchVideosByKeyword = async (
  keyword: string,
  timeFrame: TimeFrame,
  maxResults: number
): Promise<ChannelVideosResult> => {
  if (!keyword || keyword.trim().length === 0) {
    return { videos: [], totalInTimeFrame: 0 };
  }

  const functionStartTime = performance.now();
  const publishedAfter = getPublishedAfterDate(timeFrame);

  logInfo(`🔎 Keyword-Suche gestartet: "${keyword}" | Zeitraum: ${timeFrame} | Max: ${maxResults || 'Alle'}`, {
    keyword,
    timeFrame,
    publishedAfter,
    maxResults: maxResults || 'unbegrenzt',
    estimatedCost: 'min. 100 Units pro Seite (Search API)'
  });

  // YouTube Search API erlaubt maximal 50 Ergebnisse pro Seite
  // Wir holen mehrere Seiten, wenn mehr Ergebnisse gewünscht sind
  const effectiveMax = maxResults > 0 ? maxResults : 500; // Limit für "Alle"
  let allVideoIds: string[] = [];
  let nextPageToken = "";
  const MAX_PAGES = Math.ceil(effectiveMax / 50);
  let pageCount = 0;

  while (pageCount < MAX_PAGES && allVideoIds.length < effectiveMax) {
    const params: Record<string, string> = {
      part: "snippet",
      q: keyword.trim(),
      type: "video",
      order: "date", // Neueste zuerst
      publishedAfter: publishedAfter,
      maxResults: "50"
    };

    if (nextPageToken) params.pageToken = nextPageToken;

    const searchData = await fetchFromApi("search", params);

    if (!searchData.items || searchData.items.length === 0) {
      break;
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId);
    allVideoIds = [...allVideoIds, ...videoIds];

    nextPageToken = searchData.nextPageToken;
    if (!nextPageToken) break;

    pageCount++;
  }

  // pageCount wurde im Loop bei jedem Durchlauf erhöht, jetzt die finale Anzahl
  const searchPagesUsed = pageCount + 1; // +1 weil pageCount bei 0 startet und nach dem letzten break nicht erhöht wird

  if (allVideoIds.length === 0) {
    logInfo(`🔎 Keyword-Suche: Keine Videos gefunden für "${keyword}"`);
    return { videos: [], totalInTimeFrame: 0 };
  }

  logInfo(`🔎 Search-Phase abgeschlossen | ${searchPagesUsed} Seite(n) | ${allVideoIds.length} Video-IDs`, {
    searchPages: searchPagesUsed,
    videoIds: allVideoIds.length,
    searchCost: `${searchPagesUsed * 100} Units`
  });

  // Optimierung: Deduplizierung - entferne doppelte Video-IDs vor der Stats-Abfrage
  // Dies spart API-Calls wenn die Suche Duplikate zurückgibt
  const uniqueVideoIds = [...new Set(allVideoIds)];
  const duplicatesRemoved = allVideoIds.length - uniqueVideoIds.length;
  allVideoIds = uniqueVideoIds;

  if (duplicatesRemoved > 0) {
    logInfo(`🔄 Duplikate entfernt: ${duplicatesRemoved} | Verbleibend: ${allVideoIds.length} Videos`);
  }

  // Auf maxResults begrenzen
  if (maxResults > 0 && allVideoIds.length > maxResults) {
    allVideoIds = allVideoIds.slice(0, maxResults);
  }

  const totalInTimeFrame = allVideoIds.length;

  // Optimierung: Parallele Batch-Abfragen für Video-Details und Statistiken
  const batches: string[][] = [];
  for (let i = 0; i < allVideoIds.length; i += 50) {
    batches.push(allVideoIds.slice(i, i + 50));
  }

  const batchPromises = batches.map(async (batch) => {
    const videoIds = batch.join(",");

    const videoData = await fetchFromApi("videos", {
      part: "snippet,statistics,contentDetails",
      id: videoIds
    });

    if (!videoData.items) return [];

    return videoData.items.filter((item: any) => {
      // Shorts-Filter: Videos < 180 Sekunden ausschließen
      const duration = item.contentDetails?.duration;
      if (!duration) return true;

      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      let seconds = 0;
      if (match) {
        const h = parseInt(match[1]?.replace('H', '') || '0');
        const m = parseInt(match[2]?.replace('M', '') || '0');
        const s = parseInt(match[3]?.replace('S', '') || '0');
        seconds = h * 3600 + m * 60 + s;
      }
      return seconds >= 180;
    }).map((item: any) => ({
      id: item.id,
      snippet: item.snippet,
      statistics: item.statistics
    }));
  });

  const batchResults = await Promise.all(batchPromises);
  let finalVideoItems: YouTubeVideoItem[] = batchResults.flat();
  const shortsFiltered = totalInTimeFrame - finalVideoItems.length;

  // Am Ende nochmal strikt auf maxResults kürzen
  if (maxResults > 0 && finalVideoItems.length > maxResults) {
    finalVideoItems = finalVideoItems.slice(0, maxResults);
  }

  const totalDuration = performance.now() - functionStartTime;
  const searchCost = searchPagesUsed * 100; // 100 Units pro Search-Seite
  const statsCost = batches.length; // 1 Unit pro Videos-Batch
  const totalCost = searchCost + statsCost;

  logSuccess(`✅ Keyword-Suche abgeschlossen: "${keyword}" | ${finalVideoItems.length} Videos | ${formatDuration(totalDuration)} | ${totalCost} Units`, {
    keyword,
    videosReturned: finalVideoItems.length,
    totalInTimeFrame,
    shortsFiltered,
    duplicatesRemoved,
    searchPages: searchPagesUsed,
    statsBatches: batches.length,
    totalApiCost: `${totalCost} Units`,
    breakdown: {
      search: `${searchCost} Units (${searchPagesUsed} Seiten × 100)`,
      videoStats: `${statsCost} Units (${batches.length} Batches × 1)`
    },
    duration: formatDuration(totalDuration)
  });

  return { videos: finalVideoItems, totalInTimeFrame };
};