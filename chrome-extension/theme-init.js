// FOUC prevention: apply theme class before React mounts.
// Extracted from index.html inline script for Chrome Extension CSP compliance.
(function () {
  try {
    // Duplicate of STORAGE_KEYS.THEME (src/shared/constants/config.ts) and of the identical inline
    // block in index.html. Neither can import the constant — both run before the React bundle.
    // Keep this file, index.html and the constant in sync; a rename that misses one is invisible to
    // typecheck and build. Sites are listed in agent_docs/api-reference.md.
    var storageKey = "tt.theme";
    var explicit = localStorage.getItem(storageKey);
    var systemPrefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var shouldDark = explicit === "dark" || (explicit !== "light" && systemPrefersDark);
    if (shouldDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch {
    // ignore
  }
})();
