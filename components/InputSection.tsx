import React, { useState, useEffect, useRef } from 'react';
import { TimeFrame, ChannelSuggestion } from '../types';
import { TIME_FRAMES, MAX_RESULTS_OPTIONS } from '../constants';
import { Search, Loader2, Link2, X, Youtube, ListFilter } from 'lucide-react';
import { searchChannels, extractChannelIdentifier } from '../services/youtubeService';

interface InputSectionProps {
  onSearch: (channel: string, timeFrame: TimeFrame, maxResults: number) => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ onSearch, isLoading }) => {
  const [inputValue, setInputValue] = useState('TEDx');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(TimeFrame.LAST_24_HOURS);
  const [maxResults, setMaxResults] = useState<number>(25);
  
  // Autocomplete State
  const [suggestions, setSuggestions] = useState<ChannelSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

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
  };

  const clearInput = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Extract clean identifier (handle or ID) from URL if present
      const cleanIdentifier = extractChannelIdentifier(inputValue);
      onSearch(cleanIdentifier, timeFrame, maxResults);
      setShowSuggestions(false);
    }
  };

  return (
    <div className="w-full bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-800 mb-8 relative group" ref={wrapperRef}>
      {/* Glow Effect */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-5 items-end relative z-10">
        
        {/* Channel Input with Autocomplete */}
        <div className="flex-1 w-full space-y-2 relative">
          <label htmlFor="channel" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            YouTube Kanal Name oder Link
          </label>
          <div className="relative group/input">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              {inputValue.includes('http') ? (
                 <Link2 className="w-5 h-5 text-indigo-400" />
              ) : (
                 <Youtube className="w-5 h-5 text-slate-500 group-focus-within/input:text-red-500 transition-colors" />
              )}
            </div>
            
            <input
              type="text"
              id="channel"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => inputValue.length >= 2 && !inputValue.includes('http') && setShowSuggestions(true)}
              className="block w-full pl-11 pr-10 py-4 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-600 transition-all shadow-inner text-lg"
              placeholder="z.B. TEDx oder https://youtube.com/@..."
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
                  className="text-slate-600 hover:text-slate-300 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                <ul>
                  {suggestions.map((sug) => (
                    <li key={sug.id}>
                      <button
                        type="button"
                        onClick={() => selectSuggestion(sug)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors flex items-center gap-3 group/item"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-950 flex-shrink-0 border border-slate-700">
                          <img src={sug.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-slate-200 font-medium truncate group-hover/item:text-indigo-400 transition-colors">{sug.title}</p>
                          {sug.handle && <p className="text-xs text-slate-500 truncate">{sug.handle}</p>}
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
              Zeitraum
            </label>
            <div className="relative">
              <select
                id="timeframe"
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
                className="block w-full py-4 px-4 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white transition-all appearance-none text-base cursor-pointer hover:bg-slate-900 truncate"
                disabled={isLoading}
              >
                {TIME_FRAMES.map((tf) => (
                  <option key={tf.value} value={tf.value}>
                    {tf.label}
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
              <ListFilter className="w-3 h-3" /> Max. Ergebnisse
            </label>
            <div className="relative">
              <select
                id="maxResults"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="block w-full py-4 px-4 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white transition-all appearance-none text-base cursor-pointer hover:bg-slate-900 truncate"
                disabled={isLoading}
              >
                {MAX_RESULTS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="w-full xl:w-auto py-4 px-8 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              <span>Analysiere...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Trends finden</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};