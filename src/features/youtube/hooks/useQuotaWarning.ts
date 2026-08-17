import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEventBus } from "@/src/shared/lib/eventBus";
import { showToast } from "@/src/shared/components/feedback";
import { quotaService } from "../services/quotaService";

/**
 * Percentage from which the daily YouTube quota counts as nearly spent. Matches
 * the red band of the header indicator, so the toast and the battery bar never
 * disagree about what "critical" means.
 */
const WARN_THRESHOLD_PERCENT = 90;

/**
 * Warns once when the daily YouTube API quota is nearly spent, and once when it
 * is gone.
 *
 * The free tier is 10,000 units a day and a single keyword search costs 100, so
 * a couple of "Refresh all" runs can eat the rest of the budget in seconds.
 * Until now the only signal was the small colour-coded battery in the header:
 * unless the user happened to look at it, the first notice was a search failing
 * with an API error, with the quota already gone for the day.
 *
 * Fires at most once per threshold per session, and only on an actual crossing
 * — the value at mount is recorded as the baseline, so reloading the page while
 * already deep in the red does not re-announce something the user knows. The
 * daily reset (handled in quotaService) drops the percentage back down, which
 * re-arms both warnings.
 */
export function useQuotaWarning(): void {
  const { t } = useTranslation();
  // Baseline: whatever the quota already was when the app started. Reading it
  // here rather than on the first event means a call that crosses the threshold
  // is still recognised as a crossing.
  const lastPercentageRef = useRef(quotaService.getInfo().percentage);
  const warnedRef = useRef(false);
  const exhaustedWarnedRef = useRef(false);

  const handleQuotaUpdate = useCallback(
    ({ percentage, exhausted }: { percentage: number; exhausted: boolean }) => {
      const previous = lastPercentageRef.current;
      lastPercentageRef.current = percentage;

      // A daily reset (or a manual quota reset) re-arms both warnings.
      if (percentage < WARN_THRESHOLD_PERCENT && !exhausted) {
        warnedRef.current = false;
        exhaustedWarnedRef.current = false;
        return;
      }

      if (exhausted) {
        if (exhaustedWarnedRef.current) return;
        exhaustedWarnedRef.current = true;
        // Suppress the near-limit toast afterwards — the harder message wins.
        warnedRef.current = true;
        showToast(t("quota.exhausted"), "error");
        return;
      }

      if (previous >= WARN_THRESHOLD_PERCENT || warnedRef.current) return;
      warnedRef.current = true;
      showToast(t("quota.nearLimit", { percentage }), "error");
    },
    [t],
  );

  useEventBus("quota-updated", handleQuotaUpdate);
}
