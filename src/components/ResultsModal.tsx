import React from 'react';
import { ArrowRight, Crown, Home, RotateCcw, Star, Trophy, X } from 'lucide-react';
import { getLevelById } from '../data/levels';
import { RaceResult } from '../types/game';

interface ResultsModalProps {
  result: RaceResult;
  onNextLevel: (levelId: number) => void;
  onRetry: () => void;
  onExit: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  result,
  onNextLevel,
  onRetry,
  onExit,
}) => {
  const level = getLevelById(result.levelId);
  const rawTotal = result.coinsEarned + result.firstClearBonus + result.driftBonus;
  const totalCoins = result.boosterMultiplierApplied ? rawTotal * 2 : rawTotal;

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/88 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onExit}
          aria-label="Close Results"
          title="Return to Menu"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Title & Position */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs font-display font-bold tracking-widest text-sky-400">
            {result.levelId === 100 && result.victory ? (
              <Crown className="h-4 w-4 text-amber-400" />
            ) : (
              <Trophy className="h-4 w-4 text-amber-400" />
            )}
            <span>
              LEVEL {result.levelId} · {level.name.toUpperCase()}
            </span>
          </div>

          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-wider text-white">
            {result.victory
              ? result.levelId === 100
                ? 'GRAND CHAMPION!'
                : result.mode === 'time_trial'
                  ? 'TIME TRIAL COMPLETE'
                  : 'RACE VICTORY!'
              : `FINISHED #${result.position}`}
          </h2>

          {/* 3-Star Rating */}
          <div className="mt-4 flex items-center justify-center gap-3">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`h-9 w-9 transition-transform ${
                  s <= result.stars
                    ? 'fill-amber-400 text-amber-400 scale-110'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Special Level 100 Unlock Banner */}
        {result.unlockedChampionCar && (
          <div className="mt-4 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 p-3 text-center">
            <div className="font-display text-sm font-bold text-amber-300">
              CHAMPIONSHIP TROPHY UNLOCKED
            </div>
            <div className="text-xs text-amber-100 mt-0.5">
              Golden CARFLY Champion Car is now unlocked in your Garage!
            </div>
          </div>
        )}

        {/* Stats & Coin Breakdown */}
        <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-slate-950/70 p-4 text-sm tabular-nums">
          <div className="flex justify-between">
            <span className="text-slate-400">Finish Time</span>
            <span className="font-mono-tabular font-bold text-white">
              {formatTime(result.timeMs)}
              {result.isNewRecord && (
                <span className="ml-2 text-xs text-emerald-400">NEW RECORD</span>
              )}
            </span>
          </div>
          {result.mode !== 'time_trial' && (
            <div className="flex justify-between">
              <span className="text-slate-400">Position</span>
              <span className="font-bold text-amber-300">
                {result.position} / {result.totalRacers}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-2">
            <span className="text-slate-400">Race Reward</span>
            <span className="font-mono-tabular text-amber-300">+{result.coinsEarned} C</span>
          </div>
          {result.firstClearBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">First Clear Bonus</span>
              <span className="font-mono-tabular text-emerald-300">+{result.firstClearBonus} C</span>
            </div>
          )}
          {result.driftBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Corner Drift Bonus</span>
              <span className="font-mono-tabular text-sky-300">+{result.driftBonus} C</span>
            </div>
          )}
          {result.boosterMultiplierApplied && (
            <div className="flex justify-between text-xs font-bold text-emerald-300">
              <span>2x Coin Booster</span>
              <span>APPLIED (x2)</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-2 font-bold">
            <span className="text-white">Total Earned</span>
            <span className="font-mono-tabular text-amber-300">+{totalCoins.toLocaleString()} C</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onExit}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-800 px-4 py-3 text-xs font-display font-bold tracking-wider text-slate-200 hover:border-white/30 cursor-pointer min-h-[44px]"
          >
            <Home className="h-4 w-4" />
            <span>MENU</span>
          </button>
          <button
            onClick={onRetry}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-3 text-xs font-display font-bold tracking-wider text-sky-200 hover:bg-sky-500/25 cursor-pointer min-h-[44px]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>RETRY</span>
          </button>
          {result.unlockedNextLevel && (
            <button
              onClick={() => onNextLevel(result.unlockedNextLevel!)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-xs font-display font-bold tracking-wider text-slate-950 hover:bg-sky-300 cursor-pointer min-h-[44px]"
            >
              <span>LEVEL {result.unlockedNextLevel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
