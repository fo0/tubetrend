// FOUC prevention: apply theme class before React mounts.
// Extracted from index.html inline script for Chrome Extension CSP compliance.
(function() {
  try {
    var storageKey = 'tt.theme';
    var explicit = localStorage.getItem(storageKey);
    var systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var shouldDark = explicit === 'dark' || (explicit !== 'light' && systemPrefersDark);
    if (shouldDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // ignore
  }
})();
