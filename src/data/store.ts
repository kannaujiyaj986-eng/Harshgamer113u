import { WheelStyle } from '../types/game';

export type StoreCategory =
  | 'cars'
  | 'paints'
  | 'wheels'
  | 'nitro_effects'
  | 'speed_upgrades'
  | 'engine_upgrades'
  | 'special_items';

export interface StorePaintItem {
  id: string;
  name: string;
  hex: string;
  price: number;
  description: string;
}

export interface StoreWheelItem {
  id: WheelStyle;
  name: string;
  price: number;
  description: string;
}

export interface StoreBoostItem {
  id: string;
  name: string;
  hex: string;
  price: number;
  description: string;
}

export interface StoreSpecialItem {
  id: 'coin_booster' | 'full_nitro_start' | 'pro_drift_tires' | 'carbon_kit';
  name: string;
  price: number;
  description: string;
  consumable?: boolean;
}

export const STORE_PAINTS: StorePaintItem[] = [
  { id: 'paint_pearl', name: 'Pearl Frost White', hex: '#f1f5f9', price: 350, description: 'High-gloss pearl white clearcoat finish.' },
  { id: 'paint_cobalt', name: 'Cobalt Storm Blue', hex: '#3b82f6', price: 450, description: 'Deep metallic electric blue lacquer.' },
  { id: 'paint_emerald', name: 'Emerald Track Green', hex: '#10b981', price: 500, description: 'British racing metallic emerald finish.' },
  { id: 'paint_violet', name: 'Ultraviolet Metallic', hex: '#8b5cf6', price: 650, description: 'Deep satin-gloss violet racing coat.' },
  { id: 'paint_rose', name: 'Rose Titanium', hex: '#f43f5e', price: 800, description: 'Anodized crimson-rose supercar paint.' },
  { id: 'paint_24k', name: 'Champagne 24K Gold', hex: '#eab308', price: 1200, description: 'Brushed championship gold metallic finish.' },
];

export const STORE_WHEELS: StoreWheelItem[] = [
  { id: 'turbine', name: 'Turbine Aero Rims', price: 0, description: 'Standard directional cooling alloy rims.' },
  { id: 'aero_disc', name: 'Aero Disc Carbon', price: 600, description: 'Low-drag solid disc track wheels.' },
  { id: 'split_spoke', name: 'Split-Spoke Forged', price: 950, description: 'Lightweight 5-twin-spoke motorsport rims.' },
  { id: 'gold_forged', name: '24K Gold Forged', price: 1800, description: 'Ultra-light championship forged gold alloys.' },
];

export const STORE_BOOSTS: StoreBoostItem[] = [
  { id: 'boost_plasma', name: 'Plasma Blue Flame', hex: '#38bdf8', price: 0, description: 'Classic high-temp cyan exhaust flame.' },
  { id: 'boost_cobalt', name: 'Ion Cobalt Pulse', hex: '#3b82f6', price: 400, description: 'Concentrated deep blue twin-jet flame.' },
  { id: 'boost_solar', name: 'Solar Flare Orange', hex: '#fb923c', price: 550, description: 'Blazing amber-orange exhaust afterburner.' },
  { id: 'boost_emerald', name: 'Emerald Ion Burn', hex: '#34d399', price: 650, description: 'Neon mint hyper-nitro exhaust trail.' },
  { id: 'boost_violet', name: 'Violet Core Plasma', hex: '#a78bfa', price: 850, description: 'Ultraviolet superheated exhaust core.' },
];

export const STORE_SPECIAL_ITEMS: StoreSpecialItem[] = [
  {
    id: 'coin_booster',
    name: '2x Coin Booster (5 Races)',
    price: 900,
    description: 'Doubles all race coin rewards for your next 5 races.',
    consumable: true,
  },
  {
    id: 'full_nitro_start',
    name: 'Turbo Start Reserve',
    price: 1400,
    description: 'Permanently boosts nitro recharge rate by +25% in every race.',
  },
  {
    id: 'pro_drift_tires',
    name: 'Pro Compound Drift Tires',
    price: 1800,
    description: 'Improves cornering grip and drift exit speed by +10%.',
  },
  {
    id: 'carbon_kit',
    name: 'Carbon Aero Body Kit',
    price: 2500,
    description: 'Reduces chassis drag for +6% higher top speed on all cars.',
  },
];
