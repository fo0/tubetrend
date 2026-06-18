# CLAUDE.md — Project Guide

## Session Start — Read Order

When a session begins, read in this order. Stop early if a file is missing.

1. `MEMORY.md` — long-term project knowledge
2. `SCRATCHPAD.md` — short-term working context
3. `BACKLOG.md` — only if user references prior findings or asks "what's open"
4. `agent_docs/review_process.md`, `agent_docs/memory_process.md` — only when needed
5. `agent_docs/mcp_catalog.md` — only when MCPs come up
6. `.claude/skills/*/SKILL.md` — only when its trigger fires

> Don't pre-load everything. The Tier-1 SessionStart hook already prints a reminder.
> **Diagram generation:** When the user requests an architecture diagram, follow `agent_docs/diagram_prompt.md`. Write result to `docs/ARCHITECTURE.mmd` and generate `docs/ARCHITECTURE.svg`.
> **On "done" / "fertig":** Commit uncommitted changes (if any), and if the work relates to a GitHub issue, comment on it (in English) with a summary and close it. **Do NOT push unless explicitly asked.**
> **On GitHub issue work:** Reference the issue number in commit messages (e.g. `fix: resolve crash #42`).

## Workflow Triggers

| User says...                                     | Skill to load                                            |
| ------------------------------------------------ | -------------------------------------------------------- |
| "done" / "fertig" / "finished" / "/done"         | `.claude/skills/done/SKILL.md`                           |
| "PR" / "create PR" / "/pr"                       | `.claude/skills/pr/SKILL.md`                             |
| "review" / "/review"                             | `.claude/skills/review/SKILL.md`                         |
| "security review" / "/security-review"           | `.claude/skills/security-review/SKILL.md`                |
| "rollback" / "revert" / "undo" / "/rollback"     | `.claude/skills/rollback/SKILL.md`                       |
| "CI" / "fix CI" / "check the build" / "/ci"      | `.claude/skills/ci/SKILL.md`                             |
| "stuck" / "loop" / "going in circles" / "/stuck" | `.claude/skills/stuck/SKILL.md`                          |
| Diagram request                                  | `agent_docs/diagram_prompt.md` → `docs/ARCHITECTURE.mmd` |

> After every implementation, the review process in `agent_docs/review_process.md` is available via the `review` skill — done-skill does NOT auto-run reviews.
> Unresolved findings go to `BACKLOG.md` per `agent_docs/backlog_process.md`.
> Long-term knowledge → `MEMORY.md`. Temporary working context → `SCRATCHPAD.md`. Rules: `agent_docs/memory_process.md`.

## Output Languages

| Surface                                                                                  | Language                                           |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Chat / status messages to user                                                           | User's language (default: German)                  |
| Code, identifiers, comments                                                              | English                                            |
| Commit messages                                                                          | English (Conventional Commits)                     |
| PR titles + bodies                                                                       | English                                            |
| GitHub issue comments                                                                    | English                                            |
| Generated files (CLAUDE.md, agent_docs/\*, MEMORY.md, SCRATCHPAD.md, BACKLOG.md, skills) | English                                            |
| Console / log output of the app                                                          | English                                            |
| User-facing UI strings                                                                   | i18n keys (`t('key')`) — 13 locales, fallback `en` |

## Performance / Modes

- **Default model:** Opus 4.7 (1M context).
- **Fast mode** (`/fast`): Opus 4.6 with faster output. Use when latency matters more than max reasoning depth.
- **Caveman mode** (chat compression): toggle per session — `caveman lite|full|ultra` to switch, `stop caveman` / `normal mode` to disable. Affects chat only, never generated files.
- **Plan mode**: enter for non-trivial implementation strategy. Use `subagent_type: "Plan"` for delegation, or `EnterPlanMode` directly.

## AUTOMATIC CODE-REVIEW (after EVERY implementation)

