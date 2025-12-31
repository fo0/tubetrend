import type {ChannelVideosResult, QuotaCallContext, YouTubeVideoItem} from '@/src/shared/types';
import {TimeFrame} from '@/src/shared/types';
import {AUTO_LIMIT_KEYWORD} from '@/src/shared/constants';
import {getPublishedAfterDate} from '@/src/shared/lib/dateUtils';
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

    const searchData = await fetchFromApi<any>('search', params, keywordContext);

    if (!searchData.items || searchData.items.length === 0) {
      break;
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId);
    allVideoIds = [...allVideoIds, ...videoIds];

    nextPageToken = searchData.nextPageToken;
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

    const videoData = await fetchFromApi<any>('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
    }, { ...keywordContext, source: 'video-stats' });

    if (!videoData.items) return [];

    return videoData.items
      .filter((item: any) => {
        const duration = item.contentDetails?.duration;
        if (!duration) return true;

        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        let seconds = 0;
        if (match) {
          const h = parseInt(match[1]?.replace('H', '') || '0');
          const m = parseInt(match[2]?.replace('M', '') || '0');
          const s = parseInt(match[3]?.replace('S', '') || '0');
          seconds = h * 3600 + m * 60 + s;
        }
        return seconds >= 180; // Filter shorts
      })
      .map((item: any) => ({
        id: item.id,
        snippet: item.snippet,
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
