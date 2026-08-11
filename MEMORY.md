# Memory

Session-spanning project knowledge. **Read at session start, update during work.**

## Architecture Decisions

- **Review is on-demand only** — `/review` is the sole entry point; done-skill never triggers it. `review_process.md` says _how_ a review runs, not _when_. Do not reintroduce "every implementation triggers a full review". (2026-08-02)

- **Commit style is Conventional Commits** — `type(scope): description`, per CLAUDE.md → Git Conventions and all of the git history. Do not reintroduce CONTRIBUTING.md's old prose style (`Add feature X`). (2026-08-02)

- **GitNexus policy lives in `agent_docs/gitnexus.md` (mirrored in `AGENTS.md`)** — CLAUDE.md holds only a pointer. Do not write "see the Read-Only Analysis Policy in CLAUDE.md"; that section is gone. (2026-08-02)

- **`.junie/` is removed and gitignored (owner decision)** — the JetBrains Junie guidelines had drifted (documented localStorage keys `tt.theme.explicit` / `tt.quota.tracking`, while `src/shared/constants/config.ts` defines `tt.theme` / `yt_quota_tracking`). Agent guidance lives in CLAUDE.md + `agent_docs/` only. Do not reintroduce `.junie/` or reference it in docs. (2026-08-02)

- **Allowlist = one `mcp__<server>__*` glob per spelling (owner decision)** — 16 redundant per-tool entries were pruned from `.claude/settings.json`; only the three Claude-Code-Remote globs and `mcp__github__(un)subscribe_pr_activity` remain (the latter two only because no `mcp__github__*` glob exists). Self-heal by _appending_ a missing glob. Do not re-add per-tool entries a glob already matches, and never write a `deny`/`ask` block. Full rule: `agent_docs/mcp_catalog.md → Allowlist shape`. (2026-08-02)

## Gotchas & Pitfalls

- **Tailwind v4 migration (2026-02)** — Tailwind CSS was migrated from v3 (PostCSS plugin + tailwind.config.js) to v4 (@tailwindcss/vite plugin). Both `tailwind.config.js` and the empty `postcss.config.js` were deleted (postcss devDependency removed in PR #142). Dark mode now uses `@custom-variant dark` in CSS instead of `darkMode: 'class'` in config. (updated 2026-05-24)

- **Lucide React 1.x breaking change** — Lucide React migrated from 0.x to 1.x. Some brand icons (YouTube, GitHub) were removed in v0.577+ and replaced with custom SVG components. Check for removed icons when updating. (2026-04-03)

- **Vite 8 + Rolldown migration (2026-04)** — Vite 8 replaces Rollup with Rolldown. `rollupOptions` still works via compatibility layer but is deprecated; migrate to `rolldownOptions` when vite-plugin-electron has a stable Vite 8 release. `vite-plugin-electron` 0.29.1 has no explicit Vite 8 support but works for web builds. Electron desktop builds may need `vite-plugin-electron@1.0.0+` when stable. Build time dropped from ~7s to ~1s. (2026-04-06)

- **`brace-expansion` override must be per-major, never a flat `^5` (2026-08-11)** — v5 is ESM-only and dropped the CommonJS default export, which `minimatch@3` (`require("brace-expansion")`) needs. A global `"brace-expansion": "^5"` override therefore crashes every tool carrying an old minimatch: ESLint died with `TypeError: expand is not a function`, and `electron-builder` had the same latent break. The override is now keyed per major (`brace-expansion@1` → `^1.1.12`, `@2` → `^2.0.2`, `@3` → `^3.0.1`, `@4` → `^4.0.1`), which stays above the CVE-2025-5889 ReDoS fix in every branch without changing any package's API. Do not collapse it back to a single range. (2026-08-11)

- **ESLint suppressions need a reason, and `exhaustive-deps` is not always right (2026-08-11)** — this codebase leans on cache-buster dependencies (`cacheTick`, `hiddenTick`, `i18n.resolvedLanguage`, refresh tokens): counters listed in a dep array but never read in the body, because the memo/effect reads `localStorage` imperatively. `exhaustive-deps` calls those "unnecessary" — removing them freezes stale data on screen. Every such site carries an `// eslint-disable-next-line react-hooks/exhaustive-deps` with the reason above it. Never strip one without checking what the imperative read is. (2026-08-11)

- **TypeScript 6 defaults changed (2026-04)** — TS 6 changes many defaults (types=[], esModuleInterop=true, noUncheckedSideEffectImports=true). Our tsconfig explicitly sets most values so impact was minimal. `baseUrl` is deprecated in TS 6 — removed it since paths already use `"./"` prefixes. (2026-04-06)

## Working Context

## Failed Approaches

## External Dependencies

- **YouTube Data API v3 quota** — Free tier is 10,000 units/day. Search costs 100 units, videos/channels cost 1. Quota resets at midnight Pacific Time. The app tracks usage client-side in localStorage. (2026-04-03)

## User Preferences