> **STOP! This is the MOST IMPORTANT rule in this entire document.**
> After EVERY implementation, a complete code review is performed AUTOMATICALLY.
> The user does NOT need to request this — it is a fixed part of every loop.
> You must NEVER commit without completing this review first.
>
> **Full process details:** `agent_docs/review_process.md`

## Documentation Rules

After every code change, check and update:

| File                    | Update when...                                                         |
| ----------------------- | ---------------------------------------------------------------------- |
| `CLAUDE.md`             | New components, configs, patterns, technical details                   |
| `README.md`             | New features, endpoints, env vars for users                            |
| `BACKLOG.md`            | Unfixed review findings (Accepted/Deferred)                            |
| `MEMORY.md`             | Project learnings, context, decisions, gotchas                         |
| `SCRATCHPAD.md`         | Current working context, open questions, short-lived notes             |
| `docs/ARCHITECTURE.mmd` | Structural changes (new modules, changed data flow, new external deps) |
| `.env.example`          | New environment variables                                              |

### Size monitoring

If `CLAUDE.md` exceeds ~40,000 characters: extract the largest section into `agent_docs/` and replace with a one-line reference. Do this proactively.

## Refactoring Notes

- **`FavoriteRow.tsx` (~670 lines)** — God component. Split into sub-components + `useFavoriteRowData()` hook.
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

| Component            | Technology                         | Version                                                                                               |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Runtime              | Node.js                            | 22+                                                                                                   |
| Language             | TypeScript                         | ~6.0.3                                                                                                |
| UI Framework         | React                              | ^19.2.6                                                                                               |
| Build Tool           | Vite                               | ^8.0.14                                                                                               |
| Vite Plugin          | @vitejs/plugin-react               | ^6.0.2                                                                                                |
| CSS Framework        | Tailwind CSS                       | ^4.2.4 (@tailwindcss/vite plugin)                                                                     |
| Font                 | @fontsource/inter                  | ^5.2 (locally bundled)                                                                                |
| Icons                | Lucide React                       | ^1.17.0                                                                                               |
| i18n                 | i18next + react-i18next            | ^26.2 / ^17.0.8                                                                                       |
| Language Detection   | i18next-browser-languagedetector   | ^8.2.1                                                                                                |
| Package Manager      | npm                                | (lockfile v3)                                                                                         |
| Electron Integration | vite-plugin-electron (conditional) | ^0.29.1                                                                                               |
| Desktop App          | Electron                           | ^41.6.1                                                                                               |
| Desktop Packaging    | electron-builder                   | ^26.8.1                                                                                               |
| Android Build        | Capacitor                          | ^8.3.4                                                                                                |
| Container            | Docker (multi-stage)               | Node 22-alpine + Nginx alpine                                                                         |
| Chrome Extension     | Manifest V3                        | Tab-based, manual install via chrome://extensions/                                                    |
| CI/CD                | GitHub Actions                     | typecheck, build, security audit, electron release, chromebook release, android APK, chrome extension |

## Project Structure

