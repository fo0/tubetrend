import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode; // user selection or 'system'
  resolved: 'light' | 'dark'; // effective theme
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'tt.theme.explicit'; // stores 'light' | 'dark'; missing => system

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyHtmlClass(dark: boolean) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  const body = document.body;
  if (dark) {
    el.classList.add('dark');
    // keep body clean of a potential stray "dark" class
    body?.classList.remove('dark');
    // hint browser color-scheme for form controls/scrollbars
    try { (el.style as any).colorScheme = 'dark'; } catch {}
  } else {
    el.classList.remove('dark');
    body?.classList.remove('dark');
    try { (el.style as any).colorScheme = 'light'; } catch {}
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }>
  = ({ children }) => {
  // Determine initial mode from storage (explicit only). If no explicit, use 'system'.
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const explicit = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (explicit === 'light' || explicit === 'dark') return explicit;
    } catch {}
    return 'system';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => getSystemPrefersDark());

  // Listen to system scheme changes when in system mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (ev: MediaQueryListEvent) => setSystemDark(ev.matches);
    try {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } catch {
      // Safari fallback
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  const resolved: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') return systemDark ? 'dark' : 'light';
    return mode;
  }, [mode, systemDark]);

  // Apply to DOM and persist explicit choices
  useEffect(() => {
    applyHtmlClass(resolved === 'dark');
    // Debug logging in dev to diagnose theme switching on user machines
    try {
      const isDev = (import.meta as any)?.env?.DEV === true;
      if (isDev && typeof document !== 'undefined') {
        // eslint-disable-next-line no-console
        console.log('[Theme] apply', { mode, resolved, htmlClass: document.documentElement.className });
      }
    } catch {}
    try {
      if (mode === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch {
      // ignore storage errors
    }
  }, [mode, resolved]);

  const value = useMemo<ThemeContextValue>(() => ({ mode, resolved, setMode }), [mode, resolved]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
