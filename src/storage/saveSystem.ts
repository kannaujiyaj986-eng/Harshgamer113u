import { CAR_CATALOG } from '../data/cars';
import {
  AchievementDef,
  GameSettings,
  LevelProgress,
  OwnedCarData,
  SaveData,
} from '../types/game';

const STORAGE_KEY = 'carfly_ground_save_v2';

export function getDefaultSettings(): GameSettings {
  return {
    graphicsQuality: 'High',
    musicVolume: 0.45,
    sfxVolume: 0.75,
    sensitivity: 1.0,
    cameraMode: 'third_person',
    tiltSteering: false,
    vibration: true,
    language: 'en',
    targetFps: 60,
    difficulty: 'MEDIUM',
    controlLayout: 'auto',
    muted: false,
  };
}

export function createDefaultSaveData(): SaveData {
  const cars: Record<string, OwnedCarData> = {};
  for (const spec of CAR_CATALOG) {
    cars[spec.id] = {
      unlocked: spec.price === 0,
      upgrades: { speed: 1, acceleration: 1, handling: 1, brakes: 1, nitro: 1 },
      customization: {
        color: spec.defaultColor,
        wheelStyle: spec.defaultWheel,
        neonColor: spec.defaultNeon,
        boostColor: spec.defaultBoost,
      },
    };
  }

  const levels: Record<number, LevelProgress> = {};
  for (let i = 1; i <= 100; i++) {
    levels[i] = {
      unlocked: i === 1,
      completed: false,
      stars: 0,
      bestTimeMs: null,
    };
  }

  return {
    version: 2,
    coins: 2000,
    selectedCarId: 'aero-v1',
    cars,
    levels,
    settings: getDefaultSettings(),
    stats: {
      racesCompleted: 0,
      racesWon: 0,
      nitroUses: 0,
      totalDriftSeconds: 0,
      topSpeedKmh: 0,
    },
    claimedAchievements: [],
    dailyReward: {
      lastClaimDate: null,
      streakDay: 0,
    },
    store: {
      unlockedPaints: ['#06b6d4', '#ef4444', '#f59e0b', '#1e293b'],
      unlockedWheels: ['turbine'],
      unlockedBoosts: ['#38bdf8'],
      specialItems: [],
      coinBoosterRacesLeft: 0,
    },
    profile: {
      driverName: 'Apex Driver',
      avatarColor: '#06b6d4',
    },
  };
}

export function loadSaveData(): SaveData {
  const fallback = createDefaultSaveData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('carfly_save_v1');
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SaveData>;

    const mergedCars: Record<string, OwnedCarData> = { ...fallback.cars };
    if (parsed.cars) {
      for (const key of Object.keys(mergedCars)) {
        if (parsed.cars[key]) {
          mergedCars[key] = {
            unlocked: Boolean(parsed.cars[key].unlocked),
            upgrades: { ...mergedCars[key].upgrades, ...parsed.cars[key].upgrades },
            customization: { ...mergedCars[key].customization, ...parsed.cars[key].customization },
          };
        }
      }
    }

    const mergedLevels: Record<number, LevelProgress> = { ...fallback.levels };
    if (parsed.levels) {
      for (let i = 1; i <= 100; i++) {
        if (parsed.levels[i]) {
          mergedLevels[i] = {
            unlocked: i === 1 ? true : Boolean(parsed.levels[i].unlocked),
            completed: Boolean(parsed.levels[i].completed),
            stars: Number(parsed.levels[i].stars) || 0,
            bestTimeMs: parsed.levels[i].bestTimeMs ?? null,
          };
        }
      }
    }

    return {
      version: 2,
      coins: typeof parsed.coins === 'number' ? Math.max(0, parsed.coins) : fallback.coins,
      selectedCarId: parsed.selectedCarId && mergedCars[parsed.selectedCarId]?.unlocked
        ? parsed.selectedCarId
        : fallback.selectedCarId,
      cars: mergedCars,
      levels: mergedLevels,
      settings: { ...fallback.settings, ...parsed.settings },
      stats: { ...fallback.stats, ...parsed.stats },
      claimedAchievements: Array.isArray(parsed.claimedAchievements) ? parsed.claimedAchievements : [],
      dailyReward: { ...fallback.dailyReward, ...parsed.dailyReward },
      store: {
        unlockedPaints: Array.isArray(parsed.store?.unlockedPaints)
          ? parsed.store!.unlockedPaints
          : fallback.store.unlockedPaints,
        unlockedWheels: Array.isArray(parsed.store?.unlockedWheels)
          ? parsed.store!.unlockedWheels
          : fallback.store.unlockedWheels,
        unlockedBoosts: Array.isArray(parsed.store?.unlockedBoosts)
          ? parsed.store!.unlockedBoosts
          : fallback.store.unlockedBoosts,
        specialItems: Array.isArray(parsed.store?.specialItems)
          ? parsed.store!.specialItems
          : fallback.store.specialItems,
        coinBoosterRacesLeft: Number(parsed.store?.coinBoosterRacesLeft) || 0,
      },
      profile: {
        driverName: parsed.profile?.driverName || fallback.profile.driverName,
        avatarColor: parsed.profile?.avatarColor || fallback.profile.avatarColor,
      },
    };
  } catch {
    return fallback;
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function getAchievementProgress(save: SaveData, ach: AchievementDef): number {
  switch (ach.metric) {
    case 'races_won':
      return save.stats.racesWon;
    case 'levels_completed':
      return Object.values(save.levels).filter((l) => l.completed).length;
    case 'total_stars':
      return Object.values(save.levels).reduce((sum, l) => sum + l.stars, 0);
    case 'cars_owned':
      return Object.values(save.cars).filter((c) => c.unlocked).length;
    case 'drift_seconds':
      return Math.floor(save.stats.totalDriftSeconds);
    case 'nitro_uses':
      return save.stats.nitroUses;
    case 'level_100_won':
      return save.levels[100]?.completed ? 1 : 0;
    default:
      return 0;
  }
}

export function getHighestUnlockedLevel(save: SaveData): number {
  let highest = 1;
  for (let i = 1; i <= 100; i++) {
    if (save.levels[i]?.unlocked) highest = i;
  }
  return highest;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function canClaimDailyReward(save: SaveData): boolean {
  const today = getTodayDateString();
  return save.dailyReward.lastClaimDate !== today;
}
