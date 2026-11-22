import { LevelConfig } from '../types/game';
import { WORLDS } from './worlds';

const TRACK_PREFIXES = [
  'Horizon', 'Apex', 'Grand', 'Velocity', 'Turbo',
  'Canyon', 'Coastal', 'Summit', 'Valkyrie', 'Zenith',
];

const TRACK_SUFFIXES = [
  'Sprint', 'Circuit', 'Speedway', 'Loop', 'Runway',
  'Bypass', 'Parkway', 'Overdrive', 'Challenge', 'Grand Prix',
];

function createLevel(id: number): LevelConfig {
  const worldId = Math.ceil(id / 10);
  const levelInWorld = ((id - 1) % 10) + 1;
  const world = WORLDS[worldId - 1];
  const isFinal = id === 100;

  const progress = (id - 1) / 99;
  const laps = id <= 10 ? 1 : id <= 50 ? 2 : isFinal ? 3 : levelInWorld >= 8 ? 3 : 2;
  const trackRadius = 210 + ((id * 17) % 70) + progress * 95 + (isFinal ? 60 : 0);
  const complexity = 2 + Math.floor((id - 1) / 14) + (levelInWorld % 3);
  const elevationScale = 3.5 + worldId * 0.9 + (levelInWorld % 3) * 0.8;
  const trackWidth = Math.max(17, 25 - progress * 6);

  const obstacleCount = id <= 2 ? 2 : Math.min(18, 3 + Math.floor(id / 6));
  const boostPadCount = 5 + Math.floor(worldId * 0.6);
  const nitroGateCount = 5 + Math.floor(worldId * 0.6);

  const aiCount = isFinal ? 6 : Math.min(6, 3 + Math.floor(worldId / 3));
  const aiSkill = isFinal ? 1.08 : 0.72 + progress * 0.34;

  const approxCircumference = trackRadius * 2 * Math.PI * (1 + complexity * 0.04);
  const totalDist = approxCircumference * laps;
  const avgSpeedMs = 66 + progress * 46;
  const baseTimeSec = totalDist / avgSpeedMs;
  const threeStarMs = Math.round(baseTimeSec * 1000);
  const twoStarMs = Math.round(baseTimeSec * 1.18 * 1000);
  const oneStarMs = Math.round(baseTimeSec * 1.42 * 1000);

  const coinReward = isFinal
    ? 10000
    : Math.round(250 + id * 45 + (levelInWorld === 10 ? 400 : 0));

  const prefix = TRACK_PREFIXES[(id + worldId) % TRACK_PREFIXES.length];
  const suffix = TRACK_SUFFIXES[(id * 3 + levelInWorld) % TRACK_SUFFIXES.length];

  const name = isFinal
    ? 'CARFLY Grand Championship'
    : levelInWorld === 10
      ? `${world.environmentName} Finale`
      : `${prefix} ${suffix} ${id}`;

  const description = isFinal
    ? 'The ultimate Level 100 Championship road race. Defeat the Golden Rival to win the Trophy and unlock the Golden CARFLY Champion Car.'
    : `Race ${laps} ${laps === 1 ? 'lap' : 'laps'} on ${world.environmentName} against ${aiCount} ground-racing rivals.`;

  return {
    id,
    worldId,
    levelInWorld,
    name,
    description,
    seed: id * 7919 + worldId * 101,
    laps,
    trackRadius,
    complexity,
    elevationScale,
    trackWidth,
    obstacleCount,
    boostPadCount,
    nitroGateCount,
    aiCount,
    aiSkill,
    targetTimesMs: [threeStarMs, twoStarMs, oneStarMs],
    coinReward,
    isFinalChampionship: isFinal,
  };
}

export const LEVELS: LevelConfig[] = Array.from({ length: 100 }, (_, idx) => createLevel(idx + 1));

export function getLevelById(id: number): LevelConfig {
  return LEVELS[Math.max(0, Math.min(99, id - 1))];
}