```
tubetrend/
├── src/
│   ├── app/                          # Application shell & routing
│   │   ├── App.tsx                   # Main app component (state, page switching, modals)
│   │   └── routes/                   # Page-level components
│   │       ├── AnalyserPage.tsx      # Video search & analysis page
│   │       ├── DashboardPage.tsx     # Favorites dashboard page
│   │       └── index.ts              # Barrel export
│   ├── features/                     # Feature modules (domain logic)
│   │   ├── dashboard/                # Dashboard feature (hooks + services)
│   │   ├── favorites/                # Favorites management (CRUD + cache)
│   │   ├── search/                   # Search functionality
│   │   ├── videos/                   # Video analysis (trend scoring)
│   │   └── youtube/                  # YouTube API integration
│   ├── shared/                       # Shared code across features
│   │   ├── components/               # UI / layout / feedback
│   │   ├── constants/                # STORAGE_KEYS, CACHE_TTL, timeFrames
│   │   ├── hooks/                    # useDebounce, useEventListener, useLocalStorage
│   │   ├── lib/                      # storage, eventBus, formatters, dateUtils
│   │   └── types/                    # Shared types
│   ├── providers/                    # React context providers (ThemeProvider)
│   ├── i18n/                         # Internationalization (en, de + 11 fallbacks)
│   ├── styles/                       # Global CSS (themes, scrollbars, animations)
│   └── main.tsx                      # React entry point
├── android/                          # Capacitor Android project (ChromeOS APK)
├── chrome-extension/                 # Chrome Extension source files (Manifest V3)
├── electron/                         # Electron desktop app wrapper
├── build/                            # Build resources (icons)
├── scripts/                          # Build/utility scripts
├── docs/
│   ├── ARCHITECTURE.mmd              # Mermaid architecture diagram
│   └── adr/                          # Architecture Decision Records
├── agent_docs/                       # Agent process docs (review, backlog, memory, ADR, MCP, hooks, API ref, refactoring)
├── .claude/
│   ├── settings.json                 # Tier-1 hooks
│   └── skills/                       # done / pr / review / security-review / rollback / ci / stuck / gitnexus/
├── .github/                          # Workflows + dependabot + templates
├── .junie/                           # JetBrains Junie agent guidelines
├── capacitor.config.ts               # Capacitor config
├── vite.config.ts                    # Vite config
├── tsconfig.json                     # TypeScript strict config with path aliases
├── Dockerfile / docker-compose.yml   # Container build + run
└── README.md / CONTRIBUTING.md / SECURITY.md / LICENSE
```

## Commands

```bash
# Install
npm install              # Local dev
npm ci                   # CI/Docker — install from lockfile (preferred)

# Development
npm run dev              # Vite dev server at http://localhost:3000
npm run build            # Production build to dist/
npm run preview          # Build + preview at http://localhost:4173

# Automated Checks (run in this order — format FIRST to avoid CI surprises)
npm run format           # Auto-format with Prettier (run before commit; done-skill auto-invokes)
npm run format:check     # Verify formatting (matches CI; read-only)
npm run typecheck        # tsc --noEmit
npm run build            # Production build must succeed

# Single-file targeted check
npx tsc --noEmit         # Full project (no per-file scope — TS checks the whole graph)

# Electron (Desktop App) — requires ELECTRON=true (set automatically by these scripts)
npm run electron:dev     # Vite dev + auto-launch Electron window
npm run electron:preview # Build + run Electron
npm run electron:dist    # Build + package as portable app (release/)
npm run build:chromebook # Build Chromebook .deb (release-chromebook/)
npm run build:win        # Build + package Windows portable

# Capacitor (Android APK for ChromeOS)
npm run cap:sync         # Build + sync to Android project
npm run cap:build        # Build + sync + assemble release APK
npm run cap:build:debug  # Build + sync + assemble debug APK

# Chrome Extension
npm run build:extension  # Build to dist-extension/

# Docker
docker-compose up        # Run production image at http://localhost:8889

# Architecture diagram (manual)
npx @mermaid-js/mermaid-cli mmdc -i docs/ARCHITECTURE.mmd -o docs/ARCHITECTURE.svg
```

> **Testing:** No test framework configured yet. When added (recommended: Vitest), extend the automated checks with `npm test`. See "Testing" section below.

## Key Patterns

### Type-Safe Event Bus

Cross-component communication without prop drilling. Events typed via `EventMap` interface — compile-time safety. Dual emission: custom `EventBus` class + native DOM `CustomEvent`. React hook `useEventBus(event, callback)` handles lifecycle.
Location: `src/shared/lib/eventBus.ts`
Events: `favorites-changed`, `favorites-cache-updated`, `quota-updated`, `hidden-highlights-changed`, `favorite-refresh-start`, `favorite-refresh-end`

### Type-Safe Storage Adapter

All localStorage access goes through `StorageAdapter` interface. `safeRead<T>(key, fallback)` / `safeWrite<T>(key, value)` always wrapped in try-catch. Auto JSON serialization. SSR-safe.
Location: `src/shared/lib/storage.ts`

