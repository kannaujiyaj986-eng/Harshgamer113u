import * as THREE from 'three';
import { CarBodyShape, CarCustomization, CarSpec, WheelStyle } from '../types/game';

export interface CarRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Group[];
  flames: THREE.Mesh[];
  paintMaterial: THREE.MeshPhysicalMaterial;
  neonMaterial: THREE.MeshStandardMaterial;
  flameMaterial: THREE.MeshBasicMaterial;
  contactShadow: THREE.Mesh;
  applySuspension: (pitchRad: number, rollRad: number, bounceY: number) => void;
  setNitroVisual: (active: boolean, speedRatio: number) => void;
  updateAppearance: (custom: CarCustomization) => void;
  spinWheels: (distanceDelta: number, steerAngle: number) => void;
  dispose: () => void;
}

function createChassisGeometry(shapeType: CarBodyShape): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  if (shapeType === 'needle_jet') {
    s.moveTo(-2.45, 0.22);
    s.lineTo(2.58, 0.24);
    s.lineTo(2.18, 0.48);
    s.lineTo(0.45, 0.90);
    s.lineTo(-1.22, 0.88);
    s.lineTo(-2.40, 0.64);
    s.closePath();
  } else if (shapeType === 'titan_heavy') {
    s.moveTo(-2.35, 0.22);
    s.lineTo(2.32, 0.24);
    s.lineTo(2.22, 0.72);
    s.lineTo(0.8, 1.08);
    s.lineTo(-1.35, 1.08);
    s.lineTo(-2.3, 0.78);
    s.closePath();
  } else if (shapeType === 'pulse_pod') {
    s.moveTo(-2.22, 0.22);
    s.lineTo(2.28, 0.24);
    s.lineTo(1.75, 0.64);
    s.lineTo(0.25, 0.96);
    s.lineTo(-1.28, 0.92);
    s.lineTo(-2.22, 0.58);
    s.closePath();
  } else {
    // Sleek sculpted supercar profile
    s.moveTo(-2.40, 0.19);
    s.lineTo(2.45, 0.22);
    s.lineTo(2.28, 0.46);
    s.lineTo(0.95, 0.70);
    s.lineTo(0.15, 0.94);
    s.lineTo(-1.15, 0.92);
    s.lineTo(-2.35, 0.66);
    s.closePath();
  }

  const width = shapeType === 'wide_hyper' || shapeType === 'champion_gold' ? 1.92 : shapeType === 'needle_jet' ? 1.56 : 1.76;
  const geom = new THREE.ExtrudeGeometry(s, {
    steps: 1,
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  geom.translate(0, 0, -width / 2);
  geom.rotateY(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

function buildWheelGroup(
  style: WheelStyle,
  rimMat: THREE.Material,
  tireMat: THREE.Material,
  neonMat: THREE.Material,
  caliperMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.36, 20), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  const hubRadius = style === 'aero_disc' ? 0.32 : 0.29;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(hubRadius, hubRadius, 0.38, 14), rimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12), caliperMat);
  disc.rotation.z = Math.PI / 2;
  g.add(disc);

  const spokeCount = style === 'split_spoke' ? 5 : style === 'turbine' ? 6 : style === 'gold_forged' ? 8 : 3;
  for (let i = 0; i < spokeCount; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.04, 0.5), neonMat);
    spoke.rotation.x = (i * Math.PI) / spokeCount;
    g.add(spoke);
  }
  return g;
}

