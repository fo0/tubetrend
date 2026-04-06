# Memory

Session-spanning project knowledge. **Read at session start, update during work.**

## Architecture Decisions

## Gotchas & Pitfalls

- **Tailwind v4 migration (2026-02)** — Tailwind CSS was migrated from v3 (PostCSS plugin + tailwind.config.js) to v4 (@tailwindcss/vite plugin). The old tailwind.config.js was deleted. postcss.config.js remains but is empty. Dark mode now uses `@custom-variant dark` in CSS instead of `darkMode: 'class'` in config. (2026-04-03)

- **Lucide React 1.x breaking change** — Lucide React migrated from 0.x to 1.x. Some brand icons (YouTube, GitHub) were removed in v0.577+ and replaced with custom SVG components. Check for removed icons when updating. (2026-04-03)

- **Vite 8 + Rolldown migration (2026-04)** — Vite 8 replaces Rollup with Rolldown. `rollupOptions` still works via compatibility layer but is deprecated; migrate to `rolldownOptions` when vite-plugin-electron has a stable Vite 8 release. `vite-plugin-electron` 0.29.1 has no explicit Vite 8 support but works for web builds. Electron desktop builds may need `vite-plugin-electron@1.0.0+` when stable. Build time dropped from ~7s to ~1s. (2026-04-06)

- **TypeScript 6 defaults changed (2026-04)** — TS 6 changes many defaults (types=[], esModuleInterop=true, noUncheckedSideEffectImports=true). Our tsconfig explicitly sets most values so impact was minimal. `baseUrl` is deprecated in TS 6 — removed it since paths already use `"./"` prefixes. (2026-04-06)

## Working Context

## Failed Approaches

## External Dependencies

- **YouTube Data API v3 quota** — Free tier is 10,000 units/day. Search costs 100 units, videos/channels cost 1. Quota resets at midnight Pacific Time. The app tracks usage client-side in localStorage. (2026-04-03)

## User Preferences
