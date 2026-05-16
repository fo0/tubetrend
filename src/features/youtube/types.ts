/**
 * YouTube Data API v3 response shapes.
 *
 * Only the fields actually consumed by the services in this feature module are
 * typed — these intentionally do NOT mirror the full Google schema. All fields
 * are marked optional/loose to reflect that the API may omit them depending on
 * the requested `part`, the `kind` of the returned item, or per-resource access
 * restrictions. Services must keep their existing null/undefined checks; the
 * stricter typing is an aid, not a guarantee.
 *
 * Reference: https://developers.google.com/youtube/v3/docs
 */

export interface YoutubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface YoutubeThumbnails {
  default?: YoutubeThumbnail;
  medium?: YoutubeThumbnail;
  high?: YoutubeThumbnail;
  standard?: YoutubeThumbnail;
  maxres?: YoutubeThumbnail;
}

/** Snippet returned by /search for `type=video`. */
export interface YoutubeSearchVideoSnippet {
  publishedAt?: string;
  channelId?: string;
  title?: string;
  description?: string;
  thumbnails?: YoutubeThumbnails;
  channelTitle?: string;
  liveBroadcastContent?: string;
}

/** Snippet returned by /search for `type=channel`. */
export interface YoutubeSearchChannelSnippet {
  publishedAt?: string;
  channelId?: string;
  title?: string;
  description?: string;
  thumbnails?: YoutubeThumbnails;
  channelTitle?: string;
  customUrl?: string;
}

/** /search item — `id.kind` discriminates between video / channel / playlist. */
export interface YoutubeSearchResultItem {
  id?: {
    kind?: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: YoutubeSearchVideoSnippet & YoutubeSearchChannelSnippet;
}

/** /channels resource (subset). */
export interface YoutubeChannelItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    thumbnails?: YoutubeThumbnails;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
      likes?: string;
    };
  };
}

/** /videos resource (subset of what `searchVideosByKeyword` and `getVideosFromChannel` consume). */
export interface YoutubeVideoSnippet {
  publishedAt: string;
  title: string;
  description?: string;
  channelId?: string;
  channelTitle: string;
  thumbnails: YoutubeThumbnails;
}

export interface YoutubeVideoStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string;
  favoriteCount?: string;
}

export interface YoutubeVideoContentDetails {
  duration?: string;
  dimension?: string;
  definition?: string;
  caption?: string;
}

export interface YoutubeVideoItemResource {
  id: string;
  snippet?: YoutubeVideoSnippet;
  statistics?: YoutubeVideoStatistics;
  contentDetails?: YoutubeVideoContentDetails;
}

/** /playlistItems resource (subset). */
export interface YoutubePlaylistItemContentDetails {
  videoId: string;
  videoPublishedAt?: string;
}

export interface YoutubePlaylistItemResource {
  id?: string;
  snippet: YoutubeVideoSnippet;
  contentDetails: YoutubePlaylistItemContentDetails;
}

/** Generic list-response wrapper used by all endpoints. */
export interface YoutubeApiListResponse<T> {
  kind?: string;
  etag?: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo?: {
    totalResults?: number;
    resultsPerPage?: number;
  };
  items?: T[];
}

export type YoutubeSearchResponse = YoutubeApiListResponse<YoutubeSearchResultItem>;
export type YoutubeChannelListResponse = YoutubeApiListResponse<YoutubeChannelItem>;
export type YoutubeVideoListResponse = YoutubeApiListResponse<YoutubeVideoItemResource>;
export type YoutubePlaylistItemsResponse = YoutubeApiListResponse<YoutubePlaylistItemResource>;
