import React from "react";
import { Clock, Eye, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hiddenHighlightsService, type HiddenHighlight } from "@/src/features/dashboard";
import { getLocale } from "@/src/shared/lib/locale";

interface HiddenHighlightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HiddenHighlightsModal: React.FC<HiddenHighlightsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [hiddenItems, setHiddenItems] = React.useState<HiddenHighlight[]>([]);

  // Lade die Liste beim Öffnen des Modals
  React.useEffect(() => {
    if (isOpen) {
      setHiddenItems(hiddenHighlightsService.listChronological());
    }
  }, [isOpen]);

  // Close on Escape (WCAG 2.1.2 — provide keyboard escape from modal)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleUnhide = (videoId: string) => {
    hiddenHighlightsService.show(videoId);
    setHiddenItems(hiddenHighlightsService.listChronological());
  };

  const handleDelete = (videoId: string) => {
    hiddenHighlightsService.show(videoId); // Entfernt den Eintrag aus der Liste
    setHiddenItems(hiddenHighlightsService.listChronological());
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return date.toLocaleString(getLocale(), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hidden-highlights-modal-title"
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2
            id="hidden-highlights-modal-title"
            className="text-lg font-bold text-slate-900 dark:text-white"
          >
            {t("dashboard.highlights.hiddenModalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label={t("modal.close")}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {hiddenItems.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8">
              {t("dashboard.highlights.noHiddenItems")}
            </div>
          ) : (
            <ul className="space-y-3">
              {hiddenItems.map((item) => (
                <li
                  key={item.videoId}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  {/* Thumbnail */}
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.videoTitle}
                      className="w-20 h-12 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {item.videoTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {item.sourceLabel}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.hiddenAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUnhide(item.videoId)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      {t("dashboard.highlights.unhide")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.videoId)}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-red-500/30 text-red-400 dark:text-red-300 hover:bg-red-500/10 transition-colors"
                      aria-label={t("dashboard.highlights.delete")}
                      title={t("dashboard.highlights.delete")}
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
