# Environment Variables & Secrets

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 2. CLAUDE.md keeps the 3 critical vars; the full list and the secret-location table live here.

Vite exposes **only** `VITE_`-prefixed variables to the client bundle. Copy `.env.example` → `.env.local`. Restart the dev server after changing env vars — Vite reads them at startup.

## Variables

| Variable               | Description                             | Default                 |
| ---------------------- | --------------------------------------- | ----------------------- |
| `VITE_DEFAULT_SEARCH`  | Default search input value on app load  | Dev: `TEDx`, Prod: `""` |
| `VITE_GIT_COMMIT_HASH` | Full git commit hash (Docker build arg) | Auto-detected from git  |
| `VITE_GIT_BRANCH`      | Git branch name (Docker build arg)      | Auto-detected from git  |

Authoritative template: `.env.example`.

## Secrets Locations

| Secret class       | Where it lives                                                                    | Never commit |
| ------------------ | --------------------------------------------------------------------------------- | ------------ |
| Local dev secrets  | `.env.local` (gitignored), template in `.env.example`                             | ✅ Never     |
| CI/CD secrets      | GitHub Actions secrets (`gh secret set`)                                          | ✅ Never     |
| Production secrets | User-provided at runtime (YouTube API key via UI modal, stored in `localStorage`) | ✅ Never     |
| Test fixtures      | Synthetic values only — never real credentials                                    | ✅ Never     |

## Rules

- New secret needed → add to `.env.example` with a placeholder + comment, then request the real value from the user.
- Never `gh secret set` from agent code without an explicit user command.
- The `security-review` skill scans for committed secrets (gitleaks / trufflehog when available).
- **The YouTube API key is never a build-time secret.** It is entered by the end user in the app's UI modal and stored only in that browser's `localStorage`. Do not add it to `.env.example`, CI, or the Docker image.
