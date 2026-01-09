import {Activity, BarChart3, LayoutDashboard, Settings} from 'lucide-react';
import {ThemeToggle} from '@/src/shared/components/ui/ThemeToggle';
import {LanguageSwitcher} from '@/src/shared/components/ui/LanguageSwitcher';
import {ApiQuotaIndicator} from '@/src/shared/components/ui/ApiQuotaIndicator';
import {useTranslation} from 'react-i18next';

export type PageType = 'dashboard' | 'analyser';

interface HeaderProps {
  activePage: PageType;
  onPageChange: (page: PageType) => void;
  apiKey: string | null;
  isLoading: boolean;
  loadingStep?: 'fetching_youtube' | 'analyzing_ai';
  onResetApiKey: () => void;
}

export function Header({
  activePage,
  onPageChange,
  apiKey,
  isLoading,
  loadingStep,
  onResetApiKey,
}: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="bg-white/80 border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg shadow-lg shadow-red-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 hidden sm:block">
            {t('appTitle')}
          </h1>

          <nav className="ml-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                ${activePage === 'dashboard'
                  ? 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                  : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white'}
              `}
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange('analyser')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                ${activePage === 'analyser'
                  ? 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                  : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white'}
              `}
              title="Analyser"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analyser</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse">
              <Activity className="w-3 h-3 animate-spin" />
              <span>
                {loadingStep === 'fetching_youtube'
                  ? 'Lade offizielle Daten...'
                  : 'Berechne Statistiken...'}
              </span>
            </div>
          ) : (
            <>
              {apiKey && (
                <button
                  onClick={onResetApiKey}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                             border-slate-300 text-slate-700 hover:bg-slate-100
                             dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  title={t('actions.resetApiKey')}
                >
                  <Settings className="w-3 h-3" />
                  <span>{t('actions.resetApiKey')}</span>
                </button>
              )}
            </>
          )}

          <div className="flex items-center gap-2">
            {apiKey && <ApiQuotaIndicator />}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
