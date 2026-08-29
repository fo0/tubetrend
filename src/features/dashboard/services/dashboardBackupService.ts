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
 * True for the `thumbnailUrl` values a genuine export can carry: absent, or an
 * absolute http(s) URL.
 *
 * The empty string must stay accepted — `analyzeVideoStats` (trendAnalysisService)
 * falls back to `""` when a video carries no thumbnail at all, so real exports do
 * contain it, and `<img src="">` is what the dashboard already renders for those
 * rows today. Older backups may omit the field entirely. Rejecting either would
 * refuse legitimate files, which is why this is deliberately laxer than `isHttpUrl`.
 */
function isSafeThumbnailUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  return isHttpUrl(value);
}

/**
 * A backup file is untrusted input the user picked from disk — the only externally
 * supplied input this client-only app accepts at all, which makes it the boundary
 * that actually matters (the localStorage boundaries in favoritesService.getCache
 * and useSearch guard the same shape, but anyone who can write localStorage already
 * owns the origin).
 *
 * Two sinks, both fed straight from the cached videos:
 *   - `<a href={video.url}>` (HighlightVideoCard, VideoCard, VideoListTable) — without
 *     the `url` guard a crafted file smuggles a `javascript:` URL into the dashboard and
 *     runs script in the app origin the moment the user clicks a highlight, which is the
 *     origin whose localStorage holds the YouTube API key.
 *   - `<img src={video.thumbnailUrl}>` (same three components) — an unvalidated value
 *     here does not execute script, but it does make every dashboard render fire an
 *     outbound GET to a host the author of the backup file chose: a beacon confirming
 *     the import, with the victim's IP and User-Agent, from inside the app origin. The
 *     nginx CSP (`img-src 'self' data: https:`) allows any https host, so it does not
 *     close this on its own, and the targets that ship without that nginx config —
 *     Capacitor, Chrome extension — restrict `img-src` not at all.
 *
 * Genuine exports only ever contain `https://www.youtube.com/watch?v=<id>` for `url`
 * (built in trendAnalysisService) and an `https://i.ytimg.com/...` thumbnail or `""`,
 * so rejecting anything else is behavior-equivalent for real backups and fails closed:
 * an invalid file is refused whole, exactly as it already was for a bad `url`.
 * CWE-79 (url sink) / CWE-200 (thumbnail beacon) / OWASP A03.
 */
function hasOnlySafeVideoUrls(favoritesCache: Record<string, unknown>): boolean {
  for (const entry of Object.values(favoritesCache)) {
    const videos = (entry as { videos?: unknown } | null | undefined)?.videos;
    if (videos === undefined || videos === null) continue;
    if (!Array.isArray(videos)) return false;
    for (const video of videos) {
      const candidate = video as { url?: unknown; thumbnailUrl?: unknown } | null | undefined;
      if (!isHttpUrl(candidate?.url)) return false;
      if (!isSafeThumbnailUrl(candidate?.thumbnailUrl)) return false;
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
