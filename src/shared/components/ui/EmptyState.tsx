import React from 'react';
import {Youtube} from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-200 dark:border-slate-700 animate-pulse">
        <Youtube className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">Bereit zur Analyse</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">
        Gib einen Kanalnamen ein und wähle einen Zeitraum, um die trendigsten Videos zu entdecken. Die KI sucht in Echtzeit nach Daten.
      </p>
    </div>
  );
};