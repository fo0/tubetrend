import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { CACHE_TTL, STORAGE_KEYS, TIME_FRAMES } from "@/src/shared/constants";
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

/** True only for absolute http(s) URLs — the schemes an `<a href>` may safely navigate to. */
function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The persisted snapshot is rehydrated straight into the analyser view, where every
 * entry's `url` becomes an `<a href={video.url}>` (VideoCard, VideoListTable). Treat
 * it like any other on-disk input and reject a snapshot carrying a non-http(s) URL,
 * so a `javascript:` URL can never reach a link in the app origin — the origin whose
 * localStorage holds the YouTube API key. dashboardBackupService.parse() applies the
 * identical guard to the backup-import boundary; this is the second boundary the same
 * cached-video shape crosses. Genuine snapshots only ever contain
 * `https://www.youtube.com/watch?v=<id>` (built in trendAnalysisService), so this is
 * behavior-equivalent for real data and fails closed — a rejected snapshot simply
 * starts the analyser empty, exactly like an expired one. CWE-79 / OWASP A03.
 */
function isPersistedAnalyserResult(value: unknown): value is PersistedAnalyserResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.data) &&
    v.data.every((entry) => isHttpUrl((entry as { url?: unknown } | null | undefined)?.url)) &&
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

/** The arguments of the most recent analyser run, kept so it can be repeated. */
interface LastSearchArgs {
  query: string;
  timeFrame: TimeFrame;
  maxResults: number;
  searchType: SearchType;
}

export function useSearch(apiKey: string | null, options?: UseSearchOptions) {
  const { t } = useTranslation();
  const [searchState, setSearchState] = useState<SearchState>(restoreInitialSearchState);
  // Generation counter for analyser runs. A search can take many seconds (paged
  // playlist/search calls), so a second run — or opening a cached favorite, or
  // clearing the results — can easily start before the first one resolves.
  // Without this guard the slower earlier response wins: it overwrites the newer
  // results and persists a stale snapshot that survives the next reload. Same
  // pattern InputSection already uses for its autocomplete lookups.
  const searchRequestRef = useRef(0);
  // Arguments of the last run, so a failed search can be repeated verbatim.
  // A ref (not state) because nothing renders from it directly — `retrySearch`
  // reads it at click time, and storing it in state would re-render the whole
  // analyser on every search for no visible change.
  const lastSearchArgsRef = useRef<LastSearchArgs | null>(null);

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

      const requestId = ++searchRequestRef.current;
      const isStale = () => requestId !== searchRequestRef.current;
      lastSearchArgsRef.current = { query, timeFrame, maxResults, searchType };

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

        if (isStale()) return;

        if (apiVideos.length === 0) {
          // Translate the time-frame label here: the catch block only sees the
          // error, and the raw enum value ("last_month") is not user-facing text.
          const timeFrameLabelKey = TIME_FRAMES.find((tf) => tf.value === timeFrame)?.labelKey;
          throw new YouTubeApiError(`No videos found in time frame "${timeFrame}".`, 404, false, {
            key: "errors.api.noVideosInTimeFrame",
            params: { timeFrame: timeFrameLabelKey ? t(timeFrameLabelKey) : String(timeFrame) },
          });
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
        if (isStale()) return;
        // Services carry an i18n descriptor instead of a ready-made sentence —
        // resolve it here so the alert speaks the user's language. The raw
        // message stays the fallback for errors from outside our own layer.
        const errorMessage =
          err instanceof YouTubeApiError && err.i18n
            ? t(err.i18n.key, err.i18n.params)
            : err instanceof Error
              ? err.message
              : t("errors.analysisFailed");

        const isApiKeyInvalid =
          err instanceof YouTubeApiError && err.status === 403 && !err.isQuotaError;

        if (isApiKeyInvalid) {
          setSearchState((prev) => ({
            ...prev,
            isLoading: false,
            step: "idle",
            error: t("errors.apiKeyInvalid"),
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
    [apiKey, options, t],
  );

  const setSearchResult = useCallback(
    (data: VideoData[], channelName: string, channelId?: string) => {
      // Showing a cached favorite supersedes any run still in flight.
      searchRequestRef.current += 1;
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

  /**
   * Run the last search again with the exact arguments it used.
   *
   * Most analyser errors are transient — a dropped connection, an HTTP 5xx from
   * YouTube, a channel lookup that returned no video list. The banner stated the
   * problem but offered no way out: the search box sits above the fold-height
   * results area, so recovering meant scrolling back up and pressing Search
   * again. Nothing is retried automatically; the user decides when.
   */
  const retrySearch = useCallback(() => {
    const args = lastSearchArgsRef.current;
    if (!args) return;
    void handleSearch(args.query, args.timeFrame, args.maxResults, args.searchType);
  }, [handleSearch]);

  const resetSearch = useCallback(() => {
    // Clearing supersedes any run still in flight, otherwise its late response
    // would repopulate the view the user just emptied.
    searchRequestRef.current += 1;
    // The cleared view has no search behind it any more — a Retry offered after
    // this would silently resurrect a query the user just dismissed.
    lastSearchArgsRef.current = null;
    clearPersistedResult();
    setSearchState(initialSearchState);
  }, []);

  return {
    searchState,
    handleSearch,
    setSearchResult,
    resetSearch,
    retrySearch,
  };
}
