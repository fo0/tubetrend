import {useCallback, useState} from 'react';
import type {SearchType, TimeFrame} from '@/src/shared/types';
import {SearchType as ST} from '@/src/shared/types';
import type {VideoData} from '@/src/features/videos/types';
import {analyzeVideoStats} from '@/src/features/videos';
import {
  findChannelInfo,
  getChannelQueryType,
  getVideosFromChannel,
  searchVideosByKeyword,
} from '@/src/features/youtube';

export interface SearchState {
  isLoading: boolean;
  step: 'idle' | 'fetching_youtube' | 'analyzing_ai' | 'complete';
  error: string | null;
  data: VideoData[] | null;
  channelName: string;
  channelId?: string;
}

const initialSearchState: SearchState = {
  isLoading: false,
  step: 'idle',
  error: null,
  data: null,
  channelName: '',
};

interface UseSearchOptions {
  onApiKeyInvalid?: () => void;
}

export function useSearch(apiKey: string | null, options?: UseSearchOptions) {
  const [searchState, setSearchState] = useState<SearchState>(initialSearchState);

  const handleSearch = useCallback(
    async (
      query: string,
      timeFrame: TimeFrame,
      maxResults: number,
      searchType: SearchType = ST.CHANNEL
    ) => {
      if (!apiKey) {
        options?.onApiKeyInvalid?.();
        return;
      }

      setSearchState((prev) => ({
        ...prev,
        isLoading: true,
        step: 'fetching_youtube',
        error: null,
        channelName: query,
        channelId: undefined,
        data: null,
      }));

      try {
        let apiVideos: any[];
        let displayName: string;
        let channelId: string | undefined;

        if (searchType === ST.KEYWORD) {
          const { videos } = await searchVideosByKeyword(query, timeFrame, maxResults, { name: query });
          apiVideos = videos;
          displayName = query;
          channelId = undefined;
        } else {
          const queryType = getChannelQueryType(query);
          const { id, name: officialName, uploadsPlaylistId } = await findChannelInfo(query, { name: query });
          const { videos } = await getVideosFromChannel(uploadsPlaylistId, timeFrame, maxResults, { name: officialName, favoriteType: queryType });
          apiVideos = videos;
          displayName = officialName;
          channelId = id;
        }

        if (apiVideos.length === 0) {
          throw new Error(`Keine Videos im Zeitraum "${timeFrame}" gefunden.`);
        }

        setSearchState((prev) => ({ ...prev, step: 'analyzing_ai' }));
        const analyzedVideos = await analyzeVideoStats(apiVideos, displayName, timeFrame);

        setSearchState({
          isLoading: false,
          step: 'complete',
          error: null,
          data: analyzedVideos,
          channelName: displayName,
          channelId,
        });
      } catch (err: any) {
        console.error(err);
        const errorMessage = err.message || 'Fehler bei der Analyse.';

        if (errorMessage.includes('API key not valid') || errorMessage.includes('403')) {
          setSearchState((prev) => ({
            ...prev,
            error: 'Der API Key scheint ungültig zu sein. Bitte überprüfe ihn.',
          }));
          options?.onApiKeyInvalid?.();
        } else {
          setSearchState((prev) => ({
            ...prev,
            isLoading: false,
            step: 'idle',
            error: errorMessage,
          }));
        }
      }
    },
    [apiKey, options]
  );

  const setSearchResult = useCallback(
    (data: VideoData[], channelName: string, channelId?: string) => {
      setSearchState({
        isLoading: false,
        step: 'complete',
        error: null,
        data,
        channelName,
        channelId,
      });
    },
    []
  );

  const resetSearch = useCallback(() => {
    setSearchState(initialSearchState);
  }, []);

  return {
    searchState,
    handleSearch,
    setSearchResult,
    resetSearch,
  };
}
