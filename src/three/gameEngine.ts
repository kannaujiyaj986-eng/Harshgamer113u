import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { soundEngine } from '../audio/soundEngine';
import { CAR_CATALOG, computeEffectiveStats, getCarById } from '../data/cars';
import { getLevelById } from '../data/levels';
import { getWorldById } from '../data/worlds';
import {
  CameraMode,
  CarCustomization,
  CarStats,
  Difficulty,
  GameMode,
  GameSettings,
  GraphicsQuality,
  HudTelemetry,
  LevelConfig,
  OwnedCarData,
  StoreInventory,
  WorldTheme,
} from '../types/game';
import { buildGroundCarMesh, CarRig } from './carBuilder';
import { createProceduralTextures, TextureBundle } from './proceduralTextures';
import { buildTrackScene, BuiltTrack } from './trackBuilder';

export interface ControlInputState {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  nitro: boolean;
  tiltAxis: number; // -1..1
}

interface AiRacer {
  rig: CarRig;
  t: number;
  lap: number;
  totalProgress: number;
  speed: number;
  baseSpeed: number;
  lateralOffset: number;
  targetLateral: number;
  nitroTimer: number;
  laneTimer: number;
  color: string;
}

interface ParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface RaceStartParams {
  mode: GameMode;
  levelId: number;
  carId: string;
  carData: OwnedCarData;
  difficulty: Difficulty;
  settings: GameSettings;
  store: StoreInventory;
}

export interface RaceFinishEvent {
  mode: GameMode;
  levelId: number;
  position: number;
  totalRacers: number;
  timeMs: number;
  nitroUses: number;
  driftSeconds: number;
  topSpeedKmh: number;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();

export class CarflyEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: TextureBundle;

  private hemiLight: THREE.HemisphereLight;
  private dirLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  private activeMode: 'menu' | 'garage' | 'race' = 'menu';
  private paused = false;
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private destroyed = false;

  // Menu / Garage
  private showcaseGroup: THREE.Group | null = null;
  private showcaseCar: CarRig | null = null;
  private showcaseRoadLines: THREE.InstancedMesh | null = null;
  private garageOrbitYaw = 0.65;
  private garageOrbitPitch = 0.22;
  private garageOrbitDist = 7.4;
  private garageAutoSpin = true;
  private garageDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private landscapeRotated = false;
  private resizeObserver: ResizeObserver | null = null;

  // Race State
  private track: BuiltTrack | null = null;
  private level: LevelConfig | null = null;
  private world: WorldTheme | null = null;
  private raceMode: GameMode = 'levels';
  private playerRig: CarRig | null = null;
  private playerStats: CarStats = CAR_CATALOG[0].baseStats;
  private storeBonuses: StoreInventory = {
    unlockedPaints: [],
    unlockedWheels: ['turbine'],
    unlockedBoosts: ['#38bdf8'],
    specialItems: [],
    coinBoosterRacesLeft: 0,
  };
  private aiRacers: AiRacer[] = [];

  // Ground Vehicle Physics State
  private playerPos = new THREE.Vector3();
  private playerHeading = 0;
  private playerSpeed = 0; // signed m/s (+ forward, - reverse)
  private driftSlip = 0;   // lateral drift velocity
  private steerSmoothed = 0;
  private suspPitch = 0;
  private suspRoll = 0;
  private suspBounce = 0;
  private playerSampleHint = 0;
  private playerT = 0;
  private prevPlayerT = 0;
  private playerLap = 1;
  private playerTotalProgress = 0;
  private playerNitro = 100;
  private nitroActive = false;
  private prevNitroPressed = false;
  private boostPadTimer = 0;
  private hitstopTimer = 0;
  private cameraShake = 0;
  private collisionCooldown = 0;

  // Race Timers & Metrics
  private countdownTimer = 3.2;
  private lastCountdownInt = 4;
  private raceElapsedMs = 0;
  private raceStarted = false;
  private raceFinished = false;
  private nitroUses = 0;
  private driftSeconds = 0;
  private peakSpeedKmh = 0;
  private lapBannerText: string | null = null;
  private lapBannerTimer = 0;

  // Camera
  private camPos = new THREE.Vector3(0, 5, -12);
  private camLook = new THREE.Vector3(0, 1, 10);
  private cameraMode: CameraMode = 'third_person';
  private settings: GameSettings;

  // Particle Pool (Tire drift smoke & nitro sparks)
  private particleCount = 130;
  private particlePoints: THREE.Points | null = null;
  private particleSlots: ParticleSlot[] = [];
  private particlePosAttr: THREE.BufferAttribute | null = null;

  public controls: ControlInputState = {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
    nitro: false,
    tiltAxis: 0,
  };

