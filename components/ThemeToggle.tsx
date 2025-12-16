import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { mode, resolved, setMode } = useTheme();

  const nextMode = () => {
    // cycle: system -> light -> dark -> system
    const order: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
    const idx = order.indexOf(mode);
    const next = order[(idx + 1) % order.length];
    setMode(next);
  };

  const title = (() => {
    if (mode === 'system') return `System (${resolved})`;
    return mode === 'dark' ? 'Dunkel' : 'Hell';
  })();

  return (
    <button
      type="button"
      onClick={nextMode}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors \
                 border-slate-300 text-slate-700 hover:bg-slate-100 \
                 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      title={`Theme: ${title} (klicken zum Wechseln)`}
    >
      {mode === 'system' ? (
        <Monitor className="w-3 h-3" />
      ) : resolved === 'dark' ? (
        <Moon className="w-3 h-3" />
      ) : (
        <Sun className="w-3 h-3" />
      )}
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
};
