import { CarSpec, CarStats, CarUpgrades } from '../types/game';

export const CAR_CATALOG: CarSpec[] = [
  {
    id: 'aero-v1',
    name: 'AeroVeloce GT',
    tagline: 'Balanced Rear-Drive Track Coupe',
    bodyShape: 'gt_coupe',
    price: 0,
    baseStats: { topSpeed: 64, acceleration: 66, handling: 72, brakes: 70, nitro: 65 },
    defaultColor: '#141820',
    defaultNeon: '#22d3ee',
    defaultBoost: '#fb923c',
    defaultWheel: 'turbine',
  },
  {
    id: 'sky-dart',
    name: 'Veloce V8 Interceptor',
    tagline: 'Low-Slung High-Velocity Asphalt Sprinter',
    bodyShape: 'needle_jet',
    price: 1200,
    baseStats: { topSpeed: 74, acceleration: 70, handling: 69, brakes: 72, nitro: 70 },
    defaultColor: '#ef4444',
    defaultNeon: '#f87171',
    defaultBoost: '#38bdf8',
    defaultWheel: 'aero_disc',
  },
  {
    id: 'strato-gt',
    name: 'StratoPhantom GT3',
    tagline: 'Widebody Ground-Effect Apex Racer',
    bodyShape: 'wide_hyper',
    price: 2400,
    baseStats: { topSpeed: 76, acceleration: 78, handling: 78, brakes: 76, nitro: 74 },
    defaultColor: '#f59e0b',
    defaultNeon: '#fbbf24',
    defaultBoost: '#60a5fa',
    defaultWheel: 'split_spoke',
  },
  {
    id: 'nebula-ev',
    name: 'Nebula Pulse EV',
    tagline: 'Instant-Torque Electric Supercar',
    bodyShape: 'pulse_pod',
    price: 3800,
    baseStats: { topSpeed: 79, acceleration: 86, handling: 82, brakes: 80, nitro: 78 },
    defaultColor: '#6366f1',
    defaultNeon: '#818cf8',
    defaultBoost: '#38bdf8',
    defaultWheel: 'aero_disc',
  },
  {
    id: 'vortex-s',
    name: 'Vortex Twin-Turbo',
    tagline: 'High-Grip Cornering & Drift Machine',
    bodyShape: 'twin_rotor',
    price: 5500,
    baseStats: { topSpeed: 81, acceleration: 83, handling: 88, brakes: 86, nitro: 80 },
    defaultColor: '#10b981',
    defaultNeon: '#34d399',
    defaultBoost: '#22d3ee',
    defaultWheel: 'turbine',
  },
  {
    id: 'zenith-rs',
    name: 'Zenith Track RS',
    tagline: 'Endurance Carbon-Chassised Prototype',
    bodyShape: 'split_wing',
    price: 7500,
    baseStats: { topSpeed: 86, acceleration: 83, handling: 86, brakes: 88, nitro: 84 },
    defaultColor: '#f8fafc',
    defaultNeon: '#38bdf8',
    defaultBoost: '#3b82f6',
    defaultWheel: 'split_spoke',
  },
  {
    id: 'titan-x',
    name: 'Titan Ridge V10',
    tagline: 'Heavy-Torque Muscle & Circuit Bruiser',
    bodyShape: 'titan_heavy',
    price: 9800,
    baseStats: { topSpeed: 85, acceleration: 88, handling: 80, brakes: 84, nitro: 90 },
    defaultColor: '#475569',
    defaultNeon: '#f97316',
    defaultBoost: '#fb923c',
    defaultWheel: 'turbine',
  },
  {
    id: 'helios-r',
    name: 'Helios Apex R',
    tagline: 'Active-Aero Downforce Hypercar',
    bodyShape: 'forward_wing',
    price: 12500,
    baseStats: { topSpeed: 91, acceleration: 89, handling: 92, brakes: 91, nitro: 88 },
    defaultColor: '#fb7185',
    defaultNeon: '#fda4af',
    defaultBoost: '#38bdf8',
    defaultWheel: 'aero_disc',
  },
  {
    id: 'nova-apex',
    name: 'Nova Tri-Exhaust',
    tagline: 'Triple-Pipe Track Weapon',
    bodyShape: 'tri_thruster',
    price: 16000,
    baseStats: { topSpeed: 94, acceleration: 92, handling: 91, brakes: 90, nitro: 94 },
    defaultColor: '#0ea5e9',
    defaultNeon: '#38bdf8',
    defaultBoost: '#60a5fa',
    defaultWheel: 'split_spoke',
  },
  {
    id: 'quantum-z',
    name: 'Quantum Zero',
    tagline: 'Carbon-Titanium Flagship Hypercar',
    bodyShape: 'orbital_x',
    price: 21000,
    baseStats: { topSpeed: 97, acceleration: 95, handling: 95, brakes: 96, nitro: 95 },
    defaultColor: '#1e293b',
    defaultNeon: '#22d3ee',
    defaultBoost: '#818cf8',
    defaultWheel: 'gold_forged',
  },
  {
    id: 'carfly-gold',
    name: 'Golden CARFLY Champion',
    tagline: 'Level 100 Grand Championship Trophy Car',
    bodyShape: 'champion_gold',
    price: 50000,
    unlockRequirement: 'level_100',
    baseStats: { topSpeed: 100, acceleration: 100, handling: 99, brakes: 100, nitro: 100 },
    defaultColor: '#f59e0b',
    defaultNeon: '#fde047',
    defaultBoost: '#38bdf8',
    defaultWheel: 'gold_forged',
  },
];