### Feature Module Pattern

Each `src/features/` module: `services/` (pure business logic), `hooks/` (React-state composition), `types.ts`, `index.ts` (barrel export).

### Theme System

`ThemeProvider` with three modes (`light`/`dark`/`system`). `matchMedia('prefers-color-scheme: dark')`. FOUC prevention via inline script in `index.html`. Tailwind `dark:` variants.
Location: `src/providers/ThemeProvider.tsx`

### Trend Scoring (Pure Math)

`trendAnalysisService.ts` — no external AI. Velocity score (70%): `log10(viewsPerHour + 1) * 20`, cap 100. Engagement score (30%): `engagementRate * 10`, cap 100. Trend labels by threshold (Viral/Hot/Rising/Steady/Slow).
Location: `src/features/videos/services/trendAnalysisService.ts`

### Quota Tracking

`quotaService.ts` — client-side YouTube API usage. Per-endpoint cost (search 100, videos/channels 1). Daily reset Pacific Time. `quota-updated` event after each call.
Location: `src/features/youtube/services/quotaService.ts`

### Error Handling

Try-catch with fallback values for storage. Custom `YouTubeApiError` class for API errors. `ErrorBoundary` (class component) for fatal React crashes.

## Coding Conventions

- **Language**: UI text uses i18n translation keys (`t('key')`). Code comments and documentation in English. Some legacy German strings exist in API error messages (see Refactoring Notes).
- **Naming**: PascalCase for components and types, camelCase for functions/variables/hooks, kebab-case for CSS classes.
- **Files**: PascalCase for React components (`ThemeProvider.tsx`), camelCase for services/hooks/utils (`favoritesService.ts`, `useSearch.ts`).
- **Imports**: Always use path aliases (`@features/`, `@shared/`, `@providers/`, `@i18n/`). Use `import type` for type-only imports.
- **Exports**: Feature modules export via barrel files (`index.ts`).
- **Components**: Functional components with hooks. One class component for `ErrorBoundary`.
- **Styling**: Tailwind CSS v4 utility classes with `dark:` variants via `@tailwindcss/vite` plugin. No CSS modules or styled-components.
- **State**: Distributed via custom hooks + localStorage. React Context only for theme. No external state library.
- **Error handling**: Try-catch with fallback values for storage. Custom `YouTubeApiError` class for API errors.
- **Max file length**: ~300 lines (split), ~500 lines (strongly recommended) — TS/React convention.

## Architecture Decisions

Significant decisions are recorded as ADRs under `docs/adr/`. Triggers + format: `agent_docs/adr_template.md`. Always grep `docs/adr/` before contradicting an existing decision. To reverse a past decision, add a new ADR with `Status: Supersedes ADR-NNNN` — never edit accepted ADRs.

### TubeTrend-specific architecture notes

- **No router library** — Simple state-based page switching (`activePage` state in `App.tsx`). Sufficient for a 2-page app.
- **Tailwind via @tailwindcss/vite** — Tailwind CSS v4 as Vite plugin (not PostCSS). Tree-shaking, offline capability, custom font bundling.
- **No external state library** — Distributed hooks + event bus. Works well given the app's complexity.
- **Trend scoring is pure math** — No external AI API. Comment in `trendAnalysisService.ts` confirms.
- **Electron as optional wrapper** — `vite-plugin-electron` only active when `ELECTRON=true`. Web/Docker is the primary delivery method.

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:

| Alias          | Maps to             |
| -------------- | ------------------- |
| `@/*`          | `./` (project root) |
| `@features/*`  | `./src/features/*`  |
| `@shared/*`    | `./src/shared/*`    |
| `@providers/*` | `./src/providers/*` |
| `@i18n/*`      | `./src/i18n/*`      |

## Git Conventions

