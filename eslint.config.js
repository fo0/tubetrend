import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * ESLint 9 flat config.
 *
 * Purpose: catch the class of React bugs `tsc` cannot see — hook order violations
 * and stale/incorrect effect dependencies. Rules that `tsc` already enforces
 * (unused locals/parameters, implicit any, missing returns) are deliberately NOT
 * duplicated here; `npm run typecheck` stays their single source of truth.
 */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "dist-ssr/**",
      "dist-electron/**",
      "dist-extension/**",
      "build/**",
      "coverage/**",
      "release/**",
      "release-chromebook/**",
      "android/**",
      "node_modules/**",
      ".gitnexus/**",
    ],
  },

  js.configs.recommended,
  tseslint.configs.recommended,

  // Browser sources (the SPA) — the React rules live here.
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // The two rules this config exists for.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      // Fast-Refresh safety: a module exporting both a component and other values
      // loses HMR state. Constant exports are fine.
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // Node-side sources: Electron main/preload, build scripts, tool configs.
  {
    files: [
      "electron/**/*.ts",
      "scripts/**/*.mjs",
      "*.config.{js,ts,mjs}",
      "capacitor.config.ts",
      "eslint.config.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },

  // Plain-JS browser assets shipped verbatim in the Chrome extension.
  {
    files: ["chrome-extension/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, chrome: "readonly" },
    },
  },

  // Rules `tsc` already covers — keep one owner per check.
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // tsconfig: noUnusedLocals + noUnusedParameters
      "@typescript-eslint/no-unused-vars": "off",
      // tsconfig: noImplicitAny
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
