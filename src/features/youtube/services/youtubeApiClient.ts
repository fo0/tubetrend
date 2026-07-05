import { API_COSTS, STORAGE_KEYS } from "@/src/shared/constants";
import type { QuotaCallContext } from "@/src/shared/types";
import { quotaService } from "./quotaService";

type Endpoint = keyof typeof API_COSTS;

// Single source of truth: localStorage. No module-level mirror to avoid drift
// when the key is changed in another tab/window or by other code paths.
export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    // Reset quota statistics when API key is deleted
    quotaService.reset();
  }
}

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || "";
}

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly isQuotaError: boolean = false,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

export async function fetchFromApi<T>(
  endpoint: Endpoint,
  params: Record<string, string>,
  context?: QuotaCallContext,
  signal?: AbortSignal,
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new YouTubeApiError("YouTube API key missing.", 401);
  }

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.searchParams.append("key", apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const cost = API_COSTS[endpoint];
  const response = await fetch(url.toString(), { signal });
  // The YouTube API always answers with JSON; guard against non-JSON bodies
  // (proxy/HTML error pages, empty responses) so a parse failure surfaces as a
  // typed YouTubeApiError instead of a cryptic SyntaxError leaking to the UI.
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (data?.error) {
      const msg: string = typeof data.error.message === "string" ? data.error.message : "";
      const lower = msg.toLowerCase();

      if (lower.includes("api key not valid")) {
        throw new YouTubeApiError("The provided API key is invalid.", 403);
      }

      if (lower.includes("quota")) {
        quotaService.markExhausted();
        throw new YouTubeApiError("YouTube API quota exceeded.", 403, true);
      }

      // 4xx errors still cost quota
      if (response.status >= 400 && response.status < 500) {
        quotaService.track(cost, endpoint, context);
      }

      throw new YouTubeApiError(
        msg ? `YouTube API error: ${msg}` : `YouTube API error (${response.status})`,
        response.status,
      );
    }

    if (response.status >= 400 && response.status < 500) {
      quotaService.track(cost, endpoint, context);
    }

    throw new YouTubeApiError(`HTTP error: ${response.status}`, response.status);
  }

  if (data === null) {
    throw new YouTubeApiError("Invalid response from YouTube API.", response.status);
  }

  // Track successful request
  quotaService.track(cost, endpoint, context);

  return data as T;
}
