import { coerceSearchType, coerceTimeFrame, SearchType, TimeFrame } from "@/src/shared/types";
import { safeRead, safeWrite } from "@/src/shared/lib/storage";
import { dispatchEvent } from "@/src/shared/lib/eventBus";
import { CACHE_TTL, STORAGE_KEYS } from "@/src/shared/constants";
import type { FavoriteCacheEntry, FavoriteConfig } from "../types";
import type { VideoData } from "@/src/features/videos/types";

const makeId = (
  query: string,
  timeFrame: TimeFrame,
  maxResults: number,
  searchType: SearchType = SearchType.CHANNEL,
): string => {
  return `${query.trim().toLowerCase()}|${timeFrame}|${maxResults}|${searchType}`;
};

/** True only for absolute http(s) URLs — the schemes an `<a href>` may safely navigate to. */
function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The favorites cache is localStorage content, i.e. untrusted on-disk input, and
 * `getCache()` is the single read boundary every consumer goes through
 * (FavoriteRow, FavoriteAvatar, DashboardPage, useDashboard, dashboardTopVideos).
 * Its videos are rendered straight into `<a href={video.url}>` (VideoCard,
 * VideoListTable, HighlightVideoCard), so a tampered entry carrying a
 * `javascript:` URL would put script execution one click away in the app origin —
 * the origin whose localStorage holds the YouTube API key. Dropping non-http(s)
 * entries here closes the third and last boundary this cached-video shape crosses;
 * the backup-import boundary (dashboardBackupService.parse) and the persisted
 * analyser snapshot (useSearch) already apply the identical guard.
 * Genuine entries only ever contain `https://www.youtube.com/watch?v=<id>` (built
 * in trendAnalysisService), so this is behavior-equivalent for real data and fails
 * closed. The original object is returned untouched when nothing is filtered, which
 * keeps referential identity for the memo/cache-buster call sites. CWE-79 / OWASP A03.
 */
function withSafeVideoUrls<T extends FavoriteCacheEntry>(entry: T): T {
  const videos = entry?.videos;
  if (!Array.isArray(videos)) return entry;
  const safe = videos.filter((video) => isHttpUrl(video?.url));
  return safe.length === videos.length ? entry : { ...entry, videos: safe };
}

