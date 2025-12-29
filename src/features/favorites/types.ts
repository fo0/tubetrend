import type {SearchType, TimeFrame} from '@/src/shared/types';
import type {VideoData} from '@/src/features/videos/types';

/**
 * Favorite configuration stored in localStorage
 */
export interface FavoriteConfig {
  readonly id: string;
  readonly query: string;
  readonly timeFrame: TimeFrame;
  readonly maxResults: number;
  readonly searchType: SearchType;
  readonly createdAt: number;
  readonly label?: string;
}

/**
 * Cached data for a favorite
 */
export interface FavoriteCacheEntry {
  readonly videos: VideoData[];
  readonly fetchedAt: number;
  readonly meta?: FavoriteCacheMeta;
}

export interface FavoriteCacheMeta {
  readonly totalInTimeFrame?: number;
  readonly topVelocityVph?: number;
  readonly channelTitle?: string;
  readonly channelId?: string;
}

/**
 * Type guard for FavoriteConfig
 */
export function isFavoriteConfig(value: unknown): value is FavoriteConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'query' in value &&
    'timeFrame' in value &&
    'maxResults' in value &&
    'searchType' in value &&
    'createdAt' in value
  );
}
