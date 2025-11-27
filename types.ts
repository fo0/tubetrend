export enum TimeFrame {
  LAST_HOUR = 'Letzte Stunde',
  LAST_3_HOURS = 'Letzte 3 Stunden',
  LAST_5_HOURS = 'Letzte 5 Stunden',
  LAST_12_HOURS = 'Letzte 12 Stunden',
  LAST_24_HOURS = 'Letzte 24 Stunden',
  TODAY = 'Heute',
  LAST_2_DAYS = 'Letzte 2 Tage',
  LAST_3_DAYS = 'Letzte 3 Tage',
  LAST_4_DAYS = 'Letzte 4 Tage',
  LAST_5_DAYS = 'Letzte 5 Tage',
  LAST_6_DAYS = 'Letzte 6 Tage',
  LAST_WEEK = 'Letzte Woche'
}

export enum SortOption {
  TRENDING_SCORE = 'Trend-Score'
}

export interface VideoStats {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface YouTubeVideoItem {
  id: string; // The video ID
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

export interface VideoData {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  views: number;
  uploadTime: string;
  publishedTimestamp: number;
  trendingScore: number; // 0-100
  reasoning: string;
  viewsPerHour?: number; // Calculated metric
}

export interface SearchState {
  isLoading: boolean;
  step: 'idle' | 'fetching_youtube' | 'analyzing_ai' | 'complete';
  error: string | null;
  data: VideoData[] | null;
  channelName: string;
}

export interface ChannelSuggestion {
  id: string;
  title: string;
  thumbnailUrl: string;
  handle?: string;
}