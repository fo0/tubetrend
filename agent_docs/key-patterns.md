# Key Patterns — Detail

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 3. CLAUDE.md keeps the top-5 lookup index; the full descriptions live here.

## Type-Safe Event Bus

Cross-component communication without prop drilling. Events are typed via an `EventMap` interface, which gives compile-time safety on both emit and subscribe. Dual emission: a custom `EventBus` class plus a native DOM `CustomEvent`, so non-React listeners can hook in too. The React hook `useEventBus(event, callback)` handles subscribe/unsubscribe lifecycle.

**Location:** `src/shared/lib/eventBus.ts`

**Events:** `favorites-changed`, `favorites-cache-updated`, `quota-updated`, `hidden-highlights-changed`, `favorite-refresh-start`, `favorite-refresh-end`, `toggle-shortcuts-hint`

Raw `window.addEventListener` is reserved for **native** browser events (`storage`, `scroll`, `mousemove`). Every `EventMap` key goes through `eventBus.on()` / `useEventBus()` — that is what keeps the emit/subscribe pair type-checked.

## Type-Safe Storage Adapter

All `localStorage` access goes through the `StorageAdapter` interface. `safeRead<T>(key, fallback)` / `safeWrite<T>(key, value)` are always wrapped in try-catch, so a quota error or a disabled-storage browser never throws into the UI. JSON serialization is automatic. SSR-safe (guards `window`).

**Location:** `src/shared/lib/storage.ts`

## Feature Module Pattern

Each `src/features/` module exposes `services/` (pure business logic), `hooks/` (React-state composition), `types.ts`, and an `index.ts` barrel export. Cross-feature imports go through the barrel only — never deep-import another feature's internals.

**Location:** `src/features/*/`

## Theme System

`ThemeProvider` with three modes (`light` / `dark` / `system`). System mode listens to `matchMedia('prefers-color-scheme: dark')`. FOUC prevention via an inline script in `index.html` that sets the class before first paint (extracted to an external `theme-init.js` for the CSP-compliant Chrome Extension build). Styling uses Tailwind `dark:` variants.

**Location:** `src/providers/ThemeProvider.tsx`

## Trend Scoring (Pure Math)

No external AI. Two weighted components:

- **Velocity score (70%):** `log10(viewsPerHour + 1) * 20`, capped at 100
- **Engagement score (30%):** `engagementRate * 10`, capped at 100

Trend labels are assigned by threshold: Viral / Hot / Rising / Steady / Slow.

**Location:** `src/features/videos/services/trendAnalysisService.ts`

## Quota Tracking

Client-side YouTube Data API v3 usage accounting. Per-endpoint cost: `search` = 100 units, `videos`/`channels` = 1 unit. Daily reset at midnight Pacific Time. Emits `quota-updated` after each call so the UI badge stays live.

**Location:** `src/features/youtube/services/quotaService.ts`

## Result Filtering & Caps (tunable constants)

Three numeric constants silently shape every result set. They have no UI, no env var and no entry in
`.env.example` — they are compile-time defaults, and changing one changes user-visible output and
quota burn. Documented here because a search that "loses" videos is otherwise unexplainable.

| Constant                            | Default | Declared in                      | Effect                                                                                                                                        |
| ----------------------------------- | ------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `SHORTS_DURATION_THRESHOLD_SECONDS` | `180`   | `shared/constants/config.ts`     | Videos **shorter than 3 minutes** are treated as Shorts and dropped from keyword _and_ channel results. Unknown/unparseable duration is kept. |
| `AUTO_LIMIT_KEYWORD`                | `250`   | `shared/constants/maxResults.ts` | Cap the "Auto" max-results option (`value: -1`) resolves to for a **keyword** search.                                                         |
| `AUTO_LIMIT_CHANNEL`                | `500`   | `shared/constants/maxResults.ts` | Cap "Auto" resolves to for a **channel** search — higher because `playlistItems` paging costs 1 unit per page, not 100.                       |

Notes that bite:

- **The Shorts filter runs _after_ the API call**, so filtered-out videos are already paid for in
  quota. `channelService` compensates by over-fetching (`Math.max(effectiveMax, 50)`) and slicing to
  the requested count only after filtering — otherwise a Shorts-heavy channel returns short.
- **"No limit" (`value: 0`) is not symmetric.** `searchService` turns it into `5000`;
  `channelService` turns it into `0`, which means "no cap" there. Read the `effectiveMax` line in
  each service before assuming a shared meaning.
- Raising `AUTO_LIMIT_KEYWORD` multiplies `search` calls at **100 units each** — the fastest way to
  burn the 10,000-unit daily quota.

**Location:** `src/shared/constants/config.ts`, `src/shared/constants/maxResults.ts`,
`src/features/youtube/services/{searchService,channelService}.ts`

## Results Presentation (Analyser)

The analyser renders the full result set at once — there is no pagination and no `IntersectionObserver`. Presentation is driven by two persisted preferences:

- **`sortMode`** (`"trend" | "views"`) — sorts by `trendingScore` or raw view count. Persisted under `tt.analyser.sortMode`.
- **`topN`** (`3 | 6`) — splits the sorted list into a highlighted podium (`topVideos = sorted.slice(0, topN)`) and the remainder (`otherVideos`). Persisted under `tt.analyser.topN`.

Both are read from `localStorage` in the `useState` initializer and written back in an effect, so the layout survives a reload. The result set itself is restored from `tt.analyser.lastResult.v1` (24 h TTL) by `useSearch`.

Export runs client-side over the already-sorted list via `buildResultsCsv` / `buildResultsJson` (+ their `*Filename` helpers), handed to `downloadBlob`. No API call, no quota cost.

**Location:** `src/app/routes/AnalyserPage.tsx`, `src/features/videos/services/exportResults.ts`

## Error Handling

- Try-catch with fallback values for all storage access (see Storage Adapter above).
- Custom `YouTubeApiError` class for API-layer errors, carrying the HTTP status and the API reason code.
- `ErrorBoundary` (the project's only class component) catches fatal React render crashes.

**Location:** `src/shared/lib/storage.ts`, `src/features/youtube/`, `src/shared/components/`
