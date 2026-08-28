# CLAUDE.md — Project Guide

## Session Start — Read Order

Read in this order, skipping what is missing: `MEMORY.md` (long-term knowledge) → `SCRATCHPAD.md` (working context) → `BACKLOG.md` (only if the user references prior findings). `agent_docs/review_process.md`, `memory_process.md` and `mcp_catalog.md` come up on topic; a skill file only when its trigger fires. Don't pre-load everything — the Tier-1 SessionStart hook prints a reminder.

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

> Review runs on demand via the `review` skill — done-skill never auto-runs it. Findings → `BACKLOG.md`; knowledge → `MEMORY.md` / `SCRATCHPAD.md`. **GitNexus is read-only / analysis-only:** `agent_docs/gitnexus.md` (mirrored in `AGENTS.md`).
> **On "done"/"fertig":** commit; if the work relates to a GitHub issue, comment (English) and close it. **Do NOT push unless explicitly asked.** Reference issues in commits: `fix: resolve crash #42`.

## Output Languages

- **Chat / status messages to user** — user's language (default: German). **UI strings** — i18n keys (`t('key')`); bundles `en` + `de` only, fallback `en`.
- **Everything else is English** — code, identifiers, comments, console/log output; commits (Conventional Commits); PR titles + bodies; issue comments; every generated file (`CLAUDE.md`, `agent_docs/*`, MEMORY/SCRATCHPAD/BACKLOG, skills).
- **Technical terms are never translated**, not even inside a German sentence: „2 Bugs gefixt", „PR gemerged", „Build ist rot" — never „Programmfehler". Same for anything naming something real: paths, commands, tool/skill/hook names, error strings (quoted verbatim). Full vocabulary: `agent_docs/coding_conventions.md → Never-translate term list`.

## Performance / Modes

- **Default model:** whatever the session resolves to — never pin one here or in `.claude/settings.json`; `/model` switches mid-session. **`/fast`** is the same Opus model with faster output, not a downgrade.
- **Caveman mode:** every session starts at `full` — own section below.
- **Orchestrator mode** (`orca`): **the default**, width 5 — see _Subagents_ below.
- **Plan mode:** non-trivial strategy only — `Plan` subagent or `EnterPlanMode`. A plan put up for approval ends the turn on the user, so it carries the block from _Handoff Prompt_ below.

Mode reference: `agent_docs/autonomy.md → Mode reference`.

## Caveman Mode — chat compression (default `full`)

In force from the first reply of every session — no activation step, no environment check. Chat, status messages and confirmations only; **never** files (`CLAUDE.md`, `agent_docs/*`, MEMORY/SCRATCHPAD/BACKLOG, skills), code, commits, PR bodies or issue comments — those keep the form _Output Languages_ defines.

- **Shorten by selection, not by compression.** Cut what would not change the reader's next move — never squeeze prose into abbreviations, arrow chains (`A → B → fails`) or invented shorthand.
- Drop articles, filler, pleasantries, hedging. Fragments are fine for a status line. Technical terms exact, code blocks unchanged, error strings verbatim.
- **The closing summary is never compressed** — outcome first, then what it rests on, in complete sentences, each file/commit/flag in its own plain clause. Normal prose too for security warnings, irreversible-action confirmations, and wherever fragment order risks a misread.

`caveman lite|full|ultra` switches mode mid-session; **`stop caveman` turns it off** for the rest of it. Neither carries forward — the next session starts at `full`.

## Autonomy

`$CLAUDE_CODE_REMOTE` is `"true"` in web/cloud sessions (routine runs included) and unset in the local CLI, so the mode is resolvable — a rule, not a guess.

- **Unattended:** never end a turn with a question — decide under a stated assumption, finish everything unblocked, carry the open point into the report or `BACKLOG.md`. A routine run has no permission prompts, so "waiting for approval" waits forever. **Interactive:** ask only when two readings mean materially different work.
- **Report against evidence, not intent.** Tie every "done" to a tool result from this session — an exit code, a diff, a CI status. Unverified is named unverified, skipped is reported skipped.
- **Both:** destructive _and_ not ordered _and_ not standard practice → skip it, report it with the recommendation, finish the rest. Gates: merges → `pr` skill `/pr merge`, reversals/force → `rollback` skill, deploys → _Deployment_, secrets → `agent_docs/env-vars.md`.

