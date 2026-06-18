import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, HelpCircle, Key, ExternalLink, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  // The key is masked by default (privacy / shoulder-surfing); a toggle reveals it.
  const [showKey, setShowKey] = useState(false);
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep focus inside the modal while it is open (WCAG 2.4.3)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim().length > 10) {
      onSave(inputKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apikey-modal-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Key className="w-8 h-8 text-red-500" />
            </div>
            <h2
              id="apikey-modal-title"
              className="text-2xl font-bold text-slate-900 dark:text-white"
            >
              {t("modal.apiKey.title")}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">{t("modal.apiKey.description")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2"
              >
                YouTube Data API v3 Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  id="apiKey"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all font-mono text-sm"
                  autoFocus
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? t("modal.apiKey.hideKey") : t("modal.apiKey.showKey")}
                  aria-pressed={showKey}
                  title={showKey ? t("modal.apiKey.hideKey") : t("modal.apiKey.showKey")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={inputKey.length < 10}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              {t("modal.apiKey.save")}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowHelp(!showHelp)}
              aria-expanded={showHelp}
              className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 text-sm hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors mx-auto"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t("modal.apiKey.helpToggle")}</span>
            </button>

            {showHelp && (
              <div className="mt-4 text-xs text-slate-600 dark:text-slate-300 space-y-3 bg-slate-100/50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {t("modal.apiKey.quotaTitle")}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {t("modal.apiKey.quotaInfo")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    {t("modal.apiKey.stepsTitle")}
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
                    <li>
                      <a
                        href="https://console.cloud.google.com/marketplace/product/google/youtube.googleapis.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-500 dark:text-indigo-400 underline decoration-indigo-500/30 hover:text-indigo-400 inline-flex items-center gap-1"
                      >
                        {t("modal.apiKey.step1")}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>{t("modal.apiKey.step2")}</li>
                    <li>{t("modal.apiKey.step3")}</li>
                    <li>{t("modal.apiKey.step4")}</li>
                    <li>{t("modal.apiKey.step5")}</li>
                  </ol>
                </div>

                <div className="pt-2 text-slate-400 dark:text-slate-500 text-[10px]">
                  {t("modal.apiKey.keyFormat")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
