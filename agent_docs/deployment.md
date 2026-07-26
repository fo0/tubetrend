# Deployment — Detail

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 4. CLAUDE.md keeps trigger + pipeline path + agent scope; the detail lives here.

## Triggers

| Event           | Workflow               | Result                                                      |
| --------------- | ---------------------- | ----------------------------------------------------------- |
| Push to `main`  | `docker-publish.yml`   | Builds and pushes `ghcr.io/fo0/tubetrend:latest`            |
| Tag push (`v*`) | `electron-release.yml` | Builds + uploads all platform artifacts to a GitHub Release |
| Pull request    | `pr-checks.yml`        | Verification only (format:check, typecheck, build)          |
| Scheduled       | `cleanup-ghcr.yml`     | Prunes old container images                                 |

Additional workflows: `android-release.yml`, `extension-release.yml` — both fold into the tag-push release pipeline.

## Environments

Single environment. There is no staging. Distribution channels:

- **Web / Docker** — public image `ghcr.io/fo0/tubetrend:latest`, container port `80` → host `8889`.
- **Desktop** — Electron portable (Windows), DMG (macOS), AppImage (Linux) via GitHub Releases.
- **Chromebook** — `.deb` packages (x64 + arm64) via `electron-builder.chromebook.json`.
- **Android / ChromeOS** — Capacitor APK (currently unsigned / debug key).
- **Chrome Extension** — manual install from `dist-extension/` via `chrome://extensions/`.

## Agent Scope

The agent can push to feature branches, open/update PRs, and suggest a merge. **The agent does NOT trigger production deploys** without an explicit user command.

### Routine exception

A session running an **owner-authorized routine** (the kickoff prompt declares itself an authorized Claude Code routine of the repo owner) **counts as an explicit user command**. Merges ordered by such a routine are pre-approved — **including any deploy/publish pipeline the merge triggers** (CI/CD, Docker/GHCR publish, production deploy) — provided the change set is non-destructive (additive; no data migration, no history rewrite, no repo-settings change) and the routine's verification passed.

Destructive changes stay gated regardless of routine context.

## Rollback

See `.claude/skills/rollback/SKILL.md`. For deployed regressions, prefer a revert-PR over re-tagging: the container `latest` tag follows `main`, so a revert-PR merged to `main` republishes automatically, whereas re-tagging leaves the release history misleading.
