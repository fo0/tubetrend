import React from 'react';
import {Clock, Eye, Trash2, X} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {hiddenHighlightsService, type HiddenHighlight} from '@/src/features/dashboard';

interface HiddenHighlightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HiddenHighlightsModal: React.FC<HiddenHighlightsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [hiddenItems, setHiddenItems] = React.useState<HiddenHighlight[]>([]);

  // Lade die Liste beim Öffnen des Modals
  React.useEffect(() => {
    if (isOpen) {
      setHiddenItems(hiddenHighlightsService.listChronological());
    }
  }, [isOpen]);

  const handleUnhide = (videoId: string) => {
    hiddenHighlightsService.show(videoId);
    setHiddenItems(hiddenHighlightsService.listChronological());
  };

  const handleDelete = (videoId: string) => {
    hiddenHighlightsService.show(videoId); // Entfernt den Eintrag aus der Liste
    setHiddenItems(hiddenHighlightsService.listChronological());
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('dashboard.highlights.hiddenModalTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label={t('modal.apiKey.cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {hiddenItems.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8">
              {t('dashboard.highlights.noHiddenItems')}
            </div>
          ) : (
            <ul className="space-y-3">
              {hiddenItems.map((item) => (
                <li
                  key={item.videoId}
                  className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  {/* Thumbnail */}
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.videoTitle || 'Video'}
                      className="w-24 h-14 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-14 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0 flex items-center justify-center">
                      <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate" title={item.videoTitle}>
                      {item.videoTitle || item.videoId}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {item.sourceLabel || item.sourceId}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.hiddenAt)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="shrink-0 flex items-center gap-2">
                    {/* Unhide Button */}
                    <button
                      type="button"
                      onClick={() => handleUnhide(item.videoId)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                               bg-indigo-100 text-indigo-700 hover:bg-indigo-200
                               dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50
                               transition-colors"
                      title={t('dashboard.highlights.unhide')}
                    >
                      <Eye className="w-4 h-4" />
                      {t('dashboard.highlights.unhide')}
                    </button>
                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.videoId)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                               bg-red-100 text-red-700 hover:bg-red-200
                               dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50
                               transition-colors"
                      title={t('dashboard.highlights.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('dashboard.highlights.delete')}
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
