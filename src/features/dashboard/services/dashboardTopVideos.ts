import type {FavoriteCacheEntry, FavoriteConfig} from '@/src/features/favorites/types';
import type {VideoData} from '@/src/features/videos/types';

export interface HighlightItem {
  video: VideoData;
  sourceId: string;
  sourceLabel: string;
  sourceRank: number;
}

interface SelectOptions {
  perFavorite?: number;
  maxTotal?: number;
}

/**
 * Select highlight videos from favorites
 */
export function selectHighlightVideosFromFavorites(
  favorites: FavoriteConfig[],
  getCache: (id: string) => FavoriteCacheEntry | null,
  options: SelectOptions = {}
): HighlightItem[] {
  const perFavorite = options.perFavorite ?? 1;
  const maxTotal = options.maxTotal ?? favorites.length;

  const result: HighlightItem[] = [];

  for (const fav of favorites) {
    if (result.length >= maxTotal) break;

    const cache = getCache(fav.id);
    if (!cache || !cache.videos || cache.videos.length === 0) continue;

    const sorted = [...cache.videos].sort(
      (a, b) => b.trendingScore - a.trendingScore
    );

    const label = fav.label || cache.meta?.channelTitle || fav.query;

    for (let i = 0; i < Math.min(perFavorite, sorted.length); i++) {
      if (result.length >= maxTotal) break;

      result.push({
        video: sorted[i],
        sourceId: fav.id,
        sourceLabel: label,
        sourceRank: i + 1,
      });
    }
  }

  return result;
}
