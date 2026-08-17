import React, { useEffect, useRef, useState } from "react";
import type { VideoData } from "@/src/features/videos";
import { AlertCircle, Check, Clock, Copy, Eye, EyeOff, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatNumber, formatTimeAgo } from "@/src/shared/lib/formatters";

interface HighlightVideoCardProps {
  video: VideoData;
  highlightRank: number;
  sourceLabel: string;
  sourceRank: number;
  sourceId: string;
  // When true, the card is visually marked as "refreshing"
  isRefreshing?: boolean;
  /** Jump to the favorite this highlight came from. Omit to keep the label static. */
  onJumpToSource?: (sourceId: string) => void;
  // Callback to hide the card (with optional metadata for the list)
  onHide?: (
    sourceId: string,
    videoId: string,
    meta: { videoTitle: string; thumbnailUrl: string; sourceLabel: string },
  ) => void;
}

export const HighlightVideoCard: React.FC<HighlightVideoCardProps> = ({
  video,
  highlightRank,
  sourceLabel,
  sourceRank,
  sourceId,
  isRefreshing = false,
  onHide,
  onJumpToSource,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  // A blocked clipboard used to make this button a dead control: it neither
  // copied nor said anything. That is the normal case whenever the app is
  // reached over plain HTTP (e.g. the Docker image on a LAN address), where
  // navigator.clipboard does not exist at all. Surface it instead — same
  // feedback pattern as VideoCard / VideoListTable.
  const [copyFailed, setCopyFailed] = useState(false);
  const resetCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetFailedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
      if (resetFailedTimerRef.current) clearTimeout(resetFailedTimerRef.current);
    };
  }, []);

  const flashCopyFailed = () => {
    setCopyFailed(true);
    if (resetFailedTimerRef.current) clearTimeout(resetFailedTimerRef.current);
    resetFailedTimerRef.current = setTimeout(() => setCopyFailed(false), 2500);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // navigator.clipboard is undefined in insecure contexts (HTTP, some
    // iframes). Reading .writeText off it throws synchronously, which the
    // rejection handler below would not catch — so guard the property first.
    if (!navigator.clipboard) {
      flashCopyFailed();
      return;
    }
    navigator.clipboard.writeText(video.url).then(
      () => {
        setCopied(true);
        if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
        resetCopiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
      },
      () => {
        // Clipboard write rejected (permissions / focus) — surface it.
        flashCopyFailed();
      },
    );
  };

  // Highlight fresh videos (younger than 24h) with a green border
  const isFresh =
    typeof video?.publishedTimestamp === "number" &&
    Date.now() - video.publishedTimestamp < 24 * 60 * 60 * 1000;

  return (
    <div
      className={`bg-white border-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-lg hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 group flex flex-col h-full relative ${isFresh ? "fresh-green-border" : ""} ${isRefreshing ? "opacity-60" : ""}`}
      aria-busy={isRefreshing}
    >
      {/* Polite live region: announce copy success to assistive tech (the green
          checkmark alone is silent to screen readers). Mirrors VideoCard. */}
      <span className="sr-only" role="status" aria-live="polite">
        {copyFailed ? t("results.table.copyFailed") : copied ? t("results.table.urlCopied") : ""}
      </span>

      {/* Thumbnail Area */}
      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-900">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-full cursor-pointer"
        >
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            loading="lazy"
          />
        </a>

        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
          <Clock className="w-3 h-3 text-slate-300" aria-hidden="true" />
          {formatTimeAgo(video.publishedTimestamp, t)}
        </div>

        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-200/70 bg-indigo-600/90 text-white backdrop-blur-md flex items-center gap-1 pointer-events-none"
          title={`${sourceLabel} • Top ${sourceRank}`}
        >
          <Sparkles className="w-3 h-3" aria-hidden="true" />#{highlightRank}
        </div>

        {/* Hide button */}
        {onHide && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onHide(sourceId, video.id, {
                videoTitle: video.title,
                thumbnailUrl: video.thumbnailUrl,
                sourceLabel,
              });
            }}
            className="absolute top-1.5 right-1.5 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title={t("dashboard.highlights.hide")}
            aria-label={t("dashboard.highlights.hide")}
          >
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col grow">
        <div className="mb-2">
          {/* Source line. A highlight is the single best video of one favorite,
              so the obvious next question is "what else has that favorite got?"
              — until now the only answer was scrolling the dashboard for the
              row by hand. With a handler the line becomes the shortcut to it;
              without one it stays the plain label it always was. */}
          {onJumpToSource ? (
            <button
              type="button"
              onClick={() => onJumpToSource(sourceId)}
              className="block max-w-full text-left text-xs font-semibold text-slate-500 dark:text-slate-400 truncate hover:text-indigo-500 dark:hover:text-indigo-400 hover:underline underline-offset-2 transition-colors"
              title={t("dashboard.highlights.jumpToSource", { source: sourceLabel })}
              aria-label={t("dashboard.highlights.jumpToSource", { source: sourceLabel })}
            >
              {sourceLabel} <span className="text-slate-400 dark:text-slate-500">•</span> Top{" "}
              {sourceRank}
            </button>
          ) : (
            <div
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate"
              title={`${sourceLabel} • Top ${sourceRank}`}
            >
              {sourceLabel} <span className="text-slate-400 dark:text-slate-500">•</span> Top{" "}
              {sourceRank}
            </div>
          )}
          <h3 className="text-base font-bold leading-snug line-clamp-2 min-h-[2.75rem]">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors hover:underline decoration-indigo-400/30 underline-offset-2"
              title={video.title}
            >
              {video.title}
            </a>
          </h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex flex-col justify-center bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Eye className="w-3 h-3 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />{" "}
              {t("results.table.views")}
            </div>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">
              {formatNumber(video.views)}
            </span>
          </div>
          <div className="flex flex-col justify-center bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Zap className="w-3 h-3 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />{" "}
              {t("results.table.velocity")}
            </div>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">
              {video.viewsPerHour ? `~${formatNumber(video.viewsPerHour)}/h` : "N/A"}
            </span>
          </div>
        </div>

        {/* Copy URL action */}
        <div className="mt-auto pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 ${
              copyFailed
                ? "text-red-500 dark:text-red-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
            }`}
            title={copyFailed ? t("results.table.copyFailed") : t("results.table.copyUrl")}
            aria-label={
              copyFailed
                ? t("results.table.copyFailed")
                : t("results.table.copyUrlAria", { title: video.title })
            }
          >
            {copyFailed ? (
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            ) : copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {isRefreshing && (
        <div className="absolute inset-0 bg-slate-200/40 dark:bg-slate-700/30 pointer-events-none" />
      )}
    </div>
  );
};
