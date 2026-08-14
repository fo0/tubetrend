import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TableSort, TableSortKey } from "./videoListSort";

/**
 * The clickable header cell of the analyser result table. Kept beside the table
 * so VideoListTable stays within the file-size guideline; the column contract
 * and comparator it works with live in `videoListSort.ts`.
 */

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
