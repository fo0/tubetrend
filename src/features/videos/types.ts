/**
 * Video-related types
 */

export interface VideoData {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  views: number;
  uploadTime: string;
  publishedTimestamp: number;
  trendingScore: number;
  reasoning: string;
  viewsPerHour?: number;
}

export interface SearchState {
  isLoading: boolean;
  step: 'idle' | 'fetching_youtube' | 'analyzing_ai' | 'complete';
  error: string | null;
  data: VideoData[] | null;
  channelName: string;
  channelId?: string;
}
