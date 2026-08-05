# API Reference

TubeTrend communicates exclusively with the YouTube Data API v3. All calls go through `src/features/youtube/services/youtubeApiClient.ts`.

## YouTube Data API v3

### Endpoints

| Endpoint        | Method | API Cost  | Description                                                                       |
| --------------- | ------ | --------- | --------------------------------------------------------------------------------- |
| `search`        | GET    | 100 units | Search videos by keyword or channel, supports pagination via `pageToken`          |
| `videos`        | GET    | 1 unit    | Fetch video details (statistics, snippet, contentDetails) by video ID             |
| `channels`      | GET    | 1 unit    | Resolve channel ID from handle/URL/name, and read the uploads playlist ID         |
| `playlistItems` | GET    | 1 unit    | Walk a channel's uploads playlist — the 1-unit alternative to a 100-unit `search` |

Costs are declared once in `API_COSTS` (`src/shared/constants/config.ts`); `quotaService.getCost()` is typed as
`keyof typeof API_COSTS`, so adding an endpoint there is what makes it billable.

**Why `playlistItems` matters for quota:** `channelService.ts` resolves a channel (`search` and/or `channels`),
reads its uploads-playlist ID, then pages through that playlist with `playlistItems` (`maxResults: 50`, capped at
`MAX_PAGES = 100`). Each additional page costs **1** unit; paging with `search` would cost **100**. Keep new
channel-listing code on this path — swapping in a paginated `search` silently multiplies quota burn by 100×.

### Authentication

- **API Key**: User-provided via modal dialog in the UI
- **Storage**: `localStorage` key `yt_api_key`
- **Daily quota limit**: 10,000 units (free tier)
- **Quota reset**: Daily at midnight Pacific Time

### Error Handling

- `YouTubeApiError` class in `youtubeApiClient.ts` wraps API errors
- HTTP 403 → quota exhausted detection
- HTTP 400 → invalid API key detection
- All errors are caught and displayed to the user via UI components

### Quota Tracking

- `quotaService.ts` tracks usage client-side
- Per-endpoint cost accounting
- History entries with timestamp, endpoint, cost, and call context
- `quota-updated` event emitted after each API call via event bus

## Client-Side Storage (localStorage)

All storage access goes through the type-safe `StorageAdapter` in `src/shared/lib/storage.ts`.

### YouTube API Keys

| Key                        | Purpose                                     | Used by               |
| -------------------------- | ------------------------------------------- | --------------------- |
| `yt_api_key`               | YouTube API key                             | `youtubeApiClient.ts` |
| `yt_channel_cache`         | Channel ID <-> name resolution cache        | `channelService.ts`   |
| `yt_autocomplete_cache_v2` | Autocomplete suggestions cache (TTL: 5 min) | `channelService.ts`   |

### Favorites & Dashboard

| Key                                | Purpose                                       | Used by                      |
| ---------------------------------- | --------------------------------------------- | ---------------------------- |
| `tt.favorites.v1`                  | Favorites list (channels + keywords)          | `favoritesService.ts`        |
| `tt.favorites.cache.v1`            | Cached video data per favorite (TTL: 2 hours) | `favoritesService.ts`        |
| `tt.dashboard.sort.v1`             | Dashboard sort field                          | `useDashboard.ts`            |
| `tt.dashboard.sortOrder.v1`        | Dashboard sort order (asc/desc)               | `useDashboard.ts`            |
| `tt.dashboard.hiddenHighlights.v1` | Hidden highlight video IDs                    | `hiddenHighlightsService.ts` |

### Search & Preferences

| Key                    | Purpose                                     | Used by             |
| ---------------------- | ------------------------------------------- | ------------------- |
| `tt.search.timeframe`  | Search timeframe preference                 | `InputSection.tsx`  |
| `tt.search.maxResults` | Search max results preference               | `InputSection.tsx`  |
| `tt.search.query`      | Last search input text (restored on reload) | `InputSection.tsx`  |
| `tt.search.history`    | Search input history                        | `InputSection.tsx`  |
| `tt.lang.explicit`     | Explicit language selection                 | `i18n/config.ts`    |
| `tt.theme`             | Theme preference (light/dark/system)        | `ThemeProvider.tsx` |
| `tt.activePage`        | Active page (dashboard/analyser)            | `App.tsx`           |
| `yt_quota_tracking`    | API quota usage tracking & history          | `quotaService.ts`   |

### Analyser

| Key                         | Purpose                                      | Used by              |
| --------------------------- | -------------------------------------------- | -------------------- |
| `tt.analyser.sortMode`      | Analyser result sort mode                    | `AnalyserPage.tsx`   |
| `tt.analyser.topN`          | Analyser top-N result count                  | `AnalyserPage.tsx`   |
| `tt.analyser.tableSort.v1`  | Result-table column sort (field + direction) | `VideoListTable.tsx` |
| `tt.analyser.lastResult.v1` | Cached last analyser result (TTL: 24 hours)  | `useSearch.ts`       |

> The tables above mirror `STORAGE_KEYS` in `src/shared/constants/config.ts` — that constant is the
> single source of truth. Adding a key there means adding a row here; a stale list here is what made
> the old `.junie/` guidelines drift (see `MEMORY.md`).
