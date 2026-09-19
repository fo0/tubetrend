/**
 * Service for hiding highlight cards on the dashboard.
 *
 * Videos are hidden by their unique videoId.
 * Once hidden, a video stays hidden permanently.
 */

import { safeRead, safeWrite } from "@/src/shared/lib/storage";
import { dispatchEvent } from "@/src/shared/lib/eventBus";
import { STORAGE_KEYS } from "@/src/shared/constants";

const HIDDEN_HIGHLIGHTS_KEY = STORAGE_KEYS.HIDDEN_HIGHLIGHTS;

/** True only for absolute http(s) URLs — the schemes a rendered subresource may safely come from. */
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
 * True for the `thumbnailUrl` values a genuine hidden-highlight entry can carry:
 * absent, or an absolute http(s) URL.
 *
 * The empty string must stay accepted — `analyzeVideoStats` (trendAnalysisService)
 * falls back to `""` when a video carries no thumbnail at all, and `hide()` copies
 * that value straight through from the highlight card. Older entries may omit the
 * field entirely. Rejecting either would refuse legitimate data, which is why this
 * is deliberately laxer than `isHttpUrl` — the same split dashboardBackupService,
 * favoritesService and useSearch already draw between their two URL guards.
 */
function isSafeThumbnailUrl(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  return isHttpUrl(value);
}

export interface HiddenHighlight {
  videoId: string; // Unique video ID (primary key)
  sourceId: string; // Favorite/channel ID (for display/context)
  hiddenAt: number; // Timestamp when the video was hidden (for chronological sorting)
  videoTitle?: string; // Video title for display in the list
  thumbnailUrl?: string; // Thumbnail URL for display in the list
  sourceLabel?: string; // Channel/favorite name for display in the list
}

export const hiddenHighlightsService = {
  /**
   * Returns all hidden highlights.
   * Legacy entries without hiddenAt get a default timestamp.
   *
   * The hidden list is localStorage content, i.e. untrusted on-disk input, and this
   * is the single read boundary every consumer goes through (HiddenHighlightsModal,
   * useDashboardFilters, useUndoHiddenHighlight). One sink is fed from it:
   * `<img src={item.thumbnailUrl}>` in HiddenHighlightsModal. An unvalidated value
   * there does not execute script, but it does make every render of the modal fire
   * an outbound GET to a host the entry's author chose, carrying the victim's IP and
   * User-Agent from inside the app origin — the origin whose localStorage holds the
   * YouTube API key. The nginx CSP (`img-src 'self' data: https:`) allows any https
   * host, so it does not close this on its own, and the Capacitor target, which ships
   * without that nginx config and without a CSP of its own, restricts `img-src` not at
   * all.
   *
   * Such an entry is KEPT with its thumbnail dropped: the modal already renders the
   * row without an image when the field is absent, so the beacon dies without the row
   * (and its restore button) disappearing. This closes the fourth and last boundary
   * the cached-video shape crosses — dashboardBackupService.parse, favoritesService
   * .getCache and useSearch apply the same guard. Genuine entries only ever carry an
   * `https://i.ytimg.com/...` thumbnail or `""`, so this is behavior-equivalent for
   * real data and fails closed. CWE-200 (thumbnail beacon) / OWASP A03.
   */
  list(): HiddenHighlight[] {
    const raw = safeRead<unknown[]>(HIDDEN_HIGHLIGHTS_KEY, []);
    // Validation: keep only valid entries and migrate legacy entries
    return raw
      .map((entry) => entry as Record<string, unknown> | null | undefined)
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item?.sourceId === "string" &&
          typeof item?.videoId === "string" &&
          (item.sourceId as string).length > 0 &&
          (item.videoId as string).length > 0,
      )
      .map((item): HiddenHighlight => ({
        sourceId: item.sourceId as string,
        videoId: item.videoId as string,
        hiddenAt: typeof item.hiddenAt === "number" ? item.hiddenAt : 0,
        videoTitle: typeof item.videoTitle === "string" ? item.videoTitle : undefined,
        thumbnailUrl:
          typeof item.thumbnailUrl === "string" && isSafeThumbnailUrl(item.thumbnailUrl)
            ? item.thumbnailUrl
            : undefined,
        sourceLabel: typeof item.sourceLabel === "string" ? item.sourceLabel : undefined,
      }));
  },

  /**
   * Returns all hidden highlights sorted chronologically (newest first).
   */
  listChronological(): HiddenHighlight[] {
    return this.list().sort((a, b) => b.hiddenAt - a.hiddenAt);
  },

  /**
   * Hides a video permanently (by its unique videoId).
   */
  hide(
    sourceId: string,
    videoId: string,
    meta?: { videoTitle?: string; thumbnailUrl?: string; sourceLabel?: string },
  ): void {
    const list = this.list();
    const now = Date.now();
    // Check whether the video is already hidden (by videoId)
    const existingIdx = list.findIndex((h) => h.videoId === videoId);
    if (existingIdx >= 0) {
      // Video already hidden - only update metadata if needed
      list[existingIdx].hiddenAt = now;
      if (meta?.videoTitle) list[existingIdx].videoTitle = meta.videoTitle;
      if (meta?.thumbnailUrl) list[existingIdx].thumbnailUrl = meta.thumbnailUrl;
      if (meta?.sourceLabel) list[existingIdx].sourceLabel = meta.sourceLabel;
    } else {
      // Hide a new video
      list.push({
        videoId,
        sourceId,
        hiddenAt: now,
        videoTitle: meta?.videoTitle,
        thumbnailUrl: meta?.thumbnailUrl,
        sourceLabel: meta?.sourceLabel,
      });
    }
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, list);
    dispatchEvent("hidden-highlights-changed");
  },

  /**
   * Shows a hidden video again (removes it from the list).
   */
  show(videoId: string): void {
    const list = this.list().filter((h) => h.videoId !== videoId);
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, list);
    dispatchEvent("hidden-highlights-changed");
  },

  /**
   * Removes all hidden highlights.
   */
  clearAll(): void {
    safeWrite(HIDDEN_HIGHLIGHTS_KEY, []);
    dispatchEvent("hidden-highlights-changed");
  },
};
