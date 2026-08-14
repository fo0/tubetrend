import type { VideoData } from "@/src/features/videos";

/**
 * Sorting primitives for the analyser result table: the column contract, the
 * persisted-value guard and the numeric comparator. Kept apart from
 * `VideoListSortHeader.tsx` so that module exports only its component and
 * keeps its Fast Refresh state when edited.
 */

export type TableSortKey = "rank" | "upload" | "views" | "velocity" | "engagement" | "score";
export type SortDirection = "asc" | "desc";

export interface TableSort {
  key: TableSortKey;
  dir: SortDirection;
}

/** Rank ascending reproduces the order the analyser handed the rows over in. */
export const DEFAULT_TABLE_SORT: TableSort = { key: "rank", dir: "asc" };

/** Direction a column starts in on its first click — biggest/newest first. */
export const NATURAL_DIRECTION: Record<TableSortKey, SortDirection> = {
  rank: "asc",
  upload: "desc",
  views: "desc",
  velocity: "desc",
  engagement: "desc",
  score: "desc",
};

/** Guard for the persisted value — storage is untrusted input. */
export function isTableSort(value: unknown): value is TableSort {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.key === "string" && v.key in NATURAL_DIRECTION && (v.dir === "asc" || v.dir === "desc")
  );
}

/**
 * Numeric sort key for a column. Missing optional metrics sort below zero so
 * they end up last on a descending sort instead of tying with a real 0.
 */
export function sortValue(video: VideoData, rank: number, key: TableSortKey): number {
  switch (key) {
    case "upload":
      return video.publishedTimestamp;
    case "views":
      return video.views;
    case "velocity":
      return Number.isFinite(Number(video.viewsPerHour)) ? Number(video.viewsPerHour) : -1;
    case "engagement":
      return video.engagementRate ?? -1;
    case "score":
      return video.trendingScore;
    case "rank":
    default:
      return rank;
  }
}
