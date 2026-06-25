import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Copy, Download, Eye, List, Loader2, Trophy } from "lucide-react";
import { Youtube } from "@/src/shared/components/ui/BrandIcons";
import { InputSection } from "@/src/shared/components/ui/InputSection";
import { VideoCard } from "@/src/shared/components/ui/VideoCard";
import { VideoListTable } from "@/src/shared/components/ui/VideoListTable";
import { EmptyState, type EmptyStateExample } from "@/src/shared/components/ui/EmptyState";
import { useTranslation } from "react-i18next";
import { SearchType, type TimeFrame } from "@/src/shared/types";
import type { SearchState } from "@/src/features/search/hooks/useSearch";
import { buildResultsCsv, buildResultsCsvFilename } from "@/src/features/videos";
import { STORAGE_KEYS } from "@/src/shared/constants";

interface AnalyserPageProps {
  searchState: SearchState;
  externalInputValues: {
    query?: string;
    timeFrame?: TimeFrame;
    maxResults?: number;
    searchType?: SearchType;
    syncToken?: number;
  };
  onSearch: (
    query: string,
    timeFrame: TimeFrame,
    maxResults: number,
    searchType: SearchType,
  ) => void;
  /** Run a quick-start example from the welcome empty state (pre-fills the search box + searches). */
  onPickExample?: (query: string, searchType: SearchType) => void;
}

