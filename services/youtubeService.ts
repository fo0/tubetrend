import {ChannelSuggestion, TimeFrame, YouTubeVideoItem} from "../types";

const STORAGE_KEY = 'yt_api_key';
const CHANNEL_CACHE_KEY = 'yt_channel_cache';

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

  if (!response.ok) {
    // Handle specific API errors
    if (data.error) {
      const msg = data.error.message;
      if (msg.includes("API key not valid")) throw new Error("Der eingegebene API Key ist ungültig.");
      if (msg.includes("quota")) throw new Error("YouTube API Quota überschritten.");
      throw new Error(`YouTube API Fehler: ${msg}`);
    }
    throw new Error(`HTTP Fehler: ${response.status}`);
  }

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
 */
export const searchChannels = async (query: string): Promise<ChannelSuggestion[]> => {
  if (!query || query.length < 2) return [];

  // Don't autocomplete if we don't have a key yet to avoid errors
  if (!API_KEY) return [];

  try {
    const data = await fetchFromApi("search", {
      part: "snippet", q: query, type: "channel", maxResults: "5"
    });

    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: item.snippet.channelId,
      title: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.default?.url || "",
      handle: item.snippet.customUrl
    }));
  } catch (error) {
    console.warn("Autocomplete failed", error);
    return [];
  }
};

export const findChannelInfo = async (channelName: string): Promise<{
  id: string, name: string, uploadsPlaylistId: string
}> => {
  const query = channelName.startsWith('@') ? channelName : channelName;

  // 1. Check Cache
  const cache = getChannelCache();
  if (cache[query]) {
    return cache[query];
  }

  // 2. Search for the channel to get ID (Cost: 100 units)
  const searchData = await fetchFromApi("search", {
    part: "snippet", q: query, type: "channel", maxResults: "1"
  });

  if (!searchData.items || searchData.items.length === 0) {
    throw new Error(`Kanal "${channelName}" nicht gefunden.`);
  }

  const channelId = searchData.items[0].snippet.channelId;
  const channelTitle = searchData.items[0].snippet.channelTitle;

  // 3. Get Channel Details to find "Uploads" playlist (Cost: 1 unit)
  const channelDetails = await fetchFromApi("channels", {
    part: "contentDetails", id: channelId
  });

  if (!channelDetails.items || channelDetails.items.length === 0) {
    throw new Error("Kanaldetails konnten nicht geladen werden.");
  }

  const uploadsPlaylistId = channelDetails.items[0].contentDetails.relatedPlaylists.uploads;

  const result = { id: channelId, name: channelTitle, uploadsPlaylistId };
  saveChannelToCache(query, result);

  return result;
};

export const getVideosFromChannel = async (uploadsPlaylistId: string, timeFrame: TimeFrame, maxResults: number): Promise<YouTubeVideoItem[]> => {
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
    return [];
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

  let finalVideoItems: YouTubeVideoItem[] = [];

  // Batch processing for stats
  for (let i = 0; i < allVideos.length; i += 50) {
    const batch = allVideos.slice(i, i + 50);
    const videoIds = batch.map((item: any) => item.contentDetails.videoId).join(",");

    // Optimierung: 'snippet' entfernt, da wir es schon haben.
    const statsData = await fetchFromApi("videos", {
      part: "statistics,contentDetails", id: videoIds
    });

    if (statsData.items) {
      const mapped = statsData.items.filter((item: any) => {
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
        return seconds > 60; // Shorts Filter
      }).map((item: any) => {
        // Snippet aus dem Batch wiederverwenden
        const originalItem = batch.find((b: any) => b.contentDetails.videoId === item.id);
        return {
          id: item.id,
          snippet: originalItem ? originalItem.snippet : {},
          statistics: item.statistics
        };
      });

      finalVideoItems = [...finalVideoItems, ...mapped];
    }
  }

  // Am Ende nochmal strikt auf maxResults kürzen
  if (maxResults > 0 && finalVideoItems.length > maxResults) {
    finalVideoItems = finalVideoItems.slice(0, maxResults);
  }

  return finalVideoItems;
};