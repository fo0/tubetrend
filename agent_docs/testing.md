# Testing — Detail

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 6. CLAUDE.md keeps framework + run command + layout. The zero-cost/determinism constraints are defined once in `agent_docs/review_process.md → Test execution constraints`.

## Current state

**No test framework is configured yet.** The quality gate today is:

```bash
npm run format:check   # Prettier verification (matches CI)
npm run typecheck      # tsc --noEmit (strict mode)
npm run build          # production build must succeed
```

`package.json` has no `test` script. Do not invent one in generated docs or CI until a framework actually lands.

## Recommended framework

**Vitest** — ESM-native and Vite-aligned, so it reuses `vite.config.ts` resolution (including the `@features/`, `@shared/`, `@providers/`, `@i18n/` path aliases) with no extra config layer.

When added:

- Add a `test` script to `package.json` and extend the automated-checks block in `CLAUDE.md`.
- Add the `Test` step to `.github/workflows/pr-checks.yml`.

## Structure (once configured)

`*.test.ts` next to the source file it covers, mirroring the feature-module layout.

## Priority test targets

Ordered by risk × churn:

1. `favoritesService` — CRUD + cache invalidation, the most stateful module.
2. `trendAnalysisService` — pure math, trivially testable, currently the highest-value/lowest-effort target.
3. `quotaService` — cost accounting + Pacific-Time daily reset (needs a fake clock).
4. `eventBus` — typed emit/subscribe, dual DOM emission, listener cleanup.
5. `storage` — `safeRead`/`safeWrite` fallback behavior under quota errors and disabled storage.

## Constraints (autonomy + zero-cost)

This codebase is built and verified by AI agents. Tests must be:

- **Agent-runnable** with the standard test command — no manual setup, no credentials, no interactive login.
- **Zero-cost** — no real YouTube Data API calls (a `search` costs 100 quota units), no production data writes. Mock the API layer at `youtubeApiClient`.
- **Deterministic** — fake clocks (quota reset is timezone-dependent), in-memory storage adapters, mocked event bus.

External boundaries (YouTube API, `localStorage`) → mock or use ephemeral in-memory fakes. Real-service smoke tests only on explicit user request; never part of the default check pipeline.
