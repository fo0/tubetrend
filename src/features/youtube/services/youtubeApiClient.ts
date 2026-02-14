import {API_COSTS, STORAGE_KEYS} from '@/src/shared/constants';
import type {QuotaCallContext} from '@/src/shared/types';
import {quotaService} from './quotaService';

type Endpoint = keyof typeof API_COSTS;

// Module-level API key storage
let API_KEY = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.API_KEY) || '' : '';

export function setApiKey(key: string): void {
  API_KEY = key;
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
      // Reset quota statistics when API key is deleted
      quotaService.reset();
    }
  }
}

export function getApiKey(): string {
  return API_KEY;
}

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly isQuotaError: boolean = false
  ) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

export async function fetchFromApi<T>(
  endpoint: Endpoint,
  params: Record<string, string>,
  context?: QuotaCallContext
): Promise<T> {
  if (!API_KEY) {
    throw new YouTubeApiError('YouTube API Key fehlt.', 401);
  }

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.searchParams.append('key', API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const cost = API_COSTS[endpoint];
  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    if (data.error) {
      const msg = data.error.message;

      if (msg.includes('API key not valid')) {
        throw new YouTubeApiError('Der eingegebene API Key ist ungültig.', 403);
      }

      if (msg.includes('quota')) {
        quotaService.markExhausted();
        throw new YouTubeApiError('YouTube API Quota überschritten.', 403, true);
      }

      // 4xx errors still cost quota
      if (response.status >= 400 && response.status < 500) {
        quotaService.track(cost, endpoint, context);
      }

      throw new YouTubeApiError(`YouTube API Fehler: ${msg}`, response.status);
    }

    if (response.status >= 400 && response.status < 500) {
      quotaService.track(cost, endpoint, context);
    }

    throw new YouTubeApiError(`HTTP Fehler: ${response.status}`, response.status);
  }

  // Track successful request
  quotaService.track(cost, endpoint, context);

  return data as T;
}
