import { useCallback, useState } from "react";
import type { SearchType, TimeFrame, YouTubeVideoItem } from "@/src/shared/types";
import { SearchType as ST } from "@/src/shared/types";
import type { VideoData } from "@/src/features/videos/types";
import { analyzeVideoStats } from "@/src/features/videos";
import {
  findChannelInfo,
  getChannelQueryType,
  getVideosFromChannel,
  searchVideosByKeyword,
  YouTubeApiError,
} from "@/src/features/youtube";
import { CACHE_TTL, STORAGE_KEYS } from "@/src/shared/constants";
import { safeRead, safeRemove, safeWrite } from "@/src/shared/lib/storage";

export interface SearchState {
  isLoading: boolean;
  step: "idle" | "fetching_youtube" | "analyzing_ai" | "complete";
  error: string | null;
  data: VideoData[] | null;
  channelName: string;
  channelId?: string;
  /** Epoch ms when the currently displayed analysis was produced (undefined for cached favorite views). */
  resultSavedAt?: number;
}

const initialSearchState: SearchState = {
  isLoading: false,
  step: "idle",
  error: null,
  data: null,
  channelName: "",
};

/** Snapshot of the last completed analyser search, persisted so it survives a page reload. */
interface PersistedAnalyserResult {
  data: VideoData[];
  channelName: string;
  channelId?: string;
  savedAt: number;
}

function isPersistedAnalyserResult(value: unknown): value is PersistedAnalyserResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.data) &&
    typeof v.channelName === "string" &&
    typeof v.savedAt === "number" &&
    (v.channelId === undefined || typeof v.channelId === "string")
  );
}

/** Read the persisted last result, ignoring anything malformed or older than the TTL. */
function readPersistedResult(): PersistedAnalyserResult | null {
  const raw = safeRead<unknown>(STORAGE_KEYS.ANALYSER_LAST_RESULT, null);
  if (!isPersistedAnalyserResult(raw)) return null;
  if (Date.now() - raw.savedAt > CACHE_TTL.ANALYSER_RESULT) return null;
  return raw;
}

function persistResult(result: PersistedAnalyserResult): void {
  safeWrite(STORAGE_KEYS.ANALYSER_LAST_RESULT, result);
}

function clearPersistedResult(): void {
  safeRemove(STORAGE_KEYS.ANALYSER_LAST_RESULT);
}

/** Rehydrate the last completed search on mount so a reload keeps the results in view. */
function restoreInitialSearchState(): SearchState {
  const persisted = readPersistedResult();
  if (!persisted) return initialSearchState;
  return {
    isLoading: false,
    step: "complete",
    error: null,
    data: persisted.data,
    channelName: persisted.channelName,
    channelId: persisted.channelId,
    resultSavedAt: persisted.savedAt,
  };
}

interface UseSearchOptions {
  onApiKeyInvalid?: () => void;
}

export function useSearch(apiKey: string | null, options?: UseSearchOptions) {
  const [searchState, setSearchState] = useState<SearchState>(restoreInitialSearchState);

  const handleSearch = useCallback(
    async (
      query: string,
      timeFrame: TimeFrame,
      maxResults: number,
      searchType: SearchType = ST.CHANNEL,
    ) => {
      if (!apiKey) {
        options?.onApiKeyInvalid?.();
        return;
      }

      setSearchState((prev) => ({
        ...prev,
        isLoading: true,
        step: "fetching_youtube",
        error: null,
        channelName: query,
        channelId: undefined,
        data: null,
      }));

      try {
        let apiVideos: YouTubeVideoItem[];
        let displayName: string;
        let channelId: string | undefined;

        if (searchType === ST.KEYWORD) {
          const { videos } = await searchVideosByKeyword(query, timeFrame, maxResults, {
            name: query,
          });
          apiVideos = videos;
          displayName = query;
          channelId = undefined;
        } else {
          const queryType = getChannelQueryType(query);
          const {
            id,
            name: officialName,
            uploadsPlaylistId,
          } = await findChannelInfo(query, { name: query });
          const { videos } = await getVideosFromChannel(uploadsPlaylistId, timeFrame, maxResults, {
            name: officialName,
            favoriteType: queryType,
          });
          apiVideos = videos;
          displayName = officialName;
          channelId = id;
        }

        if (apiVideos.length === 0) {
          throw new Error(`No videos found in time frame "${timeFrame}".`);
        }

        setSearchState((prev) => ({ ...prev, step: "analyzing_ai" }));
        const analyzedVideos = analyzeVideoStats(apiVideos, displayName, timeFrame);

        const savedAt = Date.now();
        setSearchState({
          isLoading: false,
          step: "complete",
          error: null,
          data: analyzedVideos,
          channelName: displayName,
          channelId,
          resultSavedAt: savedAt,
        });
        // Persist the snapshot so a page reload keeps the results in view.
        persistResult({ data: analyzedVideos, channelName: displayName, channelId, savedAt });
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error(err);
        const errorMessage = err instanceof Error ? err.message : "Analysis failed.";

        const isApiKeyInvalid =
          err instanceof YouTubeApiError && err.status === 403 && !err.isQuotaError;

        if (isApiKeyInvalid) {
          setSearchState((prev) => ({
            ...prev,
            isLoading: false,
            step: "idle",
            error: "The API key appears to be invalid. Please check it.",
          }));
          options?.onApiKeyInvalid?.();
        } else {
          setSearchState((prev) => ({
            ...prev,
            isLoading: false,
            step: "idle",
            error: errorMessage,
          }));
        }
      }
    },
    [apiKey, options],
  );

  const setSearchResult = useCallback(
    (data: VideoData[], channelName: string, channelId?: string) => {
      setSearchState({
        isLoading: false,
        step: "complete",
        error: null,
        data,
        channelName,
        channelId,
      });
    },
    [],
  );

  const resetSearch = useCallback(() => {
    clearPersistedResult();
    setSearchState(initialSearchState);
  }, []);

  return {
    searchState,
    handleSearch,
    setSearchResult,
    resetSearch,
  };
}
