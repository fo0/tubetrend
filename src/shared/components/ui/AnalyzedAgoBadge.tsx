import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatTimeAgo } from "@/src/shared/lib/formatters";
import { getLocale } from "@/src/shared/lib/locale";

/** How often the relative age is re-rendered — the dashboard rows' cadence. */
const TICK_MS = 10_000;

interface AnalyzedAgoBadgeProps {
  /** When the analysis on screen was produced, in ms since the epoch. */
  savedAt: number;
}

/**
 * "Analyzed 5 minutes ago" beside the analyser's result count.
 *
 * The age used to be formatted once per render of the whole analyser page, so a
 * page left open kept saying "just now" or "2 minutes ago" for hours — and this
 * is the one figure that tells the user whether the results on screen need the
 * Refresh button next to them. It now updates itself every 10 seconds, like the
 * "as of" badge on each dashboard row.
 *
 * The tick lives in this component on purpose: re-rendering the analyser page
 * (with a result table that can hold hundreds of rows) just to move one label
 * forward would cost far more than the label is worth. The page unmounts the
 * badge while a search runs, which also stops the interval.
 *
 * `role="note"` rather than a bare span: it is the non-interactive role that
 * permits the author-provided name carrying the exact timestamp (aria-label is
 * prohibited on role="generic").
 */
export function AnalyzedAgoBadge({ savedAt }: AnalyzedAgoBadgeProps) {
  const { t } = useTranslation();
  // Only the re-render matters; the counter value itself is never read.
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((v) => v + 1), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const ago = t("results.analyzedAgo", { time: formatTimeAgo(savedAt, t) });
  const exact = new Date(savedAt).toLocaleString(getLocale());

  return (
    <span
      className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-help"
      tabIndex={0}
      role="note"
      title={exact}
      aria-label={`${ago} — ${exact}`}
    >
      {ago}
    </span>
  );
}
