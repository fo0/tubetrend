import { useMemo } from "react";
import { favoritesService } from "@/src/features/favorites";
import type { FavoriteConfig } from "@/src/features/favorites/types";
import { getLocale } from "@/src/shared/lib/locale";
import { hiddenHighlightsService } from "../services/hiddenHighlightsService";
import { selectHighlightVideosFromFavorites } from "../services/dashboardTopVideos";

/**
 * Below this many favorites the list fits on screen, so the filter bar would
 * only add clutter (mirrors FILTER_MIN_ROWS in VideoListTable).
 */
const FAVORITES_FILTER_MIN_ROWS = 5;

interface UseDashboardFiltersArgs {
  favorites: FavoriteConfig[];
  sortedFavorites: FavoriteConfig[];
  favoriteFilter: string;
  cacheTick: number;
  hiddenTick: number;
}

/**
 * Filtering of the favorites list and aggregation of the highlight cards —
 * the memo chain the dashboard page renders from.
 */
export function useDashboardFilters({
  favorites,
  sortedFavorites,
  favoriteFilter,
  cacheTick,
  hiddenTick,
}: UseDashboardFiltersArgs) {
  const showFavoriteFilter = favorites.length >= FAVORITES_FILTER_MIN_ROWS;
  const normalizedFavoriteFilter = showFavoriteFilter ? favoriteFilter.trim().toLowerCase() : "";

  // Searchable text per favorite, built once per list/cache change. Matching
  // covers the saved label, the raw query and the resolved channel title from
  // the cache, so "@mkbhd" and "Marques Brownlee" both find the same row.
  //
  // This must stay out of the keystroke path: getCache() re-reads and
  // re-JSON-parses the whole favorites cache blob on every call, so building
  // the haystacks inside the filter did that work once per favorite for every
  // single character typed (same reason the hidden list is read once below).
  const favoriteHaystacks = useMemo(() => {
    const haystacks = new Map<string, string>();
    for (const fav of sortedFavorites) {
      const channelTitle = favoritesService.getCache(fav.id)?.meta?.channelTitle ?? "";
      haystacks.set(fav.id, `${fav.label ?? ""} ${fav.query} ${channelTitle}`.toLowerCase());
    }
    return haystacks;
    // cacheTick: a refresh can resolve a channel title that was unknown before.
    // It is a cache-buster for the imperative getCache() reads above, never read
    // in the body — exhaustive-deps cannot see that and calls it unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFavorites, cacheTick]);

  // `null` means "no filter active" — every favorite stays visible. Typing only
  // runs substring checks against the precomputed haystacks above.
  const matchingFavoriteIds = useMemo<Set<string> | null>(() => {
    if (!normalizedFavoriteFilter) return null;
    const ids = new Set<string>();
    for (const fav of sortedFavorites) {
      const haystack = favoriteHaystacks.get(fav.id) ?? "";
      if (haystack.includes(normalizedFavoriteFilter)) ids.add(fav.id);
    }
    return ids;
  }, [sortedFavorites, favoriteHaystacks, normalizedFavoriteFilter]);

  const visibleFavorites = matchingFavoriteIds
    ? sortedFavorites.filter((fav) => matchingFavoriteIds.has(fav.id))
    : sortedFavorites;

  const highlightVideosData = useMemo(() => {
    const raw = selectHighlightVideosFromFavorites(
      sortedFavorites,
      (id) => favoritesService.getCache(id),
      { perFavorite: 1, maxTotal: sortedFavorites.length },
    );

    // Sort by velocity
    const sorted = [...raw].sort((a, b) => {
      const av = Number(a.video?.viewsPerHour);
      const bv = Number(b.video?.viewsPerHour);
      const aVph = Number.isFinite(av) ? av : -1;
      const bVph = Number.isFinite(bv) ? bv : -1;
      if (aVph !== bVph) return bVph - aVph;
      const aTs = typeof a.video?.trendingScore === "number" ? a.video.trendingScore : -1;
      const bTs = typeof b.video?.trendingScore === "number" ? b.video.trendingScore : -1;
      if (aTs !== bTs) return bTs - aTs;
      return a.sourceLabel.localeCompare(b.sourceLabel, getLocale(), { sensitivity: "base" });
    });

    // Read the hidden list once. `isHidden()` re-reads localStorage, JSON-parses
    // it and re-validates every entry on each call, so calling it inside the
    // filter did that work once per highlight item.
    const hiddenIds = new Set(hiddenHighlightsService.list().map((h) => h.videoId));
    const visible = sorted.filter((item) => !hiddenIds.has(item.video.id));
    const hiddenCount = sorted.length - visible.length;

    return { visible, hiddenCount };
    // cacheTick / hiddenTick are cache-busters, not inputs: the memo reads the
    // favorites cache and the hidden-highlights list imperatively, so these
    // counters are the only signal that either store changed. Dropping them
    // freezes the highlight list until an unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFavorites, cacheTick, hiddenTick]);

  const highlightVideos = highlightVideosData.visible;
  const hiddenHighlightsCount = highlightVideosData.hiddenCount;

  return {
    showFavoriteFilter,
    matchingFavoriteIds,
    visibleFavorites,
    highlightVideos,
    hiddenHighlightsCount,
  };
}
