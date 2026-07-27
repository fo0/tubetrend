# Contributing to TubeTrend

Thank you for your interest in contributing to TubeTrend! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 22 or higher
- npm

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tubetrend.git
   cd tubetrend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy the environment file:
   ```bash
   cp .env.example .env.local
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000

## How to Contribute

### Reporting Bugs

Before submitting a bug report:

- Check existing issues to avoid duplicates
- Use the bug report template when creating a new issue
- Include steps to reproduce the issue
- Describe the expected vs actual behavior

### Suggesting Features

- Use the feature request template
- Explain the use case and why this feature would be valuable
- Be open to discussion about implementation approaches

### Pull Requests

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes following the code style guidelines below
3. Test your changes locally
4. Commit with clear, descriptive messages
5. Push to your fork and create a Pull Request

### Code Style Guidelines

- **TypeScript**: Use strict typing, avoid `any`
- **Imports**: Use path aliases (`@features/`, `@shared/`, etc.)
- **Components**: Functional components with hooks
- **Naming**:
  - PascalCase for components and types
  - camelCase for functions and variables
  - kebab-case for file names (except components)

### Formatting

This project uses [Prettier](https://prettier.io/) for automatic code formatting. Before submitting a PR, run:

```bash
npm run format        # Auto-format all files
npm run format:check  # Verify formatting (read-only, matches CI)
```

Formatting is enforced in CI via `npm run format:check`. PRs with formatting drift will fail the check.

### Verification Before Submitting

Formatting is only the first of three gates. `.github/workflows/pr-checks.yml` runs all of the
following on every pull request, so run them locally in this order to catch failures before CI does:

```bash
npm run format:check  # 1. Prettier verification (read-only)
npm run typecheck     # 2. tsc --noEmit — strict mode, noUnusedLocals/noUnusedParameters are ON
npm run build         # 3. Production build to dist/ — must succeed
```

Notes:

- **Run `npm run format` first** if step 1 fails — it rewrites files in place, then re-check.
- **Unused variables are type errors, not warnings** (`noUnusedLocals` / `noUnusedParameters`), so a
  leftover import fails step 2.
- **There is no test suite yet.** No test framework is configured, so the three commands above are the
  complete quality gate. See `agent_docs/testing.md` for the planned Vitest setup and priority targets.
- CI additionally runs `npm audit --audit-level=high`, but that job is advisory and does not block.

### Project Structure

```
src/
├── app/              # App shell & routes
├── features/         # Feature modules (domain logic)
├── shared/           # Shared components, hooks, utilities
├── providers/        # React context providers
├── i18n/             # Internationalization
└── styles/           # Global CSS
```

### Commit Message Format

Use clear, descriptive commit messages:

- `Add feature X` - for new features
- `Fix bug in Y` - for bug fixes
- `Update Z` - for improvements to existing features
- `Refactor W` - for code refactoring
- `Docs: update README` - for documentation changes

## Development Notes

### localStorage Keys

The app uses localStorage for persistence. When debugging, you may need to clear these keys. The full list is defined in `src/shared/constants/config.ts` (`STORAGE_KEYS`).

### i18n

- Translations are in `src/i18n/locales/`
- Currently supported: English (en), German (de)
- When adding UI text, add translations for all supported languages
- **`supportedLngs` declares 13 locales, but only two have translation files.** `src/i18n/config.ts`
  lists `en, de, fr, es, it, pt, nl, pl, tr, ru, ja, zh, ko`; the other eleven resolve through
  `fallbackLng: "en"`. So adding a key to `en.json` + `de.json` is enough — there is no third locale
  file to keep in sync, and a missing key silently renders the English string rather than the raw key.
- **Never hardcode UI strings.** All user-facing text goes through `t('key')`; the single namespace is
  `common`. Language detection order is `localStorage` → `navigator` → `htmlTag`.

### No External AI APIs

The trend analysis is purely mathematical - no external AI API calls are made.

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
