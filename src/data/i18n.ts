import { AppLanguage } from '../types/game';

interface TranslationDict {
  play: string;
  cars: string;
  store: string;
  levels: string;
  rewards: string;
  profile: string;
  settings: string;
  pause: string;
  resume: string;
  restart: string;
  exitMenu: string;
  lap: string;
  pos: string;
  nitro: string;
  drift: string;
  reverse: string;
}

const DICTS: Record<AppLanguage, TranslationDict> = {
  en: {
    play: 'PLAY',
    cars: 'CARS',
    store: 'STORE',
    levels: 'LEVELS',
    rewards: 'REWARDS',
    profile: 'PROFILE',
    settings: 'SETTINGS',
    pause: 'PAUSED',
    resume: 'RESUME',
    restart: 'RESTART',
    exitMenu: 'MAIN MENU',
    lap: 'LAP',
    pos: 'POS',
    nitro: 'NITRO',
    drift: 'DRIFT',
    reverse: 'REV',
  },
  hi: {
    play: 'खेलें',
    cars: 'कारें',
    store: 'स्टोर',
    levels: 'लेवल',
    rewards: 'इनाम',
    profile: 'प्रोफ़ाइल',
    settings: 'सेटिंग्स',
    pause: 'रुका हुआ',
    resume: 'जारी रखें',
    restart: 'फिर से शुरू',
    exitMenu: 'मुख्य मेनू',
    lap: 'लैप',
    pos: 'स्थान',
    nitro: 'नाइट्रो',
    drift: 'ड्रिफ्ट',
    reverse: 'रिवर्स',
  },
  es: {
    play: 'JUGAR',
    cars: 'AUTOS',
    store: 'TIENDA',
    levels: 'NIVELES',
    rewards: 'PREMIOS',
    profile: 'PERFIL',
    settings: 'AJUSTES',
    pause: 'PAUSA',
    resume: 'REANUDAR',
    restart: 'REINICIAR',
    exitMenu: 'MENÚ',
    lap: 'VUELTA',
    pos: 'POS',
    nitro: 'NITRO',
    drift: 'DERRAPE',
    reverse: 'REV',
  },
  ja: {
    play: 'プレイ',
    cars: 'マシン',
    store: 'ストア',
    levels: 'レベル',
    rewards: '報酬',
    profile: 'プロフィール',
    settings: '設定',
    pause: '一時停止',
    resume: '再開',
    restart: 'リスタート',
    exitMenu: 'メニュー',
    lap: 'ラップ',
    pos: '順位',
    nitro: 'ニトロ',
    drift: 'ドリフト',
    reverse: 'R',
  },
};

export function t(lang: AppLanguage): TranslationDict {
  return DICTS[lang] ?? DICTS.en;
}