Full wording, gate table and the cloud branch rule: `agent_docs/autonomy.md`.

## Handoff Prompt — when a turn ends on a decision

A turn that hands the decision back — a plan up for approval, options, an open question — ends with **one** ready-to-send prompt: the one you would send yourself if your recommendation were taken. It goes last, _after_ the question, never instead of it.

```
<objective in one sentence> — <the recommended path>.
In scope: <...>. Out of scope: <...>.
Steps: <1 … n>. /review after every step, one overall review over the combined diff at the end by an agent that wrote none of it, then /done.
Done when: <observable condition>.
```

- **Your recommendation, not a menu** — one path, complete enough that pasting it is the whole instruction. No "as discussed above", no second option folded in.
- **Only commands that already exist:** this project's `/review` and `/done`, plus Claude Code's own `/loop <interval> <prompt>` (recurring pass, or work waiting on external state) and `/goal <done-condition>` (sent first where the run must not stop before that holds). Never invent one.
- **Never compressed**, whatever the caveman mode — same carve-out as the closing summary.

**Not on:** a finished turn (closing summary, status report, nothing left to decide); a yes/no confirmation of something just ordered (`/pr merge`, a `rollback` phase); and never in an unattended run, where nobody can paste it and _Autonomy_ rules out the question anyway.

## Scheduled Work

Three schedulers, three lifetimes: **Routines** (cloud, durable, ≥1 h), **`/loop` + `Cron*`** (this session only, 7-day expiry), **Desktop scheduled tasks** (local machine). Selection, job management and the cleanup contract for agent-created jobs: `.claude/skills/scheduler/SKILL.md`. Default prompt for a bare `/loop`: `.claude/loop.md`.

## Tech Stack

TypeScript ~6.0.3 (strict) · React ^19.2 + Vite ^8.2 · Tailwind CSS v4 (`@tailwindcss/vite`) · i18next ^26 · Lucide React ^1.33 · Node.js 22+ · npm (lockfile v3) · Prettier 3.9.6 (pinned) · ESLint 9 flat config. **No test framework configured.**

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
npm run lint             # ESLint 9 flat config — errors gate, warnings don't (`lint:fix` autofixes)
npm run build            # Production build to dist/ — must succeed

# No test runner configured yet. See agent_docs/testing.md before adding one.

