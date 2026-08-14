# CLAUDE.md — Project Guide

## Session Start — Read Order

When a session begins, read in this order. Skip any file that doesn't exist.

1. `MEMORY.md` — long-term project knowledge
2. `SCRATCHPAD.md` — short-term working context
3. `BACKLOG.md` — only if user references prior findings or asks "what's open"
4. `agent_docs/review_process.md`, `agent_docs/memory_process.md` — only when needed
5. `agent_docs/mcp_catalog.md` — only when MCPs come up
6. `.claude/skills/*/SKILL.md` — only when its trigger fires

> Don't pre-load everything. The Tier-1 SessionStart hook already prints a reminder.

## Workflow Triggers

Skills live at `.claude/skills/<name>/SKILL.md` — load the one whose trigger fires.

- `done` — "done" / "fertig" / "finished" / "/done"
- `pr` — "PR" / "create PR" / "/pr"
- `review` — "review" / "/review"
- `security-review` — "security review" / "/security-review"
- `rollback` — "rollback" / "revert" / "undo" / "/rollback"
- `ci` — "CI" / "fix CI" / "check the build" / "/ci"
- `stuck` — "stuck" / "loop" / "going in circles" / "/stuck"
- `beacon` — "check dependencies" / "update deps" / "/beacon"
- `scheduler` — "schedule" / "routine" / "nightly" / "remind me later" / "/scheduler"
- `orca` — "orca" / "orca mode an/aus" / "orchestrator mode" / "/orca"
- Diagram request → `agent_docs/diagram_prompt.md` → `docs/ARCHITECTURE.mmd`

> Review runs on demand via the `review` skill — done-skill never auto-runs it. Findings → `BACKLOG.md`; knowledge → `MEMORY.md` / `SCRATCHPAD.md`.
> **On "done"/"fertig":** commit; if the work relates to a GitHub issue, comment (English) and close it. **Do NOT push unless explicitly asked.** Reference issues in commits: `fix: resolve crash #42`.
> **GitNexus is read-only / analysis-only.** Non-negotiable policy + code-intelligence block: `agent_docs/gitnexus.md` (mirrored in `AGENTS.md`).

## Output Languages

- **Chat / status messages to user** — user's language (default: German).
- **English:** code, identifiers, comments, console/log output · commit messages (Conventional Commits) · PR titles + bodies · GitHub issue comments · every generated file (CLAUDE.md, `agent_docs/*`, MEMORY/SCRATCHPAD/BACKLOG, skills).
- **User-facing UI strings** — i18n keys (`t('key')`); bundles for `en` + `de` only, fallback `en`.
- **Technical terms — every surface, chat included — English, never translated.**

Keep the English word verbatim and inflect around it: „2 Bugs gefixt", „Code Smell in `quotaService.ts`", „PR gemerged", „Build ist rot" — never „Programmfehler", „Zusammenführungsantrag". Covers the whole vocabulary (bug, smell, lint, build, commit, merge, branch, PR, review, refactoring, deployment, rollback, regression, dependency, tech debt …) plus everything naming something real: file paths, commands, tool / skill / hook names, status labels, error strings (quoted verbatim). Test: English in code, a commit or a PR → English in chat.

## Performance / Modes

- **Default model:** whatever the session resolves to — don't pin one here or in `.claude/settings.json`; `/model` switches mid-session.
- **Fast mode** (`/fast`): same Opus model, faster output — not a downgrade.
- **Caveman mode:** `caveman lite|full|ultra` / `stop caveman`. Chat only, never generated files.
- **Orca mode** (orchestrator-only): `/orca` toggles it, `/orca <N>` sets the parallel width (default 5). While on, the agent does no task work itself — every unit goes to a subagent at the session's model and effort. Off by default; contract in `.claude/skills/orca/SKILL.md`.
- **Plan mode:** for non-trivial strategy — `Plan` subagent or `EnterPlanMode`. Not for single-step tasks.

## Autonomy

Which session you are in is resolvable, so it is a rule and not a guess: `$CLAUDE_CODE_REMOTE` is `"true"` in Claude Code web/cloud sessions — routine runs included — and unset in the local CLI.