- **Branch Naming:** `feat/X`, `fix/X`, `refactor/X`, `chore/X`, `docs/X`, `dependabot/**`
- **Commit Messages:** Conventional Commits — `type(scope): description`. Reference issue numbers (`fix: resolve crash #42`).
- **Merge Strategy:** Squash (default). Reflected in `pr` skill's merge phase.
- **CI/CD:** GitHub Actions — `pr-checks`, `docker-publish`, `electron-release`, `android-release`, `extension-release`.
- **Formatting guard:** staged files can be auto-formatted on commit (husky + lint-staged). Setup + pitfalls: `agent_docs/ci_formatting_guard.md`. Never bypass with `--no-verify`.

## Dependency Management

- **New dependencies:** Only after user approval with reasoning.
- **devDependencies:** Can be added without approval for tooling/testing.
- **Lock file:** `package-lock.json` (npm v3), always commit. CI uses `npm ci`.
- **Dependabot:** Weekly schedule, configured in `.github/dependabot.yml`. PR-skill handles dep-bot PRs via head-branch pattern detection.

## Environment Variables

Vite exposes only `VITE_` prefixed variables to the client. Copy `.env.example` → `.env.local`. Restart dev server after changing env vars.

| Variable               | Description                             | Default                 |
| ---------------------- | --------------------------------------- | ----------------------- |
| `VITE_DEFAULT_SEARCH`  | Default search input value on app load  | Dev: `TEDx`, Prod: `""` |
| `VITE_GIT_COMMIT_HASH` | Full git commit hash (Docker build arg) | Auto-detected from git  |
| `VITE_GIT_BRANCH`      | Git branch name (Docker build arg)      | Auto-detected from git  |

Full list: `.env.example`

### Secrets Locations

| Secret class       | Where it lives                                                                    | Never commit |
| ------------------ | --------------------------------------------------------------------------------- | ------------ |
| Local dev secrets  | `.env.local` (gitignored), template in `.env.example`                             | ✅ Never     |
| CI/CD secrets      | GitHub Actions secrets (`gh secret set`)                                          | ✅ Never     |
| Production secrets | User-provided at runtime (YouTube API key via UI modal, stored in `localStorage`) | ✅ Never     |
| Test fixtures      | Synthetic values only — never real credentials                                    | ✅ Never     |

Rules:

- New secret needed → add to `.env.example` with placeholder + comment, request from user.
- Never `gh secret set` from agent code without explicit user command.
- Audit step in `security-review` skill scans for committed secrets (gitleaks / trufflehog).

## Deployment

- **Trigger:** `main` branch push → `docker-publish.yml` builds and pushes `ghcr.io/fo0/tubetrend:latest`. Tag push (`v*`) → `electron-release.yml` builds + uploads all platform artifacts to GitHub Release.
- **Pipeline:** `.github/workflows/`
- **Environments:** Single environment (public Docker image + GitHub Releases). No staging.
- **Agent scope:** Agent can push to feature branches, open/update PRs, suggest merge. **Agent does NOT trigger production deploys** without explicit user command.
- **Rollback:** see `.claude/skills/rollback/SKILL.md`. For deployed regressions, prefer revert-PR over re-tag.

## API / Interfaces

YouTube Data API v3 (REST, API key auth). All calls go through `youtubeApiClient.ts`. Client-side storage via localStorage with type-safe `StorageAdapter`.

Full API reference: `agent_docs/api-reference.md`

## Testing

- **Framework:** Not yet configured. Recommended: Vitest (ESM-native, Vite-aligned).
- **Run:** `npm test` (once configured).
- **Structure:** `*.test.ts` next to source.
- **Priority test targets:** `favoritesService`, `trendAnalysisService`, `quotaService`, `eventBus`, `storage`.

### Constraints (autonomy + zero-cost)

This codebase is built and verified by AI agents. Tests must be:

- **Agent-runnable** with the standard test command — no manual setup, no credentials, no interactive login.
- **Zero-cost** — no real YouTube API calls, no production data writes. Mock the API layer.
- **Deterministic** — fake clocks, in-memory storage adapters, mocked event bus.

External boundaries (YouTube API, localStorage) → mock or use ephemeral in-memory fakes.