export const PAINT_SWATCHES = [
  { name: 'Cyber Cyan', hex: '#06b6d4', price: 0 },
  { name: 'Crimson Velocity', hex: '#ef4444', price: 0 },
  { name: 'Solar Gold', hex: '#f59e0b', price: 0 },
  { name: 'Obsidian Matte', hex: '#1e293b', price: 0 },
  { name: 'Pearl White', hex: '#f1f5f9', price: 350 },
  { name: 'Cobalt Storm', hex: '#3b82f6', price: 450 },
  { name: 'Emerald Track', hex: '#10b981', price: 500 },
  { name: 'Ultraviolet', hex: '#8b5cf6', price: 650 },
  { name: 'Rose Titanium', hex: '#f43f5e', price: 800 },
  { name: 'Champagne 24K', hex: '#eab308', price: 1200 },
];

export const NEON_SWATCHES = [
  { name: 'Ice Cyan', hex: '#22d3ee' },
  { name: 'Amber Blaze', hex: '#fbbf24' },
  { name: 'Laser Red', hex: '#f87171' },
  { name: 'Hyper Mint', hex: '#34d399' },
  { name: 'Electric Indigo', hex: '#818cf8' },
  { name: 'Pure White', hex: '#ffffff' },
];

export const BOOST_SWATCHES = [
  { name: 'Plasma Blue', hex: '#38bdf8', price: 0 },
  { name: 'Ion Cobalt', hex: '#3b82f6', price: 400 },
  { name: 'Solar Flare', hex: '#fb923c', price: 550 },
  { name: 'Emerald Ion', hex: '#34d399', price: 650 },
  { name: 'Violet Core', hex: '#a78bfa', price: 850 },
];

export function computeEffectiveStats(spec: CarSpec, upgrades: CarUpgrades): CarStats {
  return {
    topSpeed: Math.min(115, Math.round(spec.baseStats.topSpeed + (upgrades.speed - 1) * 3.8)),
    acceleration: Math.min(115, Math.round(spec.baseStats.acceleration + (upgrades.acceleration - 1) * 3.8)),
    handling: Math.min(115, Math.round(spec.baseStats.handling + (upgrades.handling - 1) * 3.8)),
    brakes: Math.min(115, Math.round(spec.baseStats.brakes + (upgrades.brakes - 1) * 3.8)),
    nitro: Math.min(115, Math.round(spec.baseStats.nitro + (upgrades.nitro - 1) * 4.0)),
  };
}

export function getUpgradeCost(currentLevel: number): number {
  return currentLevel * 450;
}

export function getCarById(id: string): CarSpec {
  return CAR_CATALOG.find((c) => c.id === id) ?? CAR_CATALOG[0];
}
