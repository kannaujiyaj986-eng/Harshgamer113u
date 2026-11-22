import React from 'react';
import { Home, Play, RotateCcw, Settings, X } from 'lucide-react';
import { t } from '../data/i18n';
import { AppLanguage } from '../types/game';

interface PauseModalProps {
  language: AppLanguage;
  levelName: string;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  language,
  levelName,
  onResume,
  onRestart,
  onOpenSettings,
  onExit,
}) => {
  const tr = t(language);
  return (
    <div
      onClick={onResume}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
      >
        <button
          onClick={onResume}
          aria-label="Close Pause"
          title="Resume"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <span className="text-xs font-display font-bold tracking-widest text-sky-400">
            {levelName}
          </span>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-wider text-white">
            {tr.pause}
          </h2>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-400 py-3 font-display text-sm font-bold tracking-wider text-slate-950 hover:bg-sky-300 cursor-pointer min-h-[46px]"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            <span>{tr.resume}</span>
          </button>
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-800 py-3 font-display text-sm font-bold tracking-wider text-white hover:border-sky-400/50 cursor-pointer min-h-[46px]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{tr.restart}</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-800 py-3 font-display text-sm font-bold tracking-wider text-white hover:border-sky-400/50 cursor-pointer min-h-[46px]"
          >
            <Settings className="h-4 w-4" />
            <span>{tr.settings}</span>
          </button>
          <button
            onClick={onExit}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 py-3 font-display text-sm font-bold tracking-wider text-rose-200 hover:bg-rose-500/20 cursor-pointer min-h-[46px]"
          >
            <Home className="h-4 w-4" />
            <span>{tr.exitMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
