<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1YBZVuqwTVcodbdO64XdT1eqmuv18pLAn

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Environment variables

This project uses Vite. Client-exposed variables must be prefixed with `VITE_`.

1. Copy the example env file and adjust values for your machine:
   ```bash
   cp .env.example .env.local
   ```
   On Windows (PowerShell):
   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Available variables:
   - `VITE_DEFAULT_SEARCH` — Default value shown in the search input when the app loads.
     - If not set, the app falls back to:
       - Dev mode: `TEDx`
       - Production builds: empty string

3. After changing env vars, restart the dev server so Vite reloads them.
