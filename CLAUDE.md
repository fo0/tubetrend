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

> Review runs via the `review` skill — done-skill does NOT auto-run it. Unresolved findings → `BACKLOG.md` (`agent_docs/backlog_process.md`). Long-term knowledge → `MEMORY.md`, temporary → `SCRATCHPAD.md` (`agent_docs/memory_process.md`).
> **On "done"/"fertig":** commit uncommitted changes; if the work relates to a GitHub issue, comment (English) with a summary and close it. **Do NOT push unless explicitly asked.** Reference issues in commits: `fix: resolve crash #42`.
> **GitNexus is read-only / analysis-only.** Non-negotiable policy + code-intelligence block: `agent_docs/gitnexus.md` (mirrored in `AGENTS.md`).

## Output Languages

| Surface                                                                       | Language                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Chat / status messages to user                                                | User's language (default: German)                                    |
| Code, identifiers, comments; console / log output                             | English                                                              |
| Commit messages                                                               | English (Conventional Commits)                                       |
| PR titles + bodies, GitHub issue comments                                     | English                                                              |
| Generated files (CLAUDE.md, agent_docs/\*, MEMORY/SCRATCHPAD/BACKLOG, skills) | English                                                              |
| User-facing UI strings                                                        | i18n keys (`t('key')`) — bundles for `en` + `de` only, fallback `en` |

## Performance / Modes

- **Default model:** whatever the session resolves to — don't pin one here or in `.claude/settings.json`; `/model` switches mid-session.
- **Fast mode** (`/fast`): same Opus model, faster output — not a downgrade.
- **Caveman mode** (chat compression): `caveman lite|full|ultra` / `stop caveman`. Chat only, never generated files.
- **Plan mode**: for non-trivial strategy — `Plan` subagent or `EnterPlanMode`. Not for single-step tasks.

## Tech Stack

| Component       | Technology                         | Version   |
| --------------- | ---------------------------------- | --------- |
| Language        | TypeScript (strict)                | ~6.0.3    |
| UI Framework    | React                              | ^19.2.7   |
| Build Tool      | Vite (+ `@vitejs/plugin-react`)    | ^8.0.16   |
| Styling         | Tailwind CSS (`@tailwindcss/vite`) | ^4.3.1    |
| i18n            | i18next + react-i18next            | ^26 / ^17 |
| Icons           | Lucide React                       | ^1.18.0   |
| Runtime         | Node.js                            | 22+       |
| Package Manager | npm (lockfile v3)                  | —         |
| Formatter       | Prettier                           | ^3        |
| Test Framework  | none (Vitest recommended)          | —         |

Also ships via Electron ^41 (+ electron-builder ^26), Capacitor ^8 (Android/ChromeOS), a Manifest-V3 Chrome extension and a multi-stage Docker image. Detail: `agent_docs/platform_builds.md`

## Project Overview

**TubeTrend** (`github.com/fo0/tubetrend`) is a YouTube trend analysis SPA built with Vite + React 19 + TypeScript. It tracks favorite channels and keywords on a dashboard, scores video performance with pure-math trend analysis (view velocity + engagement rate), and visualizes YouTube Data API v3 quota usage. Ships as web app, Docker image, Electron desktop app, Android/ChromeOS APK and Chrome extension — all wrapping the same `dist/` build.

## Project Structure

```
src/
  app/         # Shell, routing, page-level components
  features/    # dashboard, favorites, search, videos, youtube
  shared/      # Cross-feature components, hooks, lib, constants, types
  providers/   # React context providers (ThemeProvider)
  i18n/        # en + de bundles; 11 more selectable, fall back to en
  styles/      # Global CSS
android/       # Capacitor Android project (ChromeOS APK)
chrome-extension/  electron/  scripts/   # Platform wrappers + build scripts
docs/          # ARCHITECTURE.mmd + adr/
agent_docs/    # Agent process docs
.claude/       # settings.json (Tier-1 hooks) + skills/
```