- **Unattended** (`CLAUDE_CODE_REMOTE=true`, or the initial instructions are a routine): nobody will answer. Never end a turn with a question — decide under an assumption you state, finish every part that isn't blocked, carry the open point into the report or `BACKLOG.md`. A routine run has no permission prompts, so "waiting for approval" waits forever.
- **Interactive** (local CLI): asking is cheap. Ask when two readings of the task produce materially different work; otherwise decide and mention the call.
- **Both:** an action that is destructive _and_ not ordered _and_ not standard practice gets the same answer either way — skip it, report it with the recommendation, finish everything it does not block. Gates stay put: merges → `pr` skill `/pr merge`, reversals/force ops → `rollback` skill, deploys → _Deployment_, secrets → `agent_docs/env-vars.md`.

## Scheduled Work

Three schedulers, different lifetimes: **Routines** (cloud, durable, ≥1 h, survive the session), **`/loop` + `Cron*`** (this session only, 7-day expiry), **Desktop scheduled tasks** (local machine). Picking one, managing jobs, and the cleanup contract for agent-created jobs: `.claude/skills/scheduler/SKILL.md`. Default prompt for a bare `/loop`: `.claude/loop.md`.

## Tech Stack

TypeScript ~6.0.3 (strict) · React ^19.2 + Vite ^8.0 · Tailwind CSS v4 (`@tailwindcss/vite`) · i18next ^26 · Lucide React ^1.18 · Node.js 22+ · npm (lockfile v3) · Prettier ^3 · ESLint 9 flat config. **No test framework configured.**

Full version table + the Electron / Capacitor / Chrome-extension / Docker wrappers around the same `dist/`: `agent_docs/platform_builds.md`

## Project Overview

**TubeTrend** (`github.com/fo0/tubetrend`) is a YouTube trend analysis SPA: it tracks favorite channels and keywords on a dashboard, scores video performance with pure-math trend analysis (view velocity + engagement rate), and visualizes YouTube Data API v3 quota usage. One `dist/` build ships as web app, Docker image, Electron desktop app, Android/ChromeOS APK and Chrome extension.

## Project Structure

```
src/       # app/ (shell, routing) · features/ (dashboard, favorites, search, videos, youtube)
           # shared/ · providers/ · i18n/ (en + de bundles) · styles/
android/  chrome-extension/  electron/  scripts/   # Platform wrappers + build scripts
docs/ (ARCHITECTURE.mmd + adr/) · agent_docs/ · .claude/ (settings.json, loop.md, skills/)
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
npm run format           # Prettier --write (before commit; done-skill auto-invokes)
npm run format:check     # Prettier --check (matches CI; read-only)
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint 9 flat config — errors gate, warnings don't
npm run lint:fix         # ESLint with --fix
npm run build            # Production build to dist/ — must succeed

# No test runner configured yet. See agent_docs/testing.md before adding one.

# Architecture diagram
npx @mermaid-js/mermaid-cli mmdc -i docs/ARCHITECTURE.mmd -o docs/ARCHITECTURE.svg
```

Platform builds (Electron, Capacitor, Chrome Extension, Docker) and the GitNexus read-only CLI: `agent_docs/platform_builds.md`, `agent_docs/gitnexus.md`

## Key Patterns

Top 5 lookup index — descriptions, event list, error handling: `agent_docs/key-patterns.md`

- **Type-Safe Event Bus** → `src/shared/lib/eventBus.ts` (via `useEventBus()`, not raw listeners)
- **Type-Safe Storage Adapter** → `src/shared/lib/storage.ts` (`safeRead`/`safeWrite`, never bare `localStorage`)
- **Feature Module Pattern** → `src/features/*/` (import through the barrel; `search/` has none)
- **Trend Scoring** (pure math, no AI) → `src/features/videos/services/trendAnalysisService.ts`
- **Quota Tracking** → `src/features/youtube/services/quotaService.ts`

