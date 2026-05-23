import { safeRead, safeWrite } from "@/src/shared/lib/storage";
import { AUTO_LIMIT_CHANNEL, CACHE_TTL, STORAGE_KEYS } from "@/src/shared/constants";
import type {
  ChannelInfo,
  ChannelSuggestion,
  ChannelVideosResult,
  QuotaCallContext,
  YouTubeVideoItem,
} from "@/src/shared/types";
import { TimeFrame } from "@/src/shared/types";
import { getCutoffTime, parseISO8601DurationToSeconds } from "@/src/shared/lib/dateUtils";
import type {
  YoutubeChannelListResponse,
  YoutubePlaylistItemResource,
  YoutubePlaylistItemsResponse,
  YoutubeSearchResponse,
  YoutubeVideoListResponse,
} from "../types";

const SHORTS_DURATION_THRESHOLD_SECONDS = 180;
import { fetchFromApi, getApiKey } from "./youtubeApiClient";

interface AutocompleteCacheEntry {
  results: ChannelSuggestion[];
  timestamp: number;
}

// Channel cache helpers
function getChannelCache(): Record<string, ChannelInfo> {
  return safeRead<Record<string, ChannelInfo>>(STORAGE_KEYS.CHANNEL_CACHE, {});
}

function saveChannelToCache(key: string, data: ChannelInfo): void {
  const cache = getChannelCache();
  cache[key] = data;
  safeWrite(STORAGE_KEYS.CHANNEL_CACHE, cache);
}

// Autocomplete cache helpers
function getAutocompleteCache(): Record<string, AutocompleteCacheEntry> {
  return safeRead<Record<string, AutocompleteCacheEntry>>(STORAGE_KEYS.AUTOCOMPLETE_CACHE, {});
}

function getAutocompleteFromCache(query: string): ChannelSuggestion[] | null {
  const cache = getAutocompleteCache();
  const entry = cache[query.toLowerCase()];
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL.AUTOCOMPLETE) return null;

  return entry.results;
}

function saveAutocompleteToCache(query: string, results: ChannelSuggestion[]): void {
  const cache = getAutocompleteCache();
  const now = Date.now();

  // Clean expired entries
  Object.keys(cache).forEach((key) => {
    if (now - cache[key].timestamp > CACHE_TTL.AUTOCOMPLETE) {
      delete cache[key];
    }
  });

  cache[query.toLowerCase()] = { results, timestamp: now };
  safeWrite(STORAGE_KEYS.AUTOCOMPLETE_CACHE, cache);
}

/**
 * Determine the query type based on the input format
 * @returns 'handle' if query starts with @, otherwise 'channel'
 */
export function getChannelQueryType(query: string): "channel" | "handle" {
  return query.trim().startsWith("@") ? "handle" : "channel";
}

/**
 * Extract channel identifier from URL or input string
 */
export function extractChannelIdentifier(input: string): string {
  const trimmed = input.trim();

  if (trimmed.includes("youtube.com/") || trimmed.includes("youtu.be/")) {
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const path = url.pathname;

      if (path.startsWith("/@")) return path.substring(1);
      if (path.startsWith("/channel/")) return path.split("/")[2];
      if (path.startsWith("/c/") || path.startsWith("/user/")) return path.split("/")[2];
    } catch {
      // Fall through
    }
  }

  return trimmed;
}

/**
 * Search for channels (autocomplete)
 *
 * Note: The Search API does not always return correct channel thumbnails when
 * type=channel. We therefore make an additional channels API call after the
 * search to fetch the correct avatars (costs only 1 additional unit for up to
 * 50 channels).
 */
