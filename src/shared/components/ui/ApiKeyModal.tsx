import React, {useState} from 'react';
import {Check, HelpCircle, Key, ExternalLink, Zap} from 'lucide-react';
import {useTranslation} from 'react-i18next';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim().length > 10) {
      onSave(inputKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Key className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('modal.apiKey.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400">{t('modal.apiKey.description')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                YouTube Data API v3 Key
              </label>
              <input
                type="text"
                id="apiKey"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all font-mono text-sm"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={inputKey.length < 10}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              {t('modal.apiKey.save')}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 text-sm hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors mx-auto"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t('modal.apiKey.helpToggle')}</span>
            </button>

            {showHelp && (
              <div className="mt-4 text-xs text-slate-600 dark:text-slate-300 space-y-3 bg-slate-100/50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">{t('modal.apiKey.quotaTitle')}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{t('modal.apiKey.quotaInfo')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium text-slate-700 dark:text-slate-200">{t('modal.apiKey.stepsTitle')}</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
                    <li>
                      <a
                        href="https://console.cloud.google.com/marketplace/product/google/youtube.googleapis.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-500 dark:text-indigo-400 underline decoration-indigo-500/30 hover:text-indigo-400 inline-flex items-center gap-1"
                      >
                        {t('modal.apiKey.step1')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>{t('modal.apiKey.step2')}</li>
                    <li>{t('modal.apiKey.step3')}</li>
                    <li>{t('modal.apiKey.step4')}</li>
                    <li>{t('modal.apiKey.step5')}</li>
                  </ol>
                </div>

                <div className="pt-2 text-slate-400 dark:text-slate-500 text-[10px]">
                  {t('modal.apiKey.keyFormat')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
