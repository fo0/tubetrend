import { FavoriteCacheEntry, FavoriteConfig, VideoData } from '../types';

/**
 * Wählt pro Favorit genau ein Video (Top1) aus dem Favoriten-Cache aus.
 * Erwartung: `favorites` ist bereits in der gewünschten Reihenfolge sortiert.
 */
export function selectTopFavoriteVideos(
  favorites: FavoriteConfig[],
  getCache: (id: string) => FavoriteCacheEntry | null
): VideoData[] {
  const out: VideoData[] = [];
  const seen = new Set<string>();

  for (const fav of favorites) {
    const cache = getCache(fav.id);
    const top = cache?.videos?.[0];
    if (!top) continue;
    if (seen.has(top.id)) continue;
    seen.add(top.id);
    out.push(top);
  }

  return out;
}
