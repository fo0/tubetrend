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

The app uses localStorage for persistence. When debugging, you may need to clear these keys (see CLAUDE.md for the full list).

### i18n

- Translations are in `src/i18n/locales/`
- Currently supported: English (en), German (de)
- When adding UI text, add translations for all supported languages

### No External AI APIs

The trend analysis is purely mathematical - no external AI API calls are made.

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
