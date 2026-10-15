import { useTranslation } from "react-i18next";

/**
 * Placeholder for a video metric that could not be computed (no velocity, no
 * engagement rate).
 *
 * The result cards printed a hard-coded English "N/A" — also in the German UI —
 * which screen readers spell out as "N slash A", while the result table showed a
 * bare "-" that is either skipped or read as "dash". One placeholder for all
 * three surfaces: the dash stays the visual cue, the translated wording is what
 * assistive tech reads and what the tooltip explains.
 */
export function MetricUnavailable() {
  const { t } = useTranslation();
  const label = t("results.table.notAvailable");
  return (
    <span title={label}>
      <span aria-hidden="true">–</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
