import { useState } from 'react';
import { Info, Github, Calendar, GitBranch, GitCommitHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const buildInfo = __BUILD_INFO__;

export function Footer() {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const buildDate = new Date(buildInfo.buildDate);
  const formattedDate = buildDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = buildDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <footer className="mt-auto bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800">
      <div className="max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {t('appTitle')} v{buildInfo.version}
          </span>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('footer.toggleDetails')}
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('footer.buildInfo')}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {showDetails && (
            <div className="hidden md:flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1" title={t('footer.branch')}>
                <GitBranch className="w-3.5 h-3.5" />
                <span>{buildInfo.branch}</span>
              </span>
              <span className="flex items-center gap-1" title={t('footer.commitHash')}>
                <GitCommitHorizontal className="w-3.5 h-3.5" />
                <span>{buildInfo.commitHash.substring(0, 7)}</span>
              </span>
              <span className="flex items-center gap-1" title={t('footer.buildDate')}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate} {formattedTime}</span>
              </span>
            </div>
          )}
          <a
            href="https://github.com/fo0/tubetrend"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="GitHub"
          >
            <Github className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Mobile details panel */}
      {showDetails && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-2 bg-slate-50 dark:bg-slate-800">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5" />
              <span>{t('footer.branch')}:</span>
              <span>{buildInfo.branch}</span>
            </span>
            <span className="flex items-center gap-1">
              <GitCommitHorizontal className="w-3.5 h-3.5" />
              <span>{t('footer.commit')}:</span>
              <span>{buildInfo.commitHash.substring(0, 7)}</span>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('footer.built')}:</span>
              <span>{formattedDate} {formattedTime}</span>
            </span>
          </div>
        </div>
      )}
    </footer>
  );
}