export function AnalyserPage({
  searchState,
  externalInputValues,
  onSearch,
  onPickExample,
}: AnalyserPageProps) {
  const { t } = useTranslation();

  // Quick-start examples for the welcome empty state. Labels are how the user
  // would type them; queries are the bare identifiers passed to the search.
  const welcomeExamples = useMemo<EmptyStateExample[]>(
    () => [
      { label: "@MrBeast", query: "@MrBeast", searchType: SearchType.CHANNEL },
      { label: "@mkbhd", query: "@mkbhd", searchType: SearchType.CHANNEL },
      {
        label: `#${t("empty.exampleKeyword")}`,
        query: t("empty.exampleKeyword"),
        searchType: SearchType.KEYWORD,
      },
    ],
    [t],
  );

  const [sortMode, setSortMode] = useState<"trend" | "views">(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ANALYSER_SORT_MODE);
      return stored === "views" ? "views" : "trend";
    } catch {
      return "trend";
    }
  });

  const [topN, setTopN] = useState<3 | 6>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ANALYSER_TOP_N);
      return stored === "3" ? 3 : 6;
    } catch {
      return 6;
    }
  });

  // Persist sortMode and topN changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ANALYSER_SORT_MODE, sortMode);
    } catch {
      // ignore storage errors
    }
  }, [sortMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ANALYSER_TOP_N, String(topN));
    } catch {
      // ignore storage errors
    }
  }, [topN]);

  const sortedVideos = useMemo(() => {
    if (!searchState.data) return [];

    const arr = [...searchState.data];
    if (sortMode === "views") {
      return arr.sort((a, b) => {
        if (b.views !== a.views) return b.views - a.views;
        return b.trendingScore - a.trendingScore;
      });
    }
    return arr.sort((a, b) => b.trendingScore - a.trendingScore);
  }, [searchState.data, sortMode]);

  const topVideos = sortedVideos.slice(0, topN);
  const otherVideos = sortedVideos.slice(topN);

  const channelUrl = useMemo(() => {
    if (searchState.channelId) return `https://www.youtube.com/channel/${searchState.channelId}`;
    const q = (searchState.channelName || "").trim();
    if (q.startsWith("@")) return `https://www.youtube.com/${q}`;
    return null;
  }, [searchState.channelId, searchState.channelName]);

  // Comfort: export current (sorted) results as CSV + copy all URLs at once.
  // Both actions surface a short inline state so a failure (blocked clipboard /
  // download) is no longer a silent no-op.
  const [copiedAll, setCopiedAll] = useState(false);
  const [copyAllFailed, setCopyAllFailed] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const copiedAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFailedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportFailedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedAllTimerRef.current) clearTimeout(copiedAllTimerRef.current);
      if (copyFailedTimerRef.current) clearTimeout(copyFailedTimerRef.current);
      if (exportFailedTimerRef.current) clearTimeout(exportFailedTimerRef.current);
    };
  }, []);

  const flashCopyFailed = () => {
    setCopyAllFailed(true);
    if (copyFailedTimerRef.current) clearTimeout(copyFailedTimerRef.current);
    copyFailedTimerRef.current = setTimeout(() => setCopyAllFailed(false), 2500);
  };

  const handleExportCsv = () => {
    if (sortedVideos.length === 0) return;
    try {
      const csv = buildResultsCsv(sortedVideos);
      const filename = buildResultsCsvFilename(searchState.channelName);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      // Surface download errors (e.g. blocked environments) instead of failing silently.
      setExportFailed(true);
      if (exportFailedTimerRef.current) clearTimeout(exportFailedTimerRef.current);
      exportFailedTimerRef.current = setTimeout(() => setExportFailed(false), 2500);
    }
  };

  const handleCopyAllUrls = () => {
    if (sortedVideos.length === 0) return;
    // navigator.clipboard is undefined in insecure contexts (HTTP, some iframes).
    if (!navigator.clipboard) {
      flashCopyFailed();
      return;
    }
    const urls = sortedVideos.map((v) => v.url).join("\n");
    navigator.clipboard.writeText(urls).then(
      () => {
        setCopiedAll(true);
        if (copiedAllTimerRef.current) clearTimeout(copiedAllTimerRef.current);
        copiedAllTimerRef.current = setTimeout(() => setCopiedAll(false), 1500);
      },
      () => {
        // Clipboard write rejected (permissions / focus) — show feedback.
        flashCopyFailed();
      },
    );
  };

  return (
    <>
      <InputSection
        onSearch={onSearch}
        isLoading={searchState.isLoading}
        externalQuery={externalInputValues.query}
        externalTimeFrame={externalInputValues.timeFrame}
        externalMaxResults={externalInputValues.maxResults}
        externalSearchType={externalInputValues.searchType}
        externalSyncToken={externalInputValues.syncToken}
      />

      {/* Error Message */}
      {searchState.error && (
        <div
          role="alert"
          className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 dark:text-red-200 animate-fade-in shadow-lg shadow-red-900/10"
        >
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <p>{searchState.error}</p>
        </div>
      )}

      {/* Results */}
      {sortedVideos.length > 0 && (
        <div className="space-y-12 animate-fade-in">
          {/* Control Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 gap-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                {t("results.resultsFor")}{" "}
                {channelUrl ? (
                  <a
                    href={channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 hover:underline underline-offset-2"
                    title={t("results.openChannelTitle", { channel: searchState.channelName })}
                  >
                    <Youtube className="w-4 h-4" aria-hidden="true" />@{searchState.channelName}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400">
                    <Youtube className="w-4 h-4" aria-hidden="true" />@{searchState.channelName}
                  </span>
                )}
              </h3>
              <span className="bg-slate-200 dark:bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                {t("results.videosCount", { count: sortedVideos.length })}
              </span>
              {searchState.isLoading && (
                <span
                  className="inline-flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400"
                  role="status"
                  aria-label={t("loading")}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  {t("loading")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm font-medium">
              {/* Export & Share actions */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-0.5">
                <button
                  type="button"
                  onClick={handleCopyAllUrls}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    copyAllFailed
                      ? "text-red-500 dark:text-red-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                  title={copyAllFailed ? t("results.copyAllFailed") : t("results.copyAllUrls")}
                  aria-label={copyAllFailed ? t("results.copyAllFailed") : t("results.copyAllUrls")}
                >
                  {copyAllFailed ? (
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  ) : copiedAll ? (
                    <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span className="hidden lg:inline">
                    {copyAllFailed ? t("results.copyAllFailed") : t("results.copyAll")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    exportFailed
                      ? "text-red-500 dark:text-red-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                  title={exportFailed ? t("results.exportFailed") : t("results.exportCsv")}
                  aria-label={exportFailed ? t("results.exportFailed") : t("results.exportCsv")}
                >
                  {exportFailed ? (
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span className="hidden lg:inline">
                    {exportFailed ? t("results.exportFailed") : "CSV"}
                  </span>
                </button>
              </div>

              <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {t("results.sortedBy")}{" "}
                {sortMode === "trend" ? t("results.sortModes.trend") : t("results.sortModes.views")}
              </span>

              {/* Sort Toggle */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setSortMode("trend")}
                  aria-pressed={sortMode === "trend"}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    sortMode === "trend"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                  title={t("results.sortTitles.trend")}
                >
                  <Trophy className="w-4 h-4" aria-hidden="true" />
                  <span>{t("results.sortButtons.trendScore")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode("views")}
                  aria-pressed={sortMode === "views"}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    sortMode === "views"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                  title={t("results.sortTitles.views")}
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  <span>{t("results.sortButtons.views")}</span>
                </button>
              </div>

              {/* Top N Toggle */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setTopN(3)}
                  aria-pressed={topN === 3}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    topN === 3
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                  title={t("results.highlightTopN", { n: 3 })}
                >
                  <span>Top 3</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTopN(6)}
                  aria-pressed={topN === 6}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    topN === 6
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                  title={t("results.highlightTopN", { n: 6 })}
                >
                  <span>Top 6</span>
                </button>
              </div>
            </div>
          </div>

          {/* Top N Cards */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                {t("results.topPerformance", { n: topN })}
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {topVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>

          {/* List Table */}
          {otherVideos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-1 mt-8">
                <List className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  {t("results.moreVideos")}
                </h3>
              </div>
              <VideoListTable videos={otherVideos} startIndex={topN + 1} />
            </div>
          )}
        </div>
      )}

      {/* Loading skeleton: shown while fetching when there are no prior results yet */}
      {searchState.isLoading && !searchState.data && (
        <div
          className="space-y-8 animate-pulse"
          role="status"
          aria-label={t(
            searchState.step === "analyzing_ai"
              ? "loadingState.analyzing"
              : "loadingState.fetchingYoutube",
          )}
        >
          {/* Skeleton control bar */}
          <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
          {/* Skeleton card grid (topN=6 placeholder cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col"
              >
                <div className="h-40 bg-slate-200 dark:bg-slate-700" />
                <div className="p-4 space-y-2 flex-1">
                  <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-700" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!searchState.data && !searchState.isLoading && (
        <EmptyState
          variant={searchState.step === "idle" && !searchState.error ? "welcome" : "no-results"}
          examples={welcomeExamples}
          onPickExample={onPickExample}
        />
      )}
    </>
  );
}
