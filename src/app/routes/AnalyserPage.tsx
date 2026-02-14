import {useMemo, useState} from 'react';
import {AlertCircle, Eye, List, Trophy, Youtube} from 'lucide-react';
import {InputSection} from '@/src/shared/components/ui/InputSection';
import {VideoCard} from '@/src/shared/components/ui/VideoCard';
import {VideoListTable} from '@/src/shared/components/ui/VideoListTable';
import {EmptyState} from '@/src/shared/components/ui/EmptyState';
import {useTranslation} from 'react-i18next';
import type {SearchType, TimeFrame} from '@/src/shared/types';
import type {SearchState} from '@/src/features/search/hooks/useSearch';

interface AnalyserPageProps {
  searchState: SearchState;
  externalInputValues: {
    query?: string;
    timeFrame?: TimeFrame;
    maxResults?: number;
    searchType?: SearchType;
    syncToken?: number;
  };
  onSearch: (query: string, timeFrame: TimeFrame, maxResults: number, searchType: SearchType) => void;
}

export function AnalyserPage({
  searchState,
  externalInputValues,
  onSearch,
}: AnalyserPageProps) {
  const { t } = useTranslation();

  const [sortMode, setSortMode] = useState<'trend' | 'views'>('trend');
  const [topN, setTopN] = useState<3 | 6>(6);

  const sortedVideos = useMemo(() => {
    if (!searchState.data) return [];

    const arr = [...searchState.data];
    if (sortMode === 'views') {
      return arr.sort((a, b) => {
        if (b.views !== a.views) return b.views - a.views;
        return b.trendingScore - a.trendingScore;
      });
    }
    return arr.sort((a, b) => b.trendingScore - a.trendingScore);
  }, [searchState.data, sortMode]);

  const topVideos = sortedVideos.slice(0, topN);
  const otherVideos = sortedVideos.slice(topN);

  const channelUrl = useMemo(() => {
    if (searchState.channelId) return `https://www.youtube.com/channel/${searchState.channelId}`;
    const q = (searchState.channelName || '').trim();
    if (q.startsWith('@')) return `https://www.youtube.com/${q}`;
    return null;
  }, [searchState.channelId, searchState.channelName]);

  return (
    <>
      <InputSection
        onSearch={onSearch}
        isLoading={searchState.isLoading}
        externalQuery={externalInputValues.query}
        externalTimeFrame={externalInputValues.timeFrame}
        externalMaxResults={externalInputValues.maxResults}
        externalSearchType={externalInputValues.searchType}
        externalSyncToken={externalInputValues.syncToken}
      />

      {/* Error Message */}
      {searchState.error && (
        <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 dark:text-red-200 animate-fade-in shadow-lg shadow-red-900/10">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{searchState.error}</p>
        </div>
      )}

      {/* Results */}
      {sortedVideos.length > 0 && (
        <div className="space-y-12 animate-fade-in">
          {/* Control Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 gap-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                {t('results.resultsFor')}{' '}
                {channelUrl ? (
                  <a
                    href={channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 hover:underline underline-offset-2"
                    title={t('results.openChannelTitle', { channel: searchState.channelName })}
                  >
                    <Youtube className="w-4 h-4" aria-hidden="true" />
                    @{searchState.channelName}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400">
                    <Youtube className="w-4 h-4" aria-hidden="true" />
                    @{searchState.channelName}
                  </span>
                )}
              </h3>
              <span className="bg-slate-200 dark:bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                {t('results.videosCount', { count: sortedVideos.length })}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm font-medium">
              <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {t('results.sortedBy')}{' '}
                {sortMode === 'trend' ? t('results.sortModes.trend') : t('results.sortModes.views')}
              </span>

              {/* Sort Toggle */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setSortMode('trend')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    sortMode === 'trend'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title={t('results.sortTitles.trend')}
                >
                  <Trophy className="w-4 h-4" />
                  <span>{t('results.sortButtons.trendScore')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('views')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    sortMode === 'views'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title={t('results.sortTitles.views')}
                >
                  <Eye className="w-4 h-4" />
                  <span>{t('results.sortButtons.views')}</span>
                </button>
              </div>

              {/* Top N Toggle */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-0.5">
                <button
                  type="button"
                  onClick={() => setTopN(3)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    topN === 3
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title={t('results.highlightTopN', { n: 3 })}
                >
                  <span>Top 3</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTopN(6)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    topN === 6
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title={t('results.highlightTopN', { n: 6 })}
                >
                  <span>Top 6</span>
                </button>
              </div>
            </div>
          </div>

          {/* Top N Cards */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                {t('results.topPerformance', { n: topN })}
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {topVideos.map((video, index) => (
                <VideoCard key={video.id} video={video} rank={index + 1} />
              ))}
            </div>
          </div>

          {/* List Table */}
          {otherVideos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 px-1 mt-8">
                <List className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  {t('results.moreVideos')}
                </h3>
              </div>
              <VideoListTable videos={otherVideos} startIndex={topN + 1} />
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!searchState.data && !searchState.isLoading && <EmptyState />}
    </>
  );
}
