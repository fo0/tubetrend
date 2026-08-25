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
        thumbnailUrl: typeof item.thumbnailUrl === "string" ? item.thumbnailUrl : undefined,
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
