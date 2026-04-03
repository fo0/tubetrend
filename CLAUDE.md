# CLAUDE.md — Project Guide

> **Session-Start:** Read `MEMORY.md` first to restore context from previous sessions.
> After every implementation, follow the review process in `agent_docs/review_process.md`.
> Unresolved findings go to `BACKLOG.md` as defined in `agent_docs/backlog_process.md`.
> Session-spanning context and learnings go to `MEMORY.md` as defined in `agent_docs/memory_process.md`.
> **Diagram generation:** When the user requests an architecture diagram, follow `agent_docs/diagram_prompt.md`.
>   Write result to `docs/ARCHITECTURE.mmd` and generate `docs/ARCHITECTURE.svg`.
> **On "done" / "fertig":** Commit uncommitted changes (if any), and if the work relates to a GitHub
>   issue, comment on it (in English) with a summary and close it. Do NOT push unless explicitly asked.
> **On GitHub issue work:** Reference the issue number in commit messages (e.g. `fix: resolve crash #42`).

## AUTOMATIC CODE-REVIEW (after EVERY implementation)

> **STOP! This is the MOST IMPORTANT rule in this entire document.**
> After EVERY implementation, a complete code review is performed AUTOMATICALLY.
> The user does NOT need to request this — it is a fixed part of every loop.
> You must NEVER commit without completing this review first.
>
> **Full process details:** `agent_docs/review_process.md`

## Documentation Rules

After every code change, check and update:

| File | Update when... |
|------|---------------|
| `CLAUDE.md` | New components, configs, patterns, technical details |
| `README.md` | New features, endpoints, env vars for users |
| `BACKLOG.md` | Unfixed review findings (Accepted/Deferred) |
| `MEMORY.md` | Project learnings, context, decisions, gotchas |
| `docs/ARCHITECTURE.mmd` | Structural changes (new modules, changed data flow, new external deps) |
| `.env.example` | New environment variables |

### Size monitoring
If `CLAUDE.md` exceeds ~40,000 characters: extract the largest section into `agent_docs/` and replace with a one-line reference. Do this proactively.

## Refactoring Notes

- **`FavoriteRow.tsx` (~636 lines)** — God component. Split into sub-components + `useFavoriteRowData()` hook.
- **Duplicate event listeners** — Raw `window.addEventListener` instead of `useEventBus()` hook.
- **German strings in API client** — `youtubeApiClient.ts` has hardcoded German error messages.
- **Magic numbers in trend analysis** — `trendAnalysisService.ts` hardcoded thresholds and weights.
- **Module-level API key state** — `youtubeApiClient.ts` dual storage (variable + localStorage).
- **No test coverage** — Critical services need unit tests.

