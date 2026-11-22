import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GarageView } from './components/GarageView';
import { HowToPlayModal } from './components/HowToPlayModal';
import { LevelSelect } from './components/LevelSelect';
import { MainMenu } from './components/MainMenu';
import { PauseModal } from './components/PauseModal';
import { ProfileModal } from './components/ProfileModal';
import { QuickRaceModal } from './components/QuickRaceModal';
import { RaceHud } from './components/RaceHud';
import { ResultsModal } from './components/ResultsModal';
import { RewardsModal } from './components/RewardsModal';
import { SettingsModal } from './components/SettingsModal';
import { StoreModal } from './components/StoreModal';
import { ACHIEVEMENTS, DAILY_REWARD_AMOUNTS } from './data/achievements';
import { getCarById, getUpgradeCost } from './data/cars';
import { getLevelById } from './data/levels';
import {
  canClaimDailyReward,
  createDefaultSaveData,
  getAchievementProgress,
  getHighestUnlockedLevel,
  getTodayDateString,
  loadSaveData,
  persistSaveData,
} from './storage/saveSystem';
import { CarflyEngine, ControlInputState, RaceFinishEvent } from './three/gameEngine';
import {
  CarCustomization,
  CarUpgrades,
  Difficulty,
  GameMode,
  GameScreen,
  GameSettings,
  HudTelemetry,
  PlayerProfile,
  RaceResult,
  SaveData,
  WheelStyle,
} from './types/game';

