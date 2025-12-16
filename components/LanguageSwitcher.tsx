import React, { useMemo } from 'react';
import i18n from '../i18n';
import { LANG_STORAGE_KEY } from '../i18n';

type Mode = 'system' | 'explicit';

function getSystemLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || (navigator as any).userLanguage || 'en';
  // normalize to 'en' / 'de' if like 'de-DE'
  const short = lang.split('-')[0];
  return ['en', 'de'].includes(short) ? short : 'en';
}

export const LanguageSwitcher: React.FC = () => {
  const mode: Mode = useMemo(() => {
    try {
      const v = localStorage.getItem(LANG_STORAGE_KEY);
      return v ? 'explicit' : 'system';
    } catch {
      return 'system';
    }
  }, [i18n.language]);

  const resolved = useMemo(() => {
    if (mode === 'explicit') return i18n.language.split('-')[0];
    return getSystemLanguage();
  }, [mode]);

  const setSystem = () => {
    try { localStorage.removeItem(LANG_STORAGE_KEY); } catch {}
    const sys = getSystemLanguage();
    i18n.changeLanguage(sys);
  };

  const setLang = (lng: 'en' | 'de') => {
    try { localStorage.setItem(LANG_STORAGE_KEY, lng); } catch {}
    i18n.changeLanguage(lng);
  };

  const title = mode === 'system' ? `System (${resolved})` : (resolved === 'de' ? 'Deutsch' : 'English');

  return (
    <div className="inline-flex items-center gap-2">
      <label className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">Lang:</label>
      <div className="relative">
        <select
          aria-label="Language"
          className="px-3 py-1.5 rounded-md border text-xs font-medium \
                     border-slate-300 text-slate-700 bg-white dark:bg-slate-900 \
                     dark:border-slate-700 dark:text-slate-300"
          value={mode === 'system' ? 'system' : resolved}
          onChange={(e) => {
            const val = e.target.value as 'system' | 'en' | 'de';
            if (val === 'system') setSystem(); else setLang(val);
          }}
          title={`Language: ${title}`}
        >
          <option value="system">System</option>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>
  );
};
