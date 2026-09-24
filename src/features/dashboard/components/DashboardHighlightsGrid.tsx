import { EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HighlightVideoCard } from "@/src/shared/components/ui/HighlightVideoCard";
import type { HighlightItem } from "../services/dashboardTopVideos";

interface DashboardHighlightsGridProps {
  highlightVideos: HighlightItem[];
  /** Highlight candidates the user has hidden (see useDashboardFilters). */
  hiddenHighlightsCount: number;
  refreshingIds: Set<string>;
  onHide: (
    sourceId: string,
    videoId: string,
    meta: { videoTitle: string; thumbnailUrl: string; sourceLabel: string },
  ) => void;
  onJumpToSource: (sourceId: string) => void;
  onOpenHiddenModal: () => void;
}

export function DashboardHighlightsGrid({
  highlightVideos,
  hiddenHighlightsCount,
  refreshingIds,
  onHide,
  onJumpToSource,
  onOpenHiddenModal,
}: DashboardHighlightsGridProps) {
  const { t } = useTranslation();

  // Every highlight there is has been hidden. Each favorite contributes only its
  // single best video, so with a handful of favorites a few clicks on "hide"
  // empty the section — and it then fell through to the placeholder below,
  // which draws skeleton cards and says highlights will appear "once your
  // favorites have loaded videos". They had loaded; the user had hidden them,
  // and nothing on screen said so or pointed back. State the actual cause and
  // offer the hidden list right here (the same modal as the toolbar's "Hidden"
  // button), in the panel look the favorites filter's no-match state uses.
  if (highlightVideos.length === 0 && hiddenHighlightsCount > 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center gap-3">
        <p className="text-slate-600 dark:text-slate-400">
          {t("dashboard.highlights.allHidden", { count: hiddenHighlightsCount })}
        </p>
        <button
          type="button"
          onClick={onOpenHiddenModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <EyeOff className="w-4 h-4" aria-hidden="true" />
          {t("dashboard.highlights.showHiddenList")}
        </button>
      </div>
    );
  }

  return highlightVideos.length > 0 ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {highlightVideos.map((item, idx) => (
        <HighlightVideoCard
          key={`${item.video.id}:${item.sourceId}:${item.sourceRank}`}
          video={item.video}
          highlightRank={idx + 1}
          sourceLabel={item.sourceLabel}
          sourceRank={item.sourceRank}
          sourceId={item.sourceId}
          isRefreshing={refreshingIds.has(item.sourceId)}
          onHide={onHide}
          onJumpToSource={onJumpToSource}
        />
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white/50 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 flex flex-col h-full"
        >
          <div className="h-40 bg-slate-200 dark:bg-slate-700" />
          <div className="p-4 flex flex-col grow">
            <div className="mb-2">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-1" />
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50" />
              <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50" />
            </div>
          </div>
        </div>
      ))}
      <div className="col-span-full flex items-center justify-center -mt-[200px] pointer-events-none">
        <div className="text-center text-slate-500 dark:text-slate-400 text-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg">
          {t("dashboard.highlights.empty")}
        </div>
      </div>
    </div>
  );
}