const INITIAL_HUD: HudTelemetry = {
  speedKmh: 0,
  gearLabel: 'N',
  isDrifting: false,
  isReversing: false,
  position: 1,
  totalRacers: 4,
  lap: 1,
  totalLaps: 1,
  raceTimeMs: 0,
  nitro: 100,
  nitroActive: false,
  trackProgress: 0,
  countdown: 3,
  countdownLabel: '3',
  wrongWay: false,
  minimapPath: [],
  minimapMarkers: [],
  lapBanner: null,
  cameraMode: 'third_person',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CarflyEngine | null>(null);

  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const saveRef = useRef<SaveData>(save);
  saveRef.current = save;

  const [screen, setScreen] = useState<GameScreen>('menu');
  const [activeModal, setActiveModal] = useState<
    'none' | 'quick_race' | 'rewards' | 'settings' | 'how_to_play' | 'profile'
  >('none');

  const [previewCarId, setPreviewCarId] = useState<string>(save.selectedCarId);
  const [raceConfig, setRaceConfig] = useState<{
    mode: GameMode;
    levelId: number;
    difficulty: Difficulty;
  }>({ mode: 'levels', levelId: 1, difficulty: save.settings.difficulty });

  const [hud, setHud] = useState<HudTelemetry>(INITIAL_HUD);
  const [paused, setPaused] = useState(false);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [isPortraitRotated, setIsPortraitRotated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const enterLandscapeFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orientationApi = window.screen?.orientation as unknown as { lock?: (mode: string) => Promise<void> };
      if (orientationApi?.lock) {
        await orientationApi.lock('landscape');
      }
    } catch {
      // Browser may block orientation lock outside fullscreen; CSS landscape stage handles it automatically
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    soundEngine.playClick();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await enterLandscapeFullscreen();
      }
    } catch {
      // Ignore fullscreen denial gracefully
    }
  }, [enterLandscapeFullscreen]);

  useEffect(() => {
    const syncLayout = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortraitRotated(portrait);
      engineRef.current?.setLandscapeRotated(portrait);
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    syncLayout();
    window.addEventListener('resize', syncLayout);
    window.addEventListener('orientationchange', syncLayout);
    document.addEventListener('fullscreenchange', syncLayout);
    return () => {
      window.removeEventListener('resize', syncLayout);
      window.removeEventListener('orientationchange', syncLayout);
      document.removeEventListener('fullscreenchange', syncLayout);
    };
  }, []);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  // Handle race finish & rewards calculation
  const handleRaceFinishRef = useRef<(ev: RaceFinishEvent) => void>(() => {});
  handleRaceFinishRef.current = (ev: RaceFinishEvent) => {
    const curSave = saveRef.current;
    const level = getLevelById(ev.levelId);
    const prevProg = curSave.levels[ev.levelId];

    let stars = 0;
    const victory =
      ev.mode === 'time_trial'
        ? ev.timeMs <= level.targetTimesMs[2]
        : ev.position <= Math.ceil(ev.totalRacers * 0.5);

    if (ev.mode === 'time_trial') {
      if (ev.timeMs <= level.targetTimesMs[0]) stars = 3;
      else if (ev.timeMs <= level.targetTimesMs[1]) stars = 2;
      else if (ev.timeMs <= level.targetTimesMs[2]) stars = 1;
    } else {
      if (ev.position === 1) {
        stars = ev.timeMs <= level.targetTimesMs[0] ? 3 : 2;
      } else if (ev.position === 2) {
        stars = 2;
      } else if (ev.position <= Math.ceil(ev.totalRacers * 0.6)) {
        stars = 1;
      }
    }

    const placeMult = ev.position === 1 ? 1.0 : ev.position === 2 ? 0.7 : ev.position === 3 ? 0.5 : 0.3;
    const coinsEarned = Math.round(level.coinReward * placeMult);
    const firstClearBonus = !prevProg?.completed && victory ? Math.round(level.coinReward * 0.6) : 0;
    const driftBonus = Math.min(400, Math.round(ev.driftSeconds * 18));
    const boosterMultiplierApplied = curSave.store.coinBoosterRacesLeft > 0;
    const rawTotal = coinsEarned + firstClearBonus + driftBonus;
    const totalCoins = boosterMultiplierApplied ? rawTotal * 2 : rawTotal;

    const isNewRecord =
      prevProg?.bestTimeMs === null || ev.timeMs < (prevProg?.bestTimeMs ?? Infinity);

    const isCampaign = ev.mode === 'levels' || ev.mode === 'career';
    const unlockedNextLevel =
      isCampaign && victory && ev.levelId < 100 ? ev.levelId + 1 : null;

    const unlockedChampionCar =
      ev.levelId === 100 &&
      ev.position === 1 &&
      !curSave.cars['carfly-gold']?.unlocked;

    updateSave((prev) => {
      const nextLevels = { ...prev.levels };
      const existing = nextLevels[ev.levelId];
      nextLevels[ev.levelId] = {
        unlocked: true,
        completed: existing.completed || victory,
        stars: Math.max(existing.stars, stars),
        bestTimeMs:
          existing.bestTimeMs === null
            ? ev.timeMs
            : Math.min(existing.bestTimeMs, ev.timeMs),
      };

      if (unlockedNextLevel) {
        nextLevels[unlockedNextLevel] = {
          ...nextLevels[unlockedNextLevel],
          unlocked: true,
        };
      }

      const nextCars = { ...prev.cars };
      if (unlockedChampionCar) {
        nextCars['carfly-gold'] = {
          ...nextCars['carfly-gold'],
          unlocked: true,
        };
      }

      return {
        ...prev,
        coins: prev.coins + totalCoins,
        levels: nextLevels,
        cars: nextCars,
        store: {
          ...prev.store,
          coinBoosterRacesLeft: Math.max(0, prev.store.coinBoosterRacesLeft - 1),
        },
        stats: {
          racesCompleted: prev.stats.racesCompleted + 1,
          racesWon: prev.stats.racesWon + (ev.position === 1 ? 1 : 0),
          nitroUses: prev.stats.nitroUses + ev.nitroUses,
          totalDriftSeconds: prev.stats.totalDriftSeconds + ev.driftSeconds,
          topSpeedKmh: Math.max(prev.stats.topSpeedKmh, ev.topSpeedKmh),
        },
      };
    });

    setRaceResult({
      mode: ev.mode,
      levelId: ev.levelId,
      worldId: level.worldId,
      position: ev.position,
      totalRacers: ev.totalRacers,
      timeMs: ev.timeMs,
      stars,
      isNewRecord,
      coinsEarned,
      firstClearBonus,
      driftBonus,
      boosterMultiplierApplied,
      victory,
      unlockedNextLevel,
      unlockedChampionCar,
    });
  };

  // Mount Three.js WebGL Engine once in isolated ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new CarflyEngine(
      mount,
      saveRef.current.settings,
      (nextHud) => setHud(nextHud),
      (ev) => handleRaceFinishRef.current(ev)
    );
    engineRef.current = engine;
    soundEngine.updateSettings(saveRef.current.settings);

    const curCar = saveRef.current.selectedCarId;
    engine.enterMenuShowcase(curCar, saveRef.current.cars[curCar]);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard Controls & Blur Safety (Pure Ground Driving)
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const resultRef = useRef(raceResult);
  resultRef.current = raceResult;

  useEffect(() => {
    const setControl = (key: keyof ControlInputState, val: boolean) => {
      if (engineRef.current) {
        (engineRef.current.controls[key] as boolean) = val;
      }
    };

    const clearAllKeys = () => {
      if (!engineRef.current) return;
      const c = engineRef.current.controls;
      c.accelerate = false;
      c.brake = false;
      c.left = false;
      c.right = false;
      c.nitro = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (screenRef.current !== 'race') return;
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') setControl('accelerate', true);
      else if (code === 'KeyS' || code === 'ArrowDown') setControl('brake', true);
      else if (code === 'KeyA' || code === 'ArrowLeft') setControl('left', true);
      else if (code === 'KeyD' || code === 'ArrowRight') setControl('right', true);
      else if (code === 'Space') {
        e.preventDefault();
        setControl('nitro', true);
      } else if (code === 'KeyR' && !e.repeat) {
        engineRef.current?.resetCarToTrack();
      } else if (code === 'KeyC' && !e.repeat) {
        const nextCam = engineRef.current?.cycleCamera();
        if (nextCam) {
          setHud((h) => ({ ...h, cameraMode: nextCam }));
        }
      } else if (code === 'Escape' && !e.repeat && !resultRef.current) {
        const nextPaused = !pausedRef.current;
        setPaused(nextPaused);
        engineRef.current?.setPaused(nextPaused);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') setControl('accelerate', false);
      else if (code === 'KeyS' || code === 'ArrowDown') setControl('brake', false);
      else if (code === 'KeyA' || code === 'ArrowLeft') setControl('left', false);
      else if (code === 'KeyD' || code === 'ArrowRight') setControl('right', false);
      else if (code === 'Space') setControl('nitro', false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearAllKeys);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearAllKeys);
    };
  }, []);

  // Optional Tilt Steering via DeviceOrientation (calibrated for landscape & rotated portrait)
  useEffect(() => {
    const tiltEnabled = save.settings.tiltSteering || save.settings.controlLayout === 'tilt_pedals';
    if (!tiltEnabled) {
      if (engineRef.current) engineRef.current.controls.tiltAxis = 0;
      return;
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (!engineRef.current) return;
      const raw = isPortraitRotated ? e.gamma : e.beta;
      if (raw === null) return;
      engineRef.current.controls.tiltAxis = Math.max(-1, Math.min(1, raw / 30));
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [save.settings.tiltSteering, save.settings.controlLayout, isPortraitRotated]);

  // Launch a Ground Race
  const launchRace = useCallback(
    (mode: GameMode, levelId: number, difficulty?: Difficulty) => {
      soundEngine.unlock();
      soundEngine.playClick();
      if (isTouchDevice) {
        void enterLandscapeFullscreen();
      }
      const cur = saveRef.current;
      const diff = difficulty ?? cur.settings.difficulty;
      setRaceConfig({ mode, levelId, difficulty: diff });
      setRaceResult(null);
      setPaused(false);
      setActiveModal('none');
      setScreen('race');

      engineRef.current?.startRace({
        mode,
        levelId,
        carId: cur.selectedCarId,
        carData: cur.cars[cur.selectedCarId],
        difficulty: diff,
        settings: cur.settings,
        store: cur.store,
      });
    },
    [enterLandscapeFullscreen, isTouchDevice]
  );

  const returnToMenu = useCallback(() => {
    soundEngine.playClick();
    setPaused(false);
    setRaceResult(null);
    setActiveModal('none');
    setScreen('menu');
    const cur = saveRef.current;
    engineRef.current?.enterMenuShowcase(cur.selectedCarId, cur.cars[cur.selectedCarId]);
  }, []);

  const openGarage = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    const cur = saveRef.current;
    setPreviewCarId(cur.selectedCarId);
    setScreen('garage');
    engineRef.current?.enterGarage(cur.selectedCarId, cur.cars[cur.selectedCarId]);
  }, []);

  const openStore = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    setScreen('store');
  }, []);

  const handlePreviewCar = useCallback((carId: string) => {
    soundEngine.playClick();
    setPreviewCarId(carId);
    engineRef.current?.updateGarageCar(carId, saveRef.current.cars[carId]);
  }, []);

  const handleSelectCar = useCallback(
    (carId: string) => {
      soundEngine.playClick();
      updateSave((prev) => ({ ...prev, selectedCarId: carId }));
    },
    [updateSave]
  );

  const handleBuyCar = useCallback(
    (carId: string) => {
      const spec = getCarById(carId);
      if (spec.unlockRequirement === 'level_100') return;
      soundEngine.playBoost();
      updateSave((prev) => {
        if (prev.coins < spec.price || prev.cars[carId]?.unlocked) return prev;
        return {
          ...prev,
          coins: prev.coins - spec.price,
          selectedCarId: carId,
          cars: {
            ...prev.cars,
            [carId]: { ...prev.cars[carId], unlocked: true },
          },
        };
      });
    },
    [updateSave]
  );

  const handleUpdateCustomization = useCallback(
    (carId: string, custom: CarCustomization) => {
      engineRef.current?.updateGarageAppearance(custom);
      updateSave((prev) => ({
        ...prev,
        cars: {
          ...prev.cars,
          [carId]: { ...prev.cars[carId], customization: custom },
        },
      }));
    },
    [updateSave]
  );

  const handleUpgradeCar = useCallback(
    (carId: string, stat: keyof CarUpgrades) => {
      soundEngine.playBoost();
      updateSave((prev) => {
        const car = prev.cars[carId];
        if (!car || !car.unlocked) return prev;
        const lvl = car.upgrades[stat];
        if (lvl >= 5) return prev;
        const cost = getUpgradeCost(lvl);
        if (prev.coins < cost) return prev;
        return {
          ...prev,
          coins: prev.coins - cost,
          cars: {
            ...prev.cars,
            [carId]: {
              ...car,
              upgrades: { ...car.upgrades, [stat]: lvl + 1 },
            },
          },
        };
      });
    },
    [updateSave]
  );

  // Store Item Purchases
  const handleBuyPaint = useCallback(
    (hex: string, price: number) => {
      soundEngine.playBoost();
      updateSave((prev) => {
        if (prev.coins < price || prev.store.unlockedPaints.includes(hex)) return prev;
        const activeId = prev.selectedCarId;
        const nextCustom = { ...prev.cars[activeId].customization, color: hex };
        engineRef.current?.updateGarageAppearance(nextCustom);
        return {
          ...prev,
          coins: prev.coins - price,
          store: {
            ...prev.store,
            unlockedPaints: [...prev.store.unlockedPaints, hex],
          },
          cars: {
            ...prev.cars,
            [activeId]: { ...prev.cars[activeId], customization: nextCustom },
          },
        };
      });
    },
    [updateSave]
  );

  const handleEquipPaint = useCallback(
    (hex: string) => {
      soundEngine.playClick();
      updateSave((prev) => {
        const activeId = prev.selectedCarId;
        const nextCustom = { ...prev.cars[activeId].customization, color: hex };
        engineRef.current?.updateGarageAppearance(nextCustom);
        return {
          ...prev,
          cars: {
            ...prev.cars,
            [activeId]: { ...prev.cars[activeId], customization: nextCustom },
          },
        };
      });
    },
    [updateSave]
  );

  const handleBuyWheel = useCallback(
    (wheel: WheelStyle, price: number) => {
      soundEngine.playBoost();
      updateSave((prev) => {
        if (prev.coins < price || prev.store.unlockedWheels.includes(wheel)) return prev;
        const activeId = prev.selectedCarId;
        const nextCustom = { ...prev.cars[activeId].customization, wheelStyle: wheel };
        engineRef.current?.updateGarageAppearance(nextCustom);
        return {
          ...prev,
          coins: prev.coins - price,
          store: {
            ...prev.store,
            unlockedWheels: [...prev.store.unlockedWheels, wheel],
          },
          cars: {
            ...prev.cars,
            [activeId]: { ...prev.cars[activeId], customization: nextCustom },
          },
        };
      });
    },
    [updateSave]
  );

  const handleEquipWheel = useCallback(
    (wheel: WheelStyle) => {
      soundEngine.playClick();
      updateSave((prev) => {
        const activeId = prev.selectedCarId;
        const nextCustom = { ...prev.cars[activeId].customization, wheelStyle: wheel };
        engineRef.current?.updateGarageAppearance(nextCustom);
        return {
          ...prev,
          cars: {
            ...prev.cars,
            [activeId]: { ...prev.cars[activeId], customization: nextCustom },
          },
        };
      });
    },
    [updateSave]
  );

  const handleBuyBoost = useCallback(
    (hex: string, price: number) => {
      soundEngine.playBoost();
      updateSave((prev) => {
        if (prev.coins < price || prev.store.unlockedBoosts.includes(hex)) return prev;
        const activeId = prev.selectedCarId;
        const nextCustom = { ...prev.cars[activeId].customization, boostColor: hex };
        engineRef.current?.updateGarageAppearance(nextCustom);
        return {
          ...prev,
          coins: prev.coins - price,
          store: {
            ...prev.store,
            unlockedBoosts: [...prev.store.unlockedBoosts, hex],
          },
          cars: {
            ...prev.cars,
            [activeId]: { ...prev.cars[activeId], customization: nextCustom },
          },
        };
      });
    },
    [updateSave]
  );

  const handleEquipBoost = useCallback(
    (hex: string) => {
      soundEngine.playClick();
      updateSave((prev) => {
        const activeId = prev.selectedCarId;
        const nextCustom = { ...prev.cars[activeId].customization, boostColor: hex };
        engineRef.current?.updateGarageAppearance(nextCustom);
        return {
          ...prev,
          cars: {
            ...prev.cars,
            [activeId]: { ...prev.cars[activeId], customization: nextCustom },
          },
        };
      });
    },
    [updateSave]
  );

  const handleBuySpecialItem = useCallback(
    (
      itemId: 'coin_booster' | 'full_nitro_start' | 'pro_drift_tires' | 'carbon_kit',
      price: number
    ) => {
      soundEngine.playVictory();
      updateSave((prev) => {
        if (prev.coins < price) return prev;
        if (itemId === 'coin_booster') {
          return {
            ...prev,
            coins: prev.coins - price,
            store: {
              ...prev.store,
              coinBoosterRacesLeft: prev.store.coinBoosterRacesLeft + 5,
            },
          };
        }
        if (prev.store.specialItems.includes(itemId)) return prev;
        return {
          ...prev,
          coins: prev.coins - price,
          store: {
            ...prev.store,
            specialItems: [...prev.store.specialItems, itemId],
          },
        };
      });
    },
    [updateSave]
  );

  const handleUpdateSettings = useCallback(
    (next: GameSettings) => {
      engineRef.current?.updateSettings(next);
      updateSave((prev) => ({ ...prev, settings: next }));
    },
    [updateSave]
  );

  const handleUpdateProfile = useCallback(
    (profile: PlayerProfile) => {
      soundEngine.playClick();
      updateSave((prev) => ({ ...prev, profile }));
    },
    [updateSave]
  );

  const handleClaimDaily = useCallback(() => {
    soundEngine.playVictory();
    updateSave((prev) => {
      if (!canClaimDailyReward(prev)) return prev;
      const dayIdx = prev.dailyReward.streakDay % 7;
      const reward = DAILY_REWARD_AMOUNTS[dayIdx];
      return {
        ...prev,
        coins: prev.coins + reward,
        dailyReward: {
          lastClaimDate: getTodayDateString(),
          streakDay: prev.dailyReward.streakDay + 1,
        },
      };
    });
  }, [updateSave]);

  const handleClaimAchievement = useCallback(
    (id: string, reward: number) => {
      soundEngine.playVictory();
      updateSave((prev) => {
        if (prev.claimedAchievements.includes(id)) return prev;
        return {
          ...prev,
          coins: prev.coins + reward,
          claimedAchievements: [...prev.claimedAchievements, id],
        };
      });
    },
    [updateSave]
  );

  const hasClaimableReward = useMemo(() => {
    if (canClaimDailyReward(save)) return true;
    return ACHIEVEMENTS.some(
      (a) => !save.claimedAchievements.includes(a.id) && getAchievementProgress(save, a) >= a.target
    );
  }, [save]);

  const activeLevel = getLevelById(raceConfig.levelId);

  const landscapeStageStyle: React.CSSProperties = isPortraitRotated
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '100dvh',
        height: '100dvw',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        transformOrigin: 'center center',
      }
    : {
        position: 'relative',
        width: '100%',
        height: '100%',
      };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#060913]">
      <div style={landscapeStageStyle} className="overflow-hidden bg-[#060913]">
        {/* Isolated WebGL Viewport Container */}
        <div ref={canvasMountRef} className="absolute inset-0 z-0" />

        {/* MAIN MENU */}
        {screen === 'menu' && (
          <MainMenu
            save={save}
            hasClaimableReward={hasClaimableReward}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onPlay={() => launchRace('levels', getHighestUnlockedLevel(save))}
            onOpenCars={openGarage}
            onOpenStore={openStore}
            onOpenLevels={() => {
              soundEngine.unlock();
              soundEngine.playClick();
              setScreen('levels');
            }}
            onOpenRewards={() => {
              soundEngine.unlock();
              soundEngine.playClick();
              setActiveModal('rewards');
            }}
            onOpenProfile={() => {
              soundEngine.unlock();
              soundEngine.playClick();
              setActiveModal('profile');
            }}
            onOpenSettings={() => {
              soundEngine.unlock();
              soundEngine.playClick();
              setActiveModal('settings');
            }}
            onOpenQuickRace={() => {
              soundEngine.unlock();
              soundEngine.playClick();
              setActiveModal('quick_race');
            }}
            onOpenHowToPlay={() => {
              soundEngine.unlock();
              soundEngine.playClick();
              setActiveModal('how_to_play');
            }}
            onChangeDifficulty={(diff) =>
              handleUpdateSettings({ ...save.settings, difficulty: diff })
            }
          />
        )}

        {/* 100 LEVELS SCREEN */}
        {screen === 'levels' && (
          <LevelSelect
            save={save}
            onSelectLevel={(levelId) => launchRace('levels', levelId)}
            onBack={returnToMenu}
          />
        )}

        {/* 3D GARAGE SCREEN */}
        {screen === 'garage' && (
          <GarageView
            save={save}
            previewCarId={previewCarId}
            onPreviewCar={handlePreviewCar}
            onSelectCar={handleSelectCar}
            onBuyCar={handleBuyCar}
            onUpdateCustomization={handleUpdateCustomization}
            onUpgradeCar={handleUpgradeCar}
            onOpenStore={openStore}
            onBack={returnToMenu}
          />
        )}

        {/* STORE SCREEN */}
        {screen === 'store' && (
          <StoreModal
            save={save}
            onBuyCar={handleBuyCar}
            onSelectCar={handleSelectCar}
            onBuyPaint={handleBuyPaint}
            onEquipPaint={handleEquipPaint}
            onBuyWheel={handleBuyWheel}
            onEquipWheel={handleEquipWheel}
            onBuyBoost={handleBuyBoost}
            onEquipBoost={handleEquipBoost}
            onUpgradeStat={handleUpgradeCar}
            onBuySpecialItem={handleBuySpecialItem}
            onClose={returnToMenu}
          />
        )}

        {/* ACTIVE RACE HUD */}
        {screen === 'race' && (
          <RaceHud
            hud={hud}
            mode={raceConfig.mode}
            levelName={activeLevel.name}
            settings={save.settings}
            isTouchDevice={isTouchDevice}
            onControlChange={(key, val) => {
              if (engineRef.current) {
                (engineRef.current.controls[key] as boolean) = val;
              }
            }}
            onCycleCamera={() => {
              const nextCam = engineRef.current?.cycleCamera();
              if (nextCam) setHud((h) => ({ ...h, cameraMode: nextCam }));
            }}
            onToggleMute={() =>
              handleUpdateSettings({ ...save.settings, muted: !save.settings.muted })
            }
            onPause={() => {
              setPaused(true);
              engineRef.current?.setPaused(true);
            }}
            onResetCar={() => engineRef.current?.resetCarToTrack()}
            onExitRace={returnToMenu}
          />
        )}

        {/* PAUSE MODAL */}
        {screen === 'race' && paused && !raceResult && activeModal === 'none' && (
          <PauseModal
            language={save.settings.language}
            levelName={`Level ${activeLevel.id} · ${activeLevel.name}`}
            onResume={() => {
              setPaused(false);
              engineRef.current?.setPaused(false);
            }}
            onRestart={() => launchRace(raceConfig.mode, raceConfig.levelId, raceConfig.difficulty)}
            onOpenSettings={() => setActiveModal('settings')}
            onExit={returnToMenu}
          />
        )}

        {/* RACE RESULTS MODAL */}
        {screen === 'race' && raceResult && (
          <ResultsModal
            result={raceResult}
            onNextLevel={(nextId) => launchRace(raceConfig.mode, nextId, raceConfig.difficulty)}
            onRetry={() => launchRace(raceConfig.mode, raceConfig.levelId, raceConfig.difficulty)}
            onExit={returnToMenu}
          />
        )}

        {/* QUICK RACE / TIME TRIAL MODAL */}
        {activeModal === 'quick_race' && (
          <QuickRaceModal
            defaultDifficulty={save.settings.difficulty}
            onStart={({ mode, levelId, difficulty }) => launchRace(mode, levelId, difficulty)}
            onClose={() => setActiveModal('none')}
          />
        )}

        {/* REWARDS & ACHIEVEMENTS MODAL */}
        {activeModal === 'rewards' && (
          <RewardsModal
            save={save}
            onClaimDaily={handleClaimDaily}
            onClaimAchievement={handleClaimAchievement}
            onClose={() => setActiveModal('none')}
          />
        )}

        {/* DRIVER PROFILE MODAL */}
        {activeModal === 'profile' && (
          <ProfileModal
            save={save}
            onUpdateProfile={handleUpdateProfile}
            onClose={() => setActiveModal('none')}
          />
        )}

        {/* SETTINGS MODAL */}
        {activeModal === 'settings' && (
          <SettingsModal
            settings={save.settings}
            onUpdate={handleUpdateSettings}
            onResetProgress={() => {
              const fresh = createDefaultSaveData();
              persistSaveData(fresh);
              setSave(fresh);
              setPreviewCarId(fresh.selectedCarId);
              engineRef.current?.updateSettings(fresh.settings);
              if (screen === 'menu') {
                engineRef.current?.enterMenuShowcase(fresh.selectedCarId, fresh.cars[fresh.selectedCarId]);
              }
            }}
            onClose={() => setActiveModal('none')}
          />
        )}

        {/* HOW TO PLAY MODAL */}
        {activeModal === 'how_to_play' && (
          <HowToPlayModal onClose={() => setActiveModal('none')} />
        )}
      </div>
    </div>
  );
}