export async function searchChannels(query: string): Promise<ChannelSuggestion[]> {
  if (!query || query.length < 2) return [];
  if (!getApiKey()) return [];

  const cached = getAutocompleteFromCache(query);
  if (cached) return cached;

  try {
    const autocompleteContext: QuotaCallContext = {
      source: "autocomplete",
      name: query,
    };

    const data = await fetchFromApi<YoutubeSearchResponse>(
      "search",
      {
        part: "snippet",
        q: query,
        type: "channel",
        maxResults: "5",
      },
      autocompleteContext,
    );

    if (!data.items) return [];

    // Collect channel IDs for the batch call
    const channelIds = data.items
      .map((item) => item.snippet?.channelId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    // Fetch correct thumbnails via the channels endpoint (1 unit per up to 50 channels)
    let thumbnailMap: Record<string, string> = {};
    if (channelIds.length > 0) {
      try {
        const channelsData = await fetchFromApi<YoutubeChannelListResponse>(
          "channels",
          {
            part: "snippet",
            id: channelIds.join(","),
          },
          autocompleteContext,
        );

        if (channelsData.items) {
          for (const channel of channelsData.items) {
            const thumbUrl =
              channel.snippet?.thumbnails?.default?.url ||
              channel.snippet?.thumbnails?.medium?.url ||
              channel.snippet?.thumbnails?.high?.url ||
              "";
            thumbnailMap[channel.id] = thumbUrl;
          }
        }
      } catch {
        // On error: fall back to Search thumbnails (better than nothing)
      }
    }

    const results: ChannelSuggestion[] = data.items.map((item) => {
      const channelId = item.snippet?.channelId ?? "";
      return {
        id: channelId,
        title: item.snippet?.channelTitle ?? "",
        // Prefer thumbnail from channels endpoint, fall back to Search thumbnail
        thumbnailUrl: thumbnailMap[channelId] || item.snippet?.thumbnails?.default?.url || "",
        handle: item.snippet?.customUrl,
      };
    });

    saveAutocompleteToCache(query, results);
    return results;
  } catch {
    return [];
  }
}

/**
 * Find channel information by name, handle, or ID
 */
export async function findChannelInfo(
  channelName: string,
  context?: Partial<QuotaCallContext>,
): Promise<ChannelInfo> {
  const query = channelName.trim();

  // Check cache first
  const cache = getChannelCache();
  if (cache[query.toLowerCase()]) {
    return cache[query.toLowerCase()];
  }

  const queryType = getChannelQueryType(query);
  const isHandle = queryType === "handle";

  const channelContext: QuotaCallContext = {
    source: "channel-info",
    name: query,
    favoriteType: queryType,
    ...context,
  };
  const isChannelId = query.startsWith("UC") && query.length >= 20;

  // Try optimized path first (direct lookup)
  if (isHandle || isChannelId) {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
    };

    if (isHandle) {
      params.forHandle = query;
    } else {
      params.id = query;
    }

    try {
      const channelData = await fetchFromApi<YoutubeChannelListResponse>(
        "channels",
        params,
        channelContext,
      );

      if (channelData.items && channelData.items.length > 0) {
        const item = channelData.items[0];
        const uploads = item.contentDetails?.relatedPlaylists?.uploads;
        if (item.snippet?.title && uploads) {
          const result: ChannelInfo = {
            id: item.id,
            name: item.snippet.title,
            uploadsPlaylistId: uploads,
          };

          saveChannelToCache(query.toLowerCase(), result);
          return result;
        }
      }
    } catch {
      // Fall through to search
    }
  }

  // Fallback: Search API
  const searchData = await fetchFromApi<YoutubeSearchResponse>(
    "search",
    {
      part: "snippet",
      q: query,
      type: "channel",
      maxResults: "1",
    },
    channelContext,
  );

  if (!searchData.items || searchData.items.length === 0) {
    throw new Error(`Channel "${channelName}" not found.`);
  }

  const firstSnippet = searchData.items[0].snippet;
  const channelId = firstSnippet?.channelId;
  const channelTitle = firstSnippet?.channelTitle;
  if (!channelId || !channelTitle) {
    throw new Error(`Channel "${channelName}" not found.`);
  }

  // Get channel details
  const channelDetails = await fetchFromApi<YoutubeChannelListResponse>(
    "channels",
    {
      part: "contentDetails",
      id: channelId,
    },
    channelContext,
  );

  if (!channelDetails.items || channelDetails.items.length === 0) {
    throw new Error("Channel details could not be loaded.");
  }

  const uploadsPlaylistId = channelDetails.items[0].contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error("Channel details could not be loaded.");
  }

  const result: ChannelInfo = {
    id: channelId,
    name: channelTitle,
    uploadsPlaylistId,
  };

  saveChannelToCache(query.toLowerCase(), result);
  return result;
}

/**
 * Get videos from a channel's uploads playlist
 */