Full details: `agent_docs/refactoring_guidelines.md`

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
| Language | TypeScript | ~5.9.3 |
| UI Framework | React | ^19.2.0 |
| Build Tool | Vite | ^7.3.1 |
| Vite Plugin | @vitejs/plugin-react | ^5.0.0 |
| CSS Framework | Tailwind CSS | ^4.2.2 (@tailwindcss/vite plugin) |
| Font | @fontsource/inter | ^5.2 (locally bundled) |
| Icons | Lucide React | ^1.7.0 |
| i18n | i18next + react-i18next | ^26.0.1 / ^16.5.4 |
| Language Detection | i18next-browser-languagedetector | ^8.2.1 |
| Package Manager | npm | (lockfile v3) |
| Electron Integration | vite-plugin-electron (conditional) | ^0.29.0 |
| Desktop App | Electron | ^41.1.0 |
| Desktop Packaging | electron-builder | ^26.8.1 |
| Android Build | Capacitor | ^8.1.0 |
| Container | Docker (multi-stage) | Node 22-alpine + Nginx alpine |
| Chrome Extension | Manifest V3 | Tab-based, manual install via chrome://extensions/ |
| CI/CD | GitHub Actions | typecheck, build, lint, security audit, electron release, chromebook release, android APK, chrome extension |

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
├── android/                          # Capacitor Android project (ChromeOS APK build)
│   ├── app/src/main/AndroidManifest.xml  # ChromeOS-optimized manifest (resizable, keyboard/mouse)
│   └── ...                          # Gradle build files, resources (committed per Capacitor convention)
├── chrome-extension/                  # Chrome Extension source files (Manifest V3)
│   ├── manifest.json                # Extension manifest (icons, permissions, service worker)
│   ├── background.js                # Service worker: opens TubeTrend tab on icon click
│   └── theme-init.js                # FOUC prevention (extracted from index.html for CSP)
├── electron/                         # Electron desktop app wrapper (compiled by vite-plugin-electron)
│   ├── main.ts                      # Main process: BrowserWindow, app lifecycle
│   └── preload.ts                   # Preload script: contextBridge API exposure
├── electron-builder.json            # Electron packaging config (Win/Mac/Linux)
├── electron-builder.chromebook.json # Chromebook .deb config (--no-sandbox, Ozone auto-detect)
├── build/                            # Build resources
│   └── icon.png                     # App icon (512x512, generated via npm run electron:icon)
├── scripts/                          # Build/utility scripts
│   ├── generate-icon.mjs           # Generates app icon PNG from code
│   └── build-extension.mjs         # Assembles Chrome Extension from dist/ + chrome-extension/
├── capacitor.config.ts               # Capacitor config (appId, webDir, Android/ChromeOS settings)
├── .github/                          # GitHub configuration
│   ├── workflows/                    # CI: pr-checks.yml, docker-publish.yml, electron-release.yml, android-release.yml, extension-release.yml
│   ├── ISSUE_TEMPLATE/              # Bug report & feature request templates
│   └── pull_request_template.md
├── agent_docs/                        # Agent process docs (review, backlog, memory, API ref, refactoring)
├── docs/                             # Documentation (images, architecture diagram)
│   └── ARCHITECTURE.mmd             # Mermaid architecture diagram (generated)
├── .junie/guidelines.md              # JetBrains Junie agent guidelines
├── index.html                        # Vite entry: theme FOUC prevention script
├── index.css                         # Root-level global CSS
├── package.json                      # Dependencies & scripts
├── tsconfig.json                     # TypeScript strict config with path aliases
├── postcss.config.js                 # Empty (PostCSS handled by Vite internally since Tailwind v4)
├── vite.config.ts                    # Vite config: aliases, @tailwindcss/vite, build info, dev server (port 3000), conditional vite-plugin-electron
├── Dockerfile                        # Multi-stage: Node builder → Nginx runner
├── docker-compose.yml                # ghcr.io/fo0/tubetrend:latest on port 8889
├── metadata.json                     # App metadata (name, description)
├── .env.example                      # Environment variable template
├── CLAUDE.md                         # This file — agent project guide
├── MEMORY.md                         # Agent long-term memory (session-spanning context)
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

# Capacitor (Android APK for ChromeOS) — no ELECTRON env var needed
npm run cap:sync         # Build web app + sync to Android project
npm run cap:open         # Open Android project in Android Studio
npm run cap:build        # Build + sync + assemble release APK
npm run cap:build:debug  # Build + sync + assemble debug APK

# Chrome Extension
npm run build:extension  # Build extension to dist-extension/ (load unpacked in chrome://extensions/)

