/**
 * API-related type definitions
 */

export interface VideoStats {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface YouTubeVideoItem {
  id: string;
  snippet: {
    publishedAt: string;
    title: string;
    thumbnails: {
      high?: { url: string; width: number; height: number };
      medium?: { url: string };
      default?: { url: string };
    };
    channelTitle: string;
  };
  statistics?: VideoStats;
}

export interface ChannelVideosResult {
  videos: YouTubeVideoItem[];
  totalInTimeFrame: number;
}

export interface ChannelSuggestion {
  id: string;
  title: string;
  thumbnailUrl: string;
  handle?: string;
}

export interface ChannelInfo {
  id: string;
  name: string;
  uploadsPlaylistId: string;
}

/**
 * Context information for API calls to better understand quota usage
 */
export interface QuotaCallContext {
  /** Type of request: channel search, keyword search, autocomplete, etc. */
  source: 'channel' | 'keyword' | 'autocomplete' | 'channel-info' | 'video-stats' | 'unknown';
  /** Display name: channel name or search term */
  name?: string;
  /** Favorite ID if triggered by a favorite */
  favoriteId?: string;
  /** Type of favorite that triggered this call (for grouping in UI) */
  favoriteType?: 'channel' | 'handle' | 'keyword';
}

export interface QuotaHistoryEntry {
  timestamp: number;
  units: number;
  endpoint: string;
  /** Optional context about what triggered this API call */
  context?: QuotaCallContext;
}

export interface QuotaData {
  date: string;
  used: number;
  exhausted: boolean;
  detectedLimit?: number;
  history?: QuotaHistoryEntry[];
}

export interface QuotaInfo {
  used: number;
  limit: number;
  percentage: number;
  exhausted: boolean;
}
