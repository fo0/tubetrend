# CLAUDE.md - Project Guide

## Documentation Workflow (MANDATORY)

### 1. Read documentation FIRST
- **Always** read these files before starting work:
  1. `CLAUDE.md` (this file) - Technical details and coding guidelines
  2. `README.md` - Project overview and user guide
  3. `.env.example` - Environment variable configuration
  4. `.junie/guidelines.md` - Additional agent guidelines (JetBrains Junie)

### 2. Update documentation AFTER every change
After every code change, review and update:

| File | Update when... |
|------|---------------|
| `CLAUDE.md` | New components, config files, patterns, or technical details |
| `README.md` | New features, API endpoints, environment variables for users |
| `BACKLOG.md` | Unfixed review findings (Accepted/Deferred) after code review |
| `.env.example` | New environment variables added |

### 3. Documentation checklist before commit
- [ ] New components/modules documented in project structure?
- [ ] New config files documented in project structure?
- [ ] New environment variables/configuration in all relevant files?
- [ ] README.md updated with new features?
- [ ] New coding patterns documented?

---

## AUTOMATIC CODE-REVIEW (after EVERY implementation)

> **STOP! This is the MOST IMPORTANT rule in this entire document.**
> After EVERY implementation, a complete code review is performed AUTOMATICALLY.
> The user does NOT need to request this — it is a fixed part of every loop.
> You must NEVER commit without completing this review first.

### TODO Structure (MANDATORY!)

Your TODO list MUST contain these steps for EVERY task:

```
1. Implement feature
2. Update documentation (if needed)
3. Run automated checks (see Step A)
4. AUTOMATIC CODE-REVIEW (see Step B)                      ← SEPARATE TODO!
5. Auto-fix findings (Critical/High immediately, Medium by judgment)
6. Unfixed findings (Accepted/Deferred) → BACKLOG.md       ← SEPARATE TODO!
7. UI review (if UI was changed)                            ← SEPARATE TODO!
8. Commit & Push
```

**Rules:**
- Step 3 and Step 4 are SEPARATE TODOs — NEVER combine them
- Step 4 is **automatically triggered** after every implementation — no user request needed
- When issues are found: **Fix immediately** → re-run checks → repeat review until clean

### Step A: Automated Checks

```bash
npm ci                   # ALWAYS first — install dependencies
npx tsc --noEmit         # TypeScript type checking must pass
npm run build            # Production build must succeed
```