## External Integrations / MCPs

Project-intended and common MCPs are documented in `agent_docs/mcp_catalog.md`. The optimizer never auto-detects host MCP availability — fall back to standard tools (`Read`, `Bash`, `WebFetch`) when an MCP is not on the local host. Workflows must never hard-require an MCP.

## CI

CI failure handling is in `.claude/skills/ci/SKILL.md`. Triggered by `/ci`, "fix CI", "check the build". Auto-routes by run state (none / running / passed / failed / stale). Never auto-reruns; always verifies fixes locally before pushing.

Workflows: `pr-checks.yml`, `docker-publish.yml`, `electron-release.yml`, `android-release.yml`, `extension-release.yml`.

## Subagents

For complex / parallel / read-heavy work, delegate to a Claude Code subagent rather than running everything in main context.

| `subagent_type`     | Use for                                              |
| ------------------- | ---------------------------------------------------- |
| `Explore`           | Read-only search, locate symbols / files             |
| `Plan`              | Design implementation strategy for non-trivial tasks |
| `general-purpose`   | Multi-step write+execute, write tests/docs, refactor |
| `claude-code-guide` | Questions about Claude Code itself (hooks, MCP, SDK) |

Rules:

- Direct tools beat subagents when the target is known (`Read` for known path, `grep` for known symbol).
- Parallelize independent subagent calls in a single message.
- Pass full context — subagents have no conversation history.

Full guide: `agent_docs/review_process.md → Subagent Selection`.

## Development Notes

### TypeScript Configuration Quirks

- `moduleResolution: "bundler"` + `allowImportingTsExtensions: true` (Vite-style)
- If adding tooling that assumes Node-style resolution (older Jest, ts-node), additional config may be needed
- `noUnusedLocals` and `noUnusedParameters` enabled — unused variables will cause type errors
- TypeScript 6 defaults changed `baseUrl` deprecated (removed from tsconfig)

### i18n Details

- Full translations: `en`, `de`
- Supported with fallback to `en`: `fr`, `es`, `it`, `pt`, `nl`, `pl`, `tr`, `ru`, `ja`, `zh`, `ko`
- Detection order: `localStorage` → `navigator` → `htmlTag`
- Translation namespace: `common` (single namespace)

### Docker

- Multi-stage: `node:22-alpine` (builder) → `nginx:alpine` (runner)
- Git info passed as build args (`GIT_COMMIT_HASH`, `GIT_BRANCH`)
- Published image: `ghcr.io/fo0/tubetrend:latest`
- Port mapping: container `80` → host `8889`

### Electron

- **Conditionally integrated via vite-plugin-electron** — only active when `ELECTRON=true` env var is set.
- **Two build modes** — `npm run build` produces only `dist/` (web). `ELECTRON=true npm run build` additionally compiles `electron/main.ts` and `electron/preload.ts` to `dist-electron/`.
- **Security defaults** — `nodeIntegration: false`, `contextIsolation: true`. External links via `shell.openExternal`.
- **Packaging** — `electron-builder` produces Windows portable, macOS DMG, Linux AppImage in `release/`.
- **Chromebook** — Separate `electron-builder.chromebook.json` builds `.deb` packages for x64 + arm64.
- **CI/CD** — `electron-release.yml` builds all platforms + Chromebook + Chrome Extension + Android APK in one pipeline on tag pushes.

### Capacitor (Android / ChromeOS)

- **Alternative to Electron Chromebook .deb** — Native Android APK that runs on ChromeOS via ARCVM.
- **Zero changes to `src/` code** — Wraps the same `dist/` web build output.
- **ChromeOS-optimized AndroidManifest.xml** — Resizable activity, freeform window support.
- **Icon** — Uses same `build/icon.png` as Electron.
- **Signing** — Currently unsigned (debug key). Production Play Store distribution requires signing keystore.

### Chrome Extension

