# ADR-0002: Drop the Electron Desktop Target

- **Status:** Accepted
- **Date:** 2026-10-18
- **Decider(s):** user
- **Tags:** build, deploy

## Context

TubeTrend shipped one `dist/` build through five wrappers: the web app, the Docker image, an Electron desktop app (Windows portable, macOS DMG, Linux AppImage, plus Chromebook `.deb` packages), the Capacitor Android/ChromeOS APK and the Chrome extension. The Electron target carried the largest dependency surface of all of them (`electron`, `electron-builder`, `vite-plugin-electron` — about 230 lockfile packages), a three-OS CI matrix on every push to `main`, its own icon pipeline and a conditional branch in `vite.config.ts`. ChromeOS is already covered natively by the Capacitor APK, and every desktop OS by the web app and the Chrome extension.

## Decision

We will remove the Electron desktop target completely, including the electron-builder Chromebook `.deb`. The release workflow (`release.yml`, formerly `electron-release.yml`) keeps building the Chrome extension zip and the Android APK and still cuts a GitHub Release on every push to `main`.

## Consequences

### Positive

- About 230 devDependency packages and their advisories leave the lockfile; Dependabot no longer needs an `electron` major-version ignore rule.
- A push to `main` no longer runs the Windows/macOS/Linux matrix or the two Chromebook jobs.
- `vite.config.ts` has a single build mode; the `ELECTRON` and `VITE_DEV_SERVER_URL` variables are gone.

### Negative / Trade-offs

- No installable desktop app any more; desktop users run the web app, the Docker image or the Chrome extension.
- Existing Electron and Chromebook `.deb` installs receive no further updates.

### Neutral

- The GitHub Release now publishes when either the extension or the APK built; the Electron build that used to gate it no longer exists.

## Alternatives Considered

- **Keep Electron but move it out of the push-to-`main` release** — rejected: the dependency surface and the maintenance stay, for a target the owner no longer wants.
- **Keep only the Chromebook `.deb`** — rejected: it is an electron-builder build, so it keeps the whole Electron toolchain, and the Capacitor APK already serves ChromeOS.

## References

- Issue #591
