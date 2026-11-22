import React from 'react';
import { Award, Check, Gift, X } from 'lucide-react';
import { ACHIEVEMENTS, DAILY_REWARD_AMOUNTS } from '../data/achievements';
import { canClaimDailyReward, getAchievementProgress } from '../storage/saveSystem';
import { SaveData } from '../types/game';

interface RewardsModalProps {
  save: SaveData;
  onClaimDaily: () => void;
  onClaimAchievement: (id: string, reward: number) => void;
  onClose: () => void;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({
  save,
  onClaimDaily,
  onClaimAchievement,
  onClose,
}) => {
  const dailyAvailable = canClaimDailyReward(save);
  const currentDay = save.dailyReward.streakDay % 7;

  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold tracking-wider text-white">
              REWARDS &amp; ACHIEVEMENTS
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Rewards"
            title="Close Rewards"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="carfly-scroll mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
          {/* 7-Day Daily Rewards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-sm font-display font-bold text-white">
                <Gift className="h-4 w-4 text-amber-400" />
                <span>DAILY RACING BONUS</span>
              </div>
              <button
                disabled={!dailyAvailable}
                onClick={onClaimDaily}
                className={`rounded-lg px-4 py-1.5 text-xs font-display font-bold tracking-wider ${
                  dailyAvailable
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-default'
                }`}
              >
                {dailyAvailable ? `CLAIM +${DAILY_REWARD_AMOUNTS[currentDay]} C` : 'CLAIMED TODAY'}
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {DAILY_REWARD_AMOUNTS.map((amt, idx) => {
                const isToday = idx === currentDay;
                const isPast = idx < currentDay;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center rounded-xl border p-2 text-center ${
                      isToday && dailyAvailable
                        ? 'border-amber-400 bg-amber-500/20'
                        : isPast
                          ? 'border-emerald-500/30 bg-emerald-500/10'
                          : 'border-white/10 bg-slate-950/60'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400">Day {idx + 1}</span>
                    <span className="mt-1 font-mono-tabular text-xs font-bold text-amber-300">
                      {amt}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isPast ? 'Done' : isToday ? (dailyAvailable ? 'Ready' : 'Claimed') : 'Coins'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <h3 className="text-sm font-display font-bold text-white mb-2.5">
              CAREER ACHIEVEMENTS
            </h3>
            <div className="space-y-2">
              {ACHIEVEMENTS.map((ach) => {
                const prog = Math.min(ach.target, getAchievementProgress(save, ach));
                const claimed = save.claimedAchievements.includes(ach.id);
                const ready = !claimed && prog >= ach.target;
                const pct = Math.round((prog / ach.target) * 100);

                return (
                  <div
                    key={ach.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/75 p-3.5"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center justify-between text-sm font-bold text-white">
                        <span>{ach.title}</span>
                        <span className="font-mono-tabular text-xs text-slate-400">
                          {prog} / {ach.target}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{ach.description}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-sky-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      disabled={!ready}
                      onClick={() => ready && onClaimAchievement(ach.id, ach.rewardCoins)}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-display font-bold tracking-wider whitespace-nowrap shrink-0 min-h-[40px] ${
                        claimed
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : ready
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                            : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>CLAIMED</span>
                        </>
                      ) : (
                        <span>+{ach.rewardCoins} C</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