export const favoritesService = {
  list(): FavoriteConfig[] {
    const raw = safeRead<unknown[]>(STORAGE_KEYS.FAVORITES, []);

    let migrated = false;
    const byId = new Map<string, FavoriteConfig>();

    for (const entry of raw) {
      const item = entry as Record<string, unknown> | null | undefined;
      const query = typeof item?.query === "string" ? item.query.trim() : "";
      if (!query) {
        migrated = true;
        continue;
      }
      const timeFrame = coerceTimeFrame(item?.timeFrame);
      const maxResults =
        typeof item?.maxResults === "number"
          ? item.maxResults
          : typeof item?.maxResults === "string"
            ? parseInt(item.maxResults, 10)
            : 1000;
      const createdAt = typeof item?.createdAt === "number" ? item.createdAt : Date.now();
      const label = typeof item?.label === "string" ? item.label.trim() || undefined : undefined;
      const searchType = coerceSearchType(item?.searchType, SearchType.CHANNEL);

      const nextId = makeId(
        query,
        timeFrame,
        Number.isFinite(maxResults) ? maxResults : 1000,
        searchType,
      );
      const next: FavoriteConfig = {
        id: nextId,
        query,
        timeFrame,
        maxResults: Number.isFinite(maxResults) ? maxResults : 1000,
        searchType,
        createdAt,
        label,
      };

      if (item?.id !== nextId || item?.timeFrame !== timeFrame || !item?.searchType) {
        migrated = true;
      }

      const existing = byId.get(nextId);
      if (!existing || existing.createdAt < createdAt) {
        byId.set(nextId, next);
      } else {
        migrated = true;
      }
    }

    const list = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);

    if (migrated || raw.length !== list.length) {
      safeWrite(STORAGE_KEYS.FAVORITES, list);
      safeWrite(STORAGE_KEYS.FAVORITES_CACHE, {});
    }

    return list;
  },

  exists(
    query: string,
    timeFrame: TimeFrame,
    maxResults: number,
    searchType: SearchType = SearchType.CHANNEL,
  ): boolean {
    const id = makeId(query, timeFrame, maxResults, searchType);
    const list = safeRead<FavoriteConfig[]>(STORAGE_KEYS.FAVORITES, []);
    return list.some((f) => f.id === id);
  },

  add(input: {
    query: string;
    timeFrame: TimeFrame;
    maxResults: number;
    searchType?: SearchType;
    label?: string;
  }): FavoriteConfig {
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
    const existsIdx = list.findIndex((f) => f.id === id);
    if (existsIdx >= 0) {
      list[existsIdx] = {
        ...list[existsIdx],
        createdAt: now,
        label: next.label ?? list[existsIdx].label,
      };
      safeWrite(STORAGE_KEYS.FAVORITES, list);
      dispatchEvent("favorites-changed");
      return list[existsIdx];
    }
    const updated = [next, ...list];
    safeWrite(STORAGE_KEYS.FAVORITES, updated);
    dispatchEvent("favorites-changed");
    return next;
  },

  update(
    id: string,
    patch: Partial<Pick<FavoriteConfig, "timeFrame" | "maxResults" | "label">>,
  ): FavoriteConfig | null {
    const list = this.list();
    const idx = list.findIndex((f) => f.id === id);
    if (idx < 0) return null;

    const base = list[idx];
    const nextTimeFrame = patch.timeFrame ?? base.timeFrame;
    const nextMax = typeof patch.maxResults === "number" ? patch.maxResults : base.maxResults;
    const nextLabel = patch.label !== undefined ? patch.label?.trim() || undefined : base.label;
    const searchType = base.searchType ?? SearchType.CHANNEL;

    const newId = makeId(base.query, nextTimeFrame, nextMax, searchType);

    const existingIdx = list.findIndex((f) => f.id === newId);

    const updatedFav: FavoriteConfig = {
      id: newId,
      query: base.query,
      timeFrame: nextTimeFrame,
      maxResults: nextMax,
      searchType,
      createdAt: Date.now(),
      label: nextLabel,
    };

    let nextList = list.filter((f) => f.id !== id);
    if (existingIdx >= 0) {
      nextList = nextList.filter((f) => f.id !== newId);
    }
    nextList = [updatedFav, ...nextList];
    safeWrite(STORAGE_KEYS.FAVORITES, nextList);

    // Invalidate cache
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(
      STORAGE_KEYS.FAVORITES_CACHE,
      {},
    );
    if (cache[id]) delete cache[id];
    if (cache[newId]) delete cache[newId];
    safeWrite(STORAGE_KEYS.FAVORITES_CACHE, cache);

    dispatchEvent("favorites-changed");

    return updatedFav;
  },

  remove(id: string): void {
    const list = this.list().filter((f) => f.id !== id);
    safeWrite(STORAGE_KEYS.FAVORITES, list);

    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(
      STORAGE_KEYS.FAVORITES_CACHE,
      {},
    );
    if (cache[id]) {
      delete cache[id];
      safeWrite(STORAGE_KEYS.FAVORITES_CACHE, cache);
    }

    dispatchEvent("favorites-changed");
  },

  clearAll(): void {
    safeWrite(STORAGE_KEYS.FAVORITES, []);
    safeWrite(STORAGE_KEYS.FAVORITES_CACHE, {});
    dispatchEvent("favorites-changed");
  },

  getCache(id: string): FavoriteCacheEntry | null {
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(
      STORAGE_KEYS.FAVORITES_CACHE,
      {},
    );
    const entry = cache[id];
    return entry ? withSafeVideoUrls(entry) : null;
  },

  setCache(
    id: string,
    videos: VideoData[],
    extra?: {
      totalInTimeFrame?: number;
      topVelocityVph?: number;
      channelTitle?: string;
      channelId?: string;
    },
  ): void {
    const top6 = [...videos].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);

    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(
      STORAGE_KEYS.FAVORITES_CACHE,
      {},
    );

    const entry: FavoriteCacheEntry & { ttl?: number } = {
      videos: top6,
      fetchedAt: Date.now(),
      meta: {
        totalInTimeFrame: extra?.totalInTimeFrame,
        topVelocityVph: extra?.topVelocityVph,
        channelTitle: extra?.channelTitle,
        channelId: extra?.channelId,
      },
    };

    cache[id] = entry;
    safeWrite(STORAGE_KEYS.FAVORITES_CACHE, cache);

    dispatchEvent("favorites-cache-updated", { id });
  },

  isCacheValid(id: string, ttlMs: number = CACHE_TTL.FAVORITES): boolean {
    const entry = this.getCache(id);
    if (!entry) return false;
    return Date.now() - entry.fetchedAt < ttlMs;
  },
};
