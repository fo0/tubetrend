import { useTranslation } from "react-i18next";
import type { LastHiddenHighlight } from "../hooks/useUndoHiddenHighlight";

interface DashboardHighlightsLiveRegionProps {
  copiedAllHighlights: boolean;
  copyAllHighlightsFailed: boolean;
  lastHidden: LastHiddenHighlight | null;
}

/**
 * Polite live region: the bulk-copy result is otherwise only conveyed by a
 * transient icon swap, which is silent to assistive tech (mirrors the
 * analyser's bulk actions and the per-card copy buttons).
 */
export function DashboardHighlightsLiveRegion({
  copiedAllHighlights,
  copyAllHighlightsFailed,
  lastHidden,
}: DashboardHighlightsLiveRegionProps) {
  const { t } = useTranslation();

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {copyAllHighlightsFailed
        ? t("dashboard.highlights.copyAllFailed")
        : copiedAllHighlights
          ? t("dashboard.highlights.copyAllDone")
          : lastHidden
            ? /* A hidden card simply stops being rendered, which is silent to
                 assistive tech — so is the Undo button appearing in the
                 toolbar. Say both. */
              t("dashboard.highlights.hiddenAnnounce", { title: lastHidden.title })
            : ""}
    </p>
  );
}
