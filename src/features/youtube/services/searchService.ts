import type {ChannelVideosResult, QuotaCallContext, YouTubeVideoItem} from '@/src/shared/types';
import {TimeFrame} from '@/src/shared/types';
import {AUTO_LIMIT_KEYWORD} from '@/src/shared/constants';
import {getPublishedAfterDate, parseISO8601DurationToSeconds} from '@/src/shared/lib/dateUtils';
import type {YoutubeSearchResponse, YoutubeVideoListResponse} from '../types';

const SHORTS_DURATION_THRESHOLD_SECONDS = 180;
import {fetchFromApi} from './youtubeApiClient';

/**
 * Search videos by keyword
 */
export async function searchVideosByKeyword(
  keyword: string,
  timeFrame: TimeFrame,
  maxResults: number,
  context?: Partial<QuotaCallContext>
): Promise<ChannelVideosResult> {
  if (!keyword || keyword.trim().length === 0) {
    return { videos: [], totalInTimeFrame: 0 };
  }

  const keywordContext: QuotaCallContext = {
    source: 'keyword',
    name: keyword.trim(),
    favoriteType: 'keyword',
    ...context,
  };

  const publishedAfter = getPublishedAfterDate(timeFrame);
  const effectiveMax = maxResults === -1 ? AUTO_LIMIT_KEYWORD : maxResults > 0 ? maxResults : 5000;

  let allVideoIds: string[] = [];
  let nextPageToken = '';
  const MAX_PAGES = Math.ceil(effectiveMax / 50);
  let pageCount = 0;

  while (pageCount < MAX_PAGES && allVideoIds.length < effectiveMax) {
    const params: Record<string, string> = {
      part: 'snippet',
      q: keyword.trim(),
      type: 'video',
      order: 'date',
      publishedAfter: publishedAfter,
      maxResults: '50',
    };

    if (nextPageToken) params.pageToken = nextPageToken;

    const searchData = await fetchFromApi<YoutubeSearchResponse>('search', params, keywordContext);

    if (!searchData.items || searchData.items.length === 0) {
      break;
    }

    // Search API can occasionally return items without `id.videoId` (e.g. if
    // the response includes a non-video kind despite `type=video`). Filter
    // falsy values to avoid pushing `undefined` into the IDs list, which
    // would later corrupt the comma-joined `id` parameter to /videos.
    const videoIds = searchData.items
      .map((item) => item.id?.videoId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    allVideoIds = [...allVideoIds, ...videoIds];

    nextPageToken = searchData.nextPageToken ?? '';
    if (!nextPageToken) break;

    pageCount++;
  }

  if (allVideoIds.length === 0) {
    return { videos: [], totalInTimeFrame: 0 };
  }

  // Deduplicate
  const uniqueVideoIds = [...new Set(allVideoIds)];
  allVideoIds = uniqueVideoIds;

  if (maxResults > 0 && allVideoIds.length > maxResults) {
    allVideoIds = allVideoIds.slice(0, maxResults);
  }

  const totalInTimeFrame = allVideoIds.length;

  // Fetch video details in batches
  const batches: string[][] = [];
  for (let i = 0; i < allVideoIds.length; i += 50) {
    batches.push(allVideoIds.slice(i, i + 50));
  }

  const batchPromises = batches.map(async (batch) => {
    const videoIds = batch.join(',');

    const videoData = await fetchFromApi<YoutubeVideoListResponse>('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
    }, { ...keywordContext, source: 'video-stats' });

    if (!videoData.items) return [];

    return videoData.items
      .filter((item) => {
        const seconds = parseISO8601DurationToSeconds(item.contentDetails?.duration);
        // Keep videos whose duration is unknown; only filter confirmed shorts.
        if (seconds === null) return true;
        return seconds >= SHORTS_DURATION_THRESHOLD_SECONDS;
      })
      .map((item): YouTubeVideoItem => ({
        id: item.id,
        // Cast through `unknown` to bridge the loose API type (all fields
        // optional) and the stricter consumer type. Required fields are
        // guaranteed by the `part=snippet,statistics` request.
        snippet: item.snippet as unknown as YouTubeVideoItem['snippet'],
        statistics: item.statistics,
      }));
  });

  const batchResults = await Promise.all(batchPromises);
  let finalVideoItems: YouTubeVideoItem[] = batchResults.flat();

  if (finalVideoItems.length > effectiveMax) {
    finalVideoItems = finalVideoItems.slice(0, effectiveMax);
  }

  return { videos: finalVideoItems, totalInTimeFrame };
}
