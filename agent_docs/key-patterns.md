# Key Patterns — Detail

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 3. CLAUDE.md keeps the top-5 lookup index; the full descriptions live here.

## Type-Safe Event Bus

Cross-component communication without prop drilling. Events are typed via an `EventMap` interface, which gives compile-time safety on both emit and subscribe. Dual emission: a custom `EventBus` class plus a native DOM `CustomEvent`, so non-React listeners can hook in too. The React hook `useEventBus(event, callback)` handles subscribe/unsubscribe lifecycle.

**Location:** `src/shared/lib/eventBus.ts`

**Events:** `favorites-changed`, `favorites-cache-updated`, `quota-updated`, `hidden-highlights-changed`, `favorite-refresh-start`, `favorite-refresh-end`

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

## Infinite Scroll

24 videos per chunk. An `IntersectionObserver` triggers the next chunk 200px from the bottom. The display count resets whenever the search query or a filter changes. UI strings are German ("Schiffe" → here: "Videos", "Alle X Videos geladen").

**Location:** `src/app/routes/AnalyserPage.tsx`

## Error Handling

- Try-catch with fallback values for all storage access (see Storage Adapter above).
- Custom `YouTubeApiError` class for API-layer errors, carrying the HTTP status and the API reason code.
- `ErrorBoundary` (the project's only class component) catches fatal React render crashes.

**Location:** `src/shared/lib/storage.ts`, `src/features/youtube/`, `src/shared/components/`
