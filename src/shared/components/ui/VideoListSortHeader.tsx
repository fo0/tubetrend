import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { VideoData } from "@/src/features/videos";

/**
 * Sorting primitives for the analyser result table: the column contract, the
 * numeric comparator and the clickable header cell. Kept beside the table so
 * VideoListTable stays within the file-size guideline.
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

const ALIGN_CLASS: Record<"left" | "center" | "right", string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

interface SortableHeaderProps {
  sortKey: TableSortKey;
  /** Visible column label — also the accessible name of the sort button. */
  label: string;
  activeSort: TableSort;
  onSort: (key: TableSortKey) => void;
  /** Width / responsive-visibility classes for the <th> itself. */
  thClassName?: string;
  align?: "left" | "center" | "right";
  /** Overrides the button tooltip (used to keep the score explanation). */
  title?: string;
}

/**
 * Column header that sorts the table. `aria-sort` on the <th> carries the
 * current state to assistive tech; the arrow icon carries it visually.
 */
export const SortableHeader: React.FC<SortableHeaderProps> = ({
  sortKey,
  label,
  activeSort,
  onSort,
  thClassName = "",
  align = "left",
  title,
}) => {
  const { t } = useTranslation();
  const isActive = activeSort.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : activeSort.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      className={`p-0 ${thClassName}`}
      aria-sort={isActive ? (activeSort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={title ?? t("results.table.sortBy", { column: label })}
        aria-label={t("results.table.sortBy", { column: label })}
        className={`w-full p-4 inline-flex items-center gap-1.5 uppercase tracking-wider font-semibold transition-colors hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
          ALIGN_CLASS[align]
        } ${isActive ? "text-slate-700 dark:text-slate-200" : ""}`}
      >
        <span>{label}</span>
        <Icon
          className={`w-3 h-3 shrink-0 ${isActive ? "opacity-100" : "opacity-40"}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
};