# Architecture diagram
npx @mermaid-js/mermaid-cli mmdc -i docs/ARCHITECTURE.mmd -o docs/ARCHITECTURE.svg
```

Platform builds (Electron, Capacitor, Chrome Extension, Docker) + the GitNexus read-only CLI: `agent_docs/platform_builds.md`, `agent_docs/gitnexus.md`

## Key Patterns

Top 5 lookup index — descriptions, event list, error handling: `agent_docs/key-patterns.md`

- **Type-Safe Event Bus** → `src/shared/lib/eventBus.ts` (via `useEventBus()`, not raw listeners)
- **Type-Safe Storage Adapter** → `src/shared/lib/storage.ts` (`safeRead`/`safeWrite`, never bare `localStorage`)
- **Feature Module Pattern** → `src/features/*/` (import through the barrel; `search/` has none)
- **Trend Scoring** (pure math, no AI) → `src/features/videos/services/trendAnalysisService.ts`
- **Quota Tracking** → `src/features/youtube/services/quotaService.ts`

**Error handling:** try-catch with fallbacks for storage · `YouTubeApiError` for API errors · `ErrorBoundary` for fatal React crashes.

## Coding Conventions

- **Naming:** PascalCase components/types, camelCase functions/variables/hooks, kebab-case CSS classes. Files: PascalCase components, camelCase services/hooks/utils.
- **Imports:** cross-module via the `@/src/…` alias, relative only inside a module, `import type` for types — `@features|@shared|@providers|@i18n` resolve but are unused, don't start. **Exports:** barrel `index.ts` per feature, never deep-import another feature's internals.
- **Styling / state:** Tailwind v4 with `dark:` variants; custom hooks + `localStorage`, Context only for theme. No CSS modules, no state library.
- **Max file length:** ~300 lines (split), ~500 (strongly recommended).
- **Check-order override:** this repo runs `typecheck` before `lint`, mirroring `pr-checks.yml` — keep the two in step.

Full conventions, path-alias table, architecture notes: `agent_docs/coding_conventions.md`

## Architecture Decisions

ADRs live under `docs/adr/`; triggers + format: `agent_docs/adr_template.md`. Grep `docs/adr/` before contradicting one; reverse a decision only with a new ADR (`Status: Supersedes ADR-NNNN`) — never edit accepted ADRs.

## Git Conventions

- **Branch Naming:** `feat/X`, `fix/X`, `refactor/X`, `chore/X`, `docs/X`, `dependabot/**`; agent work on `claude/<topic>`.
- **Commit Messages:** Conventional Commits — `type(scope): description`. Reference issues (`fix: resolve crash #42`). **Merge:** squash (default), reflected in the `pr` skill.
- **CI/CD:** `pr-checks` gates code (skips `**.md` / `docs/**`), `docs-format` gates exactly those paths, so docs-only changes stay gated. Release/publish workflows: `agent_docs/deployment.md`.
- **Cloud / routine runs:** a `claude/`-prefixed branch is always accepted; a push to another branch is rejected when it is protected, carries someone else's open PR, or holds their commits — full rule: `agent_docs/autonomy.md → Branch rule`.
- **Formatting guard: not installed** (no husky, no lint-staged) — `npm run format` before every commit is the guard. Optional setup: `agent_docs/ci_formatting_guard.md`. Never bypass a configured hook with `--no-verify`.

## Dependency Management

New dependencies only after user approval with reasoning; devDependencies fine without for tooling/testing. Lock file `package-lock.json` (npm v3) — always commit; CI uses `npm ci`. Dependabot runs weekly (`.github/dependabot.yml`); the `pr` skill detects dep-bot PRs by head-branch pattern.

## Environment Variables

Only `VITE_`-prefixed vars reach the client (`VITE_DEFAULT_SEARCH`, `VITE_GIT_COMMIT_HASH`, `VITE_GIT_BRANCH`). Copy `.env.example` → `.env.local`; restart the dev server after changes.

The **YouTube API key is never a build-time secret** — the end user enters it in the app UI; it lives only in that browser's `localStorage`. Full list + secret-location table: `.env.example`, `agent_docs/env-vars.md`

## Deployment

- **Trigger:** push to `main` → `docker-publish.yml` pushes `ghcr.io/fo0/tubetrend:latest`; tag push (`v*`) → `electron-release.yml` uploads all platform artifacts to a GitHub Release. Single environment, no staging.
- **Agent scope:** feature branches, open/update PRs, suggest merge — **no production deploys** without an explicit user command. The routine exception + full gate live once in `.claude/skills/pr/SKILL.md → /pr merge`. **Rollback:** `rollback` skill; for deployed regressions prefer a revert-PR over re-tagging.

All workflows + distribution channels: `agent_docs/deployment.md`

## API / Interfaces

YouTube Data API v3 (REST, API-key auth), all calls through `youtubeApiClient.ts`; client-side persistence via `localStorage` behind the type-safe `StorageAdapter`. Full reference: `agent_docs/api-reference.md`

## Testing

**No framework configured yet** (Vitest recommended). Today's gate is `format:check` → `typecheck` → `lint` → `build`; tests would live as `*.test.ts` next to source. Constraints (agent-runnable, zero-cost, deterministic): `agent_docs/review_process.md → Test execution constraints`. Priority targets: `agent_docs/testing.md`

## External Integrations / MCPs

Project-intended and common MCPs: `agent_docs/mcp_catalog.md`. Host availability is never auto-detected — fall back to `Read` / `Bash` / `WebFetch`, and never hard-require an MCP. A server an unattended cloud or routine run needs must be a committed `.mcp.json` entry or a claude.ai connector — `claude mcp add` does not travel with the clone.

**Trigger tools never prompt — where the block applies.** A **project** allowlist is capability: `.claude/settings.json` → `permissions.allow` is live in the local CLI once this repo's workspace is trusted, and **dropped in every web/cloud session**. **Self-heal, local only:** a tool that still prompts has no glob for its spelling → append `mcp__<that server>__*` and commit it; under `$CLAUDE_CODE_REMOTE=true` append nothing and name the one-time user-scope fix once. **Never write `deny`/`ask`**, never remove a glob. Allowlist shape, both surfaces + the fix: `agent_docs/mcp_catalog.md → Allowlist shape` / `Prompt-free triggers everywhere`.

## CI

CI failure handling: `.claude/skills/ci/SKILL.md` (`/ci`, "fix CI", "check the build"). Auto-routes by run state (none / running / passed / failed / stale). Never auto-reruns; always verifies fixes locally before pushing.

## Subagents — orchestrator mode is the default

**Every session starts in orchestrator mode, width 5.** The main agent decides and delegates; subagents do the task work — not a mode to switch on, but how work happens here. `/orca <N>` changes the width, `/orca off` drops to plain behavior for that session only. Contract: `.claude/skills/orca/SKILL.md`.

The orchestrator keeps only the decisions — decomposition, verification of what comes back, the integration gates (commit, push, `/pr`, `/ci`, merge), the report. **The type carries tool access** (`Explore`, `Plan`, `general-purpose`, `claude-code-guide`); **the role carries the lens** — `implementer` (always, for any code change) · `reviewer` (any code change, **never the agent that wrote it**) · `architect` · `domain` · `product` · `docs` · `security` — and the wave report names it.

Seat the lenses the change calls for, never a standing panel and never two agents with the same one; which change earns which seat is the roster in `agent_docs/review_process.md → The role roster`. **Quality parity by omission:** leave model and effort off and the subagent inherits the session's — a `model:` pinned in a repo-local `.claude/agents/*.md` overrides inheritance. Disjoint write scopes per wave; verify the diff, not the summary.

## Development Notes

Three that bite before you touch anything: `noUnusedLocals` / `noUnusedParameters` are on (an unused variable is a **type error**, not a lint warning) · ESLint deliberately does not duplicate `tsc`, so a cache-buster dependency needs an `eslint-disable-next-line` **with a reason** · path aliases live in `tsconfig.json` _and_ `vite.config.ts`, so adding one means editing both.

Full toolchain rules + one-build-five-targets: `agent_docs/development_notes.md` · platform/i18n/Docker: `agent_docs/platform_builds.md` · live gotchas: `MEMORY.md`

## Refactoring Notes

Five files sit over the ~500-line bar (largest: `InputSection.tsx` ~775) and there is no test coverage. Current list, split candidates, the resolved list (do not re-open) and the principles: `agent_docs/refactoring_guidelines.md`

## Documentation Rules

After every code change: `CLAUDE.md` (components, configs, patterns) · `README.md` (features, env vars for users) · `BACKLOG.md` (unfixed findings) · `MEMORY.md` / `SCRATCHPAD.md` (stable knowledge / working context) · `docs/ARCHITECTURE.mmd` (modules, data flow, external deps) · `docs/adr/` (new decisions) · `.env.example` (new env vars).

### Context budget

`CLAUDE.md` / `MEMORY.md` / `SCRATCHPAD.md` load every session: **15k / 8k / 4k** target, offload at **20k / 16k / 8k**. `agent_docs/`, `.claude/skills/`, `docs/adr/` are on-demand and unbudgeted. Over budget → **move** content out and leave a one-line pointer; never delete to fit. Ladder + archive format: `agent_docs/context_budget.md`. The Tier-1 guard flags it after any Edit/Write — act in the same session.

<!-- Generated by claude-code-optimizer v1.30.0 -->
