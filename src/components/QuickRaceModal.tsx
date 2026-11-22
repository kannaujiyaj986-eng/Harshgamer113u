import React, { useState } from 'react';
import { Flag, Play, Timer, X } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { WORLDS } from '../data/worlds';
import { Difficulty, GameMode } from '../types/game';

interface QuickRaceModalProps {
  defaultDifficulty: Difficulty;
  onStart: (params: { mode: GameMode; levelId: number; difficulty: Difficulty }) => void;
  onClose: () => void;
}

export const QuickRaceModal: React.FC<QuickRaceModalProps> = ({
  defaultDifficulty,
  onStart,
  onClose,
}) => {
  const [mode, setMode] = useState<'quick_race' | 'time_trial'>('quick_race');
  const [worldId, setWorldId] = useState(1);
  const [levelOffset, setLevelOffset] = useState(1);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);

  const selectedLevelId = (worldId - 1) * 10 + levelOffset;
  const level = LEVELS[selectedLevelId - 1];
  const world = WORLDS[worldId - 1];

  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-display text-xl font-bold tracking-wider text-white">
            QUICK RACE &amp; TIME TRIAL
          </h2>
          <button
            onClick={onClose}
            aria-label="Close Quick Race"
            title="Close Quick Race"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1">
          <button
            onClick={() => setMode('quick_race')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-display font-bold tracking-wider cursor-pointer ${
              mode === 'quick_race' ? 'bg-sky-400 text-slate-950' : 'text-slate-300'
            }`}
          >
            <Flag className="h-4 w-4" />
            <span>QUICK RACE (AI)</span>
          </button>
          <button
            onClick={() => setMode('time_trial')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-display font-bold tracking-wider cursor-pointer ${
              mode === 'time_trial' ? 'bg-sky-400 text-slate-950' : 'text-slate-300'
            }`}
          >
            <Timer className="h-4 w-4" />
            <span>TIME TRIAL (SOLO)</span>
          </button>
        </div>

        {/* World Picker */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-400">Select Environment World</label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {WORLDS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWorldId(w.id)}
                className={`rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold cursor-pointer truncate ${
                  worldId === w.id
                    ? 'border-sky-400 bg-sky-500/20 text-white'
                    : 'border-white/10 bg-slate-950/70 text-slate-400 hover:text-white'
                }`}
              >
                W{w.id}: {w.environmentName}
              </button>
            ))}
          </div>
        </div>

        {/* Track Variation Picker 1-10 */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-400">Track Layout (1–10)</label>
          <div className="mt-2 grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setLevelOffset(num)}
                className={`rounded-lg border py-2 text-xs font-mono-tabular font-bold cursor-pointer ${
                  levelOffset === num
                    ? 'border-sky-400 bg-sky-400 text-slate-950'
                    : 'border-white/10 bg-slate-950/70 text-slate-300'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* AI Difficulty */}
        {mode === 'quick_race' && (
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-400">AI Difficulty</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`rounded-lg border py-2 text-xs font-display font-bold tracking-wider cursor-pointer ${
                    difficulty === d
                      ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                      : 'border-white/10 bg-slate-950/70 text-slate-400'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Track Summary */}
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-xs text-slate-300">
          <div className="font-display font-bold text-white">
            Level {level.id}: {level.name}
          </div>
          <div className="mt-0.5 text-slate-400">
            {world.environmentName} · {level.laps} Laps · {level.boostPadCount} Boost Strips · {level.obstacleCount} Chicanes
          </div>
        </div>

        <button
          onClick={() => onStart({ mode, levelId: selectedLevelId, difficulty })}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 py-3.5 font-display text-sm font-bold tracking-wider text-slate-950 hover:bg-sky-300 cursor-pointer min-h-[48px]"
        >
          <Play className="h-4 w-4 fill-slate-950" />
          <span>START {mode === 'quick_race' ? 'QUICK RACE' : 'TIME TRIAL'}</span>
        </button>
      </div>
    </div>
  );
};
