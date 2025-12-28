import {ChannelSuggestion, TimeFrame, YouTubeVideoItem, ChannelVideosResult, SearchType} from "../types";

const STORAGE_KEY = 'yt_api_key';
const CHANNEL_CACHE_KEY = 'yt_channel_cache';
const AUTOCOMPLETE_CACHE_KEY = 'yt_autocomplete_cache';
const QUOTA_TRACKING_KEY = 'yt_quota_tracking';
const AUTOCOMPLETE_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten TTL
const DEFAULT_DAILY_QUOTA = 10000; // YouTube API default quota

// Quota tracking interface - dynamically adapts based on actual usage
interface QuotaData {
  date: string; // YYYY-MM-DD
  used: number;
  exhausted: boolean; // True when API returns quota exceeded error
  detectedLimit?: number; // Actual limit detected when exhausted
}

// Get today's date as YYYY-MM-DD
const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get current quota data
const getQuotaData = (): QuotaData => {
  if (typeof window === 'undefined') return { date: getTodayDateString(), used: 0, exhausted: false };
  try {
    const item = localStorage.getItem(QUOTA_TRACKING_KEY);
    if (!item) return { date: getTodayDateString(), used: 0, exhausted: false };
    const data: QuotaData = JSON.parse(item);
    // Reset if it's a new day
    if (data.date !== getTodayDateString()) {
      return { date: getTodayDateString(), used: 0, exhausted: false };
    }
    return data;
  } catch { return { date: getTodayDateString(), used: 0, exhausted: false }; }
};

// Save quota data
const saveQuotaData = (data: QuotaData) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUOTA_TRACKING_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('quota-updated', { detail: data }));
  } catch (e) { console.warn("Quota tracking failed", e); }
};

// Track quota usage
const trackQuotaUsage = (units: number) => {
  const data = getQuotaData();
  data.used += units;
  saveQuotaData(data);
};

// Mark quota as exhausted (called when API returns quota error)
const markQuotaExhausted = () => {
  const data = getQuotaData();
  data.exhausted = true;
  // The current usage becomes our detected limit
  data.detectedLimit = data.used;
  saveQuotaData(data);
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
  if (!entry) return null;

  // Prüfe TTL
  if (Date.now() - entry.timestamp > AUTOCOMPLETE_CACHE_TTL) {
    return null; // Abgelaufen
  }
  return entry.results;
};

const saveAutocompleteToCache = (query: string, results: ChannelSuggestion[]) => {
  if (typeof window === 'undefined') return;
  try {
    const cache = getAutocompleteCache();

    // Alte Einträge bereinigen (älter als TTL)
    const now = Date.now();
    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > AUTOCOMPLETE_CACHE_TTL) {
        delete cache[key];
      }
    });

    cache[query.toLowerCase()] = { results, timestamp: now };
    localStorage.setItem(AUTOCOMPLETE_CACHE_KEY, JSON.stringify(cache));
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

  const response = await fetch(url.toString());
  const data = await response.json();

  // Berechne Kosten für diesen Endpoint
  const cost = API_COSTS[endpoint as keyof typeof API_COSTS] || 1;

  if (!response.ok) {
    // Handle specific API errors
    if (data.error) {
      const msg = data.error.message;
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
        trackQuotaUsage(cost);
      }
      throw new Error(`YouTube API Fehler: ${msg}`);
    }
    // Bei HTTP-Fehlern ohne error-Objekt: 4xx kosten Quota
    if (response.status >= 400 && response.status < 500) {
      trackQuotaUsage(cost);
    }
    throw new Error(`HTTP Fehler: ${response.status}`);
  }

  // Track quota usage on successful API calls
  trackQuotaUsage(cost);

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

  // 1. Check Cache
  const cache = getChannelCache();
  if (cache[query.toLowerCase()]) {
    return cache[query.toLowerCase()];
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

        return result;
      }
      // Kein Ergebnis → Fallback auf Search API (siehe unten)
    } catch (e) {
      // Bei Fehler (z.B. ungültiger Handle) → Fallback auf Search API
      console.warn("Direct channel lookup failed, falling back to search:", e);
    }
  }

  // Fallback: Search API für Namen/URLs ohne @handle (100 Units)
  const searchData = await fetchFromApi("search", {
    part: "snippet", q: query, type: "channel", maxResults: "1"
  });

  if (!searchData.items || searchData.items.length === 0) {
    throw new Error(`Kanal "${channelName}" nicht gefunden.`);
  }

  channelId = searchData.items[0].snippet.channelId;
  channelTitle = searchData.items[0].snippet.channelTitle;

  // Get Channel Details to find "Uploads" playlist (Cost: 1 unit)
  const channelDetails = await fetchFromApi("channels", {
    part: "contentDetails", id: channelId
  });

  if (!channelDetails.items || channelDetails.items.length === 0) {
    throw new Error("Kanaldetails konnten nicht geladen werden.");
  }

  const uploadsPlaylistId = channelDetails.items[0].contentDetails.relatedPlaylists.uploads;

  const result = { id: channelId, name: channelTitle, uploadsPlaylistId };
  saveChannelToCache(query.toLowerCase(), result);

  return result;
};

export const getVideosFromChannel = async (uploadsPlaylistId: string, timeFrame: TimeFrame, maxResults: number): Promise<ChannelVideosResult> => {
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
    return { videos: [], totalInTimeFrame: 0 };
  }

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

  // Am Ende nochmal strikt auf maxResults kürzen
  if (maxResults > 0 && finalVideoItems.length > maxResults) {
    finalVideoItems = finalVideoItems.slice(0, maxResults);
  }

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

  const publishedAfter = getPublishedAfterDate(timeFrame);
  
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

  if (allVideoIds.length === 0) {
    return { videos: [], totalInTimeFrame: 0 };
  }

  // Optimierung: Deduplizierung - entferne doppelte Video-IDs vor der Stats-Abfrage
  // Dies spart API-Calls wenn die Suche Duplikate zurückgibt
  const uniqueVideoIds = [...new Set(allVideoIds)];
  allVideoIds = uniqueVideoIds;

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

  // Am Ende nochmal strikt auf maxResults kürzen
  if (maxResults > 0 && finalVideoItems.length > maxResults) {
    finalVideoItems = finalVideoItems.slice(0, maxResults);
  }

  return { videos: finalVideoItems, totalInTimeFrame };
};