> **Note:** No linter or test framework is configured yet. When added, extend this section:
> - Lint: `npm run lint` (once ESLint is configured)
> - Test: `npm test` (once Vitest is configured — see [Testing](#testing))

### Step B: Code Review — Full Checklist (THE CRITICAL STEP!)

**This step runs AUTOMATICALLY after every implementation. No user prompt required.**

**You MUST ACTUALLY PERFORM these actions — not just check them off:**

1. **RE-READ EVERY changed file** — Use the Read tool, read COMPLETELY again. Not from memory!
2. Walk through every review category below and evaluate each changed file against it.
3. **Fix all issues immediately** — do not just list them.
4. Present the results as a **review table** (format below).

#### Review Categories

| # | Category | What to check |
|---|----------|---------------|
| 1 | **Modern Coding Standards** | Idiomatic React 19 / TypeScript patterns, current best practices, no deprecated APIs, clean imports with path aliases, proper naming conventions, DRY, KISS, SRP |
| 2 | **Security** | XSS, injection (SQL/command/template), unsafe dynamic code execution, prototype pollution, CSRF, insecure crypto, hardcoded secrets, improper auth checks, unvalidated input at system boundaries |
| 3 | **Code Smells** | Duplicated code, dead code, overly complex functions (high cyclomatic complexity), god objects/functions, long parameter lists, magic numbers/strings, tight coupling, missing single-responsibility |
| 4 | **Bugs & Logic Errors** | Off-by-one errors, null/undefined access, race conditions, incorrect conditionals, missing error handling at boundaries, wrong operator precedence, async pitfalls, unclosed resources |
| 5 | **Edge Cases** | Empty collections, null/undefined, boundary values (0, -1, MAX), empty strings, concurrent access, missing/malformed input, network failures, timeout handling |
| 6 | **Typing & Type Safety** | Correct types, no unsafe casts without reason, proper generics, exhaustive switch/union/enum handling, return type accuracy, TypeScript strict compliance |
| 7 | **Performance & Optimization** | Unnecessary re-renders/recomputations, missing memoization/caching where beneficial, N+1 queries, unbounded loops/allocations, large imports that could be lazy-loaded, inefficient algorithms |
| 8 | **Readability & Maintainability** | Clear variable/function names, self-documenting code, no confusing abbreviations, consistent style, logical code organization, appropriate comments for non-obvious logic |

#### Mandatory Review Output Format

```
### Code Review Results

| # | Category | Status | Findings | Action |
|---|----------|--------|----------|--------|
| 1 | Modern Coding Standards | ✅ Pass | — | — |
| 2 | Security | ⚠️ Issue | Unvalidated user input in X | Fixed: added validation |
| 3 | Code Smells | ✅ Pass | — | — |
| 4 | Bugs & Logic Errors | ❌ Bug | Off-by-one in loop at Y:42 | Fixed: changed < to <= |
| 5 | Edge Cases | ✅ Pass | — | — |
| 6 | Typing & Type Safety | ✅ Pass | — | — |
| 7 | Performance & Optimization | 💡 Suggestion | Could memoize expensive calc | Deferred → Backlog |
| 8 | Readability & Maintainability | ✅ Pass | — | — |

**Summary:** 8 categories checked | 1 bug fixed | 1 security issue fixed | 1 optimization deferred → Backlog
```

**Status Icons:**
- ✅ **Pass** — No issues found
- ⚠️ **Issue** — Problem found and **fixed**
- ❌ **Bug** — Bug found and **fixed**
- 💡 **Suggestion** — Optional improvement (applied or deferred with reasoning)

### Step C: Auto-Fixing Rules

- **Critical + High**: ALWAYS fix immediately, no asking
- **Medium**: Fix by judgment — when in doubt, fix
- **Low**: Only fix if effort is trivial
- **Info/Suggestion**: No fix required, defer to Backlog if valuable

After fixing: If changes were made, repeat Step A (checks), then re-review only affected categories.

### Step D: UI Review (for UI changes)

If UI code was changed:
- **Responsive**: Different screen sizes considered?
- **Accessibility**: Relevant attributes present?
- **Consistency**: Matches existing Tailwind CSS design system (dark mode support, Inter font)?

### Step E: Backlog Tracking (BACKLOG.md)

All review findings with status **Accepted** or **Deferred** are entered in `BACKLOG.md` so they are not lost.

> **IMPORTANT:** Backlog items are ONLY worked on upon explicit user request.
> The backlog serves exclusively as memory — never work through it independently!

**BACKLOG.md Format:**

```markdown
# Backlog

Open review findings that were not immediately fixed.

**Only work on these upon explicit request!**

## Open

| # | Date | Category | File:Line | Finding | Severity | Status | Source |
|---|------|----------|-----------|---------|----------|--------|--------|
| 1 | 2026-02-12 | Standards | foo.tsx:15 | ... | Medium | Deferred | Review from Task XY |

## Done

| # | Date | Done at | Category | File:Line | Finding | Severity |
|---|------|---------|----------|-----------|---------|----------|
```

**Rules:**
1. New entries go under `## Open`
2. **Date** = date of the review where the finding occurred
3. **Source** = short description of the task/feature where the finding occurred
4. **No duplicates** — check if finding already exists before adding
5. **Done items** move from `## Open` to `## Done` (with "Done at" date)
6. **Clean up backlog** — if a file/line changed through other modifications, update or remove finding if no longer relevant

### Commit Gate

**Only when ALL review steps (A, B, optionally C+D) are completed and all ⚠️/❌ findings are fixed → commit.**

If issues are found: Fix → re-run checks → re-review affected categories → then commit.

---

## Refactoring Guidelines

### When to Refactor

Evaluate refactoring opportunities when the codebase has grown significantly. This does NOT happen automatically — only when:
- The user explicitly requests a refactoring pass
- During code review, a pattern of repeated code smells emerges across multiple files
- A new feature implementation is significantly harder than expected due to code structure

### Refactoring Principles

1. **No over-engineering** — Only refactor what provides measurable benefit (readability, maintainability, performance)
2. **AI-optimized code structure** — This code is primarily maintained by AI agents, therefore:
   - Prefer explicit over implicit patterns (easier for AI to parse and modify)
   - Keep files focused and single-responsibility (AI works better with smaller, clear files)
   - Use descriptive naming over clever abstractions
   - Maintain consistent patterns across similar components (AI can pattern-match)
   - Document non-obvious decisions inline (AI lacks project history context)
3. **Follow framework idioms** — Use current React 19 + TypeScript best practices, not custom abstractions
4. **Incremental refactoring** — Break into small, reviewable chunks. Each chunk must pass the full review cycle.
5. **Extract, don't abstract** — Prefer extracting into focused files over creating abstract base classes or complex generics

### Refactoring Notes

- **`FavoriteRow.tsx` (~636 lines)** — God component handling data fetching, caching, UI menus, state management, and event handling. Should be split into sub-components (`FavoriteRowHeader`, `FavoriteRowMenus`, `FavoriteRowVideos`) and a custom `useFavoriteRowData()` hook.
- **Duplicate event listener patterns** — Multiple components use raw `window.addEventListener('favorites-changed', ...)` instead of the type-safe `useEventBus()` hook from `eventBus.ts`. Should be migrated consistently.
- **Hard-coded German strings in API client** — `youtubeApiClient.ts` contains German error messages (`'YouTube API Key fehlt.'`, `'Der eingegebene API Key ist ungültig.'`) instead of i18n translation keys. Should use `t()` or throw error codes that the UI translates.
- **Magic numbers in trend analysis** — `trendAnalysisService.ts` uses hardcoded thresholds (e.g., `viewsPerHour > 10000`, `engagementRate > 10`, `ageInHours < 2`) and scoring weights (`0.7`, `0.3`). Should be extracted to named constants.
- **Module-level API key state** — `youtubeApiClient.ts` stores the API key both in a module-level variable and localStorage, risking sync issues. Could be simplified to read from storage directly.
- **No test coverage** — No test setup exists. Critical services (`favoritesService`, `trendAnalysisService`, `quotaService`, `eventBus`) would benefit from unit tests.
- **Complex `useEffect` chains in FavoriteRow** — Multiple interdependent `useEffect` hooks with complex dependency arrays and refs for synchronization. Should be extracted into a custom hook.

---

## Project Overview

**TubeTrend** is a YouTube trend analysis tool built with Vite + React 19 + TypeScript. It's a single-page application that analyzes video performance, tracks favorites, and discovers trending content across YouTube channels.

Key capabilities:
- **Dashboard** — Track favorite channels and keywords with cached video data and auto-surfaced highlights
- **Analyser** — Search and analyze videos with mathematical trend scoring (view velocity + engagement rate)
- **Multi-language** — 13 languages with browser auto-detection (full translations: en, de)
- **Dark Mode** — System-aware with manual toggle and FOUC prevention
- **API Quota Tracking** — Monitor and visualize YouTube Data API v3 usage

Repository: `https://github.com/fo0/tubetrend`

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 22+ |
| Language | TypeScript | ~5.8.2 |
| UI Framework | React | ^19.2.0 |
| Build Tool | Vite | ^6.2.0 |
| Vite Plugin | @vitejs/plugin-react | ^5.0.0 |
| CSS Framework | Tailwind CSS | ^3.4 (PostCSS bundled) |
| CSS Tooling | PostCSS + Autoprefixer | ^8.5 / ^10.4 |
| Font | @fontsource/inter | ^5.2 (locally bundled) |
| Icons | Lucide React | ^0.554.0 |
| i18n | i18next + react-i18next | ^23.15.1 / ^15.5.2 |
| Language Detection | i18next-browser-languagedetector | ^7.2.1 |
| Package Manager | npm | (lockfile v3) |
| Electron Integration | vite-plugin-electron (conditional) | ^0.28.8 |
| Desktop App | Electron | ^35.0.0 |
| Desktop Packaging | electron-builder | ^26.0.0 |
| Container | Docker (multi-stage) | Node 22-alpine + Nginx alpine |
| CI/CD | GitHub Actions | typecheck, build, lint, security audit, electron release, chromebook release |

## Project Structure

```
tubetrend/
├── src/
│   ├── app/                          # Application shell & routing
│   │   ├── App.tsx                   # Main app component (state, page switching, modals)
│   │   └── routes/                   # Page-level components
│   │       ├── AnalyserPage.tsx      # Video search & analysis page
│   │       ├── DashboardPage.tsx     # Favorites dashboard page
│   │       └── index.ts             # Barrel export
│   ├── features/                     # Feature modules (domain logic)
│   │   ├── dashboard/                # Dashboard feature
│   │   │   ├── hooks/useDashboard.ts # useFavorites, useDashboardSort, useHighlights hooks
│   │   │   ├── services/             # dashboardBackupService, dashboardTopVideos, hiddenHighlightsService
│   │   │   └── index.ts
│   │   ├── favorites/                # Favorites management
│   │   │   ├── services/favoritesService.ts  # CRUD + caching for favorites
│   │   │   ├── types.ts             # FavoriteConfig, FavoriteCacheEntry types
│   │   │   └── index.ts
│   │   ├── search/                   # Search functionality
│   │   │   ├── hooks/useSearch.ts    # Search state & API orchestration
│   │   │   └── index.ts
│   │   ├── videos/                   # Video analysis
│   │   │   ├── services/trendAnalysisService.ts  # Trend scoring (pure math)
│   │   │   ├── types.ts             # VideoData, TrendInfo types
│   │   │   └── index.ts
│   │   └── youtube/                  # YouTube API integration
│   │       ├── services/
│   │       │   ├── youtubeApiClient.ts  # Core API wrapper with quota tracking
│   │       │   ├── channelService.ts    # Channel lookup & resolution
│   │       │   ├── searchService.ts     # Video search with pagination
│   │       │   └── quotaService.ts      # API quota tracking & history
│   │       └── index.ts
│   ├── shared/                       # Shared code across features
│   │   ├── components/
│   │   │   ├── feedback/             # ErrorBoundary
│   │   │   ├── layout/              # Header, Footer
│   │   │   └── ui/                  # 13+ UI components (modals, cards, tables, controls)
│   │   ├── constants/                # STORAGE_KEYS, CACHE_TTL, timeFrames, maxResults
│   │   ├── hooks/                    # useDebounce, useEventListener, useLocalStorage
│   │   ├── lib/                      # Utilities: storage, eventBus, formatters, dateUtils
│   │   └── types/                    # Shared types: api.ts, common.ts
│   ├── providers/                    # React context providers
│   │   ├── ThemeProvider.tsx         # Light/dark/system theme with localStorage persistence
│   │   └── index.ts
│   ├── i18n/                         # Internationalization
│   │   ├── config.ts                # i18next init with language detection
│   │   └── locales/                 # en.json, de.json
│   ├── styles/                       # Global CSS (themes, scrollbars, animations)
│   └── main.tsx                      # React entry point (StrictMode, ThemeProvider, ErrorBoundary)
├── electron/                         # Electron desktop app wrapper (compiled by vite-plugin-electron)
│   ├── main.ts                      # Main process: BrowserWindow, app lifecycle
│   └── preload.ts                   # Preload script: contextBridge API exposure
├── electron-builder.json            # Electron packaging config (Win/Mac/Linux)
├── electron-builder.chromebook.json # Chromebook .deb config (--no-sandbox, Ozone auto-detect)
├── build/                            # Build resources
│   └── icon.png                     # App icon (512x512, generated via npm run electron:icon)
├── scripts/                          # Build/utility scripts
│   └── generate-icon.mjs           # Generates app icon PNG from code
├── .github/                          # GitHub configuration
│   ├── workflows/                    # CI: pr-checks.yml, docker-publish.yml, electron-release.yml
│   ├── ISSUE_TEMPLATE/              # Bug report & feature request templates
│   └── pull_request_template.md
├── docs/                             # Documentation images
├── .junie/guidelines.md              # JetBrains Junie agent guidelines
├── index.html                        # Vite entry: theme FOUC prevention script
├── index.css                         # Root-level global CSS
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript strict config with path aliases
├── tailwind.config.js                # Tailwind CSS v3 config (darkMode: class, Inter font)
├── postcss.config.js                 # PostCSS config (Tailwind + Autoprefixer)
├── vite.config.ts                    # Vite config: aliases, build info, dev server (port 3000), conditional vite-plugin-electron
├── Dockerfile                        # Multi-stage: Node builder → Nginx runner
├── docker-compose.yml                # ghcr.io/fo0/tubetrend:latest on port 8889
├── metadata.json                     # App metadata (name, description)
├── .env.example                      # Environment variable template
├── CLAUDE.md                         # This file
├── README.md                         # User-facing project documentation
├── BACKLOG.md                        # Deferred review findings
├── CONTRIBUTING.md                   # Contribution guidelines
├── CODE_OF_CONDUCT.md                # Community code of conduct
└── LICENSE                           # MIT License
```

## Commands

```bash
# Development
npm install              # Install dependencies (local dev)
npm ci                   # Install from lockfile (CI/Docker, preferred)
npm run dev              # Start Vite dev server at http://localhost:3000
npm run build            # Production build to dist/
npm run preview          # Build + preview production at http://localhost:4173

# Type checking
npm run typecheck        # TypeScript type check (tsc --noEmit)

# Electron (Desktop App) — requires ELECTRON=true env var (set automatically by these scripts)
npm run electron:dev     # Start Vite dev server with Electron (auto-launches window)
npm run electron:preview # Build + run Electron with production build
npm run electron:dist    # Build + package as portable app (output: release/)
npm run build:chromebook # Build Chromebook .deb (output: release-chromebook/)
npm run build:win        # Build + package Windows portable directly

# Docker
docker-compose up        # Run production image at http://localhost:8889
docker run -d -p 8889:80 ghcr.io/fo0/tubetrend:latest  # Run directly
```

## External Interfaces

### YouTube Data API v3

The app communicates exclusively with the YouTube Data API v3. All calls go through `youtubeApiClient.ts`.

| Endpoint | API Cost | Description |
|----------|----------|-------------|
| `search` | 100 units | Search videos by keyword or channel, supports pagination |
| `videos` | 1 unit | Fetch video details (statistics, snippet, contentDetails) |
| `channels` | 1 unit | Resolve channel ID from handle/URL/name |

**API Key:** User-provided via modal, stored in `localStorage` key `yt_api_key`. Daily quota limit: 10,000 units (free tier).

### Client-Side Storage (localStorage)

| Key | Purpose | Used by |
|-----|---------|---------|
| `yt_api_key` | YouTube API key | `youtubeApiClient.ts` |
| `yt_channel_cache` | Channel ID ↔ name resolution cache | `channelService.ts` |
| `yt_autocomplete_cache_v2` | Autocomplete suggestions cache (TTL: 5 min) | `channelService.ts` |
| `tt.favorites.v1` | Favorites list (channels + keywords) | `favoritesService.ts` |
| `tt.favorites.cache.v1` | Cached video data per favorite (TTL: 2 hours) | `favoritesService.ts` |
| `tt.dashboard.sort.v1` | Dashboard sort field | `useDashboard.ts` |
| `tt.dashboard.sortOrder.v1` | Dashboard sort order (asc/desc) | `useDashboard.ts` |
| `tt.dashboard.hiddenHighlights.v1` | Hidden highlight video IDs | `hiddenHighlightsService.ts` |
| `tt.search.timeframe` | Search timeframe preference | `InputSection.tsx` |
| `tt.search.maxResults` | Search max results preference | `InputSection.tsx` |
| `tt.search.history` | Search input history | `InputSection.tsx` |
| `tt.lang.explicit` | Explicit language selection | `i18n/config.ts` |
| `tt.theme.explicit` | Theme preference (light/dark/system) | `ThemeProvider.tsx` |
| `tt.quota.tracking` | API quota usage tracking & history | `quotaService.ts` |

## Key Patterns

### Type-Safe Event Bus

Cross-component communication without prop drilling. Defined in `src/shared/lib/eventBus.ts`.

- Events are typed via `EventMap` interface — compile-time safety for event names and payloads
- Dual emission: custom `EventBus` class + native DOM `CustomEvent` (backward compat)
- Auto-unsubscribe: `eventBus.on()` returns cleanup function
- React hook: `useEventBus(event, callback)` handles lifecycle automatically

Events: `favorites-changed`, `favorites-cache-updated`, `quota-updated`, `hidden-highlights-changed`, `favorite-refresh-start`, `favorite-refresh-end`

### Type-Safe Storage Adapter

All localStorage access goes through `src/shared/lib/storage.ts`:
- `StorageAdapter` interface with `get<T>`, `set<T>`, `remove`, `clear`
- `safeRead<T>(key, fallback)` / `safeWrite<T>(key, value)` — always wrapped in try-catch
- Automatic JSON serialization/deserialization
- SSR-safe (`typeof window` guard)

### Feature Module Pattern

Each feature in `src/features/` follows a consistent structure:
- `services/` — Business logic and data access (pure functions, no React dependencies)
- `hooks/` — React hooks that compose services with React state
- `types.ts` — Domain types
- `index.ts` — Barrel export (public API of the feature)

### Theme System

`ThemeProvider` context in `src/providers/ThemeProvider.tsx`:
- Three modes: `light`, `dark`, `system`
- System preference detection via `matchMedia('prefers-color-scheme: dark')`
- FOUC prevention: inline script in `index.html` applies theme class before React mounts
- Tailwind `dark:` variant classes throughout all components

### Trend Scoring (Pure Math)

`trendAnalysisService.ts` calculates trend scores without external AI:
- **Velocity score** (70% weight): `log10(viewsPerHour + 1) * 20`, capped at 100
- **Engagement score** (30% weight): `engagementRate * 10`, capped at 100
- **Trend label**: Based on thresholds (Viral, Hot, Rising, Steady, Slow)
- Factors in video age, freshness bonuses, and engagement ratios

### Quota Tracking

`quotaService.ts` tracks YouTube API usage client-side:
- Per-endpoint cost accounting (search: 100, videos/channels: 1)
- Daily reset based on Pacific Time (YouTube quota reset timezone)
- History entries with timestamp, endpoint, cost, and call context
- `quota-updated` event emitted after each API call
- Exhausted state detection from API 403 responses

## Coding Conventions

- **Language**: UI text uses i18n translation keys (`t('key')`). Code comments and documentation in English. Some legacy German strings exist in API error messages (see Refactoring Notes).
- **Naming**: PascalCase for components and types, camelCase for functions/variables/hooks, kebab-case for CSS classes
- **Files**: PascalCase for React components (`ThemeProvider.tsx`), camelCase for services/hooks/utils (`favoritesService.ts`, `useSearch.ts`)
- **Imports**: Always use path aliases (`@features/`, `@shared/`, `@providers/`, `@i18n/`). Use `import type` for type-only imports.
- **Exports**: Feature modules export via barrel files (`index.ts`)
- **Components**: Functional components with hooks. One class component for `ErrorBoundary`.
- **Styling**: Tailwind CSS utility classes with `dark:` variants, processed via PostCSS at build time. No CSS modules or styled-components.
- **State**: Distributed via custom hooks + localStorage. React Context only for theme. No external state library.
- **Error handling**: Try-catch with fallback values for storage. Custom `YouTubeApiError` class for API errors. `ErrorBoundary` for fatal React crashes.

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:

| Alias | Maps to |
|-------|---------|
| `@/*` | `./` (project root) |
| `@features/*` | `./src/features/*` |
| `@shared/*` | `./src/shared/*` |
| `@providers/*` | `./src/providers/*` |
| `@i18n/*` | `./src/i18n/*` |

## Environment Variables

Vite exposes only `VITE_` prefixed variables to the client. Copy `.env.example` → `.env.local`.

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_DEFAULT_SEARCH` | Default search input value on app load | Dev: `TEDx`, Prod: `""` |
| `VITE_GIT_COMMIT_HASH` | Full git commit hash (Docker build arg) | Auto-detected from git |
| `VITE_GIT_BRANCH` | Git branch name (Docker build arg) | Auto-detected from git |

Restart dev server after changing env vars.

## Testing

**Current state:** No test framework configured. No test script in `package.json`.

**Recommended setup (Vitest):**

```bash
npm install -D vitest
# Add to package.json scripts: "test": "vitest run"
npm test
```

**Conventions:**
- Place tests near source files: `foo.test.ts` next to `foo.ts`
- ESM project — use ESM imports in tests
- Avoid network calls in unit tests (mock YouTube API layer)
- Priority test targets: `favoritesService`, `trendAnalysisService`, `quotaService`, `eventBus`, `storage`

## Development Notes

### Architecture Decisions
- **No router library** — Simple state-based page switching (`activePage` state in `App.tsx`). Sufficient for a 2-page app.
- **Tailwind via PostCSS** — Build-time processing via PostCSS plugin. Enables tree-shaking, offline capability, and custom font bundling. Inter font loaded via `@fontsource/inter`.
- **No external state library** — Distributed hooks + event bus. Works well given the app's complexity level.
- **Trend scoring is pure math** — `trendAnalysisService.ts` does not call any external AI API. Comment in code confirms this.
- **Electron as optional wrapper** — The `electron/` directory wraps the same `dist/` output in a desktop app. Zero changes to `src/` code. `vite-plugin-electron` is conditionally loaded only when `ELECTRON=true` env var is set, keeping the web app completely unaffected. The web/Docker deployment is the primary delivery method; Electron is an alternative distribution channel.

### TypeScript Configuration Quirks
- `moduleResolution: "bundler"` + `allowImportingTsExtensions: true` (Vite-style)
- If adding tooling that assumes Node-style resolution (older Jest, ts-node), additional config may be needed
- `noUnusedLocals` and `noUnusedParameters` enabled — unused variables will cause type errors

### i18n Details
- Full translations: `en`, `de`
- Supported with fallback to `en`: `fr`, `es`, `it`, `pt`, `nl`, `pl`, `tr`, `ru`, `ja`, `zh`, `ko`
- Detection order: `localStorage` → `navigator` → `htmlTag`
- Translation namespace: `common` (single namespace)

### Docker
- Multi-stage build: `node:22-alpine` (builder) → `nginx:alpine` (runner)
- Git info passed as build args (`GIT_COMMIT_HASH`, `GIT_BRANCH`)
- Published image: `ghcr.io/fo0/tubetrend:latest`
- Port mapping: container `80` → host `8889`

### Electron
- **Conditionally integrated via vite-plugin-electron** — The plugin is only active when `ELECTRON=true` env var is set. All `electron:*` npm scripts set this automatically. Web-only builds (`npm run dev`, `npm run build`) are completely unaffected.
- **Two separate build modes** — `npm run build` produces only `dist/` (web). `ELECTRON=true npm run build` additionally compiles `electron/main.ts` and `electron/preload.ts` to `dist-electron/`. No separate `tsconfig.json` needed.
- **No renderer plugin needed** — `vite-plugin-electron-renderer` is NOT used because `contextIsolation: true` and `nodeIntegration: false` — the renderer is a standard web page.
- **Security defaults** — `nodeIntegration: false`, `contextIsolation: true`
- **External links** — Opened in system browser via `shell.openExternal()`, not in Electron window
- **Dev mode** — `npm run electron:dev` sets `ELECTRON=true` which activates `vite-plugin-electron`; the plugin sets `VITE_DEV_SERVER_URL` env var; Electron loads the dev server URL in dev, `dist/index.html` in production
- **Packaging** — `electron-builder` creates platform-specific installers (Windows NSIS/portable, macOS DMG, Linux AppImage) in `release/`. Config in `electron-builder.json` references `dist/**/*` + `dist-electron/**/*`.
- **Chromebook release** — A separate `electron-builder.chromebook.json` builds Chromebook-optimized `.deb` packages into `release-chromebook/`. It adds `--no-sandbox` (required for Crostini's container sandbox) and `--ozone-platform-hint=auto` (Wayland/X11 auto-detection) via `executableArgs` in the `.desktop` file. Builds both x64 and arm64 architectures (ASUS Chromebooks use Intel and MediaTek/ARM chips). Artifact naming: `TubeTrend-<version>-Chromebook-<arch>.deb`. Local build: `npm run build:chromebook`.
- **App icon** — Generated via `npm run electron:icon` (`scripts/generate-icon.mjs`), outputs `build/icon.png` (512x512)
- **Requires internet** — YouTube Data API calls require internet; Tailwind CSS and fonts are bundled locally
- **CI/CD** — `electron-release.yml` workflow builds all platforms (Win/Mac/Linux) and Chromebook `.deb` (x64 + arm64) in a single pipeline. Triggers on tag pushes (`v*`), main/master branch pushes, and manual dispatch. Creates GitHub Release with `--generate-release-notes`. Chromebook builds run in parallel but are non-blocking — if they fail, the main release still proceeds.

### Build Info
`vite.config.ts` injects `__BUILD_INFO__` global with `version` (date-based, format `YYYYMMDD-HHMM`), `commitHash`, `branch`, `buildDate`. Available at runtime via the global variable.
