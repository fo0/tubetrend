# Environment Variables & Secrets

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 2. CLAUDE.md keeps the 3 critical vars; the full list and the secret-location table live here.

Vite exposes **only** `VITE_`-prefixed variables to the client bundle. Copy `.env.example` → `.env.local`. Restart the dev server after changing env vars — Vite reads them at startup.

## Variables

| Variable               | Description                             | Default                 |
| ---------------------- | --------------------------------------- | ----------------------- |
| `VITE_DEFAULT_SEARCH`  | Default search input value on app load  | Dev: `TEDx`, Prod: `""` |
| `VITE_GIT_COMMIT_HASH` | Full git commit hash (Docker build arg) | Auto-detected from git  |
| `VITE_GIT_BRANCH`      | Git branch name (Docker build arg)      | Auto-detected from git  |
| `ELECTRON`             | Activates the Electron build pipeline   | unset (web build)       |
| `VITE_DEV_SERVER_URL`  | Dev-server URL the Electron shell loads | Auto-injected by Vite   |

Authoritative template: `.env.example`.

### `VITE_DEFAULT_SEARCH`: empty ≠ unset

The `Dev: TEDx` default above applies only when the variable is **unset**. `.env.example` ships the
key as `VITE_DEFAULT_SEARCH=`, and Vite reads that as the empty string `""`, not as absent. The read
site is `src/shared/components/ui/InputSection.tsx`:

```ts
import.meta.env.VITE_DEFAULT_SEARCH ?? (import.meta.env.DEV ? "TEDx" : "");
```

`??` only falls back on `null`/`undefined`, so `""` wins and the dev-mode `TEDx` default is
suppressed. Copying `.env.example` verbatim to `.env.local` therefore yields an empty search input in
dev. Comment the line out to restore the fallback. The other four variables are read with `||` or a
plain truthiness check, so an empty value behaves the same as unset for them.

### Build-time-only variables (never reach the client bundle)

The last two rows are **not** client variables despite the `VITE_` prefix on one of them — both are read
through `process.env` outside the browser bundle, so Vite never inlines them into `dist/`.

- `ELECTRON` — read in `vite.config.ts` (`process.env.ELECTRON === "true"`). Set automatically by every
  `electron:*` / `build:win` / `build:chromebook` npm script; it toggles `vite-plugin-electron`, which
  compiles `electron/main.ts` + `electron/preload.ts` into `dist-electron/`. Do **not** put it in
  `.env.local` — a stray `ELECTRON=true` makes plain web and Docker builds emit Electron artifacts.
  Format: the literal string `true` (any other value counts as unset).
- `VITE_DEV_SERVER_URL` — read in `electron/main.ts` (Electron main process, Node side). Injected by
  `vite-plugin-electron` during `npm run electron:dev` so the desktop shell loads the hot-reload dev
  server instead of the bundled `dist/index.html`. Never set it manually; production Electron builds
  must leave it unset. Format: absolute http URL, e.g. `http://localhost:3000`.

## Docker build arguments

`Dockerfile` takes three `ARG`s and maps two of them onto the `VITE_*` variables above before running
`npm run build`. They are build-time only — nothing is read from the environment at container runtime.

| Build arg         | Description                               | Default     | Maps to                |
| ----------------- | ----------------------------------------- | ----------- | ---------------------- |
| `NODE_VERSION`    | Base image tag for the builder stage      | `22-alpine` | — (image tag only)     |
| `GIT_COMMIT_HASH` | Commit stamped into the build-info footer | `unknown`   | `VITE_GIT_COMMIT_HASH` |
| `GIT_BRANCH`      | Branch stamped into the build-info footer | `unknown`   | `VITE_GIT_BRANCH`      |

`.github/workflows/docker-publish.yml` passes `GIT_COMMIT_HASH=${{ github.sha }}` and
`GIT_BRANCH=${{ github.ref_name }}`. For a local image build, pass them yourself or accept `unknown`:

```bash
docker build --build-arg GIT_COMMIT_HASH="$(git rev-parse HEAD)" \
             --build-arg GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)" -t tubetrend .
```

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

<!-- Generated by claude-code-optimizer v1.37.0 -->
