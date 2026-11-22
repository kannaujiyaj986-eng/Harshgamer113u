import React, { useState } from 'react';
import { Award, Car, Flame, Gauge, Star, Trophy, User, X } from 'lucide-react';
import { getCarById } from '../data/cars';
import { PlayerProfile, SaveData } from '../types/game';

interface ProfileModalProps {
  save: SaveData;
  onUpdateProfile: (profile: PlayerProfile) => void;
  onClose: () => void;
}

const AVATAR_COLORS = [
  '#06b6d4',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#f43f5e',
];

function getDriverRank(completedLevels: number, wins: number): string {
  if (completedLevels >= 90) return 'Grand Champion';
  if (completedLevels >= 60) return 'Apex Legend';
  if (completedLevels >= 35) return 'Pro Circuit Racer';
  if (wins >= 10) return 'Street Challenger';
  return 'Rookie Driver';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  save,
  onUpdateProfile,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(save.profile.driverName);

  const completedLevels = Object.values(save.levels).filter((l) => l.completed).length;
  const totalStars = Object.values(save.levels).reduce((acc, l) => acc + l.stars, 0);
  const ownedCars = Object.values(save.cars).filter((c) => c.unlocked).length;
  const activeCar = getCarById(save.selectedCarId);
  const winRate =
    save.stats.racesCompleted > 0
      ? Math.round((save.stats.racesWon / save.stats.racesCompleted) * 100)
      : 0;
  const rank = getDriverRank(completedLevels, save.stats.racesWon);

  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/88 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <User className="h-5 w-5 text-violet-400" />
            <h2 className="font-display text-xl font-bold tracking-wider text-white">
              DRIVER PROFILE
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Profile"
            title="Close Profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="carfly-scroll mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
          {/* Identity Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/80 p-4">
            <div className="flex items-center gap-3.5">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white/25 font-display text-2xl font-bold text-slate-950 shrink-0"
                style={{ backgroundColor: save.profile.avatarColor }}
              >
                {(save.profile.driverName || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-display font-bold tracking-widest text-amber-300">
                  {rank.toUpperCase()}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={20}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={() =>
                      onUpdateProfile({
                        ...save.profile,
                        driverName: nameInput.trim() || 'Apex Driver',
                      })
                    }
                    className="rounded-lg border border-white/15 bg-slate-900 px-3 py-1 text-sm font-bold text-white focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    onClick={() =>
                      onUpdateProfile({
                        ...save.profile,
                        driverName: nameInput.trim() || 'Apex Driver',
                      })
                    }
                    className="rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-display font-bold text-slate-950 hover:bg-sky-300 cursor-pointer"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Badge Color</div>
              <div className="flex gap-1.5">
                {AVATAR_COLORS.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => onUpdateProfile({ ...save.profile, avatarColor: hex })}
                    className={`h-6 w-6 rounded-full border-2 cursor-pointer ${
                      save.profile.avatarColor === hex ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Career Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ProfileStatCard icon={<Trophy className="h-4 w-4 text-amber-400" />} label="Wins / Races" value={`${save.stats.racesWon} / ${save.stats.racesCompleted}`} />
            <ProfileStatCard icon={<Award className="h-4 w-4 text-emerald-400" />} label="Win Rate" value={`${winRate}%`} />
            <ProfileStatCard icon={<Star className="h-4 w-4 text-amber-300" />} label="Stars Earned" value={`${totalStars} / 300`} />
            <ProfileStatCard icon={<Gauge className="h-4 w-4 text-sky-400" />} label="Top Speed" value={`${save.stats.topSpeedKmh} KM/H`} />
            <ProfileStatCard icon={<Car className="h-4 w-4 text-cyan-400" />} label="Cars Owned" value={`${ownedCars} / 11`} />
            <ProfileStatCard icon={<Flame className="h-4 w-4 text-orange-400" />} label="Nitro Boosts" value={`${save.stats.nitroUses}`} />
            <ProfileStatCard icon={<Gauge className="h-4 w-4 text-violet-400" />} label="Drift Time" value={`${Math.round(save.stats.totalDriftSeconds)}s`} />
            <ProfileStatCard icon={<Trophy className="h-4 w-4 text-sky-300" />} label="Levels Clear" value={`${completedLevels} / 100`} />
          </div>

          {/* Active Vehicle & Store Perks */}
          <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display font-bold text-slate-300">ACTIVE RACE CAR</span>
              <span className="font-display font-bold text-sky-300">{activeCar.name}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {save.store.coinBoosterRacesLeft > 0 && (
                <span className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-amber-200 font-semibold">
                  2x Coin Booster ({save.store.coinBoosterRacesLeft} races)
                </span>
              )}
              {save.store.specialItems.map((id) => (
                <span
                  key={id}
                  className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-emerald-200 font-semibold uppercase"
                >
                  {id.replace(/_/g, ' ')}
                </span>
              ))}
              {save.store.coinBoosterRacesLeft === 0 && save.store.specialItems.length === 0 && (
                <span className="text-slate-500">No active store upgrades installed yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileStatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3">
    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-1.5 font-display text-base font-bold text-white tabular-nums">
      {value}
    </div>
  </div>
);
