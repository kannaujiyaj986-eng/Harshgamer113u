import React, { useState } from 'react';
import { Settings as SettingsIcon, Trash2, X } from 'lucide-react';
import {
  AppLanguage,
  CameraMode,
  GameSettings,
  GraphicsQuality,
} from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (next: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdate,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    onUpdate({ ...settings, [key]: val });
  };

  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-sky-400" />
            <h2 className="font-display text-xl font-bold tracking-wider text-white">
              SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Settings"
            title="Close (X)"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="carfly-scroll mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
          {/* Graphics Quality */}
          <div>
            <label className="text-xs font-semibold text-slate-400">Graphics Quality</label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {(['Low', 'Medium', 'High', 'Ultra'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => set('graphicsQuality', q)}
                  className={`rounded-lg border py-2 text-xs font-bold cursor-pointer ${
                    settings.graphicsQuality === q
                      ? 'border-sky-400 bg-sky-400 text-slate-950'
                      : 'border-white/10 bg-slate-950 text-slate-300'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* FPS Target */}
          <div>
            <label className="text-xs font-semibold text-slate-400">FPS Target</label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {([30, 60, 120] as const).map((fps) => (
                <button
                  key={fps}
                  onClick={() => set('targetFps', fps)}
                  className={`rounded-lg border py-2 text-xs font-mono-tabular font-bold cursor-pointer ${
                    settings.targetFps === fps
                      ? 'border-sky-400 bg-sky-400 text-slate-950'
                      : 'border-white/10 bg-slate-950 text-slate-300'
                  }`}
                >
                  {fps === 120 ? 'MAX' : `${fps} FPS`}
                </button>
              ))}
            </div>
          </div>

          {/* Volumes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Music Volume</span>
                <span className="font-mono-tabular text-sky-300">
                  {Math.round(settings.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) => set('musicVolume', parseFloat(e.target.value))}
                className="mt-2 w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>Sound Effects</span>
                <span className="font-mono-tabular text-sky-300">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) => set('sfxVolume', parseFloat(e.target.value))}
                className="mt-2 w-full accent-sky-400"
              />
            </div>
          </div>

          {/* Sensitivity */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-400">
              <span>Steering Sensitivity</span>
              <span className="font-mono-tabular text-sky-300">
                {settings.sensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={settings.sensitivity}
              onChange={(e) => set('sensitivity', parseFloat(e.target.value))}
              className="mt-2 w-full accent-sky-400"
            />
          </div>

          {/* Default Camera */}
          <div>
            <label className="text-xs font-semibold text-slate-400">Camera View</label>
            <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'third_person', label: '3rd Person' },
                  { id: 'chase', label: 'Chase' },
                  { id: 'first_person', label: 'Cockpit' },
                  { id: 'cinematic', label: 'Cinematic' },
                ] as Array<{ id: CameraMode; label: string }>
              ).map((c) => (
                <button
                  key={c.id}
                  onClick={() => set('cameraMode', c.id)}
                  className={`rounded-lg border py-2 text-xs font-semibold cursor-pointer ${
                    settings.cameraMode === c.id
                      ? 'border-sky-400 bg-sky-400 text-slate-950'
                      : 'border-white/10 bg-slate-950 text-slate-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Control Layout */}
          <div>
            <label className="text-xs font-semibold text-slate-400">Control Layout</label>
            <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'auto', label: 'Auto' },
                  { id: 'always', label: 'Buttons' },
                  { id: 'tilt_pedals', label: 'Tilt + Pedals' },
                  { id: 'off', label: 'Keyboard' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => set('controlLayout', m.id)}
                  className={`rounded-lg border py-2 text-xs font-bold cursor-pointer ${
                    settings.controlLayout === m.id
                      ? 'border-sky-400 bg-sky-400 text-slate-950'
                      : 'border-white/10 bg-slate-950 text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles: Tilt Steering & Vibration */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => set('tiltSteering', !settings.tiltSteering)}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold cursor-pointer ${
                settings.tiltSteering
                  ? 'border-sky-400 bg-sky-500/15 text-white'
                  : 'border-white/10 bg-slate-950 text-slate-300'
              }`}
            >
              <span>Tilt Steering</span>
              <span className="text-sky-400">{settings.tiltSteering ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => set('vibration', !settings.vibration)}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold cursor-pointer ${
                settings.vibration
                  ? 'border-sky-400 bg-sky-500/15 text-white'
                  : 'border-white/10 bg-slate-950 text-slate-300'
              }`}
            >
              <span>Vibration</span>
              <span className="text-sky-400">{settings.vibration ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-semibold text-slate-400">Language</label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'हिन्दी' },
                  { id: 'es', label: 'Español' },
                  { id: 'ja', label: '日本語' },
                ] as Array<{ id: AppLanguage; label: string }>
              ).map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => set('language', lang.id)}
                  className={`rounded-lg border py-2 text-xs font-semibold cursor-pointer ${
                    settings.language === lang.id
                      ? 'border-sky-400 bg-sky-400 text-slate-950'
                      : 'border-white/10 bg-slate-950 text-slate-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Save Data */}
          <div className="border-t border-white/10 pt-3">
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Reset Saved Progress</span>
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
                <span className="text-xs text-rose-200">Erase all 100-level progress and coins?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                    }}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