Full tree + feature-module layout: `agent_docs/project_structure.md`

## Commands

```bash
# Install
npm install              # local dev
npm ci                   # CI/Docker — install from lockfile (preferred)

# Development
npm run dev              # Vite dev server at http://localhost:3000
npm run preview          # Build + preview at http://localhost:4173

# Automated Checks (run in this order — format FIRST to avoid CI surprises)
npm run format           # Prettier --write (run before commit; done-skill auto-invokes)
npm run format:check     # Prettier --check (matches CI; read-only)
npm run typecheck        # tsc --noEmit
npm run build            # Production build to dist/ — must succeed

# No test runner configured yet. See agent_docs/testing.md before adding one.

# Architecture diagram
npx @mermaid-js/mermaid-cli mmdc -i docs/ARCHITECTURE.mmd -o docs/ARCHITECTURE.svg
```

Platform builds (Electron, Capacitor, Chrome Extension, Docker) and GitNexus read-only CLI: `agent_docs/platform_builds.md`, `agent_docs/gitnexus.md`

## Key Patterns

Top 5 — a lookup index, not documentation. Full descriptions: `agent_docs/key-patterns.md`

- **Type-Safe Event Bus** — cross-component communication without prop drilling; events typed via `EventMap`, dual emission (class + DOM `CustomEvent`), `useEventBus()` handles lifecycle. → `src/shared/lib/eventBus.ts`
- **Type-Safe Storage Adapter** — all `localStorage` access via `safeRead<T>` / `safeWrite<T>`; always try-catch wrapped, auto JSON, SSR-safe. → `src/shared/lib/storage.ts`
- **Feature Module Pattern** — each module exposes `services/` (pure logic), `hooks/` (React state), `types.ts`, `index.ts` barrel. Never deep-import another feature. → `src/features/*/`
- **Trend Scoring (pure math)** — no external AI. Velocity (70%) + engagement (30%), each capped at 100; labels by threshold (Viral/Hot/Rising/Steady/Slow). → `src/features/videos/services/trendAnalysisService.ts`
- **Quota Tracking** — client-side YouTube API accounting; search 100 units, videos/channels 1; daily reset Pacific Time; emits `quota-updated`. → `src/features/youtube/services/quotaService.ts`

### Error Handling

Try-catch with fallback values for storage. Custom `YouTubeApiError` for API errors. `ErrorBoundary` (the only class component) catches fatal React crashes.

## Coding Conventions

- **Language:** UI text via i18n keys (`t('key')`); code comments and docs in English.
- **Naming:** PascalCase for components/types, camelCase for functions/variables/hooks, kebab-case for CSS classes.
- **Files:** PascalCase for React components, camelCase for services/hooks/utils.
- **Imports:** cross-module via the `@/src/…` alias (the convention, ~132 sites); relative paths only inside a module. `import type` for type-only. The `@features|@shared|@providers|@i18n` aliases resolve but are effectively unused — don't start using them.
- **Exports:** feature modules export via barrel `index.ts`.
- **Styling:** Tailwind v4 utility classes with `dark:` variants. No CSS modules, no styled-components.
- **State:** custom hooks + `localStorage`; React Context only for theme. No external state library.
- **Max file length:** ~300 lines (split), ~500 lines (strongly recommended).

Full conventions, path-alias table and TubeTrend-specific architecture notes: `agent_docs/coding_conventions.md`

## Architecture Decisions

Significant decisions are recorded as ADRs under `docs/adr/`. Triggers + format: `agent_docs/adr_template.md`. Always grep `docs/adr/` before contradicting an existing decision. To reverse a past decision, add a new ADR with `Status: Supersedes ADR-NNNN` — never edit accepted ADRs.

## Git Conventions

