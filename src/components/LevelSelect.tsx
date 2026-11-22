import React, { useState } from 'react';
import { ArrowLeft, Crown, Lock, Play, Star, Trophy, X } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { WORLDS } from '../data/worlds';
import { SaveData } from '../types/game';

interface LevelSelectProps {
  save: SaveData;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

function formatTime(ms: number | null): string {
  if (!ms) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export const LevelSelect: React.FC<LevelSelectProps> = ({ save, onSelectLevel, onBack }) => {
  // Start on the world of the highest unlocked level
  const initialWorld = (() => {
    let highest = 1;
    for (let i = 1; i <= 100; i++) {
      if (save.levels[i]?.unlocked) highest = i;
    }
    return Math.ceil(highest / 10);
  })();

  const [selectedWorldId, setSelectedWorldId] = useState<number>(initialWorld);
  const world = WORLDS[selectedWorldId - 1];
  const worldLevels = LEVELS.filter((l) => l.worldId === selectedWorldId);
  const totalStars = Object.values(save.levels).reduce((acc, l) => acc + l.stars, 0);

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col bg-slate-950/92 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-4 py-2.5 text-xs font-display font-bold tracking-wider text-slate-100 hover:border-sky-400/60 cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>MENU</span>
          </button>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-wide text-white">
              100 RACING LEVELS
            </h1>
            <p className="text-xs text-slate-400">
              10 Ground Racing Worlds · {totalStars} / 300 Stars Earned
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/25 bg-slate-900 px-4 py-2 text-xs font-semibold text-amber-300 tabular-nums">
            <Trophy className="h-4 w-4" />
            <span>Level 100 Reward: Golden CARFLY Champion</span>
          </div>
          <button
            onClick={onBack}
            aria-label="Close Levels"
            title="Close Levels"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 10 World Selector Tabs */}
      <div className="carfly-scroll mt-4 flex gap-2 overflow-x-auto pb-2 shrink-0">
        {WORLDS.map((w) => {
          const wLevels = LEVELS.filter((l) => l.worldId === w.id);
          const wStars = wLevels.reduce((s, l) => s + (save.levels[l.id]?.stars ?? 0), 0);
          const isActive = w.id === selectedWorldId;
          return (
            <button
              key={w.id}
              onClick={() => setSelectedWorldId(w.id)}
              className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors whitespace-nowrap shrink-0 cursor-pointer min-w-[165px] ${
                isActive
                  ? 'border-sky-400 bg-sky-500/20 text-white'
                  : 'border-white/10 bg-slate-900/80 text-slate-300 hover:border-white/25'
              }`}
            >
              <span className="font-display text-xs font-bold tracking-wider text-sky-300">
                WORLD {w.id} · {w.subtitle}
              </span>
              <span className="mt-0.5 text-xs font-semibold truncate max-w-[145px]">
                {w.name}
              </span>
              <span className="mt-1 text-[11px] text-amber-300 tabular-nums">
                {wStars} / 30 Stars
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected World Banner */}
      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-4 py-3"
        style={{ background: `linear-gradient(90deg, ${world.skyTop}33, ${world.roadColor}dd)` }}
      >
        <div>
          <span className="text-xs font-display font-bold tracking-wider text-sky-300">
            WORLD {world.id}: {world.environmentName.toUpperCase()}
          </span>
          <h2 className="font-display text-lg font-bold text-white">{world.name}</h2>
        </div>
        <span className="text-xs text-slate-300">
          {world.id === 10
            ? 'Final Championship Circuit · Win Level 100 for Trophy & Golden Car'
            : 'Complete any level to unlock the next circuit'}
        </span>
      </div>

      {/* 10 Levels Grid */}
      <div className="carfly-scroll mt-4 grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-y-auto pr-1">
        {worldLevels.map((lvl) => {
          const prog = save.levels[lvl.id];
          const unlocked = prog?.unlocked ?? lvl.id === 1;
          const stars = prog?.stars ?? 0;

          return (
            <button
              key={lvl.id}
              disabled={!unlocked}
              onClick={() => unlocked && onSelectLevel(lvl.id)}
              className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all min-h-[152px] ${
                lvl.isFinalChampionship
                  ? unlocked
                    ? 'border-amber-400/70 bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 hover:border-amber-300 cursor-pointer'
                    : 'border-amber-500/25 bg-slate-900/60 opacity-65 cursor-not-allowed'
                  : unlocked
                    ? 'border-white/12 bg-slate-900/90 hover:border-sky-400/70 hover:bg-slate-800/95 cursor-pointer'
                    : 'border-white/5 bg-slate-900/45 opacity-55 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-display text-xs font-bold tracking-wider text-sky-400">
                    LEVEL {lvl.id}
                  </span>
                  <h3 className="mt-0.5 font-display text-sm font-bold text-white leading-snug">
                    {lvl.name}
                  </h3>
                </div>
                {lvl.isFinalChampionship ? (
                  <Crown className="h-5 w-5 text-amber-400 shrink-0" />
                ) : unlocked ? (
                  <Play className="h-4 w-4 text-sky-400 opacity-75 group-hover:opacity-100 shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-slate-500 shrink-0" />
                )}
              </div>

              <div className="mt-3 space-y-1 text-[11px] text-slate-400 tabular-nums">
                <div>
                  {lvl.laps} {lvl.laps === 1 ? 'Lap' : 'Laps'} · {lvl.aiCount} AI · {lvl.boostPadCount} Boost Pads
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Best: {formatTime(prog?.bestTimeMs ?? null)}</span>
                  <span className="text-amber-300">+{lvl.coinReward} C</span>
                </div>
              </div>

              {/* 3-Star Rating */}
              <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${
                      s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                    }`}
                  />
                ))}
                <span className="ml-auto text-[11px] font-semibold text-slate-300">
                  {unlocked ? (prog?.completed ? 'REPLAY' : 'RACE') : 'LOCKED'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
