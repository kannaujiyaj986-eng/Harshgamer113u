import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Palette,
  ShoppingBag,
  Sliders,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import {
  BOOST_SWATCHES,
  CAR_CATALOG,
  computeEffectiveStats,
  getCarById,
  getUpgradeCost,
  NEON_SWATCHES,
  PAINT_SWATCHES,
} from '../data/cars';
import { CarCustomization, CarUpgrades, SaveData, WheelStyle } from '../types/game';

interface GarageViewProps {
  save: SaveData;
  previewCarId: string;
  onPreviewCar: (carId: string) => void;
  onSelectCar: (carId: string) => void;
  onBuyCar: (carId: string) => void;
  onUpdateCustomization: (carId: string, custom: CarCustomization) => void;
  onUpgradeCar: (carId: string, stat: keyof CarUpgrades) => void;
  onOpenStore: () => void;
  onBack: () => void;
}

type GarageTab = 'cars' | 'paint' | 'upgrades';

const WHEEL_OPTIONS: Array<{ id: WheelStyle; label: string }> = [
  { id: 'turbine', label: 'Turbine Aero' },
  { id: 'aero_disc', label: 'Aero Disc' },
  { id: 'split_spoke', label: 'Split Spoke' },
  { id: 'gold_forged', label: 'Gold Forged' },
];

const UPGRADE_LABELS: Array<{ key: keyof CarUpgrades; label: string }> = [
  { key: 'speed', label: 'Top Speed' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'handling', label: 'Handling' },
  { key: 'brakes', label: 'Brakes' },
  { key: 'nitro', label: 'Nitro Boost' },
];

