import React, { useState } from 'react';
import { Key, Check, HelpCircle, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim().length > 10) {
      onSave(inputKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Key className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">YouTube API Zugang</h2>
            <p className="text-slate-400">
              Damit die App offizielle, echte Daten direkt von YouTube laden kann, benötigst du einen kostenlosen API Key.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-2">
                Dein YouTube Data API v3 Key
              </label>
              <input
                type="text"
                id="apiKey"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-600 outline-none transition-all font-mono text-sm"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={inputKey.length < 10}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              Speichern & Starten
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800">
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center gap-2 text-indigo-400 text-sm hover:text-indigo-300 transition-colors mx-auto"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Wie bekomme ich einen Key?</span>
            </button>
            
            {showHelp && (
              <div className="mt-4 text-xs text-slate-400 space-y-2 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                <p>1. Gehe zur <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 underline decoration-indigo-500/30">Google Cloud Console</a>.</p>
                <p>2. Erstelle ein neues Projekt.</p>
                <p>3. Suche in der Bibliothek nach <strong>"YouTube Data API v3"</strong> und aktiviere sie.</p>
                <p>4. Erstelle unter "Zugangsdaten" einen <strong>API-Schlüssel</strong>.</p>
                <p>5. Kopiere den Schlüssel (beginnt meist mit "AIza...") und füge ihn hier ein.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