export async function getVideosFromChannel(
  uploadsPlaylistId: string,
  timeFrame: TimeFrame,
  maxResults: number,
  context?: Partial<QuotaCallContext>,
): Promise<ChannelVideosResult> {
  const effectiveMax = maxResults === -1 ? AUTO_LIMIT_CHANNEL : maxResults > 0 ? maxResults : 0;
  const cutoffTime = getCutoffTime(timeFrame);

  const channelContext: QuotaCallContext = {
    source: "channel",
    favoriteType: "channel",
    ...context,
  };

  let allVideos: YoutubePlaylistItemResource[] = [];
  let nextPageToken = "";
  let shouldContinue = true;
  const MAX_PAGES = 100;
  let pageCount = 0;

  while (shouldContinue && pageCount < MAX_PAGES) {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    };

    if (nextPageToken) params.pageToken = nextPageToken;

    const playlistData = await fetchFromApi<YoutubePlaylistItemsResponse>(
      "playlistItems",
      params,
      channelContext,
    );

    if (!playlistData.items || playlistData.items.length === 0) {
      shouldContinue = false;
      break;
    }

    const items = playlistData.items;
    let validItemsInBatch = 0;

    for (const item of items) {
      const publishedAt = new Date(item.snippet.publishedAt).getTime();
      if (publishedAt >= cutoffTime) {
        allVideos.push(item);
        validItemsInBatch++;
      }
    }

    if (validItemsInBatch === 0 && items.length > 0) {
      shouldContinue = false;
    } else {
      nextPageToken = playlistData.nextPageToken ?? "";
      if (!nextPageToken) shouldContinue = false;
    }

    pageCount++;
  }

  if (allVideos.length === 0) {
    return { videos: [], totalInTimeFrame: 0 };
  }

  // Apply limit
  let processingLimit = allVideos.length;
  if (effectiveMax > 0) {
    // Over-fetch headroom: the videos.list call below post-filters
    // confirmed Shorts (duration < SHORTS_DURATION_THRESHOLD_SECONDS),
    // so we ask for up to 50 candidates even when the caller wants
    // fewer. Without this margin a channel that posted many Shorts
    // in the window would return below `effectiveMax` longform videos.
    // The final slice to `effectiveMax` happens after Shorts filtering.
    const effectiveLimit = Math.max(effectiveMax, 50);
    if (allVideos.length > effectiveLimit) {
      processingLimit = effectiveLimit;
      allVideos = allVideos.slice(0, processingLimit);
    }
  }

  const totalInTimeFrame = allVideos.length;

  // Fetch video stats in batches
  const batches: YoutubePlaylistItemResource[][] = [];
  for (let i = 0; i < allVideos.length; i += 50) {
    batches.push(allVideos.slice(i, i + 50));
  }

  const batchPromises = batches.map(async (batch) => {
    const videoIds = batch.map((item) => item.contentDetails.videoId).join(",");

    const statsData = await fetchFromApi<YoutubeVideoListResponse>(
      "videos",
      {
        part: "statistics,contentDetails",
        id: videoIds,
      },
      { ...channelContext, source: "video-stats" },
    );

    if (!statsData.items) return [];

    return statsData.items
      .filter((item) => {
        const seconds = parseISO8601DurationToSeconds(item.contentDetails?.duration);
        // Keep videos whose duration is unknown; only filter confirmed shorts.
        if (seconds === null) return true;
        return seconds >= SHORTS_DURATION_THRESHOLD_SECONDS;
      })
      .map((item): YouTubeVideoItem => {
        const originalItem = batch.find((b) => b.contentDetails.videoId === item.id);
        // Snippet comes from the original /playlistItems response (typed
        // YoutubeVideoSnippet); cast bridges to the consumer type which has
        // narrower thumbnail optionality. Empty-object fallback preserves
        // pre-refactor behaviour when an item is missing.
        const snippet = (originalItem?.snippet ?? {}) as unknown as YouTubeVideoItem["snippet"];
        return {
          id: item.id,
          snippet,
          statistics: item.statistics,
        };
      });
  });

  const batchResults = await Promise.all(batchPromises);
  let finalVideoItems: YouTubeVideoItem[] = batchResults.flat();

  if (effectiveMax > 0 && finalVideoItems.length > effectiveMax) {
    finalVideoItems = finalVideoItems.slice(0, effectiveMax);
  }

  return { videos: finalVideoItems, totalInTimeFrame };
}
