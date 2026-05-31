# Backlog

Review findings not immediately fixed. **Only work on these upon explicit request.**

## Open

| #   | Date | Category | Sev | Location | Finding | Status | Source |
| --- | ---- | -------- | --- | -------- | ------- | ------ | ------ |

## Done

| #   | Date       | Done       | Category    | Location                                                                                                                                           | Finding                                                                                                                                                          |
| --- | ---------- | ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | 2026-02-14 | 2026-02-14 | Security    | index.html -> import map                                                                                                                           | Pre-existing import map references aistudiocdn.com CDN incl. unused @google/genai. Removed in vite-plugin-electron migration.                                    |
| 3   | 2026-02-15 | 2026-04-03 | Readability | CLAUDE.md -> Tech Stack table                                                                                                                      | 13+ stale version/config references after dependency migrations. Fixed: all versions updated, Tailwind v4 architecture corrected.                                |
| 4   | 2026-02-15 | 2026-05-16 | Readability | README.md -> Tech stack section                                                                                                                    | Tech stack line said "Vite 6 \| Tailwind CSS" — corrected to "Vite 7 \| Tailwind CSS 4".                                                                         |
| 1   | 2026-02-14 | 2026-05-16 | Performance | src/main.tsx -> font imports                                                                                                                       | Switched `@fontsource/inter/{300..700}.css` to `@fontsource/inter/latin-{300..700}.css`. Bundled font assets dropped from 30 files to 5 (latin only).            |
| 5   | 2026-02-15 | 2026-05-16 | Code Smells | postcss.config.js                                                                                                                                  | Deleted empty PostCSS config; Tailwind v4 ships through `@tailwindcss/vite`, Vite 8 bundles its own PostCSS for built-in handling.                               |
| 6   | 2026-02-15 | 2026-05-16 | Standards   | package.json -> devDependencies                                                                                                                    | Removed unused `postcss` devDependency along with `postcss.config.js`. Build + typecheck verified.                                                               |
| 10  | 2026-04-25 | 2026-05-16 | i18n        | `VideoCard.tsx`, `HighlightVideoCard.tsx`, `VideoListTable.tsx`, `HiddenHighlightsModal.tsx`, `ApiQuotaIndicator.tsx` -> `toLocaleString('de-DE')` | Routed all five components through `formatters.formatNumber` (active locale default) or `getLocale()` for date formatting. No more hardcoded `de-DE`.            |
| 12  | 2026-04-25 | 2026-05-16 | Performance | `src/features/youtube/services/channelService.ts:340` -> `Math.max(effectiveMax, 50)`                                                              | Added inline comment explaining the over-fetch is intentional headroom for the post-Shorts filter; final slice happens after Shorts removal.                     |
| 7   | 2026-02-15 | 2026-05-23 | Standards   | package.json -> devDependencies                                                                                                                    | Aligned `@types/node` from `^25.8.0` to `^22.19.0` to match Node 22 runtime (Docker, CI). Typecheck + build verified.                                            |
| 9   | 2026-04-25 | 2026-05-23 | i18n        | `src/shared/components/ui/ApiQuotaIndicator.tsx` -> `getOptimalTimeWindow`                                                                         | Already resolved in prior PR: `getOptimalTimeWindow` returns i18n keys (`quota.window30m` etc.) and `en.json` ships all 8 window labels. Closed as done.         |
| 11  | 2026-04-25 | 2026-05-23 | Code Smells | `FavoriteRow.tsx`, `useDashboard.ts` -> raw `window.addEventListener`                                                                              | Routed all 6 raw `window.addEventListener` sites for typed bus events through `eventBus.on()`. Restores compile-time type safety, removes SSR-guard boilerplate. |
| 13  | 2026-05-24 | 2026-05-30 | Security    | `node_modules/brace-expansion` (transitive)                                                                                                        | brace-expansion override auf ^5.0.6, Advisory-Range verlassen (GHSA-f886-m6hf-6m8v, GHSA-jxxr-4gwj-5jf2). Nested override via electron-builder chain.            |

## Obsolete / Accepted Tradeoffs

| #   | Date       | Closed     | Category    | Location             | Reason                                                                                                                                                                                                       |
| --- | ---------- | ---------- | ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 8   | 2026-02-15 | 2026-05-23 | Performance | dist/ (build output) | Accepted tradeoff — CSS bundle increase (+0.6 KB net gzip) is the documented cost of Tailwind v4's expanded base/reset styles. No reversal planned; removed from the open list to avoid re-tracking forever. |