**Error handling:** try-catch with fallbacks for storage; `YouTubeApiError` for API errors; `ErrorBoundary` catches fatal React crashes.

## Coding Conventions

- **Language:** UI text via i18n keys (`t('key')`); comments and docs in English.
- **Naming:** PascalCase components/types, camelCase functions/variables/hooks, kebab-case CSS classes. Files: PascalCase components, camelCase services/hooks/utils.
- **Imports:** cross-module via the `@/src/…` alias (~132 sites); relative only inside a module; `import type` for types. `@features|@shared|@providers|@i18n` resolve but are unused — don't start.
- **Exports:** barrel `index.ts` per feature — never deep-import another feature's internals.
- **Styling / state:** Tailwind v4 with `dark:` variants; custom hooks + `localStorage`, Context only for theme. No CSS modules, no state library.
- **Max file length:** ~300 lines (split), ~500 (strongly recommended).

Full conventions, path-alias table, architecture notes: `agent_docs/coding_conventions.md`

## Architecture Decisions

Significant decisions are ADRs under `docs/adr/`. Triggers + format: `agent_docs/adr_template.md`. Always grep `docs/adr/` before contradicting one. To reverse a decision, add a new ADR with `Status: Supersedes ADR-NNNN` — never edit accepted ADRs.

## Git Conventions

- **Branch Naming:** `feat/X`, `fix/X`, `refactor/X`, `chore/X`, `docs/X`, `dependabot/**`
- **Commit Messages:** Conventional Commits — `type(scope): description`. Reference issues (`fix: resolve crash #42`).
- **Merge Strategy:** Squash (default). Reflected in the `pr` skill's merge phase.
- **CI/CD:** GitHub Actions — `pr-checks` gates code (skips `**.md` / `docs/**`), `docs-format` gates exactly those paths, so docs-only changes stay gated too. Release/publish workflows: `agent_docs/deployment.md`.
- **Cloud / routine runs:** a `claude/`-prefixed branch is always accepted; a push to any other branch is rejected when it is protected, carries someone else's open PR, or holds someone else's commits. Unattended work therefore starts on `claude/<topic>` unless the task names a branch.
- **Formatting guard:** staged files can be auto-formatted on commit (husky + lint-staged) — `agent_docs/ci_formatting_guard.md`. Never bypass with `--no-verify`.

## Dependency Management

- **New dependencies:** only after user approval with reasoning. **devDependencies:** fine without approval for tooling/testing.
- **Lock file:** `package-lock.json` (npm v3), always commit. CI uses `npm ci`.
- **Dependabot:** weekly, `.github/dependabot.yml`. The `pr` skill detects dep-bot PRs by head-branch pattern.

## Environment Variables

Only `VITE_`-prefixed vars reach the client (`VITE_DEFAULT_SEARCH`, `VITE_GIT_COMMIT_HASH`, `VITE_GIT_BRANCH`). Copy `.env.example` → `.env.local`; restart the dev server after changes.

The **YouTube API key is never a build-time secret** — the end user enters it in the app UI; it lives only in that browser's `localStorage`. Full list + secret-location table: `.env.example`, `agent_docs/env-vars.md`

## Deployment

- **Trigger:** push to `main` → `docker-publish.yml` pushes `ghcr.io/fo0/tubetrend:latest`. Tag push (`v*`) → `electron-release.yml` uploads all platform artifacts to a GitHub Release. Single environment, no staging.
- **Agent scope:** push to feature branches, open/update PRs, suggest merge. **Agent does NOT trigger production deploys** without an explicit user command.
- **Routine exception:** merges ordered by an owner-authorized routine count as an explicit user command — conditions + full gate: `.claude/skills/pr/SKILL.md → /pr merge` (single source of truth).
- **Rollback:** `rollback` skill; for deployed regressions prefer a revert-PR over re-tagging.

All workflows + distribution channels: `agent_docs/deployment.md`

## API / Interfaces

YouTube Data API v3 (REST, API-key auth), all calls through `youtubeApiClient.ts`; client-side persistence via `localStorage` behind the type-safe `StorageAdapter`. Full reference: `agent_docs/api-reference.md`

