import { useTranslation } from "react-i18next";
import { HighlightVideoCard } from "@/src/shared/components/ui/HighlightVideoCard";
import type { HighlightItem } from "../services/dashboardTopVideos";

interface DashboardHighlightsGridProps {
  highlightVideos: HighlightItem[];
  refreshingIds: Set<string>;
  onHide: (
    sourceId: string,
    videoId: string,
    meta: { videoTitle: string; thumbnailUrl: string; sourceLabel: string },
  ) => void;
  onJumpToSource: (sourceId: string) => void;
}

export function DashboardHighlightsGrid({
  highlightVideos,
  refreshingIds,
  onHide,
  onJumpToSource,
}: DashboardHighlightsGridProps) {
  const { t } = useTranslation();

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
