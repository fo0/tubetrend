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

export interface DashboardHighlightVideo {
  video: VideoData;
  sourceId: string;
  sourceLabel: string;
  sourceRank: number; // 1..N innerhalb des Favoriten (Top1, Top2, ...)
}

/**
 * Wählt pro Favorit mehrere Top-Videos aus (z.B. Top2), um den Dashboard-Highlight-Bereich zu füllen.
 * - Dedupliziert global nach Video-ID (damit das gleiche Video nicht mehrfach auftaucht)
 * - Begrenzung via `maxTotal`
 */
export function selectHighlightVideosFromFavorites(
  favorites: FavoriteConfig[],
  getCache: (id: string) => FavoriteCacheEntry | null,
  options?: {
    perFavorite?: number;
    maxTotal?: number;
  }
): DashboardHighlightVideo[] {
  const perFavorite = Math.max(1, options?.perFavorite ?? 2);
  const maxTotal = Math.max(1, options?.maxTotal ?? 12);

  const out: DashboardHighlightVideo[] = [];
  const seen = new Set<string>();

  for (const fav of favorites) {
    const cache = getCache(fav.id);
    const vids = cache?.videos ?? [];
    if (!vids.length) continue;

    const sourceLabel = (fav.label || fav.query || '').toString() || '—';

    // Sortierung innerhalb eines Favoriten: primär nach Velocity (Views/Hour) absteigend,
    // damit "Top 1" tatsächlich das aktivste Video im Zeitraum ist.
    const ranked = [...vids]
      .map((v, idx) => {
        const vph = Number(v?.viewsPerHour);
        return {
          v,
          idx,
          vph: Number.isFinite(vph) ? vph : -1,
          ts: typeof v?.trendingScore === 'number' && Number.isFinite(v.trendingScore) ? v.trendingScore : -1,
        };
      })
      .sort((a, b) => {
        if (a.vph !== b.vph) return b.vph - a.vph;
        if (a.ts !== b.ts) return b.ts - a.ts;
        return a.idx - b.idx;
      })
      .map(x => x.v);

    for (let i = 0; i < Math.min(perFavorite, ranked.length); i++) {
      const v = ranked[i];
      if (!v?.id) continue;
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      out.push({
        video: v,
        sourceId: fav.id,
        sourceLabel,
        sourceRank: i + 1,
      });
      if (out.length >= maxTotal) return out;
    }
  }

  return out;
}
