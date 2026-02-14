import {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import type {FavoriteConfig} from '@/src/features/favorites/types';
import {favoritesService} from '@/src/features/favorites';
import type {DashboardSortMode, SortOrder} from '@/src/shared/types';
import {STORAGE_KEYS} from '@/src/shared/constants';

/**
 * Hook for managing favorites state with event-driven updates
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteConfig[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  // Load favorites
  const loadFavorites = useCallback(() => {
    try {
      setFavorites(favoritesService.list());
    } catch {
      // ignore storage errors
    }
  }, []);

  // Remove favorite
  const removeFavorite = useCallback((id: string) => {
    favoritesService.remove(id);
    loadFavorites();
  }, [loadFavorites]);

  // Refresh all favorites
  // IMPORTANT: We immediately mark ALL favorites as refreshing to ensure
  // the mini icons show the spinning border animation right away.
  // This fixes the timing issue where start/end events could be batched together.
  const refreshAll = useCallback(() => {
    // Mark all favorites as refreshing immediately
    setRefreshingIds((prev) => {
      const next = new Set(prev);
      for (const fav of favorites) {
        next.add(fav.id);
      }
      return next;
    });
    // Then trigger the actual refresh
    setRefreshToken((v) => v + 1);
  }, [favorites]);

  // Listen for favorites-changed events
  useEffect(() => {
    loadFavorites();

    const handler = () => loadFavorites();
    window.addEventListener('favorites-changed', handler);
    return () => window.removeEventListener('favorites-changed', handler);
  }, [loadFavorites]);

  // Track refresh start/end events
  // IMPORTANT: useLayoutEffect ensures listeners are attached synchronously
  // before any regular useEffect runs (like FavoriteRow's fetch effect).
  // This fixes the issue where events were dispatched before listeners were ready.
  useLayoutEffect(() => {
    const onStart = (ev: Event) => {
      const e = ev as CustomEvent;
      const id = e?.detail?.id as string | undefined;
      if (!id) return;
      setRefreshingIds((prev) => new Set(prev).add(id));
    };

    const onEnd = (ev: Event) => {
      const e = ev as CustomEvent;
      const id = e?.detail?.id as string | undefined;
      if (!id) return;
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };

    window.addEventListener('favorite-refresh-start', onStart);
    window.addEventListener('favorite-refresh-end', onEnd);

    return () => {
      window.removeEventListener('favorite-refresh-start', onStart);
      window.removeEventListener('favorite-refresh-end', onEnd);
    };
  }, []);

  return {
    favorites,
    refreshToken,
    refreshingIds,
    loadFavorites,
    removeFavorite,
    refreshAll,
  };
}

/**
 * Hook for dashboard sorting with persistence
 */
export function useDashboardSort() {
  const [sortMode, setSortMode] = useState<DashboardSortMode>(() => {
    if (typeof window === 'undefined') return 'alpha';
    const v = localStorage.getItem(STORAGE_KEYS.DASHBOARD_SORT);
    return v === 'velocity' ? 'velocity' : 'alpha';
  });

  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    if (typeof window === 'undefined') return 'asc';
    const saved = localStorage.getItem(STORAGE_KEYS.DASHBOARD_ORDER);
    if (saved === 'asc' || saved === 'desc') return saved;
    const mode = localStorage.getItem(STORAGE_KEYS.DASHBOARD_SORT) === 'velocity' ? 'velocity' : 'alpha';
    return mode === 'velocity' ? 'desc' : 'asc';
  });

  const [cacheTick, setCacheTick] = useState(0);

  // Persist sort mode
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_SORT, sortMode);
    } catch {
      // ignore
    }
  }, [sortMode]);

  // Persist sort order
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_ORDER, sortOrder);
    } catch {
      // ignore
    }
  }, [sortOrder]);

  // Listen for cache updates to trigger re-sort
  useEffect(() => {
    const handler = () => setCacheTick((t) => t + 1);
    window.addEventListener('favorites-cache-updated', handler);
    return () => window.removeEventListener('favorites-cache-updated', handler);
  }, []);

  const handleSortClick = useCallback((mode: DashboardSortMode) => {
    if (mode === sortMode) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortMode(mode);
      setSortOrder(mode === 'velocity' ? 'desc' : 'asc');
    }
  }, [sortMode]);

  // Sort favorites
  const sortFavorites = useCallback(
    (favorites: FavoriteConfig[]): FavoriteConfig[] => {
      const arr = [...favorites];

      if (sortMode === 'alpha') {
        return arr.sort((a, b) => {
          const an = (a.label || a.query || '').toString();
          const bn = (b.label || b.query || '').toString();
          const cmp = an.localeCompare(bn, 'de', { sensitivity: 'base' });
          return sortOrder === 'asc' ? cmp : -cmp;
        });
      }

      // Velocity sort
      return arr.sort((a, b) => {
        const ac = favoritesService.getCache(a.id);
        const bc = favoritesService.getCache(b.id);

        const avMeta = Number(ac?.meta?.topVelocityVph);
        const bvMeta = Number(bc?.meta?.topVelocityVph);

        const avCandidates = (ac?.videos ?? []).map((v) => {
          const n = Number(v.viewsPerHour);
          return Number.isFinite(n) ? n : -1;
        });
        const bvCandidates = (bc?.videos ?? []).map((v) => {
          const n = Number(v.viewsPerHour);
          return Number.isFinite(n) ? n : -1;
        });

        const avFallback = avCandidates.length ? Math.max(...avCandidates) : -1;
        const bvFallback = bvCandidates.length ? Math.max(...bvCandidates) : -1;

        const av = Number.isFinite(avMeta) ? avMeta : avFallback;
        const bv = Number.isFinite(bvMeta) ? bvMeta : bvFallback;

        if (av !== bv) {
          return sortOrder === 'desc' ? bv - av : av - bv;
        }

        const an = (a.label || a.query || '').toString();
        const bn = (b.label || b.query || '').toString();
        return an.localeCompare(bn, 'de', { sensitivity: 'base' });
      });
    },
    [sortMode, sortOrder, cacheTick]
  );

  return {
    sortMode,
    sortOrder,
    cacheTick,
    handleSortClick,
    sortFavorites,
  };
}

/**
 * Hook for managing highlights with hidden items
 */
export function useHighlights(_sortedFavorites: FavoriteConfig[]) {
  const [hiddenTick, setHiddenTick] = useState(0);

  // Listen for hidden highlights changes
  useEffect(() => {
    const handler = () => setHiddenTick((t) => t + 1);
    window.addEventListener('hidden-highlights-changed', handler);
    return () => window.removeEventListener('hidden-highlights-changed', handler);
  }, []);

  return { hiddenTick };
}