# Docker
docker-compose up        # Run production image at http://localhost:8889
docker run -d -p 8889:80 ghcr.io/fo0/tubetrend:latest  # Run directly
```

## API / Interfaces

YouTube Data API v3 (REST, API key auth). All calls go through `youtubeApiClient.ts`. Client-side storage via localStorage with type-safe `StorageAdapter`.

Full API reference: `agent_docs/api-reference.md`

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
- **Styling**: Tailwind CSS v4 utility classes with `dark:` variants via `@tailwindcss/vite` plugin. No CSS modules or styled-components.
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
- **Tailwind via @tailwindcss/vite** — Tailwind CSS v4 integrated as Vite plugin (not PostCSS). Enables tree-shaking, offline capability, and custom font bundling. Inter font loaded via `@fontsource/inter`. Config in `src/styles/index.css` using CSS-first approach (`@import "tailwindcss"`, `@custom-variant dark`).
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
- **Packaging** — `electron-builder` creates platform-specific installers (Windows NSIS/portable, macOS DMG, Linux AppImage) in `release/`. Config in `electron-builder.json` references `dist/**/*` + `dist-electron/**/*`. Artifact naming: `TubeTrend-<version>-Portable.exe` (Windows portable, no installer).
- **Chromebook release** — A separate `electron-builder.chromebook.json` builds Chromebook-optimized `.deb` packages into `release-chromebook/`. It adds `--no-sandbox` (required for Crostini's container sandbox) and `--ozone-platform-hint=auto` (Wayland/X11 auto-detection) via `executableArgs` in the `.desktop` file. Builds both x64 and arm64 architectures (ASUS Chromebooks use Intel and MediaTek/ARM chips). Artifact naming: `TubeTrend-<version>-Chromebook-<arch>.deb`. Local build: `npm run build:chromebook`.
- **App icon** — Generated via `npm run electron:icon` (`scripts/generate-icon.mjs`), outputs `build/icon.png` (512x512)
- **Requires internet** — YouTube Data API calls require internet; Tailwind CSS and fonts are bundled locally
- **CI/CD** — `electron-release.yml` workflow builds all platforms (Win/Mac/Linux), Chromebook `.deb` (x64 + arm64), Chrome Extension ZIP, and Android APK in a single pipeline. Triggers on tag pushes (`v*`), main/master branch pushes, and manual dispatch. Creates GitHub Release with `--generate-release-notes`. Non-Electron builds (Chromebook, Extension, Android) run in parallel and are non-blocking. Auto-updater metadata (`latest*.yml`) is excluded from the Release to keep assets user-friendly.

### Capacitor (Android / ChromeOS)
- **Alternative to Electron Chromebook .deb** — Produces a native Android APK that runs on ChromeOS via ARCVM, without requiring Crostini (Linux VM). Eliminates GPU issues, sandbox workarounds, and VM boot delays.
- **Zero changes to `src/` code** — Capacitor wraps the same `dist/` web build output. No code changes needed in the web app.
- **ChromeOS-optimized AndroidManifest.xml** — `resizeableActivity="true"`, `screenOrientation="unspecified"`, touchscreen not required, freeform window support.
- **`androidScheme: 'https'`** — Ensures localStorage and other Web APIs work correctly when loading from local files.
- **Icon** — Uses the same `build/icon.png` (512x512) as Electron, copied to `android/app/src/main/res/mipmap-xxxhdpi/`.
- **CI/CD** — `android-release.yml` builds APK on push to main/master (Actions artifact). Additionally, `electron-release.yml` includes a parallel `build-android` job that adds `TubeTrend-<version>-Android.apk` to each GitHub Release.
- **Signing** — Currently unsigned (debug key). For production Play Store distribution, a signing keystore would need to be added.
- **The `android/` directory is committed** — This is Capacitor convention. Build outputs (`android/app/build/`, `android/.gradle/`) are gitignored.

### Chrome Extension
- **Tab-based approach** — Clicking the extension icon opens TubeTrend in a new Chrome tab. If a tab already exists, it is focused instead of opening a duplicate.
- **Zero changes to `src/` code** — Wraps the same `dist/` web build output, like Electron and Capacitor.
- **Manifest V3** — Uses the latest Chrome Extension manifest version with a background service worker.
- **CSP compliance** — The inline FOUC prevention script from `index.html` is extracted to an external `theme-init.js` file, since Manifest V3 forbids inline scripts.
- **No special permissions** — Extension pages can fetch from `googleapis.com` without declaring `host_permissions`. localStorage works in extension tabs without `chrome.storage`.
- **Icons** — Generated at 16/48/128px by `scripts/build-extension.mjs` using the same rendering logic as `scripts/generate-icon.mjs`.
- **Build** — `npm run build:extension` runs `vite build` then assembles `dist-extension/` (copies dist/, patches index.html, adds extension files, generates icons).
- **Installation** — Load unpacked via `chrome://extensions/` in developer mode, pointing to `dist-extension/`.
- **CI/CD** — `extension-release.yml` builds extension ZIP on push to main/master (Actions artifact). Additionally, `electron-release.yml` includes a parallel `build-extension` job that adds the ZIP to each GitHub Release alongside Electron and Chromebook builds.

### Build Info
`vite.config.ts` injects `__BUILD_INFO__` global with `version` (date-based, format `YYYYMMDD-HHMM`), `commitHash`, `branch`, `buildDate`. Available at runtime via the global variable.