- **Tab-based approach** — Click extension icon → opens TubeTrend in a new Chrome tab.
- **Zero changes to `src/`** — Wraps the same `dist/` output.
- **Manifest V3** — Background service worker, no inline scripts (CSP-compliant).
- **CSP compliance** — Inline FOUC prevention script extracted to external `theme-init.js`.
- **Build** — `npm run build:extension` produces `dist-extension/`.

### Build Info

`vite.config.ts` injects `__BUILD_INFO__` global with `version` (date-based `YYYYMMDD-HHMM`), `commitHash`, `branch`, `buildDate`.

<!-- The GitNexus policy below is intentionally OUTSIDE the gitnexus:start/end markers so `gitnexus analyze` cannot overwrite it. Do not move it inside the markers. -->

## GitNexus — Read-Only Analysis Policy (non-negotiable)

GitNexus is an **analysis/read-only** tool. It must never write to the repository.

- **Allowed:** read-only MCP tools only — `gitnexus_query`, `gitnexus_impact`,
  `gitnexus_context`, `gitnexus_detect_changes`, and `status`/`list`. Use these to
  understand code, assess blast radius, and navigate. They never modify files.
- **Forbidden:** creating, scaffolding, regenerating, or editing ANY file as a side
  effect of GitNexus — in particular `.claude/skills/**` (including GitNexus's own
  `gitnexus/*` skill files), `CLAUDE.md`, `AGENTS.md`, `docs/wiki/**`, or anything else.
- **`gitnexus analyze` / `index`:** only run when the index is genuinely missing or
  stale AND it is required for the current task. When you do, pass `--skip-agents-md`
  and treat it as index-only: it must NOT touch tracked files. If it modifies
  `.claude/skills/**`, `CLAUDE.md`, `AGENTS.md`, or any other tracked file, **revert
  those changes immediately** (`git checkout -- <paths>`). The index itself
  (`.gitnexus/`) stays gitignored and uncommitted.
- **Never** include GitNexus-generated skill/doc edits in a commit or PR. They are out
  of scope for every task unless I explicitly ask for them.
- **Pre-commit guard:** before any commit, run `git status` and verify no unexpected
  `.claude/**`, `CLAUDE.md`, `AGENTS.md`, or agent-doc changes are staged. If there
  are and they weren't the point of the task, revert them and proceed.

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **tubetrend** (stats: unknown — run `npx gitnexus status` to populate). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> **Read-only.** Every tool below only *reads* the index — none modify files. The Read-Only Analysis Policy above governs this block.
> Rebuilding the index is **not routine**: only run `npx gitnexus analyze --skip-agents-md` when the task genuinely needs a fresh index, treat it as index-only, then `git status` and `git checkout --` any tracked file it touched. (`status`/`index`/`list` never write tracked files; `analyze` can, which is why the flag + revert are mandatory.)
> If `gitnexus_query` returns empty for a known symbol, the local index may not be in the global registry — `npx gitnexus index .` registers it (writes only `~/.gitnexus`, no tracked files).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER use GitNexus to write or modify files — no `gitnexus_rename`, no `wiki`, no skill/doc generation. GitNexus is read-only. To rename, use `gitnexus_impact` / `gitnexus_context` to enumerate every reference, then edit them yourself with normal tools.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.
- NEVER run `npx gitnexus analyze` without `--skip-agents-md`, and NEVER commit any file a GitNexus command touched — `git checkout --` them. GitNexus must never rewrite `.claude/**`, `CLAUDE.md`, `AGENTS.md`, or `docs/wiki/**`.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/tubetrend/context` | Codebase overview, check index freshness |
| `gitnexus://repo/tubetrend/clusters` | All functional areas |
| `gitnexus://repo/tubetrend/processes` | All execution flows |
| `gitnexus://repo/tubetrend/process/{name}` | Step-by-step execution trace |

## Skill Files

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Plan a refactor — read-only impact / reference mapping (you do the edits) | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index status / list / register (read-only CLI) | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

<!-- Generated by claude-code-optimizer v1.12.0 -->
