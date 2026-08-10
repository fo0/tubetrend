import { safeRead } from "@/src/shared/lib/storage";
import { STORAGE_KEYS } from "@/src/shared/constants";
import type { DashboardSortMode, SortOrder } from "@/src/shared/types";
import type { FavoriteCacheEntry, FavoriteConfig } from "@/src/features/favorites/types";

const BACKUP_VERSION = 1;

export interface DashboardBackupPayload {
  readonly version: number;
  readonly createdAt: number;
  readonly data: {
    readonly favorites: FavoriteConfig[];
    readonly favoritesCache: Record<string, FavoriteCacheEntry>;
    readonly dashboard: {
      readonly sortMode: DashboardSortMode;
      readonly sortOrder: SortOrder;
    };
  };
}

export type ParseResult =
  { ok: true; payload: DashboardBackupPayload } | { ok: false; payload?: never };

/** True only for absolute http(s) URLs — the schemes an <a href> may safely navigate to. */
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
 * A backup file is untrusted input the user picked from disk. Its cached videos are
 * rendered straight into `<a href={video.url}>` (HighlightVideoCard, VideoCard,
 * VideoListTable), so without this guard a crafted file can smuggle a `javascript:`
 * URL into the dashboard and run script in the app origin the moment the user clicks
 * a highlight — which is where the YouTube API key lives in localStorage.
 * Genuine exports only ever contain `https://www.youtube.com/watch?v=<id>` (built in
 * trendAnalysisService), so rejecting anything else is behavior-equivalent for real
 * backups and fails closed. CWE-79 / OWASP A03.
 */
function hasOnlySafeVideoUrls(favoritesCache: Record<string, unknown>): boolean {
  for (const entry of Object.values(favoritesCache)) {
    const videos = (entry as { videos?: unknown } | null | undefined)?.videos;
    if (videos === undefined || videos === null) continue;
    if (!Array.isArray(videos)) return false;
    for (const video of videos) {
      if (!isHttpUrl((video as { url?: unknown } | null | undefined)?.url)) return false;
    }
  }
  return true;
}

export const dashboardBackupService = {
  createBackup(options: {
    dashboardSortMode: DashboardSortMode;
    dashboardSortOrder: SortOrder;
  }): DashboardBackupPayload {
    const favorites = safeRead<FavoriteConfig[]>(STORAGE_KEYS.FAVORITES, []);
    const favoritesCache = safeRead<Record<string, FavoriteCacheEntry>>(
      STORAGE_KEYS.FAVORITES_CACHE,
      {},
    );

    return {
      version: BACKUP_VERSION,
      createdAt: Date.now(),
      data: {
        favorites,
        favoritesCache,
        dashboard: {
          sortMode: options.dashboardSortMode,
          sortOrder: options.dashboardSortOrder,
        },
      },
    };
  },

  stringify(payload: DashboardBackupPayload): string {
    return JSON.stringify(payload, null, 2);
  },

  parse(json: string): ParseResult {
    try {
      const parsed = JSON.parse(json);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof parsed.version !== "number" ||
        typeof parsed.data !== "object"
      ) {
        return { ok: false };
      }

      if (!Array.isArray(parsed.data.favorites)) {
        return { ok: false };
      }

      // favoritesCache must be a plain object (Record<string, FavoriteCacheEntry>).
      // Without this guard, importing a malformed backup writes `"undefined"` to
      // localStorage via JSON.stringify(undefined) and corrupts the cache on next read.
      if (
        typeof parsed.data.favoritesCache !== "object" ||
        parsed.data.favoritesCache === null ||
        Array.isArray(parsed.data.favoritesCache)
      ) {
        return { ok: false };
      }

      if (!hasOnlySafeVideoUrls(parsed.data.favoritesCache as Record<string, unknown>)) {
        return { ok: false };
      }

      return { ok: true, payload: parsed as DashboardBackupPayload };
    } catch {
      return { ok: false };
    }
  },
};
