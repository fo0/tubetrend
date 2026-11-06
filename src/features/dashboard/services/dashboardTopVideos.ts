import type { FavoriteCacheEntry, FavoriteConfig } from "@/src/features/favorites/types";
import type { VideoData } from "@/src/features/videos/types";

export interface HighlightItem {
  video: VideoData;
  sourceId: string;
  sourceLabel: string;
  sourceRank: number;
}

interface SelectOptions {
  perFavorite?: number;
  maxTotal?: number;
  /**
   * Video ids the user hid. A hidden video is skipped and the favorite's next
   * best one takes its slot, so hiding a highlight means "show me the next
   * one" instead of dropping that favorite from the highlights until its top
   * video happens to change on a later refresh.
   */
  excludeVideoIds?: ReadonlySet<string>;
}

export interface HighlightSelection {
  items: HighlightItem[];
  /**
   * Favorites that hold cached videos but contributed no highlight because
   * every one of their videos is hidden — what the "all highlights are hidden"
   * empty state counts.
   */
  fullyHiddenCount: number;
}

/**
 * Select highlight videos from favorites
 */
export function selectHighlightVideosFromFavorites(
  favorites: FavoriteConfig[],
  getCache: (id: string) => FavoriteCacheEntry | null,
  options: SelectOptions = {},
): HighlightSelection {
  const perFavorite = options.perFavorite ?? 1;
  const maxTotal = options.maxTotal ?? favorites.length;
  const excluded = options.excludeVideoIds;

  const items: HighlightItem[] = [];
  let fullyHiddenCount = 0;

  for (const fav of favorites) {
    if (items.length >= maxTotal) break;

    const cache = getCache(fav.id);
    if (!cache || !cache.videos || cache.videos.length === 0) continue;

    const sorted = [...cache.videos].sort((a, b) => b.trendingScore - a.trendingScore);

    const label = fav.label || cache.meta?.channelTitle || fav.query;

    let taken = 0;
    // `i` stays the position in the favorite's own ranking, so a card that
    // stands in for a hidden one says "Top 2", not a second "Top 1".
    for (let i = 0; i < sorted.length && taken < perFavorite; i++) {
      if (items.length >= maxTotal) break;
      if (excluded?.has(sorted[i].id)) continue;

      items.push({
        video: sorted[i],
        sourceId: fav.id,
        sourceLabel: label,
        sourceRank: i + 1,
      });
      taken++;
    }

    if (taken === 0 && items.length < maxTotal) fullyHiddenCount++;
  }

  return { items, fullyHiddenCount };
}
