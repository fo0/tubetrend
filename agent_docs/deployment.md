# Deployment — Detail

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 4. CLAUDE.md keeps trigger + pipeline path + agent scope; the detail lives here.

## Triggers

All seven workflow files, with every trigger each one actually declares:

| Workflow                | Triggers                                                             | Result                                                                                                       |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `docker-publish.yml`    | push to `main`/`master` · `workflow_dispatch`                        | Checks code, then builds and pushes `ghcr.io/fo0/tubetrend:latest`                                           |
| `electron-release.yml`  | push to `main`/`master` · tag push `v*` · `workflow_dispatch`        | Builds win/mac/linux + Chromebook `.deb` + Chrome Extension + Android APK, then **creates a GitHub Release** |
| `android-release.yml`   | push to `main`/`master` · `workflow_dispatch`                        | Standalone APK build, uploaded as a workflow artifact (no release)                                           |
| `extension-release.yml` | push to `main`/`master` · `workflow_dispatch`                        | Standalone `dist-extension/` zip, uploaded as a workflow artifact (no release)                               |
| `pr-checks.yml`         | `pull_request` → `main`/`master` (opened / synchronize / reopened)   | `format:check` → `tsc --noEmit` → `lint` → `build`, plus an advisory `npm audit` job                         |
| `docs-format.yml`       | `pull_request` → `main`/`master` · push to `main`, both `**.md` only | Prettier `--check "**/*.md"` via `npx` at the version pinned in `package.json` — no `npm ci`, no build       |
| `cleanup-ghcr.yml`      | weekly cron (Sun 04:00 UTC) · `workflow_dispatch`                    | Prunes untagged GHCR image versions, keeps the newest 10                                                     |

Three consequences worth knowing before merging anything into `main`:

- **A merge to `main` is a release, not just a container push.** `electron-release.yml` fires on the
  same push as `docker-publish.yml`; on a non-tag ref it synthesizes the tag `vYYYYMMDD.HHMM.0` and
  publishes a full GitHub Release with every platform artifact. Tag pushes reuse the tag name instead.
  `android-release.yml` and `extension-release.yml` additionally run their own standalone builds, so
  the same artifacts also exist as workflow artifacts.
- **A markdown-only change is still gated — it does not run "zero checks".** The five push/PR build
  workflows share the same `paths-ignore` list (`**.md`, `docs/**`, `.env.example`, `.gitignore`,
  `.editorconfig`, `LICENSE*`, `.vscode/**`), so none of them fires. `docs-format.yml` is their
  deliberate counterpart: it triggers on exactly `**.md` and Prettier-checks the Markdown, closing
  the gap that `format:check` is `prettier --check .` (which covers Markdown) yet never ran on a
  docs-only PR. Expect `Prettier (Markdown)` from it, plus the three `Analyze (…)` runs from
  **CodeQL default setup** — that one is configured in GitHub repo settings, not by a workflow file
  in this repo, so it runs on every PR regardless of paths and you will not find a `.yml` for it. A
  docs change that touches **no** `.md` file — `.env.example`, `docs/*.jpeg`, `.gitignore` — drops
  back to CodeQL alone; that is configuration, not a broken CI.
- **The PR gate has two jobs, one of them advisory.** The `security` job runs
  `npm audit --audit-level=high` with `continue-on-error: true`, so a high-severity advisory is
  reported but never blocks the merge. Only the `checks` job is a real gate.

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
