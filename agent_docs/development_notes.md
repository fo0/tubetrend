# Development Notes — Detail

Offloaded from `CLAUDE.md` (2026-08-14) per `agent_docs/context_budget.md` ladder step 8/10. CLAUDE.md keeps the two
notes an agent needs before touching anything; the rest lives here. Platform/build specifics stay in
`agent_docs/platform_builds.md`, conventions in `agent_docs/coding_conventions.md`, live gotchas in `MEMORY.md`.

## Toolchain

- **Node.js 22+** is required. CI and the Docker build install with `npm ci` (lockfile v3), never `npm install`.
- **`noUnusedLocals` / `noUnusedParameters` are on** — an unused variable is a **type error**, not a warning. It fails
  `npm run typecheck` and therefore the build, not just the linter.
- **`moduleResolution: "bundler"`** — any tool that assumes Node-style resolution (older Jest setups, some codemods)
  needs extra configuration before it will resolve this project's imports.

## ESLint does not duplicate `tsc`

`eslint.config.js` deliberately turns off `no-unused-vars` and `no-explicit-any`; `npm run typecheck` owns those. ESLint's
job here is `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`.

A cache-buster dependency (`cacheTick`, `hiddenTick`, `i18n.resolvedLanguage`, refresh tokens) is a counter listed in a
dependency array but never read in the body, because the memo/effect reads `localStorage` imperatively.
`exhaustive-deps` calls those "unnecessary" — removing one freezes stale data on screen. Every such site carries an
`// eslint-disable-next-line react-hooks/exhaustive-deps` **with the reason above it**. Never strip one without checking
what the imperative read is. Full case: `MEMORY.md → Gotchas & Pitfalls`.

## Path aliases live in two files

`tsconfig.json` **and** `vite.config.ts`. Adding or changing one alias means editing both, or the build and the
type-checker disagree. The alias table (configured vs. actually used) is in `agent_docs/coding_conventions.md`.

## One build, five targets

Web app, Docker image, Electron desktop app, Android/ChromeOS APK and the Chrome extension all wrap the same `dist/`
output. Nothing under `src/` is platform-specific — a platform difference belongs in the wrapper
(`electron/`, `android/`, `chrome-extension/`), never behind a branch in shared code. Per-target commands, i18n locale
list, Docker and build-info details: `agent_docs/platform_builds.md`.