export function buildGroundCarMesh(
  spec: CarSpec,
  customization: CarCustomization,
  shadowMap: THREE.Texture,
  isSoftwareGl: boolean
): CarRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isChampion = spec.bodyShape === 'champion_gold';
  const paintMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(customization.color),
    metalness: isChampion ? 0.94 : 0.78,
    roughness: isChampion ? 0.12 : 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 1.0,
    anisotropy: isChampion ? 0.75 : 0.2,
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    metalness: 0.4,
    roughness: 0.52,
  });

  const canopyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x09111f,
    metalness: 0.15,
    roughness: 0.05,
    clearcoat: 1.0,
    transparent: true,
    opacity: isSoftwareGl ? 0.88 : 0.92,
  });

  const neonMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(customization.neonColor),
    emissive: new THREE.Color(customization.neonColor),
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.2,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: customization.wheelStyle === 'gold_forged' || isChampion ? 0xfbbf24 : 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.16,
  });

  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.05,
    roughness: 0.9,
  });

  const caliperMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    metalness: 0.6,
    roughness: 0.35,
  });

  const flameMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(customization.boostColor),
    transparent: true,
    opacity: 0.95,
  });

  // 1. Sculpted Supercar Chassis Hull + Wide Muscular Rear Haunches
  const hullGeom = createChassisGeometry(spec.bodyShape);
  const hullMesh = new THREE.Mesh(hullGeom, paintMaterial);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  bodyGroup.add(hullMesh);

  const haunchGeom = new THREE.BoxGeometry(0.42, 0.42, 1.85);
  const haunchL = new THREE.Mesh(haunchGeom, paintMaterial);
  haunchL.position.set(-0.92, 0.54, -1.25);
  haunchL.castShadow = true;
  const haunchR = haunchL.clone();
  haunchR.position.x = 0.92;
  bodyGroup.add(haunchL, haunchR);

  // 2. Carbon Front Splitter, Side Skirts & Rear Diffuser Fins
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.12, 4.82), carbonMaterial);
  splitter.position.set(0, 0.21, 0.02);
  splitter.castShadow = true;
  bodyGroup.add(splitter);

  for (let fx = -0.8; fx <= 0.8; fx += 0.32) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.48), carbonMaterial);
    fin.position.set(fx, 0.24, -2.28);
    bodyGroup.add(fin);
  }

  // 3. Tinted Glass Cabin Windshield & Rear Engine Cover
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.4, 2.08), canopyMaterial);
  canopy.position.set(0, 0.90, -0.08);
  canopy.scale.set(0.92, 0.85, 1);
  bodyGroup.add(canopy);

  // Rear engine louver slats
  for (let lz = -0.9; lz >= -1.65; lz -= 0.25) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.04, 0.12), carbonMaterial);
    slat.position.set(0, 0.84, lz);
    bodyGroup.add(slat);
  }

  // 4. Sculpted Side Mirrors & Side Air Intakes
  const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.22), paintMaterial);
  mirrorL.position.set(-1.04, 0.78, 0.58);
  const mirrorR = mirrorL.clone();
  mirrorR.position.x = 1.04;
  bodyGroup.add(mirrorL, mirrorR);

  // 5. Rear Motorsport GT Spoiler / Ducktail Lip
  const pylonL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.32), carbonMaterial);
  pylonL.position.set(-0.62, 0.86, -1.96);
  const pylonR = pylonL.clone();
  pylonR.position.x = 0.62;
  const wingBar = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.07, 0.44), carbonMaterial);
  wingBar.position.set(0, 1.06, -2.04);
  const wingEndL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.48), paintMaterial);
  wingEndL.position.set(-1.02, 1.05, -2.04);
  const wingEndR = wingEndL.clone();
  wingEndR.position.x = 1.02;
  bodyGroup.add(pylonL, pylonR, wingBar, wingEndL, wingEndR);

  // 6. LED Headlights & Split Racing Taillights
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.12), headlightMat);
  headL.position.set(-0.62, 0.44, 2.40);
  const headR = headL.clone();
  headR.position.x = 0.62;

  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a44 });
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.1), tailMat);
  tailL.position.set(-0.58, 0.60, -2.38);
  const tailR = tailL.clone();
  tailR.position.x = 0.58;
  bodyGroup.add(headL, headR, tailL, tailR);

  // 7. Twin Center-High Exhaust Tips & Bright Dual-Core Nitro Flames
  const pipeCount = spec.bodyShape === 'tri_thruster' || isChampion ? 3 : 2;
  const pipeOffsets = pipeCount === 3 ? [-0.42, 0, 0.42] : [-0.36, 0.36];
  const flames: THREE.Mesh[] = [];
  const flameGeom = new THREE.ConeGeometry(0.2, 1.7, 10);
  flameGeom.rotateX(-Math.PI / 2);
  flameGeom.translate(0, 0, -0.85);
  const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  const innerFlameGeom = new THREE.ConeGeometry(0.09, 1.05, 8);
  innerFlameGeom.rotateX(-Math.PI / 2);
  innerFlameGeom.translate(0, 0, -0.52);

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.96, roughness: 0.14 });
  for (const ox of pipeOffsets) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.3, 14), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ox, 0.46, -2.38);
    bodyGroup.add(pipe);

    const flame = new THREE.Mesh(flameGeom, flameMaterial);
    flame.add(new THREE.Mesh(innerFlameGeom, innerFlameMat));
    flame.position.set(ox, 0.46, -2.46);
    flame.scale.set(0.1, 0.1, 0.05);
    flame.visible = false;
    bodyGroup.add(flame);
    flames.push(flame);
  }

  // 8. Four Grounded Upright Wheels
  const wheelCoords: [number, number, number][] = [
    [-0.99, 0.43, 1.44],
    [0.99, 0.43, 1.44],
    [-1.03, 0.43, -1.42],
    [1.03, 0.43, -1.42],
  ];
  const wheels: THREE.Group[] = [];
  for (const [wx, wy, wz] of wheelCoords) {
    const wg = buildWheelGroup(customization.wheelStyle, rimMaterial, tireMaterial, neonMaterial, caliperMaterial);
    wg.position.set(wx, wy, wz);
    root.add(wg);
    wheels.push(wg);
  }

  // 9. Ground Contact Shadow directly on asphalt
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.78,
  });
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.6), shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  root.add(contactShadow);

  const applySuspension = (pitchRad: number, rollRad: number, bounceY: number) => {
    bodyGroup.rotation.x = pitchRad;
    bodyGroup.rotation.z = rollRad;
    bodyGroup.position.y = bounceY;
  };

  const setNitroVisual = (active: boolean, speedRatio: number) => {
    for (const f of flames) {
      f.visible = active || speedRatio > 0.72;
      if (f.visible) {
        const len = active ? 1.25 + Math.random() * 0.48 : 0.42 + Math.random() * 0.15;
        const w = active ? 1.05 : 0.62;
        f.scale.set(w, w, len);
      }
    }
    flameMaterial.opacity = active ? 0.95 : 0.65;
  };

  const spinWheels = (distanceDelta: number, steerAngle: number) => {
    const spin = distanceDelta / 0.43;
    wheels.forEach((w, idx) => {
      if (idx < 2) {
        w.rotation.y = steerAngle;
      }
      w.children.forEach((part) => {
        part.rotation.x += spin;
      });
    });
  };

  const updateAppearance = (next: CarCustomization) => {
    paintMaterial.color.set(next.color);
    neonMaterial.color.set(next.neonColor);
    neonMaterial.emissive.set(next.neonColor);
    flameMaterial.color.set(next.boostColor);
    rimMaterial.color.set(next.wheelStyle === 'gold_forged' || isChampion ? '#fbbf24' : '#e2e8f0');
  };

  const dispose = () => {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
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
    root,
    bodyGroup,
    wheels,
    flames,
    paintMaterial,
    neonMaterial,
    flameMaterial,
    contactShadow,
    applySuspension,
    setNitroVisual,
    updateAppearance,
    spinWheels,
    dispose,
  };
}
