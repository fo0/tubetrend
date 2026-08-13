import React, { useEffect, useMemo, useRef, useState } from "react";
import type { VideoData } from "@/src/features/videos";
import { AlertCircle, Check, Clock, Copy, ExternalLink, Heart, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatNumber, formatTimeAgo } from "@/src/shared/lib/formatters";
import { VideoListFilter } from "@/src/shared/components/ui/VideoListFilter";
import {
  DEFAULT_TABLE_SORT,
  isTableSort,
  NATURAL_DIRECTION,
  SortableHeader,
  sortValue,
} from "@/src/shared/components/ui/VideoListSortHeader";
import type { TableSort, TableSortKey } from "@/src/shared/components/ui/VideoListSortHeader";
import { STORAGE_KEYS } from "@/src/shared/constants";
import { safeRead, safeWrite } from "@/src/shared/lib/storage";

/**
 * Below this many rows the list is short enough to scan by eye, so the filter
 * bar would only add clutter.
 */
const FILTER_MIN_ROWS = 10;

interface VideoListTableProps {
  videos: VideoData[];
  startIndex: number;
  /**
   * Identity of the analysis these rows belong to. Changing it clears the title
   * filter — see the effect below. Optional so the table stays usable without it.
   */
  analysisKey?: string;
}

export const VideoListTable: React.FC<VideoListTableProps> = ({
  videos,
  startIndex,
  analysisKey,
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");

  // The table is not remounted between analyses, so a filter typed for the
  // previous channel stayed active for the next one: the user ran a new search
  // and landed on "No video title matches <the word they typed minutes ago>",
  // or on a silently truncated list. The filter belongs to the result set that
  // was on screen when it was typed, so a new analysis drops it.
  useEffect(() => {
    setFilter("");
  }, [analysisKey]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTitleId, setCopiedTitleId] = useState<string | null>(null);
  // Which row/action last failed, so a blocked clipboard is visible feedback
  // instead of a dead button (mirrors the bulk actions on the analyser page).
  const [copyFailed, setCopyFailed] = useState<{ id: string; kind: "url" | "title" } | null>(null);
  const resetCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCopiedTitleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetFailedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending copy-feedback timers on unmount to avoid setState after unmount
  useEffect(() => {
    return () => {
      if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
      if (resetCopiedTitleTimerRef.current) clearTimeout(resetCopiedTitleTimerRef.current);
      if (resetFailedTimerRef.current) clearTimeout(resetFailedTimerRef.current);
    };
  }, []);

  const flashCopyFailed = (id: string, kind: "url" | "title") => {
    setCopyFailed({ id, kind });
    if (resetFailedTimerRef.current) clearTimeout(resetFailedTimerRef.current);
    resetFailedTimerRef.current = setTimeout(() => setCopyFailed(null), 2500);
  };

  const handleCopy = (video: VideoData) => {
    // navigator.clipboard is undefined in insecure contexts (HTTP, some iframes).
    // Accessing .writeText on it throws synchronously, which the promise
    // rejection handler below would not catch — so guard the property first.
    if (!navigator.clipboard) {
      flashCopyFailed(video.id, "url");
      return;
    }
    navigator.clipboard.writeText(video.url).then(
      () => {
        setCopiedId(video.id);
        if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
        resetCopiedTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
      },
      () => {
        // Clipboard write rejected (permissions / focus) — surface it.
        flashCopyFailed(video.id, "url");
      },
    );
  };

  const handleCopyTitle = (video: VideoData) => {
    if (!navigator.clipboard) {
      flashCopyFailed(video.id, "title");
      return;
    }
    navigator.clipboard.writeText(video.title).then(
      () => {
        setCopiedTitleId(video.id);
        if (resetCopiedTitleTimerRef.current) clearTimeout(resetCopiedTitleTimerRef.current);
        resetCopiedTitleTimerRef.current = setTimeout(() => setCopiedTitleId(null), 1500);
      },
      () => {
        // Clipboard write rejected (permissions / focus) — surface it.
        flashCopyFailed(video.id, "title");
      },
    );
  };

  // Rank is assigned before sorting/filtering, so a row keeps its position in
  // the full result set ("#42") instead of being renumbered inside the view.
  const rankedVideos = useMemo(
    () => videos.map((video, index) => ({ video, rank: startIndex + index })),
    [videos, startIndex],
  );

  // Column sort, persisted so the preferred view survives a reload.
  const [sort, setSort] = useState<TableSort>(() => {
    const stored = safeRead<unknown>(STORAGE_KEYS.ANALYSER_TABLE_SORT, null);
    return isTableSort(stored) ? stored : DEFAULT_TABLE_SORT;
  });

  useEffect(() => {
    safeWrite(STORAGE_KEYS.ANALYSER_TABLE_SORT, sort);
  }, [sort]);

  /** Click a column: activate it in its natural direction, or flip it. */
  const handleSort = (key: TableSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: NATURAL_DIRECTION[key] },
    );
  };

  const sortedVideos = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rankedVideos].sort((a, b) => {
      const av = sortValue(a.video, a.rank, sort.key);
      const bv = sortValue(b.video, b.rank, sort.key);
      if (av !== bv) return (av - bv) * factor;
      // Stable tie-break: fall back to the original result order.
      return a.rank - b.rank;
    });
  }, [rankedVideos, sort]);

  const showFilter = videos.length >= FILTER_MIN_ROWS;
  const normalizedFilter = filter.trim().toLowerCase();

  const visibleVideos = useMemo(() => {
    if (!showFilter || !normalizedFilter) return sortedVideos;
    return sortedVideos.filter((entry) =>
      entry.video.title.toLowerCase().includes(normalizedFilter),
    );
  }, [sortedVideos, showFilter, normalizedFilter]);

  // Light mode paints this table on a white surface, where the 400 shades were
  // only ~1.7-2.9:1 — the score is content, so it has to clear the 4.5:1 of WCAG
  // 1.4.3. Darker shades for light, the original 400s kept for dark; the tinted
  // background and border are unchanged. Mirrors VideoCard.
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-red-700 dark:text-red-400 bg-red-400/10 border-red-400/20";
    if (score >= 50)
      return "text-amber-700 dark:text-amber-400 bg-amber-400/10 border-amber-400/20";
    return "text-slate-600 dark:text-slate-400 bg-slate-400/10 border-slate-400/20";
  };

  return (
    <div className="bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden backdrop-blur-sm shadow-xl">
      {/* Polite live region: announce copy success to assistive tech (the green
          checkmark alone is silent to screen readers). */}
      <span className="sr-only" role="status" aria-live="polite">
        {copyFailed
          ? t("results.table.copyFailed")
          : copiedId
            ? t("results.table.urlCopied")
            : copiedTitleId
              ? t("results.table.titleCopied")
              : ""}
      </span>
      {showFilter && (
        <VideoListFilter
          value={filter}
          onChange={setFilter}
          matchCount={visibleVideos.length}
          totalCount={rankedVideos.length}
        />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label={t("results.moreVideos")}>
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <SortableHeader
                sortKey="rank"
                label={t("results.table.rank")}
                activeSort={sort}
                onSort={handleSort}
                thClassName="w-16"
                align="center"
              />
              <th scope="col" className="p-4">
                {t("results.table.video")}
              </th>
              <SortableHeader
                sortKey="upload"
                label={t("results.table.upload")}
                activeSort={sort}
                onSort={handleSort}
                thClassName="hidden sm:table-cell"
              />
              <SortableHeader
                sortKey="views"
                label={t("results.table.views")}
                activeSort={sort}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                sortKey="velocity"
                label={t("results.table.velocity")}
                activeSort={sort}
                onSort={handleSort}
                thClassName="hidden md:table-cell"
                align="right"
              />
              <SortableHeader
                sortKey="engagement"
                label={t("results.table.engagement")}
                activeSort={sort}
                onSort={handleSort}
                thClassName="hidden lg:table-cell"
                align="right"
              />
              <SortableHeader
                sortKey="score"
                label={t("results.table.score")}
                activeSort={sort}
                onSort={handleSort}
                align="center"
                title={t("results.table.scoreTooltip")}
              />
              <th scope="col" className="p-4 w-16 text-center">
                <span className="sr-only">{t("results.table.copyUrl")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-sm">
            {visibleVideos.map(({ video, rank }) => {
              return (
                <tr
                  key={video.id}
                  className="hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="p-4 text-center text-slate-500 font-mono font-medium" scope="row">
                    {rank}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-24 h-14 shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                        aria-label={t("results.table.watchOnYoutubeAria", { title: video.title })}
                      >
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          loading="lazy"
                        />
                      </a>
                      <div className="min-w-0">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-slate-700 dark:text-slate-200 line-clamp-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors hover:underline decoration-indigo-400/30 underline-offset-2 block"
                          title={video.title}
                        >
                          {video.title}
                        </a>
                        <div className="text-xs text-slate-500 mt-1 sm:hidden">
                          {formatTimeAgo(video.publishedTimestamp, t)} • {formatNumber(video.views)}{" "}
                          {t("results.table.views")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                      {formatTimeAgo(video.publishedTimestamp, t)}
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-300">
                    {formatNumber(video.views)}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {video.viewsPerHour ? (
                      <span className="flex items-center justify-end gap-1 text-yellow-600/80 dark:text-yellow-500/80">
                        {formatNumber(video.viewsPerHour)}/h
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                    {video.engagementRate != null ? (
                      <span className="flex items-center justify-end gap-1 text-pink-600/80 dark:text-pink-500/80">
                        <Heart className="w-3 h-3" aria-hidden="true" />
                        {video.engagementRate}%
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(video.trendingScore)}`}
                    >
                      {video.trendingScore}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyTitle(video)}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 ${
                          copyFailed?.id === video.id && copyFailed.kind === "title"
                            ? "text-red-500 dark:text-red-400"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        }`}
                        title={
                          copyFailed?.id === video.id && copyFailed.kind === "title"
                            ? t("results.table.copyFailed")
                            : t("results.table.copyTitle")
                        }
                        aria-label={
                          copyFailed?.id === video.id && copyFailed.kind === "title"
                            ? t("results.table.copyFailed")
                            : t("results.table.copyTitleAria", { title: video.title })
                        }
                      >
                        {copyFailed?.id === video.id && copyFailed.kind === "title" ? (
                          <AlertCircle className="w-4 h-4" aria-hidden="true" />
                        ) : copiedTitleId === video.id ? (
                          <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                        ) : (
                          <Type className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(video)}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 ${
                          copyFailed?.id === video.id && copyFailed.kind === "url"
                            ? "text-red-500 dark:text-red-400"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        }`}
                        title={
                          copyFailed?.id === video.id && copyFailed.kind === "url"
                            ? t("results.table.copyFailed")
                            : t("results.table.copyUrl")
                        }
                        aria-label={
                          copyFailed?.id === video.id && copyFailed.kind === "url"
                            ? t("results.table.copyFailed")
                            : t("results.table.copyUrlAria", { title: video.title })
                        }
                      >
                        {copyFailed?.id === video.id && copyFailed.kind === "url" ? (
                          <AlertCircle className="w-4 h-4" aria-hidden="true" />
                        ) : copiedId === video.id ? (
                          <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                        ) : (
                          <Copy className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        title={t("results.table.watchOnYoutube")}
                        aria-label={t("results.table.watchOnYoutubeAria", { title: video.title })}
                      >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleVideos.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400 mb-3">
                    {t("results.table.filterNoMatches", { query: filter.trim() })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilter("")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {t("results.table.filterClear")}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
