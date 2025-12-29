import React, {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {LANG_STORAGE_KEY} from '@/src/i18n/config';

type Mode = 'system' | 'explicit';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
] as const;

type ExplicitLang = (typeof LANGS)[number]['code'];

const SUPPORTED = LANGS.map(l => l.code) as unknown as ExplicitLang[];

function normalizeLangCode(lng: string): string {
  return (lng || 'en').split('-')[0].toLowerCase();
}

function readExplicitLanguage(): ExplicitLang | null {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (!v) return null;
    const n = normalizeLangCode(v);
    return (SUPPORTED as unknown as string[]).includes(n) ? (n as ExplicitLang) : null;
  } catch {
    return null;
  }
}

function getSystemLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || (navigator as any).userLanguage || 'en';
  const short = normalizeLangCode(lang);
  return (SUPPORTED as unknown as string[]).includes(short) ? short : 'en';
}

export const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [mode, setMode] = useState<Mode>(() => (readExplicitLanguage() ? 'explicit' : 'system'));
  const [explicitLng, setExplicitLng] = useState<ExplicitLang>(() => readExplicitLanguage() ?? 'en');

  // Sync with external changes (e.g. another tab or programmatic language change)
  useEffect(() => {
    const v = readExplicitLanguage();
    if (v) {
      setMode('explicit');
      setExplicitLng(v);
    } else {
      setMode('system');
    }
  }, [i18n.language]);

  const systemLng = useMemo(() => getSystemLanguage(), [i18n.resolvedLanguage]);

  const title = mode === 'system'
    ? `${t('language.system')} (${systemLng})`
    : (LANGS.find(l => l.code === explicitLng)?.label ?? explicitLng);

  const setSystem = () => {
    try { localStorage.removeItem(LANG_STORAGE_KEY); } catch {}
    setMode('system');
    const sys = getSystemLanguage();
    i18n.changeLanguage(sys);
  };

  const setLang = (lng: ExplicitLang) => {
    try { localStorage.setItem(LANG_STORAGE_KEY, lng); } catch {}
    setMode('explicit');
    setExplicitLng(lng);
    i18n.changeLanguage(lng);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <label className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">{t('language.label')}</label>
      <div className="relative">
        <select
          aria-label="Language"
          className="px-3 py-1.5 rounded-md border text-xs font-medium \
                     border-slate-300 text-slate-700 bg-white dark:bg-slate-900 \
                     dark:border-slate-700 dark:text-slate-300"
          value={mode === 'system' ? 'system' : explicitLng}
          onChange={(e) => {
            const val = e.target.value as 'system' | ExplicitLang;
            if (val === 'system') setSystem(); else setLang(val);
          }}
          title={`Language: ${title}`}
        >
          <option value="system">{t('language.system')}</option>
          {LANGS.map((lng) => (
            <option key={lng.code} value={lng.code}>{lng.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
