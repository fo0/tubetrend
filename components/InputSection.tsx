import React, { useState, useEffect, useRef } from 'react';
import { TimeFrame, ChannelSuggestion, coerceTimeFrame } from '../types';
import { TIME_FRAMES, MAX_RESULTS_OPTIONS } from '../constants';
import { Search, Loader2, Link2, X, Youtube, ListFilter, History, Star } from 'lucide-react';
import { searchChannels, extractChannelIdentifier } from '../services/youtubeService';
import { favoritesService } from '../services/favoritesService';
import { useTranslation } from 'react-i18next';

// Default search input can be configured via Vite env: VITE_DEFAULT_SEARCH
// Behavior:
// - If VITE_DEFAULT_SEARCH is set, use that value.
// - Else: in dev mode default to 'TEDx', in prod default to empty string.
const DEFAULT_SEARCH_INPUT: string = (
  (import.meta as any)?.env?.VITE_DEFAULT_SEARCH ?? (((import.meta as any)?.env?.DEV) ? 'TEDx' : '')
);

interface InputSectionProps {
  onSearch: (channel: string, timeFrame: TimeFrame, maxResults: number) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onSearch, isLoading }) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState<string>(DEFAULT_SEARCH_INPUT);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(TimeFrame.LAST_24_HOURS);
  const [maxResults, setMaxResults] = useState<number>(25);
  
  // Autocomplete State
  const [suggestions, setSuggestions] = useState<ChannelSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  
  // Local history state (last 10 entries)
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Load last selected timeframe and max results from localStorage once
  useEffect(() => {
    try {
      const tf = localStorage.getItem('tt.search.timeframe');
      if (tf) {
        setTimeFrame(coerceTimeFrame(tf));
      }
      const mr = localStorage.getItem('tt.search.maxResults');
      if (mr) {
        const n = parseInt(mr, 10);
        if (!Number.isNaN(n)) {
          setMaxResults(n);
        }
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Persist timeframe and maxResults on change
  useEffect(() => {
    try {
      localStorage.setItem('tt.search.timeframe', timeFrame);
      localStorage.setItem('tt.search.maxResults', String(maxResults));
    } catch (e) {
      // ignore storage errors
    }
  }, [timeFrame, maxResults]);

  // Load history from storage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tt.search.history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.filter((x) => typeof x === 'string'));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const persistHistory = (next: string[]) => {
    try {
      localStorage.setItem('tt.search.history', JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  };

  const addToHistory = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setHistory((prev) => {
      const withoutDup = prev.filter((x) => x.toLowerCase() !== v.toLowerCase());
      const updated = [v, ...withoutDup].slice(0, 10);
      persistHistory(updated);
      return updated;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    // Hide history once user starts typing
    if (val.length > 0) setShowHistory(false);

    // If it looks like a URL, don't try to autocomplete
    if (val.includes('youtube.com') || val.includes('youtu.be')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce API call
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    setIsSearchingSuggestions(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchChannels(val);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 500); // 500ms delay
  };

  const selectSuggestion = (suggestion: ChannelSuggestion) => {
    setInputValue(suggestion.title); // Use title for display
    setSuggestions([]);
    setShowSuggestions(false);
    setShowHistory(false);
  };

  const clearInput = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    // keep history hidden until user focuses again
    setShowHistory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Extract clean identifier (handle or ID) from URL if present
      const cleanIdentifier = extractChannelIdentifier(inputValue);
      onSearch(cleanIdentifier, timeFrame, maxResults);
      setShowSuggestions(false);
      setShowHistory(false);
      // Save typed value to history (what the user entered)
      addToHistory(inputValue);
    }
  };

  const handleSaveFavorite = () => {
    if (!inputValue.trim()) return;
    const cleanIdentifier = extractChannelIdentifier(inputValue);
    favoritesService.add({ query: cleanIdentifier, timeFrame, maxResults });
    // kurzes visuelles Feedback
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
    // Status aktualisieren
    try {
      const exists = favoritesService.exists(cleanIdentifier, timeFrame, maxResults);
      setIsFavorite(exists);
    } catch {}
  };

  const handleFocus = () => {
    // Show history only when input is empty and there is history
    if (inputValue.length === 0 && history.length > 0) {
      setShowHistory(true);
      setShowSuggestions(false);
    } else if (inputValue.length >= 2 && !inputValue.includes('http')) {
      setShowSuggestions(true);
      setShowHistory(false);
    }
  };

  const selectHistoryItem = (val: string) => {
    setInputValue(val);
    setShowHistory(false);
    // Do not trigger search automatically; user can submit
  };

  // Synchronisiere Favoriten-Status, wenn Eingabe/Zeitfenster/MaxErgebnisse sich ändern
  useEffect(() => {
    const q = extractChannelIdentifier(inputValue || '');
    if (!q.trim()) {
      setIsFavorite(false);
      return;
    }
    try {
      const exists = favoritesService.exists(q, timeFrame, maxResults);
      setIsFavorite(exists);
    } catch {
      setIsFavorite(false);
    }
  }, [inputValue, timeFrame, maxResults]);

  return (
    <div className="w-full bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 mb-8 relative z-40 group" ref={wrapperRef}>
      {/* Glow Effect */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-5 items-end relative z-10">
        
        {/* Channel Input with Autocomplete */}
        <div className="flex-1 w-full space-y-2 relative">
          <label htmlFor="channel" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('labels.channelName')}
          </label>
          <div className="relative group/input">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              {inputValue.includes('http') ? (
                 <Link2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              ) : (
                 <Youtube className="w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within/input:text-red-500 transition-colors" />
              )}
            </div>
            
            <input
              type="text"
              id="channel"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              className="block w-full pl-11 pr-10 py-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-all shadow-inner text-lg"
              placeholder={t('input.channelPlaceholder')}
              disabled={isLoading}
              autoComplete="off"
            />
            
            {/* Loading Indicator or Clear Button */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {isSearchingSuggestions ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : inputValue && (
                <button 
                  type="button" 
                  onClick={clearInput}
                  className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                <ul>
                  {suggestions.map((sug) => (
                    <li key={sug.id}>
                      <button
                        type="button"
                        onClick={() => selectSuggestion(sug)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group/item"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                          <img src={sug.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-700 dark:text-slate-200 font-medium truncate group-hover/item:text-indigo-500 dark:group-hover/item:text-indigo-400 transition-colors">{sug.title}</p>
                          {sug.handle && <p className="text-xs text-slate-500 truncate">{sug.handle}</p>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* History Dropdown (shown only on focus when input is empty) */}
            {showHistory && history.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                <ul>
                  {history.map((item, idx) => (
                    <li key={`${item}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => selectHistoryItem(item)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group/item"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 flex-shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                          <History className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-700 dark:text-slate-200 font-medium truncate group-hover/item:text-indigo-500 dark:group-hover/item:text-indigo-400 transition-colors">{item}</p>
                          <p className="text-xs text-slate-500 truncate">{t('history.recent')}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Timeframe Select */}
          <div className="w-full sm:w-48 space-y-2">
            <label htmlFor="timeframe" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('labels.timeFrame')}
            </label>
            <div className="relative">
              <select
                id="timeframe"
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                className="block w-full py-4 px-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-900 dark:text-white transition-all appearance-none text-base cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 truncate"
                disabled={isLoading}
              >
                {TIME_FRAMES.map((tf) => (
                  <option key={tf.value} value={tf.value}>
                    {t(tf.labelKey)}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          {/* Max Results Select */}
          <div className="w-full sm:w-40 space-y-2">
            <label htmlFor="maxResults" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <ListFilter className="w-3 h-3" /> {t('labels.maxResults')}
            </label>
            <div className="relative">
              <select
                id="maxResults"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="block w-full py-4 px-4 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-900 dark:text-white transition-all appearance-none text-base cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 truncate"
                disabled={isLoading}
              >
                {MAX_RESULTS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey, opt.n ? { n: opt.n } : undefined)}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full xl:w-auto flex items-stretch gap-3">
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex-1 xl:flex-none py-4 px-8 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                <span>...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>{t('actions.search')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            disabled={isLoading || !inputValue.trim()}
            onClick={handleSaveFavorite}
            className={`px-4 xl:px-5 rounded-xl border font-semibold flex items-center gap-2 transition-colors ${
              isFavorite
                ? 'border-yellow-400/30 bg-yellow-500/10 text-yellow-500 dark:text-yellow-300'
                : (justSaved ? 'border-green-500/30 bg-green-500/10 text-green-500 dark:text-green-300' : 'border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800')
            }`}
            title={isFavorite ? t('favorites.alreadySaved') : t('favorites.saveTitle')}
          >
            <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            <span>{isFavorite ? t('favorites.favorite') : (justSaved ? t('favorites.saved') : t('favorites.saveButton'))}</span>
          </button>
        </div>
      </form>
    </div>
  );
};