- **Branch Naming:** `feat/X`, `fix/X`, `refactor/X`, `chore/X`, `docs/X`, `dependabot/**`
- **Commit Messages:** Conventional Commits — `type(scope): description`. Reference issue numbers (`fix: resolve crash #42`).
- **Merge Strategy:** Squash (default). Reflected in the `pr` skill's merge phase.
- **CI/CD:** GitHub Actions — `pr-checks`, `docker-publish`, `electron-release`, `android-release`, `extension-release`, `cleanup-ghcr`.
- **Formatting guard:** staged files can be auto-formatted on commit (husky + lint-staged). Setup + pitfalls: `agent_docs/ci_formatting_guard.md`. Never bypass with `--no-verify`.

## Dependency Management

- **New dependencies:** Only after user approval with reasoning.
- **devDependencies:** Can be added without approval for tooling/testing.
- **Lock file:** `package-lock.json` (npm v3), always commit. CI uses `npm ci`.
- **Dependabot:** Weekly, configured in `.github/dependabot.yml`. The `pr` skill detects dep-bot PRs by head-branch pattern.

## Environment Variables

Only `VITE_`-prefixed vars reach the client. Copy `.env.example` → `.env.local`; restart the dev server after changes.

| Variable               | Description                        | Default                 |
| ---------------------- | ---------------------------------- | ----------------------- |
| `VITE_DEFAULT_SEARCH`  | Default search input on app load   | Dev: `TEDx`, Prod: `""` |
| `VITE_GIT_COMMIT_HASH` | Git commit hash (Docker build arg) | Auto-detected           |
| `VITE_GIT_BRANCH`      | Git branch name (Docker build arg) | Auto-detected           |

The **YouTube API key is never a build-time secret** — the end user enters it in the app UI; it lives only in that browser's `localStorage`.

Full list + secret-location table: `.env.example`, `agent_docs/env-vars.md`

## Deployment

- **Trigger:** push to `main` → `docker-publish.yml` pushes `ghcr.io/fo0/tubetrend:latest`. Tag push (`v*`) → `electron-release.yml` uploads all platform artifacts to a GitHub Release.
- **Pipeline:** `.github/workflows/`. Single environment (public Docker image + GitHub Releases), no staging.
- **Agent scope:** Agent can push to feature branches, open/update PRs, suggest merge. **Agent does NOT trigger production deploys** without an explicit user command.
- **Routine exception:** a session running an **owner-authorized routine** counts as an explicit user command — its merges are pre-approved _including_ any pipeline they trigger, provided the change set is non-destructive and verification passed. Destructive changes stay gated. Full wording: `agent_docs/deployment.md`.
- **Rollback:** `.claude/skills/rollback/SKILL.md`. For deployed regressions prefer a revert-PR over re-tagging.

Deployment detail (all workflows, distribution channels): `agent_docs/deployment.md`

## API / Interfaces

YouTube Data API v3 (REST, API-key auth). All calls go through `youtubeApiClient.ts`. Client-side persistence via `localStorage` behind the type-safe `StorageAdapter`.

Full API reference: `agent_docs/api-reference.md`

## Testing

- **Framework:** not yet configured. Recommended: Vitest (ESM-native, Vite-aligned, reuses the path aliases).
- **Run:** `npm test` (once configured). Today the gate is `format:check` → `typecheck` → `build`.
- **Structure:** `*.test.ts` next to source.
- **Constraints:** agent-runnable (no setup/credentials), zero-cost (mock the YouTube API — a `search` costs 100 quota units), deterministic (fake clocks, in-memory storage). Details: `agent_docs/review_process.md → Test execution constraints`.

Priority targets + full detail: `agent_docs/testing.md`

## External Integrations / MCPs

Project-intended and common MCPs: `agent_docs/mcp_catalog.md`. Host MCP availability is never auto-detected — fall back to `Read` / `Bash` / `WebFetch` when an MCP is absent. Workflows must never hard-require an MCP.

