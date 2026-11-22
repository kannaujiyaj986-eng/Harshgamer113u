import * as THREE from 'three';
import { GraphicsQuality, LevelConfig, WorldTheme } from '../types/game';
import { TextureBundle } from './proceduralTextures';

export interface TrackSample {
  t: number; // 0..1
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
}

export interface NitroGateItem {
  t: number;
  position: THREE.Vector3;
  mesh: THREE.Group;
  cooldown: number;
}

export interface BoostPadItem {
  t: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
}

export interface ObstacleItem {
  t: number;
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Mesh;
  baseOffset: number;
  oscillateSpeed: number;
}

export interface BuiltTrack {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
  trackWidth: number;
  nitroGates: NitroGateItem[];
  boostPads: BoostPadItem[];
  obstacles: ObstacleItem[];
  minimapPath: Array<{ x: number; z: number }>;
  minimapBounds: { cx: number; cz: number; scale: number };
  update: (dt: number, elapsed: number) => void;
  sampleAtT: (t: number) => TrackSample;
  findClosestSample: (
    pos: THREE.Vector3,
    hintIndex?: number
  ) => { index: number; sample: TrackSample; distSq: number; lateral: number };
  dispose: () => void;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildTrackScene(
  level: LevelConfig,
  world: WorldTheme,
  textures: TextureBundle,
  quality: GraphicsQuality,
  isSoftwareGl: boolean
): BuiltTrack {
  const group = new THREE.Group();
  const rand = seededRandom(level.seed);
  const isDaylightWorld = !world.hasSpace && world.id !== 4 && world.id !== 6 && world.id !== 10;

  // 1. Crisp Atmospheric Sky Gradient Dome + Sunlit Clouds
  const skyGeom = new THREE.SphereGeometry(2400, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(world.skyTop) },
      bottomColor: { value: new THREE.Color(world.skyHorizon) },
      isDay: { value: isDaylightWorld ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float isDay;
      varying vec3 vWorldPosition;

      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash2(i);
        float b = hash2(i + vec2(1.0, 0.0));
        float c = hash2(i + vec2(0.0, 1.0));
        float d = hash2(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise2(p);
          p *= 2.04;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = max(dir.y, 0.0);
        float f = clamp(pow(h, 0.52), 0.0, 1.0);
        vec3 sky = mix(bottomColor, topColor, f);
        if (isDay > 0.5 && dir.y > 0.01) {
          vec2 uv = dir.xz / (dir.y + 0.16);
          float c = fbm(uv * 1.4 + vec2(1.3, 2.7));
          float cloudMask = smoothstep(0.50, 0.78, c) * smoothstep(0.01, 0.22, dir.y);
          sky = mix(sky, vec3(0.99, 0.995, 1.0), cloudMask * 0.72);
        }
        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  group.add(new THREE.Mesh(skyGeom, skyMat));

  // 2. Closed Ground Road Circuit Control Points (Zero Gaps, Smooth Highway Elevation)
  const controlCount = 24;
  const controlPoints: THREE.Vector3[] = [];
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const p3 = rand() * Math.PI * 2;

  for (let i = 0; i < controlCount; i++) {
    const angle = (i / controlCount) * Math.PI * 2;
    const radialWave =
      Math.sin(angle * 2 + p1) * (0.14 + level.complexity * 0.012) +
      Math.cos(angle * 3 + p2) * 0.12 +
      Math.sin(angle * 5 + p3) * 0.05;

    const r = level.trackRadius * (1 + radialWave);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    const startFlatten = Math.min(1, Math.min(i, controlCount - i) / 3);
    const hill =
      0.32 +
      startFlatten *
        Math.max(
          0,
          Math.sin(angle * 2 + p2) * level.elevationScale +
            Math.cos(angle * 3 + p1) * (level.elevationScale * 0.4) +
            level.elevationScale * 0.45
        );

    controlPoints.push(new THREE.Vector3(x, hill, z));
  }

  const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
  const totalLength = curve.getLength();
  const sampleCount = 440;

  const samples: TrackSample[] = [];
  const worldUp = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
    samples.push({ t, point, tangent, right, up });
  }

  // Helper to find closest road height & distance for rolling sunlit valley hills hugging the road
  const terrainHeightAt = (wx: number, wz: number): number => {
    let minD2 = Infinity;
    let roadY = 0.25;
    for (let i = 0; i < sampleCount; i += 2) {
      const sp = samples[i].point;
      const dx = wx - sp.x;
      const dz = wz - sp.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD2) {
        minD2 = d2;
        roadY = sp.y;
      }
    }
    const dist = Math.sqrt(minD2);
    const halfCorridor = level.trackWidth * 0.5 + 3.0;
    if (dist <= halfCorridor) {
      return roadY - 0.3;
    }
    const blend = Math.min(1, (dist - halfCorridor) / 24);
    const hillNoise =
      Math.sin(wx * 0.013 + p1) * Math.cos(wz * 0.013 + p2) * 20 +
      Math.sin(wx * 0.028 - wz * 0.022) * 9 +
      (dist > 110 ? Math.min(72, (dist - 110) * 0.16) : 0);
    const targetH = Math.max(0.2, roadY + 3.2 + Math.abs(hillNoise));
    return THREE.MathUtils.lerp(roadY - 0.3, targetH, blend * blend);
  };

  // 3. Rolling Sunlit Valley Terrain Mesh (Dense grid so hills hug the highway edge)
  const terrainSize = 3200;
  const terrainSegs = quality === 'Low' ? 88 : 140;
  const terrainGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
  terrainGeom.rotateX(-Math.PI / 2);

  const tPos = terrainGeom.attributes.position;
  const tColors = new Float32Array(tPos.count * 3);
  const cMeadow = new THREE.Color(world.groundColor);
  const cHillLight = isDaylightWorld
    ? new THREE.Color('#f7ffc4')
    : cMeadow.clone().offsetHSL(0.015, 0.08, 0.1);
  const cRockSlope = new THREE.Color(isDaylightWorld ? '#b5b0a2' : '#334155');

  for (let i = 0; i < tPos.count; i++) {
    const vx = tPos.getX(i);
    const vz = tPos.getZ(i);
    const vy = terrainHeightAt(vx, vz);
    tPos.setY(i, vy);

    const col = vy > 27 ? cRockSlope : vy > 6.5 ? cHillLight : cMeadow;
    tColors[i * 3] = col.r;
    tColors[i * 3 + 1] = col.g;
    tColors[i * 3 + 2] = col.b;
  }
  terrainGeom.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
  terrainGeom.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: isDaylightWorld ? textures.grassMap : null,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
  });
  const terrain = new THREE.Mesh(terrainGeom, terrainMat);
  terrain.receiveShadow = true;
  group.add(terrain);

  // Coastal / Lake Water Plane if world has water
  let waterMesh: THREE.Mesh | null = null;
  if (world.hasWater) {
    const waterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(world.waterColor),
      map: textures.waterRippleMap,
      roughness: 0.14,
      metalness: 0.55,
    });
    waterMesh = new THREE.Mesh(new THREE.RingGeometry(level.trackRadius + 105, 2200, 64), waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -0.1;
    waterMesh.receiveShadow = true;
    group.add(waterMesh);
  }

  // 4. Continuous Asphalt Road Deck + Red-and-White Guardrails + Road Shoulder Skirts
  const halfW = level.trackWidth * 0.5;
  const roadMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(world.roadColor),
    map: textures.roadMap,
    roughness: world.hasStorm ? 0.25 : 0.62,
    metalness: world.hasStorm ? 0.35 : 0.08,
  });

  const railMat = new THREE.MeshStandardMaterial({
    map: textures.barrierMap,
    color: isDaylightWorld ? 0xffffff : new THREE.Color(world.railColor),
    emissive: isDaylightWorld ? 0x000000 : new THREE.Color(world.railColor),
    emissiveIntensity: isDaylightWorld ? 0 : 0.5,
    roughness: 0.45,
    metalness: 0.15,
  });

  const skirtMat = new THREE.MeshStandardMaterial({
    color: isDaylightWorld ? 0x6b7280 : 0x1e293b,
    roughness: 0.88,
    metalness: 0.08,
  });

  const deckPositions: number[] = [];
  const deckNormals: number[] = [];
  const deckUvs: number[] = [];
  const deckIndices: number[] = [];

  const railPositions: number[] = [];
  const railNormals: number[] = [];
  const railUvs: number[] = [];
  const railIndices: number[] = [];

  const skirtPositions: number[] = [];
  const skirtNormals: number[] = [];
  const skirtIndices: number[] = [];

  let vCursor = 0;
  let rCursor = 0;
  let sCursor = 0;

  for (let i = 0; i < sampleCount; i++) {
    const cur = samples[i];
    const next = samples[(i + 1) % sampleCount];

    const p0 = cur.point.clone().addScaledVector(cur.right, -halfW);
    const p1v = cur.point.clone().addScaledVector(cur.right, halfW);
    const p2v = next.point.clone().addScaledVector(next.right, -halfW);
    const p3v = next.point.clone().addScaledVector(next.right, halfW);

    deckPositions.push(
      p0.x, p0.y, p0.z,
      p1v.x, p1v.y, p1v.z,
      p2v.x, p2v.y, p2v.z,
      p3v.x, p3v.y, p3v.z
    );
    deckNormals.push(
      cur.up.x, cur.up.y, cur.up.z,
      cur.up.x, cur.up.y, cur.up.z,
      next.up.x, next.up.y, next.up.z,
      next.up.x, next.up.y, next.up.z
    );
    const v0 = i / sampleCount;
    const v1 = (i + 1) / sampleCount;
    deckUvs.push(0, v0, 1, v0, 0, v1, 1, v1);
    deckIndices.push(vCursor, vCursor + 2, vCursor + 1, vCursor + 1, vCursor + 2, vCursor + 3);
    vCursor += 4;

    // Left & Right Concrete Racing Guardrails (with UVs for Red/White stripes)
    const railH = 0.92;
    for (const side of [-1, 1]) {
      const baseCur = cur.point.clone().addScaledVector(cur.right, side * (halfW + 0.15));
      const baseNext = next.point.clone().addScaledVector(next.right, side * (halfW + 0.15));
      const topCur = baseCur.clone().addScaledVector(cur.up, railH);
      const topNext = baseNext.clone().addScaledVector(next.up, railH);

      railPositions.push(
        baseCur.x, baseCur.y, baseCur.z,
        topCur.x, topCur.y, topCur.z,
        baseNext.x, baseNext.y, baseNext.z,
        topNext.x, topNext.y, topNext.z
      );
      railUvs.push(v0, 0, v0, 1, v1, 0, v1, 1);

      const nx = -side * cur.right.x;
      const ny = -side * cur.right.y;
      const nz = -side * cur.right.z;
      for (let k = 0; k < 4; k++) railNormals.push(nx, ny, nz);
      if (side === -1) {
        railIndices.push(rCursor, rCursor + 1, rCursor + 2, rCursor + 1, rCursor + 3, rCursor + 2);
      } else {
        railIndices.push(rCursor, rCursor + 2, rCursor + 1, rCursor + 1, rCursor + 2, rCursor + 3);
      }
      rCursor += 4;

      // Embankment shoulder connecting guardrail top down to terrain
      const outerCur = cur.point.clone().addScaledVector(cur.right, side * (halfW + 3.2));
      const outerNext = next.point.clone().addScaledVector(next.right, side * (halfW + 3.2));
      outerCur.y = cur.point.y - 1.6;
      outerNext.y = next.point.y - 1.6;

      skirtPositions.push(
        topCur.x, topCur.y, topCur.z,
        outerCur.x, outerCur.y, outerCur.z,
        topNext.x, topNext.y, topNext.z,
        outerNext.x, outerNext.y, outerNext.z
      );
      const snx = side * cur.right.x;
      const snz = side * cur.right.z;
      for (let k = 0; k < 4; k++) skirtNormals.push(snx, 0.55, snz);
      if (side === -1) {
        skirtIndices.push(sCursor, sCursor + 2, sCursor + 1, sCursor + 1, sCursor + 2, sCursor + 3);
      } else {
        skirtIndices.push(sCursor, sCursor + 1, sCursor + 2, sCursor + 1, sCursor + 3, sCursor + 2);
      }
      sCursor += 4;
    }
  }

  const deckGeom = new THREE.BufferGeometry();
  deckGeom.setAttribute('position', new THREE.Float32BufferAttribute(deckPositions, 3));
  deckGeom.setAttribute('normal', new THREE.Float32BufferAttribute(deckNormals, 3));
  deckGeom.setAttribute('uv', new THREE.Float32BufferAttribute(deckUvs, 2));
  deckGeom.setIndex(deckIndices);
  const deckMesh = new THREE.Mesh(deckGeom, roadMat);
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  const railGeom = new THREE.BufferGeometry();
  railGeom.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
  railGeom.setAttribute('normal', new THREE.Float32BufferAttribute(railNormals, 3));
  railGeom.setAttribute('uv', new THREE.Float32BufferAttribute(railUvs, 2));
  railGeom.setIndex(railIndices);
  const railMesh = new THREE.Mesh(railGeom, railMat);
  railMesh.castShadow = true;
  railMesh.receiveShadow = true;
  group.add(railMesh);

  const skirtGeom = new THREE.BufferGeometry();
  skirtGeom.setAttribute('position', new THREE.Float32BufferAttribute(skirtPositions, 3));
  skirtGeom.setAttribute('normal', new THREE.Float32BufferAttribute(skirtNormals, 3));
  skirtGeom.setIndex(skirtIndices);
  const skirtMesh = new THREE.Mesh(skirtGeom, skirtMat);
  skirtMesh.receiveShadow = true;
  group.add(skirtMesh);

  // 5. Start / Finish Line Strip & Overhead Gantry
  const startSample = samples[0];
  const gantry = new THREE.Group();
  gantry.position.copy(startSample.point);
  gantry.lookAt(startSample.point.clone().add(startSample.tangent));

  const finishStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(level.trackWidth * 0.92, 4.5),
    new THREE.MeshStandardMaterial({
      map: textures.finishMap,
      roughness: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  finishStrip.rotation.x = -Math.PI / 2;
  finishStrip.position.y = 0.05;
  gantry.add(finishStrip);

  const pillarMat = new THREE.MeshStandardMaterial({
    color: level.isFinalChampionship ? 0xf59e0b : 0x334155,
    metalness: 0.75,
    roughness: 0.25,
  });
  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 9.5, 1.3), pillarMat);
  pillarL.position.set(-halfW - 0.6, 4.75, 0);
  const pillarR = pillarL.clone();
  pillarR.position.x = halfW + 0.6;
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(level.trackWidth + 2.8, 1.4, 1.4), pillarMat);
  crossBar.position.set(0, 9.3, 0);
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(level.trackWidth * 0.85, 0.45, 0.3),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(world.accentColor) })
  );
  banner.position.set(0, 9.0, 0.85);
  gantry.add(pillarL, pillarR, crossBar, banner);
  group.add(gantry);

  // 6. On-Road Nitro Pickup Gates
  const nitroGates: NitroGateItem[] = [];
  const archGeom = new THREE.TorusGeometry(2.4, 0.2, 8, 20, Math.PI);
  const archMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(world.accentColor),
    emissive: new THREE.Color(world.accentColor),
    emissiveIntensity: isDaylightWorld ? 0.9 : 1.7,
    roughness: 0.25,
  });

  for (let i = 0; i < level.nitroGateCount; i++) {
    const t = (0.09 + (i / level.nitroGateCount) * 0.84) % 1;
    const s = samples[Math.floor(t * sampleCount) % sampleCount];
    const lateralOffset = (rand() - 0.5) * (level.trackWidth * 0.5);
    const gatePos = s.point.clone().addScaledVector(s.right, lateralOffset);

    const gGroup = new THREE.Group();
    gGroup.position.copy(gatePos);
    gGroup.lookAt(gatePos.clone().add(s.tangent));
    gGroup.add(new THREE.Mesh(archGeom, archMat));
    group.add(gGroup);

    nitroGates.push({ t, position: gatePos, mesh: gGroup, cooldown: 0 });
  }

  // 7. Track Boost Pads (Chevron Strips on Asphalt)
  const boostPads: BoostPadItem[] = [];
  const padGeom = new THREE.PlaneGeometry(4.2, 8.2);
  const padMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  for (let i = 0; i < level.boostPadCount; i++) {
    const t = (0.06 + (i / level.boostPadCount) * 0.87) % 1;
    const s = samples[Math.floor(t * sampleCount) % sampleCount];
    const lat = ((i % 3) - 1) * (level.trackWidth * 0.22);
    const pos = s.point.clone().addScaledVector(s.right, lat).addScaledVector(s.up, 0.06);

    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.copy(pos);
    pad.lookAt(pos.clone().add(s.tangent));
    pad.rotateX(-Math.PI / 2);
    group.add(pad);

    boostPads.push({ t, position: pos, mesh: pad });
  }

  // 8. Road Chicane Barriers / Cones (Obstacles on Ground)
  const obstacles: ObstacleItem[] = [];
  const obsGeom = new THREE.CylinderGeometry(0.75, 1.1, 1.9, 8);
  const obsMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.4,
    metalness: 0.2,
  });

  for (let i = 0; i < level.obstacleCount; i++) {
    const t = 0.1 + (i / level.obstacleCount) * 0.82;
    const s = samples[Math.floor(t * sampleCount) % sampleCount];
    const lat = (rand() - 0.5) * (level.trackWidth * 0.6);
    const pos = s.point.clone().addScaledVector(s.right, lat).addScaledVector(s.up, 0.95);

    const mesh = new THREE.Mesh(obsGeom, obsMat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    group.add(mesh);

    obstacles.push({
      t,
      position: pos.clone(),
      radius: 1.55,
      mesh,
      baseOffset: lat,
      oscillateSpeed: level.worldId >= 5 ? 0.8 + rand() * 0.9 : 0,
    });
  }

  // 9. Scenic World Elements (Composite Pine Trees, Boulders, Snow-Capped Mountains, Clouds)
  const qualityScale =
    quality === 'Low' ? 0.35 : quality === 'Medium' ? 0.65 : quality === 'High' ? 1.0 : 1.35;
  const dummy = new THREE.Object3D();
  const tintColor = new THREE.Color();

  // Highway Marker Posts (only in night/city worlds, daylight uses clean guardrails)
  if (!isDaylightWorld) {
    const poleCount = 32;
    const poleGeom = new THREE.CylinderGeometry(0.18, 0.22, 7.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
    const poles = new THREE.InstancedMesh(poleGeom, poleMat, poleCount);
    for (let i = 0; i < poleCount; i++) {
      const s = samples[Math.floor((i / poleCount) * sampleCount) % sampleCount];
      const side = i % 2 === 0 ? 1 : -1;
      dummy.position.copy(s.point).addScaledVector(s.right, side * (halfW + 1.4));
      dummy.position.y += 3.6;
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
    group.add(poles);
  }

  // Fluffy Sky Clouds (soft mist in non-daylight worlds; sky shader handles crisp daylight clouds)
  const cloudCount = isDaylightWorld ? 0 : Math.round((isSoftwareGl ? 35 : 65) * qualityScale);
  const cloudGeom = new THREE.DodecahedronGeometry(1, 1);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(world.cloudTint),
    roughness: 0.95,
    transparent: true,
    opacity: world.hasSpace ? 0.2 : 0.72,
  });
  const clouds = new THREE.InstancedMesh(cloudGeom, cloudMat, Math.max(1, cloudCount));
  const cloudBasePositions: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; speed: number }> = [];
  if (cloudCount > 0) {
    for (let i = 0; i < cloudCount; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 180 + rand() * 1100;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = 120 + rand() * 160;
      const sx = 24 + rand() * 44;
      const sy = 6 + rand() * 10;
      const sz = 18 + rand() * 32;
      cloudBasePositions.push({ x: cx, y: cy, z: cz, sx, sy, sz, speed: 1.6 + rand() * 3.2 });
      dummy.position.set(cx, cy, cz);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.updateMatrix();
      clouds.setMatrixAt(i, dummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
    clouds.frustumCulled = false;
    group.add(clouds);
  }

  // Composite Multi-Tier Pine Trees along the Valley Hills
  if (world.hasTrees) {
    const treeCount = Math.round(215 * qualityScale);
    const trunkGeom = new THREE.CylinderGeometry(0.42, 0.7, 4.4, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });

    const tier1Geom = new THREE.ConeGeometry(3.8, 6.8, 7);
    const tier2Geom = new THREE.ConeGeometry(3.0, 6.0, 7);
    const tier3Geom = new THREE.ConeGeometry(2.1, 5.2, 7);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      flatShading: true,
    });

    const trunks = new THREE.InstancedMesh(trunkGeom, trunkMat, treeCount);
    const tier1 = new THREE.InstancedMesh(tier1Geom, leafMat, treeCount);
    const tier2 = new THREE.InstancedMesh(tier2Geom, leafMat, treeCount);
    const tier3 = new THREE.InstancedMesh(tier3Geom, leafMat, treeCount);
    trunks.castShadow = true;
    tier1.castShadow = true;
    tier2.castShadow = true;

    for (let i = 0; i < treeCount; i++) {
      const s = samples[Math.floor(rand() * sampleCount)];
      const side = rand() > 0.5 ? 1 : -1;
      const offset = halfW + 6.5 + rand() * 82;
      const px = s.point.x + s.right.x * side * offset + (rand() - 0.5) * 12;
      const pz = s.point.z + s.right.z * side * offset + (rand() - 0.5) * 12;
      const py = terrainHeightAt(px, pz);
      const sc = 0.85 + rand() * 0.75;
      const yaw = rand() * Math.PI * 2;

      dummy.scale.set(sc, sc, sc);
      dummy.rotation.set(0, yaw, 0);

      dummy.position.set(px, py + 2.0 * sc, pz);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(px, py + 6.0 * sc, pz);
      dummy.updateMatrix();
      tier1.setMatrixAt(i, dummy.matrix);

      dummy.position.set(px, py + 9.2 * sc, pz);
      dummy.updateMatrix();
      tier2.setMatrixAt(i, dummy.matrix);

      dummy.position.set(px, py + 12.1 * sc, pz);
      dummy.updateMatrix();
      tier3.setMatrixAt(i, dummy.matrix);

      const gShade = 0.85 + rand() * 0.35;
      tintColor.setRGB(0.16 * gShade, 0.42 * gShade, 0.14 * gShade);
      tier1.setColorAt(i, tintColor);
      tier2.setColorAt(i, tintColor);
      tier3.setColorAt(i, tintColor);
    }

    [trunks, tier1, tier2, tier3].forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
      group.add(m);
    });

    // Scattered Hillside Granite Boulders
    const rockCount = Math.round(90 * qualityScale);
    const rockGeom = new THREE.DodecahedronGeometry(1.9, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9c9689,
      roughness: 0.9,
      flatShading: true,
    });
    const rocks = new THREE.InstancedMesh(rockGeom, rockMat, rockCount);
    for (let i = 0; i < rockCount; i++) {
      const s = samples[Math.floor(rand() * sampleCount)];
      const side = rand() > 0.5 ? 1 : -1;
      const offset = halfW + 6.5 + rand() * 68;
      const px = s.point.x + s.right.x * side * offset;
      const pz = s.point.z + s.right.z * side * offset;
      const py = terrainHeightAt(px, pz);
      const sx = 0.75 + rand() * 1.5;
      const sy = 0.5 + rand() * 0.95;
      dummy.position.set(px, py + 0.35 * sy, pz);
      dummy.scale.set(sx, sy, sx * (0.8 + rand() * 0.4));
      dummy.rotation.set(rand(), rand() * Math.PI, rand());
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    rocks.computeBoundingSphere();
    group.add(rocks);
  }

  // Snow-Capped Alpine Mountains Framing the Valley Horizon
  if (world.hasMountains) {
    const mCount = Math.round(68 * qualityScale);
    const mGeom = new THREE.ConeGeometry(1, 1, 6);
    const mMat = new THREE.MeshStandardMaterial({
      color: world.id === 2 ? 0x9a3412 : 0x768092,
      roughness: 0.9,
      flatShading: true,
    });
    const snowGeom = new THREE.ConeGeometry(0.48, 0.44, 6);
    const snowMat = new THREE.MeshStandardMaterial({
      color: world.id === 2 ? 0xd97706 : 0xf8fafc,
      roughness: 0.8,
      flatShading: true,
    });

    const mountains = new THREE.InstancedMesh(mGeom, mMat, mCount);
    const snowCaps = new THREE.InstancedMesh(snowGeom, snowMat, mCount);

    for (let i = 0; i < mCount; i++) {
      const ang = (i / mCount) * Math.PI * 2 + rand() * 0.16;
      const r = level.trackRadius + 165 + rand() * 440;
      const h = 115 + rand() * 210;
      const w = 78 + rand() * 110;
      const mx = Math.cos(ang) * r;
      const mz = Math.sin(ang) * r;
      const yaw = rand() * Math.PI;

      dummy.position.set(mx, h * 0.45 - 6, mz);
      dummy.scale.set(w, h, w);
      dummy.rotation.set(0, yaw, 0);
      dummy.updateMatrix();
      mountains.setMatrixAt(i, dummy.matrix);

      dummy.position.set(mx, h * 0.74 - 5, mz);
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      snowCaps.setMatrixAt(i, dummy.matrix);
    }
    mountains.instanceMatrix.needsUpdate = true;
    mountains.computeBoundingSphere();
    snowCaps.instanceMatrix.needsUpdate = true;
    snowCaps.computeBoundingSphere();
    group.add(mountains, snowCaps);
  }

  // City Skyscrapers
  if (world.hasCity) {
    const bCount = Math.round(100 * qualityScale);
    const bGeom = new THREE.BoxGeometry(1, 1, 1);
    const bMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.75,
    });
    const buildings = new THREE.InstancedMesh(bGeom, bMat, bCount);
    for (let i = 0; i < bCount; i++) {
      const ang = rand() * Math.PI * 2;
      const ring = rand() > 0.45 ? level.trackRadius + 85 + rand() * 340 : rand() * (level.trackRadius * 0.5);
      const h = 45 + rand() * 195;
      const w = 14 + rand() * 22;
      dummy.position.set(Math.cos(ang) * ring, h * 0.5 - 2, Math.sin(ang) * ring);
      dummy.scale.set(w, h, w);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.updateMatrix();
      buildings.setMatrixAt(i, dummy.matrix);
    }
    buildings.instanceMatrix.needsUpdate = true;
    buildings.computeBoundingSphere();
    group.add(buildings);
  }

  // Space Starfield
  if (world.hasSpace) {
    const starCount = Math.round(600 * qualityScale);
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const rad = 1200 + rand() * 400;
      starPos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(rad * Math.cos(phi)) * 0.8 + 40;
      starPos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    group.add(
      new THREE.Points(
        starGeom,
        new THREE.PointsMaterial({ color: 0xe0f2fe, size: 4.5, sizeAttenuation: true })
      )
    );
  }

  // Rainbow Sky Arches
  if (world.hasRainbow) {
    const rainbowColors = [0xf43f5e, 0xf97316, 0xfacc15, 0x22c55e, 0x38bdf8, 0x818cf8];
    rainbowColors.forEach((col, idx) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(420 - idx * 14, 4.5, 8, 48, Math.PI),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.52 })
      );
      arc.position.set(0, 0, -140);
      group.add(arc);
    });
  }

  // Championship Citadel Pillars
  if (world.hasCitadel) {
    const citCount = 16;
    const citGeom = new THREE.CylinderGeometry(3.5, 5.5, 130, 8);
    const citMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.22 });
    const citadel = new THREE.InstancedMesh(citGeom, citMat, citCount);
    for (let i = 0; i < citCount; i++) {
      const ang = (i / citCount) * Math.PI * 2;
      const r = level.trackRadius + 115;
      dummy.position.set(Math.cos(ang) * r, 60, Math.sin(ang) * r);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      citadel.setMatrixAt(i, dummy.matrix);
    }
    citadel.instanceMatrix.needsUpdate = true;
    citadel.computeBoundingSphere();
    group.add(citadel);
  }

  // Storm Rain
  let rainPoints: THREE.Points | null = null;
  if (world.hasStorm && quality !== 'Low') {
    const rCount = Math.round(450 * qualityScale);
    const rPos = new Float32Array(rCount * 3);
    for (let i = 0; i < rCount; i++) {
      rPos[i * 3] = (rand() - 0.5) * 320;
      rPos[i * 3 + 1] = rand() * 120;
      rPos[i * 3 + 2] = (rand() - 0.5) * 320;
    }
    const rGeom = new THREE.BufferGeometry();
    rGeom.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    rainPoints = new THREE.Points(
      rGeom,
      new THREE.PointsMaterial({ color: 0x93c5fd, size: 1.0, transparent: true, opacity: 0.55 })
    );
    group.add(rainPoints);
  }

  // Minimap Normalized Coordinates
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const rawMini: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < sampleCount; i += 4) {
    const p = samples[i].point;
    rawMini.push({ x: p.x, z: p.z });
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const span = Math.max(maxX - minX, maxZ - minZ, 1);
  const miniScale = 1.7 / span;
  const minimapPath = rawMini.map((p) => ({
    x: (p.x - cx) * miniScale,
    z: (p.z - cz) * miniScale,
  }));

  const _tmpVec = new THREE.Vector3();
  const _tmpSamplePos = new THREE.Vector3();

  const sampleAtT = (t: number): TrackSample => {
    const normT = ((t % 1) + 1) % 1;
    const idx = Math.floor(normT * sampleCount) % sampleCount;
    return samples[idx];
  };

  const findClosestSample = (pos: THREE.Vector3, hintIndex?: number) => {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintIndex !== undefined && hintIndex >= 0) {
      for (let offset = -32; offset <= 32; offset++) {
        const idx = (hintIndex + offset + sampleCount) % sampleCount;
        const dx = pos.x - samples[idx].point.x;
        const dz = pos.z - samples[idx].point.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
      if (bestDistSq > 1800) {
        for (let i = 0; i < sampleCount; i++) {
          const dx = pos.x - samples[i].point.x;
          const dz = pos.z - samples[i].point.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestIdx = i;
          }
        }
      }
    } else {
      for (let i = 0; i < sampleCount; i++) {
        const dx = pos.x - samples[i].point.x;
        const dz = pos.z - samples[i].point.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
    }

    const s = samples[bestIdx];
    _tmpVec.subVectors(pos, s.point);
    const lateral = _tmpVec.dot(s.right);
    return { index: bestIdx, sample: s, distSq: bestDistSq, lateral };
  };

  const update = (dt: number, elapsed: number) => {
    for (const g of nitroGates) {
      if (g.cooldown > 0) g.cooldown = Math.max(0, g.cooldown - dt);
    }

    for (const obs of obstacles) {
      obs.mesh.rotation.y += dt * 1.4;
      if (obs.oscillateSpeed > 0) {
        const s = sampleAtT(obs.t);
        const shift = Math.sin(elapsed * obs.oscillateSpeed) * (level.trackWidth * 0.28);
        _tmpSamplePos.copy(s.point).addScaledVector(s.right, obs.baseOffset * 0.4 + shift).addScaledVector(s.up, 0.95);
        obs.mesh.position.copy(_tmpSamplePos);
        obs.position.copy(_tmpSamplePos);
      }
    }

    for (let i = 0; i < cloudBasePositions.length; i++) {
      const c = cloudBasePositions[i];
      const shiftX = ((c.x + elapsed * c.speed + 1100) % 2200) - 1100;
      dummy.position.set(shiftX, c.y, c.z);
      dummy.scale.set(c.sx, c.sy, c.sz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      clouds.setMatrixAt(i, dummy.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;

    if (waterMesh) {
      textures.waterRippleMap.offset.x = elapsed * 0.015;
      textures.waterRippleMap.offset.y = elapsed * 0.01;
    }

    if (rainPoints) {
      rainPoints.position.y = -((elapsed * 65) % 60);
    }
  };

  const dispose = () => {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
  };

  return {
    group,
    curve,
    samples,
    totalLength,
    trackWidth: level.trackWidth,
    nitroGates,
    boostPads,
    obstacles,
    minimapPath,
    minimapBounds: { cx, cz, scale: miniScale },
    update,
    sampleAtT,
    findClosestSample,
    dispose,
  };
}
