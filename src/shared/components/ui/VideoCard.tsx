import React, { useEffect, useRef, useState } from "react";
import type { VideoData } from "@/src/features/videos";
import { Check, Clock, Copy, Eye, Heart, TrendingUp, Type, Zap } from "lucide-react";
import { formatNumber, formatTimeAgo } from "@/src/shared/lib/formatters";
import { useTranslation } from "react-i18next";

interface VideoCardProps {
  video: VideoData;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [titleCopied, setTitleCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTitleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (resetTitleTimerRef.current) clearTimeout(resetTitleTimerRef.current);
    };
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // navigator.clipboard is undefined in insecure contexts (HTTP, some iframes).
    // Accessing .writeText on it throws synchronously, which the promise
    // rejection handler below would not catch — so guard the property first.
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(video.url).then(
      () => {
        setCopied(true);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => setCopied(false), 1500);
      },
      () => {
        // Clipboard API unavailable (HTTP context, iframe restriction, etc.)
      },
    );
  };

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(video.title).then(
      () => {
        setTitleCopied(true);
        if (resetTitleTimerRef.current) clearTimeout(resetTitleTimerRef.current);
        resetTitleTimerRef.current = setTimeout(() => setTitleCopied(false), 1500);
      },
      () => {
        // Clipboard API unavailable
      },
    );
  };

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80)
      return "text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.2)]";
    if (score >= 50) return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  };

  return (
    <div className="bg-white border-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-lg hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 group flex flex-col h-full relative">
      {/* Polite live region: announce copy success to assistive tech (the green
          checkmark alone is silent to screen readers). */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t("results.table.urlCopied") : titleCopied ? t("results.table.titleCopied") : ""}
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
          <Clock className="w-3 h-3 text-slate-300" />
          {formatTimeAgo(video.publishedTimestamp, t)}
        </div>
        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center gap-1 cursor-help ${getScoreColor(video.trendingScore)}`}
          tabIndex={0}
          title={t("results.table.scoreTooltip")}
          aria-label={`${t("results.table.score")}: ${video.trendingScore} — ${t("results.table.scoreTooltip")}`}
        >
          <TrendingUp className="w-3 h-3" aria-hidden="true" />
          {t("results.table.score")}: {video.trendingScore}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col grow">
        <div className="mb-2">
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
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="flex flex-col justify-center bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Eye className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />{" "}
              {t("results.table.views")}
            </div>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">
              {formatNumber(video.views)}
            </span>
          </div>
          <div className="flex flex-col justify-center bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Zap className="w-3 h-3 text-yellow-500 dark:text-yellow-400" />{" "}
              {t("results.table.velocity")}
            </div>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">
              {video.viewsPerHour ? `~${formatNumber(video.viewsPerHour)}/h` : "N/A"}
            </span>
          </div>
          <div className="flex flex-col justify-center bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Heart className="w-3 h-3 text-pink-500 dark:text-pink-400" />{" "}
              {t("results.table.engagement")}
            </div>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">
              {video.engagementRate != null ? `${video.engagementRate}%` : "N/A"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-2 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={handleCopyTitle}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700"
            title={t("results.table.copyTitle")}
            aria-label={t("results.table.copyTitleAria", { title: video.title })}
          >
            {titleCopied ? (
              <Check className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
            ) : (
              <Type className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700"
            title={t("results.table.copyUrl")}
            aria-label={t("results.table.copyUrlAria", { title: video.title })}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
