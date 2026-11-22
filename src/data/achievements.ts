import { AchievementDef } from '../types/game';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_win',
    title: 'Checkered Flag',
    description: 'Win your first ground racing event.',
    rewardCoins: 400,
    target: 1,
    metric: 'races_won',
  },
  {
    id: 'world_one_champ',
    title: 'Coastal Champion',
    description: 'Complete 10 road racing levels.',
    rewardCoins: 1000,
    target: 10,
    metric: 'levels_completed',
  },
  {
    id: 'drift_king',
    title: 'Apex Drift Master',
    description: 'Drift for 30 total seconds around corners.',
    rewardCoins: 850,
    target: 30,
    metric: 'drift_seconds',
  },
  {
    id: 'nitro_junkie',
    title: 'Afterburner Overdrive',
    description: 'Activate Nitro Boost 30 times.',
    rewardCoins: 750,
    target: 30,
    metric: 'nitro_uses',
  },
  {
    id: 'collector_3',
    title: 'Showroom Collector',
    description: 'Own 3 different racing cars in your garage.',
    rewardCoins: 1500,
    target: 3,
    metric: 'cars_owned',
  },
  {
    id: 'star_hunter',
    title: 'Precision Driver',
    description: 'Earn 50 total stars across levels.',
    rewardCoins: 2500,
    target: 50,
    metric: 'total_stars',
  },
  {
    id: 'halfway_hero',
    title: 'Grand Tour Veteran',
    description: 'Complete 50 racing levels.',
    rewardCoins: 5000,
    target: 50,
    metric: 'levels_completed',
  },
  {
    id: 'legendary_100',
    title: 'CARFLY Grand Champion',
    description: 'Win Level 100 and claim the Golden CARFLY Champion Car.',
    rewardCoins: 15000,
    target: 1,
    metric: 'level_100_won',
  },
];

export const DAILY_REWARD_AMOUNTS = [500, 750, 1000, 1500, 2000, 3000, 5000];
