# Platform Builds & Development Notes — Detail

Offloaded from `CLAUDE.md` (2026-07-26, extended 2026-08-14) per `agent_docs/context_budget.md` ladder step 8 / 10. CLAUDE.md keeps the load-bearing development notes and a four-row stack summary; the full tech-stack table and the per-platform detail live here.

TubeTrend ships one web build (`dist/`) that every other target wraps. Nothing under `src/` is platform-specific.

## Tech stack (full table)

| Component       | Technology                         | Version   |
| --------------- | ---------------------------------- | --------- |
| Language        | TypeScript (strict)                | ~6.0.3    |
| UI Framework    | React                              | ^19.2.7   |
| Build Tool      | Vite (+ `@vitejs/plugin-react`)    | ^8.2.1    |
| Styling         | Tailwind CSS (`@tailwindcss/vite`) | ^4.3.1    |
| i18n            | i18next + react-i18next            | ^26 / ^17 |
| Icons           | Lucide React                       | ^1.33.0   |
| Runtime         | Node.js                            | 22+       |
| Package Manager | npm (lockfile v3)                  | —         |
| Formatter       | Prettier (pinned, no caret)        | 3.9.6     |
| Linter          | ESLint 9 flat config               | ^9.39     |
| Test Framework  | none (Vitest recommended)          | —         |

Distribution wrappers: Electron ^41 (+ electron-builder ^26), Capacitor ^8 (Android / ChromeOS), a Manifest-V3 Chrome
extension and a multi-stage Docker image — all wrapping the same `dist/`.

## Commands

```bash
# Electron (Desktop) — requires ELECTRON=true (set automatically by these scripts)
npm run electron:dev      # Vite dev + auto-launch Electron window
npm run electron:preview  # Build + run Electron
npm run electron:dist     # Build + package as portable app (release/)
npm run build:chromebook  # Build Chromebook .deb (release-chromebook/)
npm run build:win         # Build + package Windows portable

# Capacitor (Android APK for ChromeOS)
npm run cap:sync          # Build + sync to Android project
npm run cap:open          # Open android/ in Android Studio (no build)
npm run cap:build         # Build + sync + assemble release APK
npm run cap:build:debug   # Build + sync + assemble debug APK

# Electron icon generation (invoked by electron:dist / build:chromebook)
npm run electron:icon     # Regenerate build/icon.png via scripts/generate-icon.mjs

# Chrome Extension
npm run build:extension   # Build to dist-extension/

# Docker
docker-compose up         # Run production image at http://localhost:8889
```

## TypeScript configuration quirks

- `moduleResolution: "bundler"` + `allowImportingTsExtensions: true` (Vite-style).
- If adding tooling that assumes Node-style resolution (older Jest, ts-node), additional config may be needed.
- `noUnusedLocals` and `noUnusedParameters` are enabled — unused variables are type errors, not warnings.
- TypeScript 6 changed defaults; `baseUrl` is deprecated and was removed from `tsconfig.json`.

## i18n details

- Full translations: `en`, `de`.
- Supported with fallback to `en`: `fr`, `es`, `it`, `pt`, `nl`, `pl`, `tr`, `ru`, `ja`, `zh`, `ko`.
- Detection order: `localStorage` → `navigator` → `htmlTag`.
- Translation namespace: `common` (single namespace).

## Docker

- Multi-stage: `node:22-alpine` (builder) → `nginx:alpine` (runner).
- Git info passed as build args (`GIT_COMMIT_HASH`, `GIT_BRANCH`).
- Published image: `ghcr.io/fo0/tubetrend:latest`.
- Port mapping: container `80` → host `8889`.

## Electron

- **Conditionally integrated via `vite-plugin-electron`** — only active when the `ELECTRON=true` env var is set.
- **Two build modes** — `npm run build` produces only `dist/` (web). `ELECTRON=true npm run build` additionally compiles `electron/main.ts` and `electron/preload.ts` to `dist-electron/`.
- **Security defaults** — `nodeIntegration: false`, `contextIsolation: true`. External links open via `shell.openExternal`.
- **Packaging** — `electron-builder` produces Windows portable, macOS DMG and Linux AppImage in `release/`.
- **Chromebook** — a separate `electron-builder.chromebook.json` builds `.deb` packages for x64 + arm64.
- **CI/CD** — `electron-release.yml` builds all platforms + Chromebook + Chrome Extension + Android APK in one pipeline on tag pushes.

## Capacitor (Android / ChromeOS)

- **Alternative to the Electron Chromebook `.deb`** — a native Android APK that runs on ChromeOS via ARCVM.
- **Zero changes to `src/`** — wraps the same `dist/` web build output.
- **Toolchain prerequisites** — unlike every other target, the `cap:build*` scripts need more than Node:
  **JDK 21 (Temurin)** and the **Android SDK** (`ANDROID_HOME`), because the last step is a Gradle
  build inside `android/`. `.github/workflows/android-release.yml` sets both up via
  `actions/setup-java@v5` (`java-version: "21"`) and `android-actions/setup-android@v4`; the same
  requirement applies to the `build-android` job in `electron-release.yml`. Without them
  `npm run cap:build:debug` fails at `./gradlew`, not at the Vite build.
- **ChromeOS-optimized `AndroidManifest.xml`** — resizable activity, freeform window support.
- **Icon** — uses the same `build/icon.png` as Electron.
- **Signing** — currently unsigned (debug key). Production Play Store distribution requires a signing keystore.

## Chrome Extension

- **Tab-based approach** — clicking the extension icon opens TubeTrend in a new Chrome tab.
- **Zero changes to `src/`** — wraps the same `dist/` output.
- **Manifest V3** — background service worker, no inline scripts (CSP-compliant).
- **CSP compliance** — the inline FOUC-prevention script is extracted to an external `theme-init.js`.
- **Declared permissions — exactly one: `tabs`** (`chrome-extension/manifest.json`). `background.js`
  calls `chrome.tabs.query({})` to find an already-open TubeTrend tab and focus it instead of opening
  a duplicate; without the permission that query returns tab objects with no `url`, so the lookup
  silently fails and every click opens a new tab (#351). `chrome.tabs.create` / `.update` and
  `chrome.windows.update` need no permission of their own. Keep the list at one entry — the store
  review surfaces every added permission to users, and no other Chrome API is used.
- **Assembled, not hand-maintained** — `scripts/build-extension.mjs` copies `dist/` plus the three
  files in `chrome-extension/` (`manifest.json`, `background.js`, `theme-init.js`) into
  `dist-extension/` and rewrites `index.html`. A new source file there must be added to that copy list.
- **Build** — `npm run build:extension` produces `dist-extension/`.

## Build info

`vite.config.ts` injects a `__BUILD_INFO__` global with `version` (date-based `YYYYMMDD-HHMM`), `commitHash`, `branch` and `buildDate`.

<!-- Generated by claude-code-optimizer v1.37.0 -->