## Testing

**No framework configured yet** (Vitest recommended). Today's gate is `format:check` → `typecheck` → `lint` → `build`; tests would live as `*.test.ts` next to source. Constraints (agent-runnable, zero-cost, deterministic): `agent_docs/review_process.md → Test execution constraints`. Priority targets: `agent_docs/testing.md`

## External Integrations / MCPs

Project-intended and common MCPs: `agent_docs/mcp_catalog.md`. Host MCP availability is never auto-detected — fall back to `Read` / `Bash` / `WebFetch`; workflows must never hard-require one. A server an unattended cloud or routine run needs must be a committed `.mcp.json` entry or a claude.ai connector — a local `claude mcp add` does not travel with the clone.

**Trigger tools never prompt.** `.claude/settings.json` → `permissions.allow` holds one `mcp__<server>__*` glob per spelling, the two `mcp__github__(un)subscribe_pr_activity` entries, and one `Bash(...)` entry per automated check — so an unattended run stalls on neither scheduling nor working. Per-tool MCP entries a glob already matches are redundant: pruned, never re-add. **Self-heal:** a tool that still prompts has no glob for its spelling — append `mcp__<that server>__*` and commit it. **Never write a `deny`/`ask` block.** Rationale, trust-dialog caveat, user-level fallback: `agent_docs/mcp_catalog.md`.

## CI

CI failure handling is in `.claude/skills/ci/SKILL.md` (`/ci`, "fix CI", "check the build"). Auto-routes by run state (none / running / passed / failed / stale). Never auto-reruns; always verifies fixes locally before pushing.

## Subagents

`Explore` (read-only search) · `Plan` (strategy) · `general-purpose` (write+execute) · `claude-code-guide` (Claude Code itself). Direct tools beat subagents when the target is known; parallelize independent calls; pass full context — subagents have no history. A repo-local `.claude/agents/*.md` is picked up automatically, cloud sessions included; a `model:` in its frontmatter overrides model inheritance. **Orca mode** (`/orca`) makes delegation the only path and voids these thresholds. Full guide: `agent_docs/review_process.md → Subagent Selection`.

## Development Notes

- **`noUnusedLocals` / `noUnusedParameters` are on** — unused variables are type errors and fail `typecheck` + the build.
- **ESLint does not duplicate `tsc`** — its job is `react-hooks/rules-of-hooks` + `exhaustive-deps`; a cache-buster dependency needs an `eslint-disable-next-line` **with a reason**.
- **Path aliases live in `tsconfig.json` _and_ `vite.config.ts`** — adding one means editing both.

Toolchain rules, one-build-five-targets: `agent_docs/development_notes.md` · platform/i18n/Docker: `agent_docs/platform_builds.md`

## Refactoring Notes

Four files sit over the ~500-line bar (largest: `InputSection.tsx` ~768) and there is no test coverage. Current list, split candidates, the resolved list (do not re-open) and the principles: `agent_docs/refactoring_guidelines.md`

## Documentation Rules

After every code change, check and update:

- `CLAUDE.md` — new components, configs, patterns, technical details
- `README.md` — new features, endpoints, env vars for users
- `BACKLOG.md` — unfixed review findings (Accepted/Deferred)
- `MEMORY.md` / `SCRATCHPAD.md` — stable knowledge / current working context
- `docs/ARCHITECTURE.mmd` — structural changes (modules, data flow, external deps)
- `docs/adr/` — new significant architecture decisions
- `.env.example` — new environment variables

### Context budget

`CLAUDE.md` / `MEMORY.md` / `SCRATCHPAD.md` load every session: **15k / 8k / 4k** target, offload at **20k / 16k / 8k**. `agent_docs/`, `.claude/skills/`, `docs/adr/` are on-demand and unbudgeted. Over budget → **move** content out and leave a one-line pointer; never delete to fit. Ladder + archive format: `agent_docs/context_budget.md`. The Tier-1 guard flags it after any Edit/Write — act in the same session.

<!-- Generated by claude-code-optimizer v1.22.0 -->
