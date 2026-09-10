import { FileJson } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Drop hint for a backup file dragged onto the dashboard page.
 *
 * `pointer-events-none` is load-bearing: an overlay that took the pointer would
 * sit between the cursor and the drop target above, firing a
 * dragleave/dragenter pair on every frame and cancelling the drop it is
 * advertising. z-[55] puts it over the sticky header (z-50) but under the
 * toasts (z-60) that report the outcome.
 */
export function DashboardDropOverlay() {
  const { t } = useTranslation();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-400 bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-2xl dark:border-indigo-500 dark:bg-slate-900 dark:text-slate-200">
        <FileJson className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
        {t("backup.dropHint")}
      </div>
    </div>
  );
}
