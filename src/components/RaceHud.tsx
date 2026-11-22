import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Flame,
  Navigation,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { t } from '../data/i18n';
import { ControlInputState } from '../three/gameEngine';
import { GameMode, GameSettings, HudTelemetry } from '../types/game';

interface RaceHudProps {
  hud: HudTelemetry;
  mode: GameMode;
  levelName: string;
  settings: GameSettings;
  isTouchDevice: boolean;
  onControlChange: (key: keyof ControlInputState, value: boolean) => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onResetCar: () => void;
  onExitRace: () => void;
}

function formatRaceTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function ordinal(n: number): string {
  if (n === 1) return '1ST';
  if (n === 2) return '2ND';
  if (n === 3) return '3RD';
  return `${n}TH`;
}

export const RaceHud: React.FC<RaceHudProps> = ({
  hud,
  mode,
  levelName,
  settings,
  isTouchDevice,
  onControlChange,
  onCycleCamera,
  onToggleMute,
  onPause,
  onResetCar,
  onExitRace,
}) => {
  const tr = t(settings.language);
  const showPedals =
    settings.controlLayout === 'always' ||
    settings.controlLayout === 'tilt_pedals' ||
    (settings.controlLayout === 'auto' && isTouchDevice);
  const showSteerButtons =
    settings.controlLayout === 'always' ||
    (settings.controlLayout === 'auto' && isTouchDevice && !settings.tiltSteering);

  const svgPoints = hud.minimapPath
    .map((p) => `${(p.x * 42 + 52).toFixed(1)},${(p.z * 42 + 52).toFixed(1)}`)
    .join(' ');
  const startPoint = hud.minimapPath[0];

  // Speedometer dial arc math (240 degree sweep)
  const maxDialKmh = 360;
  const speedRatio = Math.min(1, Math.max(0, hud.speedKmh / maxDialKmh));
  const dialRadius = 32;
  const dialCircumference = 2 * Math.PI * dialRadius;
  const sweepLength = dialCircumference * (240 / 360);
  const activeLength = sweepLength * speedRatio;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-2.5 sm:p-4">
      {/* Nitro Speed Vignette */}
      {hud.nitroActive && (
        <div
          className="nitro-speed-lines pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              'radial-gradient(circle at center, transparent 54%, rgba(251, 146, 60, 0.18) 86%, rgba(56, 189, 248, 0.34) 100%)',
          }}
        />
      )}

      {/* UPPER HUD ROW: Upper-Left (Race Stats + GPS Map) | Upper-Center (Progress) | Upper-Right (Actions + NITRO) */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        {/* UPPER-LEFT: Telemetry + GPS Track Mini-Map */}
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/15 bg-slate-950/80 px-3 py-1.5 shadow-lg">
            {mode !== 'time_trial' && (
              <>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold tracking-wider text-slate-400">
                    {tr.pos}
                  </span>
                  <span className="font-display text-base sm:text-lg font-bold text-amber-300 tabular-nums leading-none">
                    {ordinal(hud.position)}
                    <span className="text-[11px] text-slate-400">/{hud.totalRacers}</span>
                  </span>
                </div>
                <div className="h-6 w-px bg-white/12" />
              </>
            )}

            <div className="flex flex-col">
              <span className="text-[9px] font-bold tracking-wider text-slate-400">
                {tr.lap}
              </span>
              <span className="font-display text-base sm:text-lg font-bold text-white tabular-nums leading-none">
                {hud.lap}
                <span className="text-[11px] text-slate-400">/{hud.totalLaps}</span>
              </span>
            </div>

            <div className="h-6 w-px bg-white/12" />

            <div className="flex flex-col">
              <span className="text-[9px] font-bold tracking-wider text-slate-400">TIME</span>
              <span className="font-mono-tabular text-sm sm:text-base font-bold text-sky-300 leading-none">
                {formatRaceTime(hud.raceTimeMs)}
              </span>
            </div>
          </div>

          {/* UPPER-LEFT GPS TRACK MINI-MAP */}
          <div className="rounded-2xl border border-sky-400/30 bg-slate-950/85 p-1.5 shadow-lg">
            <div className="mb-0.5 flex items-center justify-between px-1">
              <span className="flex items-center gap-1 text-[8px] font-display font-bold tracking-widest text-sky-300">
                <Navigation className="h-2.5 w-2.5" />
                MAP
              </span>
              <span className="text-[8px] font-mono-tabular font-bold text-slate-400">
                {Math.round(hud.trackProgress * 100)}%
              </span>
            </div>
            <svg viewBox="0 0 104 104" className="h-16 w-16 sm:h-22 sm:w-22">
              <circle
                cx="52"
                cy="52"
                r="47"
                fill="rgba(15, 23, 42, 0.72)"
                stroke="rgba(56, 189, 248, 0.22)"
                strokeWidth="1.2"
              />
              <circle
                cx="52"
                cy="52"
                r="30"
                fill="none"
                stroke="rgba(148, 163, 184, 0.12)"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              {svgPoints && (
                <>
                  <polygon
                    points={svgPoints}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="7"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={svgPoints}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                </>
              )}
              {startPoint && (
                <rect
                  x={startPoint.x * 42 + 52 - 3}
                  y={startPoint.z * 42 + 52 - 3}
                  width="6"
                  height="6"
                  rx="1"
                  fill="#f8fafc"
                  stroke="#0f172a"
                  strokeWidth="1"
                />
              )}
              {hud.minimapMarkers.map((m, idx) => (
                <circle
                  key={idx}
                  cx={m.x * 42 + 52}
                  cy={m.z * 42 + 52}
                  r={m.isPlayer ? 4.8 : 3.0}
                  fill={m.isPlayer ? '#f59e0b' : m.color}
                  stroke={m.isPlayer ? '#ffffff' : '#0f172a'}
                  strokeWidth={m.isPlayer ? 1.8 : 0.8}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* UPPER-CENTER: Track Progress Strip (Desktop/Tablet) */}
        <div className="hidden md:flex flex-col items-center gap-1 rounded-xl border border-white/12 bg-slate-950/78 px-4 py-1.5 min-w-[205px] shadow-md">
          <div className="flex w-full justify-between text-[10px] font-semibold text-slate-300 tabular-nums">
            <span className="truncate max-w-[155px]">{levelName}</span>
            <span className="text-sky-300">{Math.round(hud.trackProgress * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-150"
              style={{ width: `${Math.round(hud.trackProgress * 100)}%` }}
            />
          </div>
        </div>

        {/* UPPER-RIGHT: Quick Actions + NITRO Bar & Upper-Right NITRO Boost Button */}
        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={onResetCar}
              title="Reset to Track (R)"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/15 bg-slate-950/82 text-slate-200 hover:border-sky-400/60 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={onCycleCamera}
              title="Switch Camera (C)"
              className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-slate-950/82 px-2.5 sm:px-3 text-[11px] font-display font-bold text-slate-200 hover:border-sky-400/60 cursor-pointer whitespace-nowrap"
            >
              <Camera className="h-4 w-4 text-sky-400" />
              <span className="hidden sm:inline">{hud.cameraMode.replace('_', ' ').toUpperCase()}</span>
            </button>
            <button
              onClick={onToggleMute}
              title="Mute / Unmute"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/15 bg-slate-950/82 text-slate-200 hover:border-sky-400/60 cursor-pointer"
            >
              {settings.muted ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-sky-400" />
              )}
            </button>
            <button
              onClick={onPause}
              title="Pause (Esc)"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/15 bg-slate-950/82 text-white hover:border-amber-400/60 cursor-pointer"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              onClick={onExitRace}
              aria-label="Exit Race"
              title="Exit Race to Menu"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-rose-400/60 bg-rose-600/85 text-white hover:bg-rose-500 shadow-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* UPPER-RIGHT NITRO GAUGE + NITRO BOOST TRIGGER */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/35 bg-slate-950/85 px-3 py-1.5 shadow-lg">
              <Flame
                className={`h-4 w-4 ${
                  hud.nitroActive ? 'text-amber-300' : 'text-sky-400'
                }`}
              />
              <div className="flex flex-col min-w-[92px] sm:min-w-[120px]">
                <div className="flex items-center justify-between text-[9px] font-display font-bold tracking-wider">
                  <span className={hud.nitroActive ? 'text-amber-300' : 'text-slate-300'}>
                    {tr.nitro}
                  </span>
                  <span className="font-mono-tabular text-sky-300">{hud.nitro}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-75 ${
                      hud.nitroActive
                        ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-200'
                        : 'bg-gradient-to-r from-sky-500 to-cyan-300'
                    }`}
                    style={{ width: `${hud.nitro}%` }}
                  />
                </div>
              </div>
            </div>

            {showPedals && (
              <TouchControlBtn
                label="NITRO"
                size="nitro"
                accent="amber"
                icon={<Flame className="h-6 w-6" />}
                onChange={(v) => onControlChange('nitro', v)}
              />
            )}
          </div>
        </div>
      </div>

      {/* CENTER OVERLAYS: Countdown, Lap Banner, Wrong Way, Drift */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2">
        {hud.countdownLabel && (
          <div className="rounded-2xl border border-sky-400/45 bg-slate-950/85 px-8 py-3 font-display text-5xl sm:text-7xl font-bold italic tracking-wider text-sky-300 shadow-2xl">
            {hud.countdownLabel}
          </div>
        )}

        {hud.lapBanner && !hud.countdownLabel && (
          <div className="rounded-xl border border-amber-400/50 bg-slate-950/85 px-6 py-2 font-display text-2xl sm:text-3xl font-bold tracking-wider text-amber-300">
            {hud.lapBanner}
          </div>
        )}

        {hud.wrongWay && (
          <div className="rounded-xl border border-rose-500/70 bg-rose-950/90 px-5 py-2 font-display text-sm sm:text-lg font-bold tracking-wider text-rose-200">
            WRONG WAY · PRESS R TO RESET
          </div>
        )}

        {hud.isDrifting && !hud.countdownLabel && (
          <div className="rounded-lg border border-amber-400/50 bg-slate-950/80 px-3.5 py-1 font-display text-xs font-bold tracking-widest text-amber-300">
            {tr.drift} · +NITRO
          </div>
        )}
      </div>

      {/* LOWER HUD: Speedometer Dial + Bottom-Left Steering | Bottom-Right Brake/Rev & Gas Pedals */}
      <div className="relative z-10 flex items-end justify-between gap-2">
        {/* BOTTOM-LEFT: Speedometer Dial + LEFT/RIGHT Steering Buttons */}
        <div className="flex flex-col items-start gap-2">
          {/* Speedometer Dial + Gear Readout */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-950/82 px-3 py-2 shadow-lg">
            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center">
              <svg viewBox="0 0 80 80" className="h-full w-full -rotate-[210deg]">
                <circle
                  cx="40"
                  cy="40"
                  r={dialRadius}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeDasharray={`${sweepLength} ${dialCircumference}`}
                />
                <circle
                  cx="40"
                  cy="40"
                  r={dialRadius}
                  fill="none"
                  stroke={hud.nitroActive ? '#fb923c' : hud.isReversing ? '#f43f5e' : '#38bdf8'}
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeDasharray={`${activeLength} ${dialCircumference}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                <span className="font-display text-lg sm:text-xl font-bold italic text-white tabular-nums leading-none">
                  {hud.speedKmh}
                </span>
                <span className="text-[8px] font-bold tracking-wider text-sky-400">KM/H</span>
              </div>
            </div>

            <div className="flex flex-col items-center border-l border-white/12 pl-2.5">
              <span className="text-[8px] font-bold tracking-wider text-slate-400">GEAR</span>
              <span
                className={`font-display text-xl sm:text-2xl font-bold leading-tight ${
                  hud.isReversing ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {hud.gearLabel}
              </span>
              <span className="text-[8px] font-semibold tracking-wider text-slate-400">
                {hud.isReversing ? 'REV' : 'AUTO'}
              </span>
            </div>
          </div>

          {/* Steering Touch Buttons (Bottom-Left) */}
          {showPedals && (
            <div className="pointer-events-auto flex items-center gap-2.5">
              {showSteerButtons ? (
                <>
                  <TouchControlBtn
                    label="LEFT"
                    size="steer"
                    icon={<ArrowLeft className="h-7 w-7" />}
                    onChange={(v) => onControlChange('left', v)}
                  />
                  <TouchControlBtn
                    label="RIGHT"
                    size="steer"
                    icon={<ArrowRight className="h-7 w-7" />}
                    onChange={(v) => onControlChange('right', v)}
                  />
                </>
              ) : (
                <div className="rounded-xl border border-sky-400/30 bg-slate-950/75 px-3 py-2 text-[11px] font-display font-bold text-sky-300">
                  TILT STEERING ACTIVE
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop keyboard hint */}
        {!showPedals && (
          <div className="hidden lg:block rounded-xl bg-slate-950/78 border border-white/10 px-3.5 py-1.5 text-[11px] text-slate-300">
            W/↑ Gas · S/↓ Brake &amp; Reverse · A/D Steer · Space Nitro · R Reset · C Camera
          </div>
        )}

        {/* BOTTOM-RIGHT: Ergonomic BRAKE/REV & GAS Pedals */}
        {showPedals && (
          <div className="pointer-events-auto flex items-end gap-2.5 sm:gap-3">
            <TouchControlBtn
              label="BRAKE / REV"
              size="brake"
              accent="rose"
              pedalStyle="brake"
              icon={
                <div className="flex flex-col gap-1 w-9">
                  <span className="h-1 w-full rounded bg-rose-200/80" />
                  <span className="h-1 w-full rounded bg-rose-200/80" />
                  <span className="h-1 w-full rounded bg-rose-200/80" />
                </div>
              }
              onChange={(v) => onControlChange('brake', v)}
            />
            <TouchControlBtn
              label="GAS"
              size="gas"
              accent="emerald"
              pedalStyle="gas"
              icon={
                <div className="flex flex-col gap-1.5 w-8">
                  <span className="h-1.5 w-full rounded bg-emerald-100/85" />
                  <span className="h-1.5 w-full rounded bg-emerald-100/85" />
                  <span className="h-1.5 w-full rounded bg-emerald-100/85" />
                  <span className="h-1.5 w-full rounded bg-emerald-100/85" />
                </div>
              }
              onChange={(v) => onControlChange('accelerate', v)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface TouchControlBtnProps {
  label: string;
  icon: React.ReactNode;
  accent?: 'amber' | 'rose' | 'emerald';
  size: 'steer' | 'brake' | 'nitro' | 'gas';
  pedalStyle?: 'brake' | 'gas';
  onChange: (pressed: boolean) => void;
}

const TouchControlBtn: React.FC<TouchControlBtnProps> = ({
  label,
  icon,
  accent,
  size,
  pedalStyle,
  onChange,
}) => {
  const colorMap = {
    amber:
      'border-amber-400/70 bg-amber-500/30 text-amber-100 active:bg-amber-400/65 shadow-[0_0_22px_rgba(245,158,11,0.3)]',
    rose:
      'border-rose-400/65 bg-slate-900/85 text-rose-100 active:bg-rose-500/55 shadow-[0_0_16px_rgba(244,63,94,0.2)]',
    emerald:
      'border-emerald-400/75 bg-slate-900/85 text-emerald-50 active:bg-emerald-500/60 shadow-[0_0_22px_rgba(16,185,129,0.25)]',
  };
  const cls = accent
    ? colorMap[accent]
    : 'border-sky-400/50 bg-slate-900/85 text-white active:bg-sky-400/45';

  const sizeMap = {
    steer: 'h-16 w-20 sm:h-20 sm:w-24 rounded-2xl',
    brake: 'h-16 w-20 sm:h-20 sm:w-24 rounded-xl',
    nitro: 'h-14 w-16 sm:h-16 sm:w-20 rounded-2xl',
    gas: 'h-24 w-16 sm:h-28 sm:w-20 rounded-xl',
  };

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(true);
      }}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onLostPointerCapture={() => onChange(false)}
      className={`flex flex-col items-center justify-center border-2 select-none touch-none transition-transform active:scale-95 cursor-pointer ${
        pedalStyle === 'gas' ? 'pt-1' : ''
      } ${cls} ${sizeMap[size]}`}
      aria-label={label}
    >
      {icon}
      <span className="mt-1 text-[9px] sm:text-[10px] font-display font-bold tracking-wider">
        {label}
      </span>
    </button>
  );
};
