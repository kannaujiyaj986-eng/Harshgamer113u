import React from 'react';
import {
  Award,
  Car,
  Flag,
  HelpCircle,
  Layers,
  Maximize2,
  Minimize2,
  Play,
  Settings,
  ShoppingBag,
  User,
  Zap,
} from 'lucide-react';
import { getCarById } from '../data/cars';
import { t } from '../data/i18n';
import { getHighestUnlockedLevel } from '../storage/saveSystem';
import { Difficulty, SaveData } from '../types/game';

interface MainMenuProps {
  save: SaveData;
  hasClaimableReward: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onPlay: () => void;
  onOpenCars: () => void;
  onOpenStore: () => void;
  onOpenLevels: () => void;
  onOpenRewards: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenQuickRace: () => void;
  onOpenHowToPlay: () => void;
  onChangeDifficulty: (diff: Difficulty) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  save,
  hasClaimableReward,
  isFullscreen,
  onToggleFullscreen,
  onPlay,
  onOpenCars,
  onOpenStore,
  onOpenLevels,
  onOpenRewards,
  onOpenProfile,
  onOpenSettings,
  onOpenQuickRace,
  onOpenHowToPlay,
  onChangeDifficulty,
}) => {
  const tr = t(save.settings.language);
  const currentCar = getCarById(save.selectedCarId);
  const highestLevel = getHighestUnlockedLevel(save);
  const totalStars = Object.values(save.levels).reduce((s, l) => s + l.stars, 0);
  const completedCount = Object.values(save.levels).filter((l) => l.completed).length;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 md:p-6">
      {/* Top Bar: Coins, Progress, Difficulty, Quick Modes, Fullscreen */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 rounded-xl border border-sky-400/20 bg-slate-950/88 px-3.5 py-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 font-display text-xs font-bold">
              C
            </span>
            <span className="font-mono-tabular text-sm sm:text-base font-bold text-amber-300">
              {save.coins.toLocaleString()}
            </span>
          </div>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 tabular-nums">
            <span>{completedCount}/100 Levels</span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="text-amber-300 hidden sm:inline">{totalStars} Stars</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Difficulty Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/88 p-1">
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => onChangeDifficulty(diff)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  save.settings.difficulty === diff
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenQuickRace}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-slate-950/88 px-3 py-2 text-xs font-display font-bold tracking-wider text-emerald-300 hover:border-emerald-400/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Flag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">QUICK RACE</span>
          </button>

          <button
            onClick={onOpenCars}
            className="hidden md:flex items-center gap-2 rounded-xl border border-sky-400/25 bg-slate-950/88 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-sky-400/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Car className="h-4 w-4 text-sky-400" />
            <span>{currentCar.name}</span>
          </button>

          <button
            onClick={onOpenHowToPlay}
            title="Controls & Guide"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-slate-950/88 text-slate-200 hover:border-sky-400/60 cursor-pointer shrink-0"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          <button
            onClick={onToggleFullscreen}
            title="Landscape Fullscreen"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-slate-950/88 text-slate-200 hover:border-sky-400/60 cursor-pointer shrink-0"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Left-Aligned CARFLY Logo & Primary PLAY CTA */}
      <div className="my-auto flex flex-col items-start max-w-xl">
        <div className="pointer-events-auto mb-2">
          <svg
            viewBox="0 0 420 96"
            className="w-52 sm:w-72 md:w-[370px] h-auto drop-shadow-[0_8px_24px_rgba(6,182,212,0.45)]"
            aria-label="CARFLY 3D Asphalt Racing"
          >
            <defs>
              <linearGradient id="carflyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="trackAccent" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            {/* Ground Racing Speed Stripes */}
            <path d="M12 72 L94 22 L152 22 L126 36 L68 36 L38 72 Z" fill="url(#trackAccent)" />
            <path d="M34 80 L402 80 L388 86 L24 86 Z" fill="url(#trackAccent)" opacity="0.88" />
            <text
              x="78"
              y="68"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontStyle="italic"
              fontSize="64"
              letterSpacing="4"
              fill="#0c4a6e"
            >
              CARFLY
            </text>
            <text
              x="74"
              y="64"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontStyle="italic"
              fontSize="64"
              letterSpacing="4"
              fill="url(#carflyGrad)"
              stroke="#082f49"
              strokeWidth="1.5"
            >
              CARFLY
            </text>
          </svg>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-sky-200/90">
            Ground Asphalt Racing · 10 Circuits · Level {highestLevel} Ready
          </p>
        </div>

        {/* Primary PLAY CTA */}
        <div className="pointer-events-auto mt-2 flex flex-wrap items-center gap-2.5">
          <button
            onClick={onPlay}
            className="group relative flex items-center gap-3 rounded-xl bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 px-7 py-3 font-display text-base sm:text-lg font-bold tracking-wider text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.45)] transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer min-h-[46px]"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            <span>{tr.play}</span>
            <span className="text-xs font-mono-tabular bg-slate-950/20 px-2 py-0.5 rounded-md">
              LVL {highestLevel}
            </span>
          </button>

          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/88 px-4 py-3 text-xs font-display font-bold tracking-wider text-slate-200 hover:border-sky-400/60 cursor-pointer min-h-[46px]"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: save.profile.avatarColor }}
            />
            <span>{save.profile.driverName}</span>
          </button>
        </div>

        <p className="mt-2 text-[11px] text-slate-400 hidden md:block">
          WASD / Arrows Drive · Brake/Reverse (S) · Space Nitro · C Camera · Esc Pause
        </p>
      </div>

      {/* Bottom Navigation Dock: PLAY, CARS, STORE, LEVELS, REWARDS, PROFILE, SETTINGS */}
      <div className="pointer-events-auto mx-auto w-full max-w-5xl">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 rounded-2xl border border-white/12 bg-slate-950/90 p-2 shadow-2xl">
          <MenuActionButton
            icon={<Play className="h-4 w-4 text-sky-400" />}
            label={tr.play}
            onClick={onPlay}
          />
          <MenuActionButton
            icon={<Car className="h-4 w-4 text-cyan-400" />}
            label={tr.cars}
            onClick={onOpenCars}
          />
          <MenuActionButton
            icon={<ShoppingBag className="h-4 w-4 text-emerald-400" />}
            label={tr.store}
            onClick={onOpenStore}
          />
          <MenuActionButton
            icon={<Layers className="h-4 w-4 text-indigo-400" />}
            label={tr.levels}
            onClick={onOpenLevels}
          />
          <MenuActionButton
            icon={<Award className="h-4 w-4 text-amber-400" />}
            label={tr.rewards}
            highlight={hasClaimableReward}
            onClick={onOpenRewards}
          />
          <MenuActionButton
            icon={<User className="h-4 w-4 text-violet-400" />}
            label={tr.profile}
            onClick={onOpenProfile}
          />
          <MenuActionButton
            icon={<Settings className="h-4 w-4 text-slate-300" />}
            label={tr.settings}
            onClick={onOpenSettings}
          />
        </div>
      </div>
    </div>
  );
};

interface MenuActionButtonProps {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  onClick: () => void;
}

const MenuActionButton: React.FC<MenuActionButtonProps> = ({
  icon,
  label,
  highlight,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`relative flex items-center justify-center gap-1.5 rounded-xl border px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-display font-semibold tracking-wider transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[44px] ${
      highlight
        ? 'border-amber-400/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
        : 'border-white/8 bg-slate-900/90 text-slate-100 hover:border-sky-400/50 hover:bg-slate-800/95'
    }`}
  >
    {icon}
    <span className="truncate hidden sm:inline">{label}</span>
    {highlight && <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
  </button>
);
