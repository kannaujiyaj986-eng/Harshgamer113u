import React, { useState } from 'react';
import {
  Car,
  Check,
  Cog,
  Flame,
  Gauge,
  Lock,
  Palette,
  ShoppingBag,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { CAR_CATALOG, getCarById, getUpgradeCost } from '../data/cars';
import {
  STORE_BOOSTS,
  STORE_PAINTS,
  STORE_SPECIAL_ITEMS,
  STORE_WHEELS,
  StoreCategory,
} from '../data/store';
import { SaveData, WheelStyle } from '../types/game';

interface StoreModalProps {
  save: SaveData;
  onBuyCar: (carId: string) => void;
  onSelectCar: (carId: string) => void;
  onBuyPaint: (hex: string, price: number) => void;
  onEquipPaint: (hex: string) => void;
  onBuyWheel: (wheel: WheelStyle, price: number) => void;
  onEquipWheel: (wheel: WheelStyle) => void;
  onBuyBoost: (hex: string, price: number) => void;
  onEquipBoost: (hex: string) => void;
  onUpgradeStat: (carId: string, stat: 'speed' | 'acceleration' | 'handling' | 'brakes' | 'nitro') => void;
  onBuySpecialItem: (itemId: 'coin_booster' | 'full_nitro_start' | 'pro_drift_tires' | 'carbon_kit', price: number) => void;
  onClose: () => void;
}

interface PendingPurchase {
  title: string;
  description: string;
  price: number;
  onConfirm: () => void;
}

const CATEGORIES: Array<{ id: StoreCategory; label: string; icon: React.ReactNode }> = [
  { id: 'cars', label: 'Cars', icon: <Car className="h-3.5 w-3.5" /> },
  { id: 'paints', label: 'Car Paints', icon: <Palette className="h-3.5 w-3.5" /> },
  { id: 'wheels', label: 'Wheels', icon: <Cog className="h-3.5 w-3.5" /> },
  { id: 'nitro_effects', label: 'Nitro Effects', icon: <Flame className="h-3.5 w-3.5" /> },
  { id: 'speed_upgrades', label: 'Speed Upgrades', icon: <Gauge className="h-3.5 w-3.5" /> },
  { id: 'engine_upgrades', label: 'Engine Upgrades', icon: <Wrench className="h-3.5 w-3.5" /> },
  { id: 'special_items', label: 'Special Items', icon: <Sparkles className="h-3.5 w-3.5" /> },
];

export const StoreModal: React.FC<StoreModalProps> = ({
  save,
  onBuyCar,
  onSelectCar,
  onBuyPaint,
  onEquipPaint,
  onBuyWheel,
  onEquipWheel,
  onBuyBoost,
  onEquipBoost,
  onUpgradeStat,
  onBuySpecialItem,
  onClose,
}) => {
  const [category, setCategory] = useState<StoreCategory>('cars');
  const [pending, setPending] = useState<PendingPurchase | null>(null);

  const selectedCar = getCarById(save.selectedCarId);
  const selectedCarData = save.cars[save.selectedCarId];

  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/90 p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-slate-900 p-4 sm:p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="font-display text-xl font-bold tracking-wider text-white">
                CARFLY RACING STORE
              </h2>
              <p className="text-[11px] text-slate-400">
                Active Car: <span className="text-sky-300 font-semibold">{selectedCar.name}</span> · In-Game Coins Only
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-slate-950 px-3.5 py-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-amber-400 font-display text-xs font-bold">
                C
              </span>
              <span className="font-mono-tabular text-sm font-bold text-amber-300">
                {save.coins.toLocaleString()}
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Store"
              title="Close Store"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="carfly-scroll mt-3 flex gap-1.5 overflow-x-auto pb-2 shrink-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-display font-bold tracking-wider whitespace-nowrap shrink-0 cursor-pointer ${
                category === c.id
                  ? 'border-sky-400 bg-sky-400 text-slate-950'
                  : 'border-white/10 bg-slate-950 text-slate-300 hover:border-white/25'
              }`}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Category Grid */}
        <div className="carfly-scroll mt-3 flex-1 overflow-y-auto pr-1">
          {category === 'cars' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CAR_CATALOG.map((car) => {
                const owned = save.cars[car.id]?.unlocked;
                const equipped = save.selectedCarId === car.id;
                const lvl100Locked = car.unlockRequirement === 'level_100' && !owned;
                const canAfford = save.coins >= car.price && !lvl100Locked;

                return (
                  <div
                    key={car.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/80 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/30"
                          style={{ backgroundColor: car.defaultColor }}
                        />
                        <span className="text-[11px] font-bold text-amber-300 font-mono-tabular">
                          {owned ? 'UNLOCKED' : lvl100Locked ? 'LEVEL 100 TROPHY' : `${car.price.toLocaleString()} C`}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-base font-bold text-white">{car.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{car.tagline}</p>
                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px] text-slate-300 tabular-nums">
                        <span className="rounded bg-slate-900 px-2 py-1">SPD {car.baseStats.topSpeed}</span>
                        <span className="rounded bg-slate-900 px-2 py-1">ACC {car.baseStats.acceleration}</span>
                        <span className="rounded bg-slate-900 px-2 py-1">BRK {car.baseStats.brakes}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      {owned ? (
                        <button
                          onClick={() => onSelectCar(car.id)}
                          disabled={equipped}
                          className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-display font-bold tracking-wider ${
                            equipped
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 cursor-default'
                              : 'bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{equipped ? 'SELECTED' : 'SELECT CAR'}</span>
                        </button>
                      ) : lvl100Locked ? (
                        <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2.5 text-xs font-display font-bold text-amber-300">
                          <Lock className="h-3.5 w-3.5" />
                          <span>WIN LEVEL 100</span>
                        </div>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() =>
                            setPending({
                              title: `Buy ${car.name}`,
                              description: car.tagline,
                              price: car.price,
                              onConfirm: () => onBuyCar(car.id),
                            })
                          }
                          className={`w-full rounded-xl py-2.5 text-xs font-display font-bold tracking-wider ${
                            canAfford
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          BUY · {car.price.toLocaleString()} C
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {category === 'paints' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STORE_PAINTS.map((p) => {
                const owned = save.store.unlockedPaints.includes(p.hex);
                const equipped = selectedCarData.customization.color === p.hex;
                const canAfford = save.coins >= p.price;

                return (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/80 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl border border-white/25 shrink-0"
                          style={{ backgroundColor: p.hex }}
                        />
                        <div>
                          <h3 className="font-display text-sm font-bold text-white">{p.name}</h3>
                          <p className="text-xs text-slate-400">{p.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      {owned ? (
                        <button
                          onClick={() => onEquipPaint(p.hex)}
                          disabled={equipped}
                          className={`w-full rounded-xl py-2 text-xs font-display font-bold tracking-wider ${
                            equipped
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                              : 'bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer'
                          }`}
                        >
                          {equipped ? 'EQUIPPED ON ACTIVE CAR' : 'APPLY TO ACTIVE CAR'}
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() =>
                            setPending({
                              title: `Unlock ${p.name}`,
                              description: `Unlock this metallic paint for all cars and apply it to ${selectedCar.name}.`,
                              price: p.price,
                              onConfirm: () => onBuyPaint(p.hex, p.price),
                            })
                          }
                          className={`w-full rounded-xl py-2 text-xs font-display font-bold tracking-wider ${
                            canAfford
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          BUY · {p.price} C
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {category === 'wheels' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STORE_WHEELS.map((w) => {
                const owned = w.price === 0 || save.store.unlockedWheels.includes(w.id);
                const equipped = selectedCarData.customization.wheelStyle === w.id;
                const canAfford = save.coins >= w.price;

                return (
                  <div
                    key={w.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/80 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-bold text-white">{w.name}</h3>
                        <span className="font-mono-tabular text-xs font-bold text-amber-300">
                          {owned ? 'OWNED' : `${w.price} C`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{w.description}</p>
                    </div>
                    <div className="mt-4">
                      {owned ? (
                        <button
                          onClick={() => onEquipWheel(w.id)}
                          disabled={equipped}
                          className={`w-full rounded-xl py-2.5 text-xs font-display font-bold tracking-wider ${
                            equipped
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                              : 'bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer'
                          }`}
                        >
                          {equipped ? 'EQUIPPED' : 'EQUIP WHEELS'}
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() =>
                            setPending({
                              title: `Buy ${w.name}`,
                              description: w.description,
                              price: w.price,
                              onConfirm: () => onBuyWheel(w.id, w.price),
                            })
                          }
                          className={`w-full rounded-xl py-2.5 text-xs font-display font-bold tracking-wider ${
                            canAfford
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          BUY · {w.price} C
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {category === 'nitro_effects' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STORE_BOOSTS.map((b) => {
                const owned = b.price === 0 || save.store.unlockedBoosts.includes(b.hex);
                const equipped = selectedCarData.customization.boostColor === b.hex;
                const canAfford = save.coins >= b.price;

                return (
                  <div
                    key={b.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/80 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 shrink-0"
                        style={{ backgroundColor: `${b.hex}33`, color: b.hex }}
                      >
                        <Flame className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-white">{b.name}</h3>
                        <p className="text-xs text-slate-400">{b.description}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      {owned ? (
                        <button
                          onClick={() => onEquipBoost(b.hex)}
                          disabled={equipped}
                          className={`w-full rounded-xl py-2 text-xs font-display font-bold tracking-wider ${
                            equipped
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                              : 'bg-sky-400 text-slate-950 hover:bg-sky-300 cursor-pointer'
                          }`}
                        >
                          {equipped ? 'EQUIPPED' : 'EQUIP NITRO FLAME'}
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() =>
                            setPending({
                              title: `Buy ${b.name}`,
                              description: b.description,
                              price: b.price,
                              onConfirm: () => onBuyBoost(b.hex, b.price),
                            })
                          }
                          className={`w-full rounded-xl py-2 text-xs font-display font-bold tracking-wider ${
                            canAfford
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          BUY · {b.price} C
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {category === 'speed_upgrades' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAR_CATALOG.filter((c) => save.cars[c.id]?.unlocked).map((car) => {
                const carState = save.cars[car.id];
                const lvl = carState.upgrades.speed;
                const isMax = lvl >= 5;
                const cost = getUpgradeCost(lvl);
                const canAfford = !isMax && save.coins >= cost;

                return (
                  <div
                    key={car.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/80 p-4"
                  >
                    <div>
                      <h3 className="font-display text-sm font-bold text-white">{car.name}</h3>
                      <p className="text-xs text-slate-400">Top Speed Stage Lv.{lvl} / 5</p>
                      <div className="mt-2 flex gap-1 w-36">
                        {[1, 2, 3, 4, 5].map((t) => (
                          <div
                            key={t}
                            className={`h-1.5 flex-1 rounded-full ${t <= lvl ? 'bg-sky-400' : 'bg-slate-800'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() =>
                        setPending({
                          title: `Upgrade Speed: ${car.name}`,
                          description: `Raise Top Speed from Lv.${lvl} to Lv.${lvl + 1}.`,
                          price: cost,
                          onConfirm: () => onUpgradeStat(car.id, 'speed'),
                        })
                      }
                      className={`rounded-xl px-4 py-2.5 text-xs font-display font-bold tracking-wider whitespace-nowrap ${
                        isMax
                          ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                          : canAfford
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'MAXED' : `UPGRADE · ${cost} C`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {category === 'engine_upgrades' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { key: 'acceleration', title: 'Twin-Turbo Engine Block', desc: 'Boosts launch torque and corner exit acceleration.' },
                  { key: 'nitro', title: 'High-Pressure Nitro Injectors', desc: 'Extends nitro duration and peak exhaust thrust.' },
                  { key: 'handling', title: 'Track Suspension & Differential', desc: 'Sharpens steering response and high-speed stability.' },
                  { key: 'brakes', title: 'Carbon-Ceramic Brake Kit', desc: 'Shortens braking distance into tight chicanes.' },
                ] as const
              ).map((item) => {
                const lvl = selectedCarData.upgrades[item.key];
                const isMax = lvl >= 5;
                const cost = getUpgradeCost(lvl);
                const canAfford = !isMax && save.coins >= cost;

                return (
                  <div
                    key={item.key}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/80 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-sm font-bold text-white">{item.title}</h3>
                        <span className="font-mono-tabular text-xs font-bold text-sky-400">
                          Lv.{lvl}/5
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() =>
                        setPending({
                          title: `${item.title} (${selectedCar.name})`,
                          description: `Upgrade ${selectedCar.name} to Lv.${lvl + 1}.`,
                          price: cost,
                          onConfirm: () => onUpgradeStat(save.selectedCarId, item.key),
                        })
                      }
                      className={`mt-4 w-full rounded-xl py-2.5 text-xs font-display font-bold tracking-wider ${
                        isMax
                          ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                          : canAfford
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'MAXED' : `INSTALL · ${cost} C`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {category === 'special_items' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STORE_SPECIAL_ITEMS.map((item) => {
                const isOwnedPerm = !item.consumable && save.store.specialItems.includes(item.id);
                const canAfford = save.coins >= item.price;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/80 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-white">{item.name}</h3>
                        <span className="font-mono-tabular text-xs font-bold text-amber-300">
                          {isOwnedPerm ? 'ACTIVE' : `${item.price} C`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                      {item.id === 'coin_booster' && save.store.coinBoosterRacesLeft > 0 && (
                        <div className="mt-2 text-xs font-semibold text-emerald-300">
                          Active: {save.store.coinBoosterRacesLeft} races remaining
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      {isOwnedPerm ? (
                        <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/35 py-2.5 text-xs font-display font-bold text-emerald-300">
                          <Check className="h-3.5 w-3.5" />
                          <span>OWNED &amp; ACTIVE</span>
                        </div>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() =>
                            setPending({
                              title: `Purchase ${item.name}`,
                              description: item.description,
                              price: item.price,
                              onConfirm: () => onBuySpecialItem(item.id, item.price),
                            })
                          }
                          className={`w-full rounded-xl py-2.5 text-xs font-display font-bold tracking-wider ${
                            canAfford
                              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          BUY · {item.price} C
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {pending && (
        <div
          onClick={() => setPending(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-amber-400/40 bg-slate-900 p-6 shadow-2xl"
          >
            <button
              onClick={() => setPending(null)}
              aria-label="Close Confirmation"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-display text-lg font-bold text-white">CONFIRM PURCHASE</h3>
            <p className="mt-2 text-sm font-semibold text-sky-300">{pending.title}</p>
            <p className="mt-1 text-xs text-slate-400">{pending.description}</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 px-4 py-2.5 text-sm">
              <span className="text-slate-400">Price</span>
              <span className="font-mono-tabular font-bold text-amber-300">
                {pending.price.toLocaleString()} C
              </span>
            </div>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setPending(null)}
                className="flex-1 rounded-xl border border-white/15 bg-slate-800 py-2.5 text-xs font-display font-bold text-slate-200 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  pending.onConfirm();
                  setPending(null);
                }}
                className="flex-1 rounded-xl bg-amber-400 py-2.5 text-xs font-display font-bold text-slate-950 hover:bg-amber-300 cursor-pointer"
              >
                CONFIRM BUY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
