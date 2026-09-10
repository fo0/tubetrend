import {
  AlertCircle,
  Check,
  Copy,
  Download,
  EyeOff,
  FileJson,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { showToast } from "@/src/shared/components/feedback";
import type { FavoriteConfig } from "@/src/features/favorites/types";
import {
  buildResultsCsv,
  buildResultsCsvFilename,
  buildResultsJson,
  buildResultsJsonFilename,
} from "@/src/features/videos";
import { downloadBlob } from "@/src/shared/lib/download";
import type { HighlightItem } from "../services/dashboardTopVideos";
import type { LastHiddenHighlight } from "../hooks/useUndoHiddenHighlight";

interface DashboardHighlightsToolbarProps {
  favorites: FavoriteConfig[];
  highlightVideos: HighlightItem[];
  refreshingIds: Set<string>;
  showRefreshProgress: boolean;
  refreshProgressLabel: string;
  hiddenHighlightsCount: number;
  lastHidden: LastHiddenHighlight | null;
  copiedAllHighlights: boolean;
  copyAllHighlightsFailed: boolean;
  onUndoHide: () => void;
  onCopyAllHighlights: () => void;
  onImportPick: () => void;
  onExport: () => void;
  onRefreshAll: () => void;
  onClearAllFavorites: () => void;
  onOpenHiddenModal: () => void;
}

export function DashboardHighlightsToolbar({
  favorites,
  highlightVideos,
  refreshingIds,
  showRefreshProgress,
  refreshProgressLabel,
  hiddenHighlightsCount,
  lastHidden,
  copiedAllHighlights,
  copyAllHighlightsFailed,
  onUndoHide,
  onCopyAllHighlights,
  onImportPick,
  onExport,
  onRefreshAll,
  onClearAllFavorites,
  onOpenHiddenModal,
}: DashboardHighlightsToolbarProps) {
  const { t } = useTranslation();

  // Export every visible highlight as CSV. The analyser has offered CSV/JSON for
  // its result list for a while; the dashboard could only copy bare URLs, so
  // getting the day's highlights into a sheet meant pasting links and refilling
  // views, velocity and score by hand. Same builder as the analyser export, so
  // both files share one column layout and one CSV-injection guard.
  const handleExportHighlightsCsv = () => {
    if (highlightVideos.length === 0) return;
    try {
      const csv = buildResultsCsv(highlightVideos.map((item) => item.video));
      downloadBlob(
        buildResultsCsvFilename("highlights"),
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      );
      showToast(t("dashboard.highlights.exportDone"), "success");
    } catch {
      // The download can be blocked (sandboxed iframe, hardened Electron
      // window) — never report a file the browser refused to write.
      showToast(t("dashboard.highlights.exportFailed"), "error");
    }
  };

  // Export every visible highlight as JSON. The analyser results bar offers CSV
  // *and* JSON side by side; the dashboard only had CSV, so the surface most
  // users start on could not produce the machine-readable format. CSV is the
  // lossy one of the pair — it drops the stable video id and the self-describing
  // envelope (export time, count) — which is exactly what a script consuming the
  // day's highlights needs. Same builder as the analyser export, so both files
  // share one schema.
  const handleExportHighlightsJson = () => {
    if (highlightVideos.length === 0) return;
    try {
      // No channel argument: unlike an analyser export these videos come from
      // many favorites at once, so the envelope's `channel` field stays null
      // rather than claiming a channel that does not exist. The per-video rows
      // carry the source through their own ids and URLs.
      const json = buildResultsJson(highlightVideos.map((item) => item.video));
      downloadBlob(
        buildResultsJsonFilename("highlights"),
        new Blob([json], { type: "application/json;charset=utf-8;" }),
      );
      showToast(t("dashboard.highlights.exportJsonDone"), "success");
    } catch {
      // The download can be blocked (sandboxed iframe, hardened Electron
      // window) — never report a file the browser refused to write.
      showToast(t("dashboard.highlights.exportFailed"), "error");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
      <div>
        {/* h2: the page's <h1> (Header) otherwise skips straight to each
            favorite row's <h3> (WCAG 1.3.1 — no skipped heading levels). */}
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          {t("dashboard.highlights.title")}
        </h2>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {t("dashboard.highlights.subtitle")}
        </div>
      </div>

      {/* flex-wrap: up to five labelled buttons (Import, Export, Refresh
          all, Clear all, Hidden) share this row with the count badge. On
          one unwrapped line they run past the section — and the page
          container with it — on any viewport narrower than a desktop. */}
      <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
        {highlightVideos.length > 0 && (
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            {t("dashboard.highlights.count", { count: highlightVideos.length })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
          {lastHidden && (
            <button
              type="button"
              onClick={onUndoHide}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-indigo-500/40 text-indigo-600 hover:bg-indigo-500/10
                             dark:border-indigo-500/30 dark:text-indigo-400"
              /* Reuses the hidden-list row's own label — "Show <title>
                       again" is exactly what this button does, and one string
                       for one action keeps the two from drifting apart. */
              title={t("dashboard.highlights.unhideAria", { title: lastHidden.title })}
              aria-label={t("dashboard.highlights.unhideAria", {
                title: lastHidden.title,
              })}
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span className="whitespace-nowrap">{t("dashboard.highlights.undoHide")}</span>
            </button>
          )}
          {highlightVideos.length > 0 && (
            <button
              type="button"
              onClick={onCopyAllHighlights}
              className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                copyAllHighlightsFailed
                  ? "border-red-300/60 text-red-600 dark:border-red-700/40 dark:text-red-400"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
              title={
                copyAllHighlightsFailed
                  ? t("dashboard.highlights.copyAllFailed")
                  : t("dashboard.highlights.copyAllUrls")
              }
              aria-label={
                copyAllHighlightsFailed
                  ? t("dashboard.highlights.copyAllFailed")
                  : t("dashboard.highlights.copyAllUrls")
              }
            >
              {copyAllHighlightsFailed ? (
                <AlertCircle className="w-3 h-3" aria-hidden="true" />
              ) : copiedAllHighlights ? (
                <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
              ) : (
                <Copy className="w-3 h-3" aria-hidden="true" />
              )}
              <span className="whitespace-nowrap">{t("dashboard.highlights.copyAll")}</span>
            </button>
          )}
          {highlightVideos.length > 0 && (
            <button
              type="button"
              onClick={handleExportHighlightsCsv}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-slate-300 text-slate-700 hover:bg-slate-100
                             dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title={t("dashboard.highlights.exportCsvTitle")}
              aria-label={t("dashboard.highlights.exportCsvTitle")}
            >
              <Download className="w-3 h-3" aria-hidden="true" />
              <span className="whitespace-nowrap">{t("dashboard.highlights.exportCsv")}</span>
            </button>
          )}
          {highlightVideos.length > 0 && (
            <button
              type="button"
              onClick={handleExportHighlightsJson}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-slate-300 text-slate-700 hover:bg-slate-100
                             dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title={t("dashboard.highlights.exportJsonTitle")}
              aria-label={t("dashboard.highlights.exportJsonTitle")}
            >
              <FileJson className="w-3 h-3" aria-hidden="true" />
              <span className="whitespace-nowrap">{t("dashboard.highlights.exportJson")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onImportPick}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title={t("actions.importDashboard")}
          >
            <Upload className="w-3 h-3" /> {t("actions.importDashboard")}
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={favorites.length === 0}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           disabled:opacity-50 disabled:cursor-not-allowed
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title={t("actions.exportDashboard")}
          >
            <Download className="w-3 h-3" /> {t("actions.exportDashboard")}
          </button>
          <button
            type="button"
            onClick={onRefreshAll}
            disabled={favorites.length === 0 || refreshingIds.size > 0}
            aria-busy={refreshingIds.size > 0}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           disabled:opacity-50 disabled:cursor-not-allowed
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title={
              showRefreshProgress
                ? refreshProgressLabel
                : refreshingIds.size > 0
                  ? t("favorites.status.refreshing")
                  : t("actions.refreshAll")
            }
          >
            <RefreshCw className={`w-3 h-3 ${refreshingIds.size > 0 ? "animate-spin" : ""}`} />{" "}
            <span className="whitespace-nowrap">
              {showRefreshProgress ? refreshProgressLabel : t("actions.refreshAll")}
            </span>
          </button>
          {favorites.length > 0 && (
            <button
              type="button"
              onClick={onClearAllFavorites}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-red-300/60 text-red-600 hover:bg-red-50
                             dark:border-red-700/40 dark:text-red-400 dark:hover:bg-red-900/20"
              title={t("favorites.clearAll")}
            >
              <Trash2 className="w-3 h-3" /> {t("favorites.clearAll")}
            </button>
          )}
          {hiddenHighlightsCount > 0 && (
            <button
              type="button"
              onClick={onOpenHiddenModal}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-amber-300 text-amber-700 hover:bg-amber-50
                             dark:border-amber-600/50 dark:text-amber-400 dark:hover:bg-amber-900/20"
              title={t("dashboard.highlights.showHiddenList")}
            >
              <EyeOff className="w-3 h-3" /> {t("dashboard.highlights.hiddenButton")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