**Trigger tools never prompt.** `.claude/settings.json` → `permissions.allow` carries one `mcp__<server>__*` glob per Claude Code Remote spelling plus the two `mcp__github__(un)subscribe_pr_activity` entries, so scheduled check-ins and PR-watch subscriptions run unattended. **Self-heal:** a tool that still prompts means its server spelling is missing — append `mcp__<that server>__*` and commit it (additive only, never `deny`/`ask`). Trust-dialog caveat + user-level fallback: `agent_docs/mcp_catalog.md`.

## CI

CI failure handling is in `.claude/skills/ci/SKILL.md`. Triggered by `/ci`, "fix CI", "check the build". Auto-routes by run state (none / running / passed / failed / stale). Never auto-reruns; always verifies fixes locally before pushing.

## Subagents

Delegate complex / parallel / read-heavy work: `Explore` (read-only search), `Plan` (strategy), `general-purpose` (write+execute), `claude-code-guide` (Claude Code itself). Direct tools beat subagents when the target is known; parallelize independent calls in one message; pass full context — subagents have no history. Full guide: `agent_docs/review_process.md → Subagent Selection`.

## Development Notes

- **Node.js 22+** required; `npm ci` in CI/Docker.
- **`noUnusedLocals` / `noUnusedParameters` are on** — unused variables are type errors, not warnings.
- **`moduleResolution: "bundler"`** — tooling assuming Node-style resolution needs extra config.
- **Path aliases live in two files** — `tsconfig.json` _and_ `vite.config.ts`. Adding one means editing both.
- **Every platform target wraps the same `dist/`** — nothing under `src/` is platform-specific.

Platform detail, i18n locales, Docker, build-info: `agent_docs/platform_builds.md`

## Refactoring Notes

- **`InputSection.tsx` (~768 lines)** — largest file; form + autocomplete + history + persistence in one component.
- **`FavoriteRow.tsx` (~715 lines)** — god component with 11 interdependent `useEffect`s; split out a `useFavoriteRowData()` hook.
- **`ApiQuotaIndicator.tsx` (~686 lines)** — badge + history panel + window math; the math is pure and extractable.
- **`AnalyserPage.tsx` (~576 lines)** — extract the export / copy-all action handlers.
- **No test coverage** — priority targets in `agent_docs/testing.md`.

Resolved (do not re-open): duplicate event listeners, German strings in `youtubeApiClient.ts`, magic numbers in `trendAnalysisService.ts`, module-level API-key state. Details + evidence: `agent_docs/refactoring_guidelines.md`

## Documentation Rules

After every code change, check and update:

| File                    | Update when...                                                         |
| ----------------------- | ---------------------------------------------------------------------- |
| `CLAUDE.md`             | New components, configs, patterns, technical details                   |
| `README.md`             | New features, endpoints, env vars for users                            |
| `BACKLOG.md`            | Unfixed review findings (Accepted/Deferred)                            |
| `MEMORY.md`             | Architecture decisions, gotchas, external deps, user preferences       |
| `SCRATCHPAD.md`         | Current working context, open questions, short-lived notes             |
| `docs/ARCHITECTURE.mmd` | Structural changes (new modules, changed data flow, new external deps) |
| `docs/adr/`             | New significant architecture decisions                                 |
| `.env.example`          | New environment variables                                              |

### Context budget

`CLAUDE.md`, `MEMORY.md` and `SCRATCHPAD.md` load into every session, so they have a fixed char budget: **15k / 8k / 4k** target, offload at **20k / 16k / 8k**. Everything under `agent_docs/`, `.claude/skills/` and `docs/adr/` is read on demand and unbudgeted.

Over budget → **move** content out and leave a one-line pointer: CLAUDE.md sections to `agent_docs/`, memory entries to `docs/adr/` or `agent_docs/memory_archive/`. Never delete to fit. Ladder + archive format: `agent_docs/context_budget.md`. The Tier-1 budget guard flags it after any Edit/Write; act in the same session.

<!-- Generated by claude-code-optimizer v1.18.0 -->
