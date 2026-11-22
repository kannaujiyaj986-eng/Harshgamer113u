export type GameScreen =
  | 'menu'
  | 'levels'
  | 'garage'
  | 'store'
  | 'race';

export type GameMode =
  | 'career'
  | 'levels'
  | 'quick_race'
  | 'time_trial';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type CameraMode =
  | 'third_person'
  | 'chase'
  | 'first_person'
  | 'cinematic';

export type GraphicsQuality = 'Low' | 'Medium' | 'High' | 'Ultra';

export type WheelStyle = 'turbine' | 'aero_disc' | 'split_spoke' | 'gold_forged';

export type ControlLayout = 'auto' | 'always' | 'tilt_pedals' | 'off';

export type AppLanguage = 'en' | 'hi' | 'es' | 'ja';

export type CarBodyShape =
  | 'gt_coupe'
  | 'needle_jet'
  | 'wide_hyper'
  | 'pulse_pod'
  | 'twin_rotor'
  | 'split_wing'
  | 'titan_heavy'
  | 'forward_wing'
  | 'tri_thruster'
  | 'orbital_x'
  | 'champion_gold';

export interface CarStats {
  topSpeed: number;     // 1-115
  acceleration: number; // 1-115
  handling: number;     // 1-115
  brakes: number;       // 1-115
  nitro: number;        // 1-115
}

export interface CarSpec {
  id: string;
  name: string;
  tagline: string;
  bodyShape: CarBodyShape;
  price: number;
  unlockRequirement?: 'level_100';
  baseStats: CarStats;
  defaultColor: string;
  defaultNeon: string;
  defaultBoost: string;
  defaultWheel: WheelStyle;
}

export interface CarUpgrades {
  speed: number;        // 1..5
  acceleration: number; // 1..5
  handling: number;     // 1..5
  brakes: number;       // 1..5
  nitro: number;        // 1..5
}

export interface CarCustomization {
  color: string;
  wheelStyle: WheelStyle;
  neonColor: string;
  boostColor: string;
}

export interface OwnedCarData {
  unlocked: boolean;
  upgrades: CarUpgrades;
  customization: CarCustomization;
}

export interface WorldTheme {
  id: number; // 1..10
  name: string;
  subtitle: string;
  environmentName: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  groundColor: string;
  roadColor: string;
  railColor: string;
  accentColor: string;
  waterColor: string;
  hasWater: boolean;
  hasMountains: boolean;
  hasCity: boolean;
  hasTrees: boolean;
  hasStorm: boolean;
  hasSpace: boolean;
  hasRainbow: boolean;
  hasCitadel: boolean;
  cloudTint: string;
}

export interface LevelConfig {
  id: number; // 1..100
  worldId: number; // 1..10
  levelInWorld: number; // 1..10
  name: string;
  description: string;
  seed: number;
  laps: number;
  trackRadius: number;
  complexity: number;
  elevationScale: number;
  trackWidth: number;
  obstacleCount: number;
  boostPadCount: number;
  nitroGateCount: number;
  aiCount: number;
  aiSkill: number;
  targetTimesMs: [number, number, number];
  coinReward: number;
  isFinalChampionship: boolean;
}

export interface LevelProgress {
  unlocked: boolean;
  completed: boolean;
  stars: number;
  bestTimeMs: number | null;
}

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  musicVolume: number;
  sfxVolume: number;
  sensitivity: number;
  cameraMode: CameraMode;
  tiltSteering: boolean;
  vibration: boolean;
  language: AppLanguage;
  targetFps: 30 | 60 | 120;
  difficulty: Difficulty;
  controlLayout: ControlLayout;
  muted: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  target: number;
  metric:
    | 'races_won'
    | 'levels_completed'
    | 'total_stars'
    | 'cars_owned'
    | 'drift_seconds'
    | 'nitro_uses'
    | 'level_100_won';
}

export interface SaveStats {
  racesCompleted: number;
  racesWon: number;
  nitroUses: number;
  totalDriftSeconds: number;
  topSpeedKmh: number;
}

export interface DailyRewardState {
  lastClaimDate: string | null;
  streakDay: number;
}

export interface StoreInventory {
  unlockedPaints: string[];
  unlockedWheels: WheelStyle[];
  unlockedBoosts: string[];
  specialItems: string[]; // 'coin_booster', 'full_nitro_start', 'pro_drift_tires', 'carbon_kit'
  coinBoosterRacesLeft: number;
}

export interface PlayerProfile {
  driverName: string;
  avatarColor: string;
}

export interface SaveData {
  version: number;
  coins: number;
  selectedCarId: string;
  cars: Record<string, OwnedCarData>;
  levels: Record<number, LevelProgress>;
  settings: GameSettings;
  stats: SaveStats;
  claimedAchievements: string[];
  dailyReward: DailyRewardState;
  store: StoreInventory;
  profile: PlayerProfile;
}

export interface MinimapMarker {
  x: number;
  z: number;
  isPlayer: boolean;
  color: string;
}

export interface HudTelemetry {
  speedKmh: number;
  gearLabel: string; // 'R', 'N', '1'..'6'
  isDrifting: boolean;
  isReversing: boolean;
  position: number;
  totalRacers: number;
  lap: number;
  totalLaps: number;
  raceTimeMs: number;
  nitro: number;
  nitroActive: boolean;
  trackProgress: number;
  countdown: number;
  countdownLabel: string;
  wrongWay: boolean;
  minimapPath: Array<{ x: number; z: number }>;
  minimapMarkers: MinimapMarker[];
  lapBanner: string | null;
  cameraMode: CameraMode;
}

export interface RaceResult {
  mode: GameMode;
  levelId: number;
  worldId: number;
  position: number;
  totalRacers: number;
  timeMs: number;
  stars: number;
  isNewRecord: boolean;
  coinsEarned: number;
  firstClearBonus: number;
  driftBonus: number;
  boosterMultiplierApplied: boolean;
  victory: boolean;
  unlockedNextLevel: number | null;
  unlockedChampionCar: boolean;
}
