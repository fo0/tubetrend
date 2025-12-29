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

export interface QuotaHistoryEntry {
  timestamp: number;
  units: number;
  endpoint: string;
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
