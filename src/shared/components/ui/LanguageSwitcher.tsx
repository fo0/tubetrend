import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LANG_STORAGE_KEY } from "@/src/i18n/config";

type Mode = "system" | "explicit";

const LANGS = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "tr", label: "Türkçe" },
  { code: "ru", label: "Русский" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
] as const;

type ExplicitLang = (typeof LANGS)[number]["code"];

const SUPPORTED = LANGS.map((l) => l.code) as unknown as ExplicitLang[];

/**
 * The languages that actually ship a resource bundle (`src/i18n/locales/`).
 * The other eleven entries above are in i18next's `supportedLngs` so the
 * detector accepts them, but they have no bundle — picking one renders English
 * through `fallbackLng` (see the comment in `src/i18n/config.ts`).
 *
 * The picker used to be one flat list, so choosing "Français" left a control
 * confidently reading "Français" above an untouched English UI, with nothing to
 * tell the user whether they had mis-clicked or the app was broken. Splitting
 * the options into two labelled groups states the outcome before the click.
 * Keep this list in sync with the `resources` map in `src/i18n/config.ts`.
 */
const TRANSLATED_LANGS: readonly ExplicitLang[] = ["en", "de"];

function normalizeLangCode(lng: string): string {
  return (lng || "en").split("-")[0].toLowerCase();
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
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || "en";
  const short = normalizeLangCode(lang);
  return (SUPPORTED as unknown as string[]).includes(short) ? short : "en";
}

export const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [mode, setMode] = useState<Mode>(() => (readExplicitLanguage() ? "explicit" : "system"));
  const [explicitLng, setExplicitLng] = useState<ExplicitLang>(
    () => readExplicitLanguage() ?? "en",
  );

  // Sync with external changes (e.g. another tab or programmatic language change)
  useEffect(() => {
    const v = readExplicitLanguage();
    if (v) {
      setMode("explicit");
      setExplicitLng(v);
    } else {
      setMode("system");
    }
  }, [i18n.language]);

  // i18n.resolvedLanguage is a cache-buster, not an input: getSystemLanguage()
  // reads the navigator/i18next detector imperatively, so the resolved language is
  // the only signal that its answer can have changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const systemLng = useMemo(() => getSystemLanguage(), [i18n.resolvedLanguage]);

  const title =
    mode === "system"
      ? `${t("language.system")} (${systemLng})`
      : (LANGS.find((l) => l.code === explicitLng)?.label ?? explicitLng);

  const setSystem = () => {
    try {
      localStorage.removeItem(LANG_STORAGE_KEY);
    } catch {
      // ignore storage errors — the language still switches in memory
    }
    setMode("system");
    const sys = getSystemLanguage();
    i18n.changeLanguage(sys);
  };

  const setLang = (lng: ExplicitLang) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lng);
    } catch {
      // ignore storage errors — the language still switches in memory
    }
    setMode("explicit");
    setExplicitLng(lng);
    i18n.changeLanguage(lng);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <label
        htmlFor="language-select"
        className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline"
      >
        {t("language.label")}
      </label>
      <div className="relative">
        <select
          id="language-select"
          aria-label={t("language.label")}
          className="px-3 py-1.5 rounded-md border text-xs font-medium border-slate-300 text-slate-700 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
          value={mode === "system" ? "system" : explicitLng}
          onChange={(e) => {
            const val = e.target.value as "system" | ExplicitLang;
            if (val === "system") setSystem();
            else setLang(val);
          }}
          title={`${t("language.label")} ${title}`}
        >
          <option value="system">{t("language.system")}</option>
          <optgroup label={t("language.groupTranslated")}>
            {LANGS.filter((lng) => TRANSLATED_LANGS.includes(lng.code)).map((lng) => (
              <option key={lng.code} value={lng.code}>
                {lng.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={t("language.groupFallback")}>
            {LANGS.filter((lng) => !TRANSLATED_LANGS.includes(lng.code)).map((lng) => (
              <option key={lng.code} value={lng.code}>
                {lng.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    </div>
  );
};
