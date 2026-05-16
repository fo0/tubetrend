# Backlog

Review findings not immediately fixed. **Only work on these upon explicit request.**

## Open

| # | Date | Category | Sev | Location | Finding | Status | Source |
|---|------|----------|-----|----------|---------|--------|--------|
| 7 | 2026-02-15 | Standards | P2 | package.json -> devDependencies | `@types/node: ^25.5.0` but runtime is Node 22. No actual issues (tsc passes), but mismatch could surface if code uses Node 25-only APIs. | Accepted | @types/node migration (PR #10) |
| 8 | 2026-02-15 | Performance | P2 | dist/ (build output) | CSS bundle increased from 56.45 KB to 76.98 KB (gzip) after Tailwind v4 migration. Expected — v4 includes more comprehensive base/reset styles. Net gzip impact: +0.6 KB total. | Accepted | Tailwind 3->4 + Vite 6->7 migration |
| 9 | 2026-04-25 | i18n | P2 | `src/shared/components/ui/ApiQuotaIndicator.tsx` -> `getOptimalTimeWindow` | Hardcoded German short-form labels (`'30 Min.'`, `'1 Std.'`, `'3 Std.'`, `'6 Std.'`, `'12 Std.'`, `'24 Std.'`) break i18n consistency for the 13 supported languages. Needs translation keys (e.g. `quota.window30m`). Locale-aware number/date formatting now handled via shared `formatNumber`/`getLocale`; only labels still hardcoded. | Deferred | Round 3 polish — narrow scope but needs per-locale label entries |
| 11 | 2026-04-25 | Code Smells | P2 | `FavoriteRow.tsx` (~635 lines), `useDashboard.ts` -> raw `window.addEventListener` | Six raw `window.addEventListener` sites for typed bus events (`favorites-cache-updated`, `favorites-changed`, `favorite-refresh-start/end`, `hidden-highlights-changed`) bypass the `useEventBus` hook. Inconsistent with the rest of the app and miss type-safety. | Deferred | Round 3 polish — refactor depth |

## Done

| # | Date | Done | Category | Location | Finding |
|---|------|------|----------|----------|---------|
| 2 | 2026-02-14 | 2026-02-14 | Security | index.html -> import map | Pre-existing import map references aistudiocdn.com CDN incl. unused @google/genai. Removed in vite-plugin-electron migration. |
| 3 | 2026-02-15 | 2026-04-03 | Readability | CLAUDE.md -> Tech Stack table | 13+ stale version/config references after dependency migrations. Fixed: all versions updated, Tailwind v4 architecture corrected. |
| 4 | 2026-02-15 | 2026-05-16 | Readability | README.md -> Tech stack section | Tech stack line said "Vite 6 \| Tailwind CSS" — corrected to "Vite 7 \| Tailwind CSS 4". |
| 1 | 2026-02-14 | 2026-05-16 | Performance | src/main.tsx -> font imports | Switched `@fontsource/inter/{300..700}.css` to `@fontsource/inter/latin-{300..700}.css`. Bundled font assets dropped from 30 files to 5 (latin only). |
| 5 | 2026-02-15 | 2026-05-16 | Code Smells | postcss.config.js | Deleted empty PostCSS config; Tailwind v4 ships through `@tailwindcss/vite`, Vite 8 bundles its own PostCSS for built-in handling. |
| 6 | 2026-02-15 | 2026-05-16 | Standards | package.json -> devDependencies | Removed unused `postcss` devDependency along with `postcss.config.js`. Build + typecheck verified. |
| 10 | 2026-04-25 | 2026-05-16 | i18n | `VideoCard.tsx`, `HighlightVideoCard.tsx`, `VideoListTable.tsx`, `HiddenHighlightsModal.tsx`, `ApiQuotaIndicator.tsx` -> `toLocaleString('de-DE')` | Routed all five components through `formatters.formatNumber` (active locale default) or `getLocale()` for date formatting. No more hardcoded `de-DE`. |
| 12 | 2026-04-25 | 2026-05-16 | Performance | `src/features/youtube/services/channelService.ts:340` -> `Math.max(effectiveMax, 50)` | Added inline comment explaining the over-fetch is intentional headroom for the post-Shorts filter; final slice happens after Shorts removal. |
