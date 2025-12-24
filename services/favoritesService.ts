import { FavoriteCacheEntry, FavoriteConfig, TimeFrame, VideoData, coerceTimeFrame, SearchType, coerceSearchType } from "../types";

const FAVORITES_KEY = 'tt.favorites.v1';
const FAVORITES_CACHE_KEY = 'tt.favorites.cache.v1';

const FAVORITES_CHANGED_EVENT = 'favorites-changed';

// TTL für Cache (Millisekunden) – 30 Minuten
const DEFAULT_CACHE_TTL = 30 * 60 * 1000;

const safeRead = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
};

const safeWrite = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const makeId = (query: string, timeFrame: TimeFrame, maxResults: number, searchType: SearchType = SearchType.CHANNEL) => {
  // deterministischer Schlüssel zur einfachen Deduplizierung
  return `${query.trim().toLowerCase()}|${timeFrame}|${maxResults}|${searchType}`;
};

const dispatchFavoritesChanged = () => {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
    }
  } catch {
    // stiller Fallback
  }
};

export const favoritesService = {
  list(): FavoriteConfig[] {
    const raw = safeRead<any[]>(FAVORITES_KEY, []);

    let migrated = false;
    const byId = new Map<string, FavoriteConfig>();

    for (const item of raw) {
      const query = typeof item?.query === 'string' ? item.query.trim() : '';
      if (!query) {
        migrated = true;
        continue;
      }
      const timeFrame = coerceTimeFrame(item?.timeFrame);
      const maxResults = typeof item?.maxResults === 'number'
        ? item.maxResults
        : (typeof item?.maxResults === 'string' ? parseInt(item.maxResults, 10) : 1000);
      const createdAt = typeof item?.createdAt === 'number' ? item.createdAt : Date.now();
      const label = typeof item?.label === 'string' ? (item.label.trim() || undefined) : undefined;
      // Migration: Bestehende Favoriten ohne searchType bekommen Default CHANNEL
      const searchType = coerceSearchType(item?.searchType, SearchType.CHANNEL);

      const nextId = makeId(query, timeFrame, Number.isFinite(maxResults) ? maxResults : 1000, searchType);
      const next: FavoriteConfig = {
        id: nextId,
        query,
        timeFrame,
        maxResults: Number.isFinite(maxResults) ? maxResults : 1000,
        searchType,
        createdAt,
        label,
      };

      // Migration-Check: auch wenn searchType fehlt oder ID sich geändert hat
      if (item?.id !== nextId || item?.timeFrame !== timeFrame || !item?.searchType) migrated = true;

      const existing = byId.get(nextId);
      if (!existing || existing.createdAt < createdAt) {
        byId.set(nextId, next);
      } else {
        migrated = true; // Duplikat entfernt
      }
    }

    const list = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);

    // Wenn wir migriert haben, Cache verwerfen (IDs können sich geändert haben)
    if (migrated || raw.length !== list.length) {
      safeWrite(FAVORITES_KEY, list);
      safeWrite(FAVORITES_CACHE_KEY, {});
    }

    return list;
  },

  /** Prüft, ob eine Favoriten-Konfiguration bereits existiert. */
  exists(query: string, timeFrame: TimeFrame, maxResults: number, searchType: SearchType = SearchType.CHANNEL): boolean {
    const id = makeId(query, timeFrame, maxResults, searchType);
    const list = safeRead<FavoriteConfig[]>(FAVORITES_KEY, []);
    return list.some(f => f.id === id);
  },

  add(input: { query: string; timeFrame: TimeFrame; maxResults: number; searchType?: SearchType; label?: string }): FavoriteConfig {
    const searchType = input.searchType ?? SearchType.CHANNEL;
    const id = makeId(input.query, input.timeFrame, input.maxResults, searchType);
    const now = Date.now();
    const next: FavoriteConfig = {
      id,
      query: input.query.trim(),
      timeFrame: input.timeFrame,
      maxResults: input.maxResults,
      searchType,
      createdAt: now,
      label: input.label?.trim() || undefined,
    };

    const list = this.list();
    const existsIdx = list.findIndex(f => f.id === id);
    if (existsIdx >= 0) {
      // Aktualisiere createdAt, Label ggf. übernehmen
      list[existsIdx] = { ...list[existsIdx], createdAt: now, label: next.label ?? list[existsIdx].label };
      safeWrite(FAVORITES_KEY, list);
      dispatchFavoritesChanged();
      return list[existsIdx];
    }
    const updated = [next, ...list];
    safeWrite(FAVORITES_KEY, updated);
    dispatchFavoritesChanged();
    return next;
  },

  /**
   * Aktualisiert einen bestehenden Favoriten. Darf timeFrame und/oder maxResults (und optional label) ändern.
   * Wenn sich durch die Änderung der zusammengesetzte Schlüssel (id) ändert, wird der Eintrag unter neuer id gespeichert
   * und der alte entfernt. Optional vorhandener Cache wird invalidiert.
   * searchType bleibt unverändert.
   */
  update(id: string, patch: Partial<Pick<FavoriteConfig, 'timeFrame' | 'maxResults' | 'label'>>): FavoriteConfig | null {
    const list = this.list();
    const idx = list.findIndex(f => f.id === id);
    if (idx < 0) return null;

    const base = list[idx];
    const nextTimeFrame = patch.timeFrame ?? base.timeFrame;
    const nextMax = typeof patch.maxResults === 'number' ? patch.maxResults : base.maxResults;
    const nextLabel = patch.label !== undefined ? (patch.label?.trim() || undefined) : base.label;
    // searchType bleibt unverändert
    const searchType = base.searchType ?? SearchType.CHANNEL;

    const newId = makeId(base.query, nextTimeFrame, nextMax, searchType);

    // Wenn bereits ein Eintrag mit neuer id existiert, ersetzen wir diesen durch die aktualisierte Version (kein Duplikat)
    const existingIdx = list.findIndex(f => f.id === newId);

    const updatedFav: FavoriteConfig = {
      id: newId,
      query: base.query,
      timeFrame: nextTimeFrame,
      maxResults: nextMax,
      searchType,
      createdAt: Date.now(),
      label: nextLabel
    };

    let nextList = list.filter(f => f.id !== id);
    if (existingIdx >= 0) {
      nextList = nextList.filter(f => f.id !== newId);
    }
    nextList = [updatedFav, ...nextList];
    safeWrite(FAVORITES_KEY, nextList);

    // Cache invalidieren: alter und ggf. neuer Schlüssel entfernen
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(FAVORITES_CACHE_KEY, {});
    if (cache[id]) delete cache[id];
    if (cache[newId]) delete cache[newId];
    safeWrite(FAVORITES_CACHE_KEY, cache);

    dispatchFavoritesChanged();

    return updatedFav;
  },

  remove(id: string) {
    const list = this.list().filter(f => f.id !== id);
    safeWrite(FAVORITES_KEY, list);
    // Optional: Cache für diesen Favoriten ebenfalls entfernen
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(FAVORITES_CACHE_KEY, {});
    if (cache[id]) {
      delete cache[id];
      safeWrite(FAVORITES_CACHE_KEY, cache);
    }

    dispatchFavoritesChanged();
  },

  clearAll() {
    safeWrite(FAVORITES_KEY, []);
    safeWrite(FAVORITES_CACHE_KEY, {});
    dispatchFavoritesChanged();
  },

  getCache(id: string): FavoriteCacheEntry | null {
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(FAVORITES_CACHE_KEY, {});
    const entry = cache[id];
    if (!entry) return null;
    return entry;
  },

  setCache(
    id: string,
    videos: VideoData[],
    extra?: { totalInTimeFrame?: number; topVelocityVph?: number; channelTitle?: string; channelId?: string },
    ttlMs: number = DEFAULT_CACHE_TTL
  ) {
    // Nur Top6 speichern, um Speicher zu sparen
    const top6 = [...videos].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(FAVORITES_CACHE_KEY, {});
    const entry: FavoriteCacheEntry & { ttl?: number } = {
      videos: top6,
      fetchedAt: Date.now(),
      meta: {
        totalInTimeFrame: extra?.totalInTimeFrame,
        topVelocityVph: extra?.topVelocityVph,
        channelTitle: extra?.channelTitle,
        channelId: extra?.channelId
      }
    };
    cache[id] = entry;
    safeWrite(FAVORITES_CACHE_KEY, cache);
    // Informiere UI, dass es neue Cache-Daten gibt (z. B. für Dashboard-Neusortierung)
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        const evt = new CustomEvent('favorites-cache-updated', { detail: { id } });
        window.dispatchEvent(evt);
      }
    } catch {
      // stiller Fallback
    }
  },

  isCacheValid(id: string, ttlMs: number = DEFAULT_CACHE_TTL): boolean {
    const entry = this.getCache(id);
    if (!entry) return false;
    return (Date.now() - entry.fetchedAt) < ttlMs;
  }
};

export type { FavoriteConfig as Favorite };