  private onHudUpdate: (hud: HudTelemetry) => void;
  private onRaceFinish: (event: RaceFinishEvent) => void;
  private hudEmitAccum = 0;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    onHudUpdate: (hud: HudTelemetry) => void,
    onRaceFinish: (event: RaceFinishEvent) => void
  ) {
    this.container = container;
    this.settings = initialSettings;
    this.cameraMode = initialSettings.cameraMode;
    this.onHudUpdate = onHudUpdate;
    this.onRaceFinish = onRaceFinish;

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialSettings.graphicsQuality !== 'Low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.applyQualityToRenderer(initialSettings.graphicsQuality);

    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.2,
      2800
    );

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color('#87cefa');
    const skyLightTop = new THREE.Mesh(
      new THREE.SphereGeometry(20, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#dbeafe', side: THREE.BackSide })
    );
    envScene.add(skyLightTop);
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(4, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    sunDisc.position.set(8, 12, -8);
    sunDisc.lookAt(0, 0, 0);
    envScene.add(sunDisc);
    const groundBounce = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ color: '#6b7280' })
    );
    groundBounce.rotation.x = -Math.PI / 2;
    groundBounce.position.y = -4;
    envScene.add(groundBounce);
    this.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();

    if (!this.isSoftwareGl) {
      RectAreaLightUniformsLib.init();
    }

    this.hemiLight = new THREE.HemisphereLight(0xa8d5ff, 0x4d7c0f, 1.0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffef5, 2.3);
    this.dirLight.position.set(60, 120, 50);
    this.dirLight.castShadow = !this.isSoftwareGl && initialSettings.graphicsQuality !== 'Low';
    const shadowSize = initialSettings.graphicsQuality === 'Ultra' || initialSettings.graphicsQuality === 'High' ? 2048 : 1024;
    this.dirLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.dirLight.shadow.camera.near = 5;
    this.dirLight.shadow.camera.far = 280;
    const d = 55;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    this.rimLight = new THREE.DirectionalLight(0xbae6fd, 0.75);
    this.rimLight.position.set(-50, 40, -60);
    this.scene.add(this.rimLight);

    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.initParticles();
    this.bindEvents();

    this.lastTime = performance.now();
    this.startLoop();
  }

  private applyQualityToRenderer(quality: GraphicsQuality): void {
    const maxDpr = quality === 'Low' ? 1.0 : quality === 'Medium' ? 1.25 : quality === 'High' ? 1.65 : 2.0;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && quality !== 'Low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initParticles(): void {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3 + 1] = -9999;
      this.particleSlots.push({
        active: false,
        pos: new THREE.Vector3(0, -9999, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.35,
      });
    }
    this.particlePosAttr = new THREE.BufferAttribute(positions, 3);
    geom.setAttribute('position', this.particlePosAttr);
    const mat = new THREE.PointsMaterial({
      size: 1.25,
      map: this.textures.sparkMap,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xbae6fd,
    });
    this.particlePoints = new THREE.Points(geom, mat);
    this.particlePoints.frustumCulled = false;
  }

  private spawnParticle(origin: THREE.Vector3, vel: THREE.Vector3, maxLife = 0.32): void {
    for (let i = 0; i < this.particleCount; i++) {
      const slot = this.particleSlots[i];
      if (!slot.active) {
        slot.active = true;
        slot.pos.copy(origin);
        slot.vel.copy(vel);
        slot.life = maxLife;
        slot.maxLife = maxLife;
        break;
      }
    }
  }

  private updateParticles(dt: number): void {
    if (!this.particlePosAttr) return;
    for (let i = 0; i < this.particleCount; i++) {
      const s = this.particleSlots[i];
      if (!s.active) {
        this.particlePosAttr.setXYZ(i, 0, -9999, 0);
        continue;
      }
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        this.particlePosAttr.setXYZ(i, 0, -9999, 0);
      } else {
        s.pos.addScaledVector(s.vel, dt);
        this.particlePosAttr.setXYZ(i, s.pos.x, s.pos.y, s.pos.z);
      }
    }
    this.particlePosAttr.needsUpdate = true;
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('resize', this.onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }
    dom.addEventListener('webglcontextlost', this.onContextLost);
    dom.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  public setLandscapeRotated(rotated: boolean): void {
    this.landscapeRotated = rotated;
    this.onResize();
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.activeMode !== 'garage') return;
    this.garageDragging = true;
    this.garageAutoSpin = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.garageDragging || this.activeMode !== 'garage') return;
    const rawDx = e.clientX - this.lastPointerX;
    const rawDy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    const dx = this.landscapeRotated ? rawDy : rawDx;
    const dy = this.landscapeRotated ? -rawDx : rawDy;
    this.garageOrbitYaw -= dx * 0.008;
    this.garageOrbitPitch = THREE.MathUtils.clamp(this.garageOrbitPitch + dy * 0.006, 0.06, 0.85);
  };

  private onPointerUp = () => {
    this.garageDragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (this.activeMode !== 'garage') return;
    this.garageOrbitDist = THREE.MathUtils.clamp(this.garageOrbitDist + e.deltaY * 0.005, 4.8, 12.0);
  };

  private onResize = () => {
    if (this.destroyed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
  };

  private onContextRestored = () => {
    this.onResize();
  };

  public updateSettings(next: GameSettings): void {
    this.settings = next;
    this.cameraMode = next.cameraMode;
    this.applyQualityToRenderer(next.graphicsQuality);
    if (this.dirLight) {
      this.dirLight.castShadow = !this.isSoftwareGl && next.graphicsQuality !== 'Low';
    }
    soundEngine.updateSettings(next);
  }

  public cycleCamera(): CameraMode {
    const order: CameraMode[] = ['third_person', 'chase', 'first_person', 'cinematic'];
    const nextIdx = (order.indexOf(this.cameraMode) + 1) % order.length;
    this.cameraMode = order[nextIdx];
    return this.cameraMode;
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      soundEngine.updateEngine(0, false, false);
    }
  }

  public resetCarToTrack(): void {
    if (!this.track || !this.playerRig || this.activeMode !== 'race') return;
    const sample = this.track.samples[this.playerSampleHint];
    this.playerPos.copy(sample.point);
    this.playerHeading = Math.atan2(sample.tangent.x, sample.tangent.z);
    this.playerSpeed = 0;
    this.driftSlip = 0;
    this.collisionCooldown = 0.6;
  }

  private clearActiveSceneContent(): void {
    if (this.track) {
      this.scene.remove(this.track.group);
      this.track.dispose();
      this.track = null;
    }
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
      this.playerRig.dispose();
      this.playerRig = null;
    }
    for (const ai of this.aiRacers) {
      this.scene.remove(ai.rig.root);
      ai.rig.dispose();
    }
    this.aiRacers = [];
    if (this.showcaseGroup) {
      this.scene.remove(this.showcaseGroup);
      this.showcaseGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
          else m.material?.dispose();
        }
      });
      this.showcaseGroup = null;
      this.showcaseCar = null;
      this.showcaseRoadLines = null;
    }
    if (this.particlePoints) {
      this.scene.remove(this.particlePoints);
    }
  }

  public enterMenuShowcase(carId: string, carData: OwnedCarData): void {
    this.clearActiveSceneContent();
    this.activeMode = 'menu';
    this.paused = false;
    soundEngine.stopEngine();

    const group = new THREE.Group();
    this.scene.background = new THREE.Color('#a7d8fa');
    this.scene.fog = new THREE.FogExp2('#cfe9fc', 0.0009);

    this.hemiLight.color.set('#a8d5ff');
    this.hemiLight.groundColor.set('#6f9c28');
    this.hemiLight.intensity = 1.15;
    this.dirLight.color.set('#fffef5');
    this.dirLight.intensity = 2.5;
    this.dirLight.position.set(30, 50, 22);

    // Daylight Sky Dome with Sunlit Clouds
    const menuSkyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){
          vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y);
        }
        float fbm(vec2 p){
          float v=0.0, a=0.5;
          for(int i=0;i<4;i++){ v+=a*n2(p); p*=2.04; a*=0.5; }
          return v;
        }
        void main() {
          vec3 d = normalize(vWorldPos);
          float f = clamp(pow(max(d.y, 0.0), 0.55), 0.0, 1.0);
          vec3 sky = mix(vec3(0.81, 0.91, 0.99), vec3(0.12, 0.44, 0.91), f);
          if (d.y > 0.01) {
            float c = fbm((d.xz / (d.y + 0.16)) * 1.4 + vec2(1.3, 2.7));
            float m = smoothstep(0.50, 0.78, c) * smoothstep(0.01, 0.22, d.y);
            sky = mix(sky, vec3(1.0), m * 0.72);
          }
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });
    group.add(new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), menuSkyMat));

    // Rolling Sunlit Green Valley Hills Flanking the Highway
    const valleyGeom = new THREE.PlaneGeometry(760, 760, 64, 64);
    valleyGeom.rotateX(-Math.PI / 2);
    const vp = valleyGeom.attributes.position;
    for (let i = 0; i < vp.count; i++) {
      const vx = vp.getX(i);
      const vz = vp.getZ(i);
      const sideDist = Math.max(0, Math.abs(vx) - 10.5);
      const hill =
        sideDist > 0
          ? Math.min(28, sideDist * 0.22) +
            Math.abs(Math.sin(vx * 0.03 + vz * 0.02)) * Math.min(12, sideDist * 0.15)
          : -0.08;
      vp.setY(i, hill - 0.08);
    }
    valleyGeom.computeVertexNormals();
    const ground = new THREE.Mesh(
      valleyGeom,
      new THREE.MeshStandardMaterial({
        map: this.textures.grassMap,
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.02,
      })
    );
    ground.receiveShadow = true;
    group.add(ground);

    // Daylight Asphalt Highway
    const roadTex = this.textures.roadMap.clone();
    roadTex.repeat.set(1, 16);
    roadTex.needsUpdate = true;
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(17, 0.1, 360),
      new THREE.MeshStandardMaterial({
        map: roadTex,
        color: 0xe2e5ea,
        roughness: 0.62,
        metalness: 0.08,
      })
    );
    road.position.set(0, 0, 0);
    road.receiveShadow = true;
    group.add(road);

    // Red-and-White Concrete Racing Guardrails
    const railTex = this.textures.barrierMap.clone();
    railTex.repeat.set(36, 1);
    railTex.needsUpdate = true;
    const railMat = new THREE.MeshStandardMaterial({
      map: railTex,
      roughness: 0.45,
      metalness: 0.12,
    });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 360), railMat);
    railL.position.set(-8.6, 0.42, 0);
    railL.castShadow = true;
    const railR = railL.clone();
    railR.position.x = 8.6;
    group.add(railL, railR);

    // Roadside Multi-Tier Pine Trees & Boulders
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x2a6922, roughness: 0.88, flatShading: true });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x9c9689, roughness: 0.9, flatShading: true });
    for (let i = -8; i <= 8; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const px = side * (16 + (Math.abs(i * 7) % 18));
      const pz = i * 19 - 20;
      const baseY = Math.min(8, Math.max(0, (Math.abs(px) - 10.5) * 0.22));
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.6, 3.2, 6), trunkMat);
      trunk.position.set(px, baseY + 1.5, pz);
      const cone1 = new THREE.Mesh(new THREE.ConeGeometry(3.1, 5.5, 7), pineMat);
      cone1.position.set(px, baseY + 4.8, pz);
      const cone2 = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.8, 7), pineMat);
      cone2.position.set(px, baseY + 7.5, pz);
      const cone3 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.0, 7), pineMat);
      cone3.position.set(px, baseY + 9.8, pz);
      group.add(trunk, cone1, cone2, cone3);

      if (i % 3 === 0) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), rockMat);
        rock.position.set(-px * 0.85, baseY + 0.5, pz + 6);
        rock.scale.set(1.2, 0.7, 1.0);
        group.add(rock);
      }
    }

    // Snow-Capped Mountains on the Horizon
    const mMat = new THREE.MeshStandardMaterial({ color: 0x768092, roughness: 0.9, flatShading: true });
    const sMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8, flatShading: true });
    for (let i = -5; i <= 5; i++) {
      const mx = i * 68 + (i % 2) * 18;
      const mz = -270 - Math.abs(i) * 22;
      const mh = 75 + (Math.abs(i * 19) % 55);
      const mw = 48 + (Math.abs(i * 11) % 24);
      const mMesh = new THREE.Mesh(new THREE.ConeGeometry(mw, mh, 6), mMat);
      mMesh.position.set(mx, mh * 0.44 - 4, mz);
      const sMesh = new THREE.Mesh(new THREE.ConeGeometry(mw * 0.48, mh * 0.44, 6), sMat);
      sMesh.position.set(mx, mh * 0.72 - 3, mz);
      group.add(mMesh, sMesh);
    }

    // Moving Road Center Dashes
    const dashGeom = new THREE.BoxGeometry(0.22, 0.03, 3.2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const dashCount = 16;
    const dashes = new THREE.InstancedMesh(dashGeom, dashMat, dashCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < dashCount; i++) {
      dummy.position.set(0, 0.06, -90 + i * 12);
      dummy.updateMatrix();
      dashes.setMatrixAt(i, dummy.matrix);
    }
    dashes.instanceMatrix.needsUpdate = true;
    this.showcaseRoadLines = dashes;
    group.add(dashes);

    // Grounded Hero Supercar
    const spec = getCarById(carId);
    const car = buildGroundCarMesh(spec, carData.customization, this.textures.shadowMap, this.isSoftwareGl);
    car.root.position.set(2.2, 0.05, 0);
    car.setNitroVisual(true, 0.9);
    group.add(car.root);

    this.showcaseCar = car;
    this.showcaseGroup = group;
    this.scene.add(group);

    this.camera.fov = 50;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(6.8, 2.25, 7.2);
    this.camera.lookAt(1.6, 0.65, -8);
  }

  public enterGarage(carId: string, carData: OwnedCarData): void {
    this.clearActiveSceneContent();
    this.activeMode = 'garage';
    this.paused = false;
    this.garageAutoSpin = true;
    soundEngine.stopEngine();

    const group = new THREE.Group();
    this.scene.background = new THREE.Color('#070b14');
    this.scene.fog = new THREE.FogExp2('#070b14', 0.012);

    this.hemiLight.color.set('#93c5fd');
    this.hemiLight.groundColor.set('#0f172a');
    this.hemiLight.intensity = 0.85;
    this.dirLight.color.set('#fffbeb');
    this.dirLight.intensity = 2.0;
    this.dirLight.position.set(10, 16, 12);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(45, 48),
      new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.28, metalness: 0.55 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const turntable = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.4, 0.24, 48),
      new THREE.MeshStandardMaterial({ color: 0x162033, roughness: 0.22, metalness: 0.78 })
    );
    turntable.position.y = 0.12;
    turntable.receiveShadow = true;
    group.add(turntable);

    const neonRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.25, 0.06, 12, 64),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(carData.customization.neonColor) })
    );
    neonRing.rotation.x = Math.PI / 2;
    neonRing.position.y = 0.25;
    group.add(neonRing);

    if (!this.isSoftwareGl) {
      const soft1 = new THREE.RectAreaLight(0xe0f2fe, 5.5, 8, 2.2);
      soft1.position.set(0, 6.5, 4);
      soft1.lookAt(0, 0.5, 0);
      group.add(soft1);

      const soft2 = new THREE.RectAreaLight(0x38bdf8, 3.2, 8, 2);
      soft2.position.set(-5, 4.5, -4);
      soft2.lookAt(0, 0.5, 0);
      group.add(soft2);
    }

    const spec = getCarById(carId);
    const car = buildGroundCarMesh(spec, carData.customization, this.textures.shadowMap, this.isSoftwareGl);
    car.root.position.set(0, 0.24, 0);
    car.setNitroVisual(false, 0.35);
    group.add(car.root);

    this.showcaseCar = car;
    this.showcaseGroup = group;
    this.scene.add(group);

    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();
  }

  public updateGarageCar(carId: string, carData: OwnedCarData): void {
    if (this.activeMode !== 'garage' || !this.showcaseGroup) return;
    if (this.showcaseCar) {
      this.showcaseGroup.remove(this.showcaseCar.root);
      this.showcaseCar.dispose();
    }
    const spec = getCarById(carId);
    const car = buildGroundCarMesh(spec, carData.customization, this.textures.shadowMap, this.isSoftwareGl);
    car.root.position.set(0, 0.24, 0);
    car.setNitroVisual(false, 0.35);
    this.showcaseGroup.add(car.root);
    this.showcaseCar = car;
  }

  public updateGarageAppearance(customization: CarCustomization): void {
    this.showcaseCar?.updateAppearance(customization);
  }

  public startRace(params: RaceStartParams): void {
    this.clearActiveSceneContent();
    this.activeMode = 'race';
    this.paused = false;
    this.raceMode = params.mode;
    this.settings = params.settings;
    this.cameraMode = params.settings.cameraMode;
    this.storeBonuses = params.store;

    const level = getLevelById(params.levelId);
    const world = getWorldById(level.worldId);
    this.level = level;
    this.world = world;

    this.scene.background = new THREE.Color(world.skyHorizon);
    this.scene.fog = new THREE.FogExp2(world.fogColor, world.fogDensity);

    this.hemiLight.color.set(world.hemiSky);
    this.hemiLight.groundColor.set(world.hemiGround);
    this.hemiLight.intensity = 0.88;
    this.dirLight.color.set(world.sunColor);
    this.dirLight.intensity = world.sunIntensity;

    this.track = buildTrackScene(level, world, this.textures, params.settings.graphicsQuality, this.isSoftwareGl);
    this.scene.add(this.track.group);

    if (this.particlePoints) {
      this.scene.add(this.particlePoints);
    }

    const spec = getCarById(params.carId);
    this.playerStats = computeEffectiveStats(spec, params.carData.upgrades);
    this.playerRig = buildGroundCarMesh(spec, params.carData.customization, this.textures.shadowMap, this.isSoftwareGl);
    this.scene.add(this.playerRig.root);

    const startSample = this.track.samples[0];
    this.playerPos.copy(startSample.point).addScaledVector(startSample.right, -2.6);
    this.playerHeading = Math.atan2(startSample.tangent.x, startSample.tangent.z);
    this.playerSpeed = 0;
    this.driftSlip = 0;
    this.steerSmoothed = 0;
    this.suspPitch = 0;
    this.suspRoll = 0;
    this.suspBounce = 0;
    this.playerSampleHint = 0;
    this.playerT = 0;
    this.prevPlayerT = 0;
    this.playerLap = 1;
    this.playerTotalProgress = 0;
    this.playerNitro = 100;
    this.nitroActive = false;
    this.prevNitroPressed = false;
    this.boostPadTimer = 0;
    this.hitstopTimer = 0;
    this.cameraShake = 0;
    this.collisionCooldown = 0;

    this.nitroUses = 0;
    this.driftSeconds = 0;
    this.peakSpeedKmh = 0;
    this.lapBannerText = null;
    this.lapBannerTimer = 0;

    this.countdownTimer = 3.2;
    this.lastCountdownInt = 4;
    this.raceElapsedMs = 0;
    this.raceStarted = false;
    this.raceFinished = false;

    const hasAi = params.mode !== 'time_trial';
    if (hasAi) {
      const diffMult = params.difficulty === 'EASY' ? 0.85 : params.difficulty === 'HARD' ? 1.12 : 1.0;
      const aiCount = level.aiCount;
      for (let i = 0; i < aiCount; i++) {
        const aiSpecIdx = level.isFinalChampionship && i === 0
          ? CAR_CATALOG.length - 1
          : (i * 2 + level.worldId) % (CAR_CATALOG.length - 1);
        const aiSpec = CAR_CATALOG[aiSpecIdx];
        const aiColors = ['#eab308', '#dc2626', '#1e293b', '#2563eb', '#10b981', '#f97316'];
        const color = level.isFinalChampionship && i === 0 ? '#fbbf24' : aiColors[i % aiColors.length];
        const custom: CarCustomization = {
          color,
          wheelStyle: aiSpec.defaultWheel,
          neonColor: color,
          boostColor: '#fb923c',
        };
        const rig = buildGroundCarMesh(aiSpec, custom, this.textures.shadowMap, this.isSoftwareGl);
        this.scene.add(rig.root);

        const gridRow = Math.floor((i + 1) / 2);
        const gridSide = i % 2 === 0 ? 2.6 : -2.6;
        const startT = (1 - (gridRow * 10) / this.track.totalLength) % 1;
        const s = this.track.sampleAtT(startT);
        rig.root.position.copy(s.point).addScaledVector(s.right, gridSide);

        const baseSpeed = (56 + level.aiSkill * 32 + (i === 0 ? 4 : 0)) * diffMult;
        this.aiRacers.push({
          rig,
          t: startT,
          lap: 1,
          totalProgress: -gridRow * 0.01,
          speed: 0,
          baseSpeed,
          lateralOffset: gridSide,
          targetLateral: gridSide,
          nitroTimer: 0,
          laneTimer: 1.5 + Math.random() * 2,
          color,
        });
      }
    }

    this.camPos.copy(this.playerPos).addScaledVector(startSample.tangent, -11).addScaledVector(_up, 4.2);
    this.camLook.copy(this.playerPos).addScaledVector(startSample.tangent, 12);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    soundEngine.unlock();
    soundEngine.startEngine();
    soundEngine.startMusic();
  }

  private startLoop(): void {
    const tick = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      this.elapsed += dt;

      if (!this.paused) {
        if (this.activeMode === 'menu') {
          this.updateMenuShowcase(dt);
        } else if (this.activeMode === 'garage') {
          this.updateGarage(dt);
        } else if (this.activeMode === 'race') {
          this.updateRace(dt);
        }
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    const poll = () => {
      if (this.destroyed) return;
      if (!sync) {
        this.frameId = window.setTimeout(cb, 80);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateMenuShowcase(dt: number): void {
    if (!this.showcaseCar) return;
    // Animate highway road lines moving backward to give live driving motion
    if (this.showcaseRoadLines) {
      const dummy = new THREE.Object3D();
      const offset = (this.elapsed * 32) % 12;
      for (let i = 0; i < 16; i++) {
        dummy.position.set(0, 0.06, -90 + i * 12 - offset);
        dummy.updateMatrix();
        this.showcaseRoadLines.setMatrixAt(i, dummy.matrix);
      }
      this.showcaseRoadLines.instanceMatrix.needsUpdate = true;
    }

    // Subtle grounded suspension road ripple
    const susp = Math.sin(this.elapsed * 7.5) * 0.018;
    this.showcaseCar.applySuspension(-0.015, Math.sin(this.elapsed * 1.4) * 0.02, susp);
    this.showcaseCar.spinWheels(dt * 36, Math.sin(this.elapsed * 1.1) * 0.06);
    this.showcaseCar.setNitroVisual(false, 0.9);

    const camAngle = 0.42 + Math.sin(this.elapsed * 0.25) * 0.24;
    this.camera.position.x = 2.0 + Math.sin(camAngle) * 7.5;
    this.camera.position.z = Math.cos(camAngle) * 7.5;
    this.camera.position.y = 2.15 + Math.sin(this.elapsed * 0.4) * 0.18;
    this.camera.lookAt(1.2, 0.75, -14);
  }

  private updateGarage(dt: number): void {
    if (this.garageAutoSpin) {
      this.garageOrbitYaw += dt * 0.35;
    }
    const camX = Math.sin(this.garageOrbitYaw) * Math.cos(this.garageOrbitPitch) * this.garageOrbitDist;
    const camY = Math.sin(this.garageOrbitPitch) * this.garageOrbitDist + 0.85;
    const camZ = Math.cos(this.garageOrbitYaw) * Math.cos(this.garageOrbitPitch) * this.garageOrbitDist;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 8, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camY, 8, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 8, dt);
    this.camera.lookAt(0, 0.72, 0);

    if (this.showcaseCar) {
      this.showcaseCar.spinWheels(dt * 4, 0);
    }
  }

  private updateRace(dt: number): void {
    if (!this.track || !this.playerRig || !this.level || !this.world) return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      dt *= 0.25;
    }

    if (!this.raceStarted) {
      this.countdownTimer -= dt;
      const curInt = Math.ceil(this.countdownTimer);
      if (curInt !== this.lastCountdownInt && curInt >= 0 && curInt <= 3) {
        this.lastCountdownInt = curInt;
        soundEngine.playCountdown(curInt === 0);
      }
      if (this.countdownTimer <= 0) {
        this.raceStarted = true;
        soundEngine.playCountdown(true);
      }
    } else if (!this.raceFinished) {
      this.raceElapsedMs += dt * 1000;
    }

    if (this.lapBannerTimer > 0) {
      this.lapBannerTimer = Math.max(0, this.lapBannerTimer - dt);
      if (this.lapBannerTimer <= 0) this.lapBannerText = null;
    }
    if (this.collisionCooldown > 0) {
      this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    }
    if (this.boostPadTimer > 0) {
      this.boostPadTimer = Math.max(0, this.boostPadTimer - dt);
    }

    this.track.update(dt, this.elapsed);

    // Track sample
    const closest = this.track.findClosestSample(this.playerPos, this.playerSampleHint);
    this.playerSampleHint = closest.index;
    const sample = closest.sample;
    this.playerT = sample.t;

    // Lap detection across finish line
    if (this.raceStarted && !this.raceFinished) {
      if (this.prevPlayerT > 0.85 && this.playerT < 0.15) {
        this.playerLap++;
        if (this.playerLap > this.level.laps) {
          this.finishRace();
        } else {
          this.lapBannerText =
            this.playerLap === this.level.laps
              ? 'FINAL LAP!'
              : `LAP ${this.playerLap} / ${this.level.laps}`;
          this.lapBannerTimer = 2.4;
          soundEngine.playBoost();
        }
      } else if (this.prevPlayerT < 0.15 && this.playerT > 0.85) {
        this.playerLap = Math.max(1, this.playerLap - 1);
      }
    }
    this.prevPlayerT = this.playerT;
    this.playerTotalProgress = (this.playerLap - 1) + this.playerT;

    // Ground Vehicle Physics
    const hasCarbonKit = this.storeBonuses.specialItems.includes('carbon_kit');
    const hasDriftTires = this.storeBonuses.specialItems.includes('pro_drift_tires');
    const hasTurboReserve = this.storeBonuses.specialItems.includes('full_nitro_start');

    const maxRoadSpeed = (66 + this.playerStats.topSpeed * 0.64) * (hasCarbonKit ? 1.06 : 1.0);
    const accelForce = 38 + this.playerStats.acceleration * 0.48;
    const brakeForce = 56 + this.playerStats.brakes * 0.6;
    const maxReverseSpeed = -30;
    const turnRate = (1.92 + this.playerStats.handling * 0.013) * this.settings.sensitivity;
    const nitroDrainRate = 22 - this.playerStats.nitro * 0.08;
    const nitroRegenRate = (9.5 + (hasTurboReserve ? 2.5 : 0));

    const canControl = this.raceStarted && !this.raceFinished;
    const rawSteer =
      (this.controls.left ? 1 : 0) -
      (this.controls.right ? 1 : 0) +
      (this.settings.tiltSteering ? THREE.MathUtils.clamp(-this.controls.tiltAxis, -1, 1) : 0);
    this.steerSmoothed = THREE.MathUtils.damp(this.steerSmoothed, THREE.MathUtils.clamp(rawSteer, -1, 1), 15, dt);

    // Nitro Boost
    const wantsNitro = canControl && this.controls.nitro && this.playerNitro > 4 && this.playerSpeed >= -1;
    if (wantsNitro && !this.prevNitroPressed) {
      this.nitroUses++;
    }
    this.prevNitroPressed = wantsNitro;
    this.nitroActive = wantsNitro;

    if (this.nitroActive) {
      this.playerNitro = Math.max(0, this.playerNitro - nitroDrainRate * dt);
    } else {
      this.playerNitro = Math.min(100, this.playerNitro + nitroRegenRate * dt);
    }

    const boostMult = (this.nitroActive ? 1.40 : 1.0) * (this.boostPadTimer > 0 ? 1.24 : 1.0);
    const targetMax = maxRoadSpeed * boostMult;

    let accelInput = 0;
    if (canControl) {
      if (this.controls.accelerate) {
        if (this.playerSpeed < 0) {
          this.playerSpeed += brakeForce * 1.15 * dt;
        } else {
          this.playerSpeed += accelForce * boostMult * dt;
        }
        accelInput = 1;
      } else if (this.controls.brake) {
        if (this.playerSpeed > 1.2) {
          // Crisp Active Braking
          this.playerSpeed = Math.max(0, this.playerSpeed - brakeForce * dt);
          accelInput = -1;
        } else {
          // Responsive Reverse Driving (Aage-Piche)
          this.playerSpeed = Math.max(maxReverseSpeed, this.playerSpeed - accelForce * 0.85 * dt);
          accelInput = -0.6;
        }
      } else {
        // Gentle coasting tire drag
        this.playerSpeed = THREE.MathUtils.damp(this.playerSpeed, 0, 1.15, dt);
      }

      if (this.nitroActive) {
        this.playerSpeed = Math.max(this.playerSpeed, maxRoadSpeed * 1.18);
      }
    } else {
      this.playerSpeed = THREE.MathUtils.damp(this.playerSpeed, 0, 3.0, dt);
    }

    this.playerSpeed = THREE.MathUtils.clamp(this.playerSpeed, maxReverseSpeed, targetMax);

    // Smooth Speed-Weighted Steering
    const absSpeed = Math.abs(this.playerSpeed);
    const speedFactor = THREE.MathUtils.clamp(absSpeed / 8, 0.22, 1.0);
    const highSpeedStability = 1.0 - THREE.MathUtils.clamp((absSpeed - 60) / 160, 0, 0.28);
    const dirSign = this.playerSpeed >= -0.3 ? 1 : -1;
    if (canControl && absSpeed > 0.3) {
      this.playerHeading += this.steerSmoothed * turnRate * speedFactor * highSpeedStability * dirSign * dt;
    }

    // Drifting & Lateral Tire Grip Physics
    const driftThreshold = maxRoadSpeed * 0.45;
    const isDrifting =
      canControl &&
      this.playerSpeed > driftThreshold &&
      Math.abs(this.steerSmoothed) > 0.58;

    const targetSlip = isDrifting
      ? -this.steerSmoothed * (this.playerSpeed * (hasDriftTires ? 0.12 : 0.16))
      : 0;
    const gripRecovery = hasDriftTires ? 10.5 : 8.0;
    this.driftSlip = THREE.MathUtils.damp(this.driftSlip, targetSlip, gripRecovery, dt);

    if (isDrifting) {
      this.driftSeconds += dt;
      this.playerNitro = Math.min(100, this.playerNitro + 6.5 * dt);
    }

    // Move along road XZ plane + drift slip
    const fwdX = Math.sin(this.playerHeading);
    const fwdZ = Math.cos(this.playerHeading);
    const rightX = Math.cos(this.playerHeading);
    const rightZ = -Math.sin(this.playerHeading);

    this.playerPos.x += (fwdX * this.playerSpeed + rightX * this.driftSlip) * dt;
    this.playerPos.z += (fwdZ * this.playerSpeed + rightZ * this.driftSlip) * dt;

    // Ground Height & Smooth Guardrail Slide (Cars NEVER leave the road!)
    const updatedClosest = this.track.findClosestSample(this.playerPos, this.playerSampleHint);
    this.playerSampleHint = updatedClosest.index;
    const roadSample = updatedClosest.sample;
    const halfW = this.track.trackWidth * 0.5;

    this.playerPos.y = roadSample.point.y;

    const maxLat = halfW - 1.25;
    if (Math.abs(updatedClosest.lateral) > maxLat) {
      const sign = Math.sign(updatedClosest.lateral);
      const excess = Math.abs(updatedClosest.lateral) - maxLat;
      this.playerPos.addScaledVector(roadSample.right, -sign * excess);
      this.playerSpeed *= 0.95;
      this.driftSlip *= -0.18;
      // Gently align heading back parallel to the barrier for smooth racing flow
      const trackYaw = Math.atan2(roadSample.tangent.x, roadSample.tangent.z);
      let diffYaw = trackYaw - this.playerHeading;
      while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
      while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
      this.playerHeading += diffYaw * Math.min(1, dt * 6);
      if (absSpeed > 32 && this.collisionCooldown <= 0) {
        soundEngine.playCollision(0.38);
        this.cameraShake = Math.max(this.cameraShake, 0.16);
        this.collisionCooldown = 0.35;
      }
    }

    // Suspension Squat / Dive / Roll & Road Pitch
    const roadSlopePitch = -Math.asin(THREE.MathUtils.clamp(roadSample.tangent.y, -0.4, 0.4));
    const targetSuspPitch = accelInput * -0.028;
    const targetSuspRoll = THREE.MathUtils.clamp(-this.steerSmoothed * 0.055 * speedFactor, -0.07, 0.07);
    const targetBounce = Math.sin(this.elapsed * 22) * (absSpeed / maxRoadSpeed) * 0.015;
    this.suspPitch = THREE.MathUtils.damp(this.suspPitch, targetSuspPitch, 10, dt);
    this.suspRoll = THREE.MathUtils.damp(this.suspRoll, targetSuspRoll, 10, dt);
    this.suspBounce = THREE.MathUtils.damp(this.suspBounce, targetBounce, 14, dt);

    const visualDriftYaw = THREE.MathUtils.clamp(this.driftSlip * 0.016, -0.24, 0.24);
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.order = 'YXZ';
    this.playerRig.root.rotation.y = this.playerHeading + visualDriftYaw;
    this.playerRig.root.rotation.x = roadSlopePitch;
    this.playerRig.root.rotation.z = 0;

    this.playerRig.applySuspension(this.suspPitch, this.suspRoll, this.suspBounce);
    this.playerRig.setNitroVisual(this.nitroActive || this.boostPadTimer > 0, absSpeed / maxRoadSpeed);
    this.playerRig.spinWheels(this.playerSpeed * dt, this.steerSmoothed * 0.38);

    // Exhaust Nitro & Tire Drift Particles
    if ((this.nitroActive || this.boostPadTimer > 0) && this.settings.graphicsQuality !== 'Low') {
      _v1.set(0, 0.36, -2.55).applyEuler(this.playerRig.root.rotation).add(this.playerPos);
      _v2.set(-fwdX * 14 + (Math.random() - 0.5) * 3, 0.8, -fwdZ * 14 + (Math.random() - 0.5) * 3);
      this.spawnParticle(_v1, _v2, 0.25);
    }
    if (isDrifting && this.settings.graphicsQuality !== 'Low') {
      const wheelSide = this.steerSmoothed > 0 ? -1.0 : 1.0;
      _v1.set(wheelSide, 0.15, -1.45).applyEuler(this.playerRig.root.rotation).add(this.playerPos);
      _v2.set((Math.random() - 0.5) * 2.5, 1.4, (Math.random() - 0.5) * 2.5);
      this.spawnParticle(_v1, _v2, 0.38);
    }

    // Nitro Gate Pickups on Asphalt
    for (const gate of this.track.nitroGates) {
      if (gate.cooldown > 0) continue;
      if (this.playerPos.distanceToSquared(gate.position) < 16) {
        gate.cooldown = 3.5;
        this.playerNitro = Math.min(100, this.playerNitro + 26);
        this.boostPadTimer = Math.max(this.boostPadTimer, 0.9);
        soundEngine.playBoost();
      }
    }

    // Boost Pads
    for (const pad of this.track.boostPads) {
      if (this.playerPos.distanceToSquared(pad.position) < 16) {
        if (this.boostPadTimer < 0.7) soundEngine.playBoost();
        this.boostPadTimer = 1.3;
        this.playerNitro = Math.min(100, this.playerNitro + 12);
      }
    }

    // Chicane Obstacle Collisions
    if (this.collisionCooldown <= 0) {
      for (const obs of this.track.obstacles) {
        const hitDist = obs.radius + 1.4;
        if (this.playerPos.distanceToSquared(obs.position) < hitDist * hitDist) {
          this.playerSpeed *= 0.42;
          this.hitstopTimer = 0.055;
          this.cameraShake = 0.65;
          this.collisionCooldown = 0.8;
          soundEngine.playCollision(1.0);
          if (this.settings.vibration && navigator.vibrate) {
            navigator.vibrate(70);
          }
          break;
        }
      }
    }

    // AI Opponents + Car-to-Car Collisions
    this.updateAiRacers(dt);

    // Particles & Audio
    this.updateParticles(dt);
    soundEngine.updateEngine(absSpeed / maxRoadSpeed, isDrifting, this.nitroActive);

    // Track Peak Speed
    const speedKmh = Math.round(absSpeed * 3.6);
    if (speedKmh > this.peakSpeedKmh) this.peakSpeedKmh = speedKmh;

    // Shadow Light Tracking
    this.dirLight.position.set(this.playerPos.x + 55, this.playerPos.y + 95, this.playerPos.z + 45);
    this.dirLight.target.position.copy(this.playerPos);

    this.updateRaceCamera(dt, fwdX, fwdZ, absSpeed / maxRoadSpeed);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.04) {
      this.hudEmitAccum = 0;
      this.emitHudTelemetry(roadSample, isDrifting, speedKmh, maxRoadSpeed);
    }
  }

  private updateAiRacers(dt: number): void {
    if (!this.track || !this.level) return;

    for (const ai of this.aiRacers) {
      if (!this.raceStarted) {
        ai.rig.setNitroVisual(false, 0);
        continue;
      }

      ai.laneTimer -= dt;
      if (ai.laneTimer <= 0) {
        ai.laneTimer = 1.8 + Math.random() * 2.5;
        ai.targetLateral = (Math.random() - 0.5) * (this.track.trackWidth * 0.55);
      }
      ai.lateralOffset = THREE.MathUtils.damp(ai.lateralOffset, ai.targetLateral, 2.5, dt);

      const gapToPlayer = this.playerTotalProgress - ai.totalProgress;
      const rubberBand = THREE.MathUtils.clamp(1 + gapToPlayer * 0.35, 0.86, 1.18);
      if (ai.nitroTimer <= 0 && Math.random() < 0.006) {
        ai.nitroTimer = 1.6;
      }
      if (ai.nitroTimer > 0) ai.nitroTimer -= dt;
      const targetSpd = ai.baseSpeed * rubberBand * (ai.nitroTimer > 0 ? 1.18 : 1.0);
      ai.speed = THREE.MathUtils.damp(ai.speed, targetSpd, 3.5, dt);

      const prevT = ai.t;
      const deltaT = (ai.speed * dt) / this.track.totalLength;
      ai.t = (ai.t + deltaT) % 1;
      if (prevT > 0.85 && ai.t < 0.15) {
        ai.lap++;
      }
      ai.totalProgress = (ai.lap - 1) + ai.t;

      const s = this.track.sampleAtT(ai.t);
      _v1.copy(s.point).addScaledVector(s.right, ai.lateralOffset);
      ai.rig.root.position.copy(_v1);
      _v2.copy(_v1).add(s.tangent);
      _lookMat.lookAt(_v2, _v1, _up);
      _targetQuat.setFromRotationMatrix(_lookMat);
      ai.rig.root.quaternion.slerp(_targetQuat, Math.min(1, dt * 10));

      ai.rig.setNitroVisual(ai.nitroTimer > 0, ai.speed / 100);
      ai.rig.spinWheels(ai.speed * dt, 0);

      // Car-to-car collision check with player
      const distSq = this.playerPos.distanceToSquared(_v1);
      if (distSq < 11.5 && distSq > 0.01) {
        _v3.subVectors(this.playerPos, _v1).normalize();
        this.playerPos.x += _v3.x * 0.35;
        this.playerPos.z += _v3.z * 0.35;
        this.playerSpeed *= 0.94;
        if (this.collisionCooldown <= 0) {
          soundEngine.playCollision(0.6);
          this.cameraShake = Math.max(this.cameraShake, 0.28);
          this.collisionCooldown = 0.45;
        }
      }
    }
  }

  private updateRaceCamera(dt: number, fwdX: number, fwdZ: number, speedRatio: number): void {
    const targetFov = this.nitroActive ? 75 : 60 + speedRatio * 9;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'first_person') {
      _v1.set(
        this.playerPos.x + fwdX * 0.7,
        this.playerPos.y + 1.25,
        this.playerPos.z + fwdZ * 0.7
      );
      _v2.set(
        this.playerPos.x + fwdX * 30,
        this.playerPos.y + 1.15,
        this.playerPos.z + fwdZ * 30
      );
      this.camera.position.copy(_v1);
      this.camera.lookAt(_v2);
      return;
    }

    let distBack = 7.6;
    let heightUp = 3.0;
    let lookAhead = 16;

    if (this.cameraMode === 'chase') {
      distBack = 6.2;
      heightUp = 2.45;
      lookAhead = 18;
    } else if (this.cameraMode === 'cinematic') {
      const sway = Math.sin(this.elapsed * 0.7) * 4.5;
      distBack = 12.2;
      heightUp = 4.8;
      _v1.set(
        this.playerPos.x - fwdX * distBack + fwdZ * sway,
        this.playerPos.y + heightUp,
        this.playerPos.z - fwdZ * distBack - fwdX * sway
      );
      _v2.set(this.playerPos.x + fwdX * 8, this.playerPos.y + 1.1, this.playerPos.z + fwdZ * 8);
      this.camPos.lerp(_v1, 1 - Math.exp(-5 * dt));
      this.camLook.lerp(_v2, 1 - Math.exp(-7 * dt));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }

    _v1.set(
      this.playerPos.x - fwdX * distBack,
      this.playerPos.y + heightUp,
      this.playerPos.z - fwdZ * distBack
    );
    _v2.set(
      this.playerPos.x + fwdX * lookAhead,
      this.playerPos.y + 1.25,
      this.playerPos.z + fwdZ * lookAhead
    );

    this.camPos.lerp(_v1, 1 - Math.exp(-10 * dt));
    this.camLook.lerp(_v2, 1 - Math.exp(-13 * dt));

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 2.5);
      _v3.set(
        (Math.random() - 0.5) * this.cameraShake,
        (Math.random() - 0.5) * this.cameraShake,
        (Math.random() - 0.5) * this.cameraShake
      );
      this.camera.position.copy(this.camPos).add(_v3);
    } else {
      this.camera.position.copy(this.camPos);
    }
    this.camera.lookAt(this.camLook);
  }

  private computePlayerPosition(): number {
    let aheadCount = 0;
    for (const ai of this.aiRacers) {
      if (ai.totalProgress > this.playerTotalProgress) aheadCount++;
    }
    return aheadCount + 1;
  }

  private finishRace(): void {
    if (this.raceFinished || !this.level) return;
    this.raceFinished = true;
    soundEngine.playVictory();

    const position = this.computePlayerPosition();
    this.onRaceFinish({
      mode: this.raceMode,
      levelId: this.level.id,
      position,
      totalRacers: this.aiRacers.length + 1,
      timeMs: Math.round(this.raceElapsedMs),
      nitroUses: this.nitroUses,
      driftSeconds: Math.round(this.driftSeconds),
      topSpeedKmh: this.peakSpeedKmh,
    });
  }

  private emitHudTelemetry(
    sample: { point: THREE.Vector3; tangent: THREE.Vector3 },
    isDrifting: boolean,
    speedKmh: number,
    maxRoadSpeed: number
  ): void {
    if (!this.track || !this.level) return;

    const fwdX = Math.sin(this.playerHeading);
    const fwdZ = Math.cos(this.playerHeading);
    const dot = fwdX * sample.tangent.x + fwdZ * sample.tangent.z;
    const wrongWay = this.playerSpeed > 10 && dot < -0.35;

    const bounds = this.track.minimapBounds;
    const markers = [
      {
        x: (this.playerPos.x - bounds.cx) * bounds.scale,
        z: (this.playerPos.z - bounds.cz) * bounds.scale,
        isPlayer: true,
        color: '#22d3ee',
      },
      ...this.aiRacers.map((ai) => ({
        x: (ai.rig.root.position.x - bounds.cx) * bounds.scale,
        z: (ai.rig.root.position.z - bounds.cz) * bounds.scale,
        isPlayer: false,
        color: ai.color,
      })),
    ];

    const cdInt = Math.ceil(this.countdownTimer);
    const countdownLabel = this.raceStarted ? '' : cdInt > 0 ? String(cdInt) : 'GO!';

    const isReversing = this.playerSpeed < -1.0;
    let gearLabel = 'N';
    if (isReversing) gearLabel = 'R';
    else if (this.playerSpeed > 1) {
      const ratio = this.playerSpeed / maxRoadSpeed;
      gearLabel = String(Math.min(6, Math.max(1, Math.ceil(ratio * 6))));
    }

    this.onHudUpdate({
      speedKmh,
      gearLabel,
      isDrifting,
      isReversing,
      position: this.computePlayerPosition(),
      totalRacers: this.aiRacers.length + 1,
      lap: Math.min(this.playerLap, this.level.laps),
      totalLaps: this.level.laps,
      raceTimeMs: Math.round(this.raceElapsedMs),
      nitro: Math.round(this.playerNitro),
      nitroActive: this.nitroActive || this.boostPadTimer > 0,
      trackProgress: THREE.MathUtils.clamp(this.playerTotalProgress / this.level.laps, 0, 1),
      countdown: this.raceStarted ? 0 : Math.max(0, cdInt),
      countdownLabel,
      wrongWay,
      minimapPath: this.track.minimapPath,
      minimapMarkers: markers,
      lapBanner: this.lapBannerText,
      cameraMode: this.cameraMode,
    });
  }

  public dispose(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    soundEngine.stopEngine();
    soundEngine.stopMusic();

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    dom.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.clearActiveSceneContent();
    this.textures.roadMap.dispose();
    this.textures.barrierMap.dispose();
    this.textures.grassMap.dispose();
    this.textures.finishMap.dispose();
    this.textures.shadowMap.dispose();
    this.textures.sparkMap.dispose();
    this.textures.waterRippleMap.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