export const GarageView: React.FC<GarageViewProps> = ({
  save,
  previewCarId,
  onPreviewCar,
  onSelectCar,
  onBuyCar,
  onUpdateCustomization,
  onUpgradeCar,
  onOpenStore,
  onBack,
}) => {
  const [tab, setTab] = useState<GarageTab>('cars');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const spec = getCarById(previewCarId);
  const owned = save.cars[previewCarId];
  const isUnlocked = owned?.unlocked ?? false;
  const isSelected = save.selectedCarId === previewCarId;
  const stats = computeEffectiveStats(spec, owned.upgrades);

  const canAffordCar = save.coins >= spec.price && spec.unlockRequirement !== 'level_100';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/90 px-4 py-2.5 text-xs font-display font-bold tracking-wider text-white hover:border-sky-400/60 cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>MENU</span>
          </button>

          <div className="rounded-xl border border-white/10 bg-slate-950/88 px-4 py-2">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base sm:text-lg font-bold text-white whitespace-nowrap">
                {spec.name}
              </h1>
              {isSelected && (
                <span className="text-[11px] font-bold text-emerald-400">· SELECTED</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">{spec.tagline}</p>
          </div>
        </div>

        {/* Live Stats + Store Button + Coins */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-4 rounded-xl border border-white/10 bg-slate-950/88 px-4 py-2 text-xs tabular-nums">
            <StatMini label="SPD" value={stats.topSpeed} />
            <StatMini label="ACC" value={stats.acceleration} />
            <StatMini label="HND" value={stats.handling} />
            <StatMini label="BRK" value={stats.brakes} />
            <StatMini label="N2O" value={stats.nitro} />
          </div>

          <button
            onClick={onOpenStore}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-display font-bold tracking-wider text-emerald-200 hover:bg-emerald-500/25 cursor-pointer min-h-[44px]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>STORE</span>
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-slate-950/90 px-4 py-2.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-amber-400 font-display text-xs font-bold">
              C
            </span>
            <span className="font-mono-tabular text-sm font-bold text-amber-300">
              {save.coins.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onBack}
            aria-label="Close Garage"
            title="Close Garage"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/25 text-rose-100 hover:bg-rose-500/45 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Center Hint */}
      <div className="pointer-events-none self-center text-[11px] tracking-wider text-slate-400/80">
        Drag to Rotate 360° · Scroll to Zoom
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="pointer-events-auto mx-auto w-full max-w-4xl">
        <div className="flex justify-center mb-1.5">
          <button
            onClick={() => setDockCollapsed((c) => !c)}
            className="flex items-center gap-1.5 rounded-t-xl border border-b-0 border-white/15 bg-slate-950/90 px-4 py-1.5 text-[11px] font-display font-bold tracking-wider text-slate-300 hover:text-white cursor-pointer"
          >
            {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>{dockCollapsed ? 'SHOW GARAGE CONTROLS' : 'HIDE CONTROLS'}</span>
          </button>
        </div>

        {!dockCollapsed && (
          <div className="carfly-scroll max-h-[46vh] overflow-y-auto rounded-2xl border border-white/12 bg-slate-950/92 p-3 sm:p-4 shadow-2xl">
            {/* Tab Bar + BUY / SELECT Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-1 rounded-xl bg-slate-900 p-1">
                <DockTab
                  active={tab === 'cars'}
                  icon={<Sliders className="h-3.5 w-3.5" />}
                  label="Cars (11)"
                  onClick={() => setTab('cars')}
                />
                <DockTab
                  active={tab === 'paint'}
                  icon={<Palette className="h-3.5 w-3.5" />}
                  label="Colors & Rims"
                  onClick={() => setTab('paint')}
                />
                <DockTab
                  active={tab === 'upgrades'}
                  icon={<Wrench className="h-3.5 w-3.5" />}
                  label="Upgrades"
                  onClick={() => setTab('upgrades')}
                />
              </div>

              <div className="flex items-center gap-2">
                {isUnlocked ? (
                  <button
                    onClick={() => onSelectCar(previewCarId)}
                    disabled={isSelected}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-display font-bold tracking-wider whitespace-nowrap shrink-0 min-h-[40px] ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 cursor-default'
                        : 'bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    <span>{isSelected ? 'SELECTED' : 'SELECT CAR'}</span>
                  </button>
                ) : spec.unlockRequirement === 'level_100' ? (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs font-display font-bold text-amber-300">
                    <Lock className="h-4 w-4" />
                    <span>WIN LEVEL 100 TO UNLOCK</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onBuyCar(previewCarId)}
                    disabled={!canAffordCar}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-display font-bold tracking-wider whitespace-nowrap shrink-0 min-h-[40px] ${
                      canAffordCar
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed'
                    }`}
                  >
                    <span>BUY · {spec.price.toLocaleString()} C</span>
                  </button>
                )}
                <button
                  onClick={() => setDockCollapsed(true)}
                  aria-label="Minimize Options"
                  title="Close Options"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tab 1: Cars */}
            {tab === 'cars' && (
              <div className="carfly-scroll mt-3 flex gap-2.5 overflow-x-auto pb-1">
                {CAR_CATALOG.map((car) => {
                  const carOwned = save.cars[car.id]?.unlocked;
                  const active = car.id === previewCarId;
                  const equipped = car.id === save.selectedCarId;
                  return (
                    <button
                      key={car.id}
                      onClick={() => onPreviewCar(car.id)}
                      className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-colors shrink-0 w-44 cursor-pointer ${
                        active
                          ? 'border-sky-400 bg-sky-500/15'
                          : 'border-white/10 bg-slate-900/90 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="h-3 w-3 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: save.cars[car.id]?.customization.color ?? car.defaultColor }}
                        />
                        <span className="text-[10px] font-bold tracking-wider text-slate-400">
                          {equipped ? 'SELECTED' : carOwned ? 'OWNED' : car.unlockRequirement ? 'LVL 100' : `${car.price} C`}
                        </span>
                      </div>
                      <div className="mt-2 font-display text-xs font-bold text-white truncate">
                        {car.name}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 tabular-nums">
                        <span>SPD {car.baseStats.topSpeed}</span>
                        <span>BRK {car.baseStats.brakes}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Colors, Wheels, Neon, Nitro Flames */}
            {tab === 'paint' && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                      <span>Body Paint</span>
                      <span className="text-slate-500">More in Store</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PAINT_SWATCHES.map((sw) => {
                        const unlocked = sw.price === 0 || save.store.unlockedPaints.includes(sw.hex);
                        return (
                          <button
                            key={sw.hex}
                            title={unlocked ? sw.name : `${sw.name} (Unlock in Store)`}
                            onClick={() => {
                              if (!unlocked) {
                                onOpenStore();
                                return;
                              }
                              onUpdateCustomization(previewCarId, {
                                ...owned.customization,
                                color: sw.hex,
                              });
                            }}
                            className={`relative h-8 w-8 rounded-lg border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${
                              owned.customization.color === sw.hex ? 'border-white scale-110' : 'border-white/20'
                            } ${!unlocked ? 'opacity-55' : ''}`}
                            style={{ backgroundColor: sw.hex }}
                          >
                            {!unlocked && <Lock className="h-3 w-3 text-slate-950" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Underbody Neon Lights</div>
                    <div className="flex flex-wrap gap-2">
                      {NEON_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          title={sw.name}
                          onClick={() =>
                            onUpdateCustomization(previewCarId, {
                              ...owned.customization,
                              neonColor: sw.hex,
                            })
                          }
                          className={`h-8 w-8 rounded-lg border-2 cursor-pointer transition-transform hover:scale-110 ${
                            owned.customization.neonColor === sw.hex ? 'border-white scale-110' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Wheel Design</div>
                    <div className="grid grid-cols-2 gap-2">
                      {WHEEL_OPTIONS.map((w) => {
                        const unlocked =
                          w.id === 'turbine' ||
                          w.id === spec.defaultWheel ||
                          save.store.unlockedWheels.includes(w.id);
                        return (
                          <button
                            key={w.id}
                            onClick={() => {
                              if (!unlocked) {
                                onOpenStore();
                                return;
                              }
                              onUpdateCustomization(previewCarId, {
                                ...owned.customization,
                                wheelStyle: w.id,
                              });
                            }}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                              owned.customization.wheelStyle === w.id
                                ? 'border-sky-400 bg-sky-500/20 text-white'
                                : 'border-white/10 bg-slate-900 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            <span>{w.label}</span>
                            {!unlocked && <Lock className="h-3 w-3 text-amber-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Nitro Exhaust Flame</div>
                    <div className="flex flex-wrap gap-2">
                      {BOOST_SWATCHES.map((sw) => {
                        const unlocked = sw.price === 0 || save.store.unlockedBoosts.includes(sw.hex);
                        return (
                          <button
                            key={sw.hex}
                            title={unlocked ? sw.name : `${sw.name} (Unlock in Store)`}
                            onClick={() => {
                              if (!unlocked) {
                                onOpenStore();
                                return;
                              }
                              onUpdateCustomization(previewCarId, {
                                ...owned.customization,
                                boostColor: sw.hex,
                              });
                            }}
                            className={`relative h-8 w-8 rounded-lg border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${
                              owned.customization.boostColor === sw.hex ? 'border-white scale-110' : 'border-white/20'
                            } ${!unlocked ? 'opacity-55' : ''}`}
                            style={{ backgroundColor: sw.hex }}
                          >
                            {!unlocked && <Lock className="h-3 w-3 text-slate-950" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Upgrades (Speed, Acceleration, Handling, Brakes, Nitro) */}
            {tab === 'upgrades' && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {UPGRADE_LABELS.map(({ key, label }) => {
                  const lvl = owned.upgrades[key];
                  const isMax = lvl >= 5;
                  const cost = getUpgradeCost(lvl);
                  const canUpgrade = isUnlocked && !isMax && save.coins >= cost;
                  return (
                    <div
                      key={key}
                      className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900 p-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-white">
                          <span>{label}</span>
                          <span className="font-mono-tabular text-sky-400">Lv.{lvl}/5</span>
                        </div>
                        <div className="mt-2 flex gap-1">
                          {[1, 2, 3, 4, 5].map((tier) => (
                            <div
                              key={tier}
                              className={`h-1.5 flex-1 rounded-full ${
                                tier <= lvl ? 'bg-sky-400' : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        disabled={!canUpgrade}
                        onClick={() => onUpgradeCar(previewCarId, key)}
                        className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-display font-bold tracking-wider min-h-[36px] ${
                          isMax
                            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                            : canUpgrade
                              ? 'bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{isMax ? 'MAXED' : !isUnlocked ? 'LOCKED' : `UPGRADE ${cost} C`}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StatMini: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-slate-400 font-semibold">{label}</span>
    <span className="font-mono-tabular font-bold text-sky-300">{value}</span>
  </div>
);

const DockTab: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
      active ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
