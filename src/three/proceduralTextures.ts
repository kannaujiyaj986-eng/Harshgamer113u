import * as THREE from 'three';

export interface TextureBundle {
  roadMap: THREE.CanvasTexture;
  barrierMap: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  finishMap: THREE.CanvasTexture;
  shadowMap: THREE.CanvasTexture;
  sparkMap: THREE.CanvasTexture;
  waterRippleMap: THREE.CanvasTexture;
}

export function createProceduralTextures(maxAnisotropy: number): TextureBundle {
  // 1. Sunlit Realistic Highway Asphalt Texture (Double white center & edge lines + yellow shoulders)
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rctx = roadCanvas.getContext('2d')!;

  // Sunlit warm-gray highway asphalt
  rctx.fillStyle = '#646870';
  rctx.fillRect(0, 0, 512, 512);

  // Darker tire-wear tracks in the 4 highway lanes
  const laneCenters = [100, 195, 317, 412];
  for (const cx of laneCenters) {
    const wear = rctx.createLinearGradient(cx - 42, 0, cx + 42, 0);
    wear.addColorStop(0, 'rgba(42, 46, 52, 0)');
    wear.addColorStop(0.5, 'rgba(42, 46, 52, 0.28)');
    wear.addColorStop(1, 'rgba(42, 46, 52, 0)');
    rctx.fillStyle = wear;
    rctx.fillRect(cx - 42, 0, 84, 512);
  }

  // Fine sunlit asphalt stone aggregate speckle
  for (let i = 0; i < 11000; i++) {
    const x = (i * 73) % 512;
    const y = (i * 139) % 512;
    const v = 78 + (i % 46);
    rctx.fillStyle = `rgb(${v + 2},${v + 2},${v + 4})`;
    rctx.fillRect(x, y, 2, 2);
  }

  // Outer paved gravel shoulder strip
  rctx.fillStyle = '#7b7f86';
  rctx.fillRect(0, 0, 22, 512);
  rctx.fillRect(490, 0, 22, 512);

  // Yellow shoulder edge lines
  rctx.fillStyle = '#facc15';
  rctx.fillRect(22, 0, 7, 512);
  rctx.fillRect(483, 0, 7, 512);

  // Crisp double white inner road edge lines
  rctx.fillStyle = '#f8fafc';
  rctx.fillRect(40, 0, 6, 512);
  rctx.fillRect(52, 0, 6, 512);
  rctx.fillRect(454, 0, 6, 512);
  rctx.fillRect(466, 0, 6, 512);

  // Center double white highway lines
  rctx.fillStyle = '#ffffff';
  rctx.fillRect(247, 0, 6, 512);
  rctx.fillRect(259, 0, 6, 512);

  // Lane dividers (dashed white lines in left & right carriageways)
  rctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
  for (let y = 0; y < 512; y += 64) {
    rctx.fillRect(145, y + 10, 5, 34);
    rctx.fillRect(362, y + 10, 5, 34);
  }

  const roadMap = new THREE.CanvasTexture(roadCanvas);
  roadMap.wrapS = THREE.RepeatWrapping;
  roadMap.wrapT = THREE.RepeatWrapping;
  roadMap.repeat.set(1, 95);
  roadMap.colorSpace = THREE.SRGBColorSpace;
  roadMap.anisotropy = maxAnisotropy;

  // 2. Red-and-White Highway Concrete Barrier Texture
  const barCanvas = document.createElement('canvas');
  barCanvas.width = 512;
  barCanvas.height = 128;
  const bctx = barCanvas.getContext('2d')!;
  bctx.fillStyle = '#f8fafc';
  bctx.fillRect(0, 0, 512, 128);
  const segW = 64;
  for (let x = 0; x < 512; x += segW) {
    const isRed = (x / segW) % 2 === 0;
    bctx.fillStyle = isRed ? '#dc2626' : '#f8fafc';
    bctx.fillRect(x, 0, segW, 92);
    // Subtle sunlit top bevel highlight
    bctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    bctx.fillRect(x, 0, segW, 12);
    // Concrete base plinth
    bctx.fillStyle = '#94a3b8';
    bctx.fillRect(x, 92, segW, 36);
    // Joint seam
    bctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    bctx.fillRect(x, 0, 3, 128);
  }
  const barrierMap = new THREE.CanvasTexture(barCanvas);
  barrierMap.wrapS = THREE.RepeatWrapping;
  barrierMap.wrapT = THREE.ClampToEdgeWrapping;
  barrierMap.repeat.set(95, 1);
  barrierMap.colorSpace = THREE.SRGBColorSpace;
  barrierMap.anisotropy = maxAnisotropy;

  // 3. Vibrant Sunlit Alpine Grass & Meadow Texture
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 512;
  grassCanvas.height = 512;
  const gctx = grassCanvas.getContext('2d')!;
  gctx.fillStyle = '#85be32';
  gctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16000; i++) {
    const x = (i * 97) % 512;
    const y = (i * 193) % 512;
    const shade = i % 4;
    gctx.fillStyle =
      shade === 0
        ? 'rgba(84, 140, 24, 0.42)'
        : shade === 1
          ? 'rgba(174, 214, 68, 0.45)'
          : shade === 2
            ? 'rgba(130, 175, 48, 0.35)'
            : 'rgba(198, 205, 120, 0.20)';
    gctx.fillRect(x, y, 3, 3);
  }
  const grassMap = new THREE.CanvasTexture(grassCanvas);
  grassMap.wrapS = THREE.RepeatWrapping;
  grassMap.wrapT = THREE.RepeatWrapping;
  grassMap.repeat.set(70, 70);
  grassMap.colorSpace = THREE.SRGBColorSpace;
  grassMap.anisotropy = maxAnisotropy;

  // 4. Start/Finish Checker Texture
  const finCanvas = document.createElement('canvas');
  finCanvas.width = 256;
  finCanvas.height = 128;
  const fctx = finCanvas.getContext('2d')!;
  const size = 32;
  for (let y = 0; y < 128; y += size) {
    for (let x = 0; x < 256; x += size) {
      const dark = ((x / size) + (y / size)) % 2 === 0;
      fctx.fillStyle = dark ? '#0f172a' : '#f8fafc';
      fctx.fillRect(x, y, size, size);
    }
  }
  const finishMap = new THREE.CanvasTexture(finCanvas);
  finishMap.colorSpace = THREE.SRGBColorSpace;
  finishMap.anisotropy = maxAnisotropy;

  // 5. Radial Contact Shadow
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const sctx = shCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.85)');
  grad.addColorStop(0.58, 'rgba(2, 6, 23, 0.42)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowMap = new THREE.CanvasTexture(shCanvas);

  // 6. Soft Particle Spark / Flame Glow Texture
  const spCanvas = document.createElement('canvas');
  spCanvas.width = 64;
  spCanvas.height = 64;
  const spCtx = spCanvas.getContext('2d')!;
  const spGrad = spCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  spGrad.addColorStop(0, 'rgba(255,255,255,1)');
  spGrad.addColorStop(0.45, 'rgba(254,215,170,0.85)');
  spGrad.addColorStop(1, 'rgba(251,146,60,0)');
  spCtx.fillStyle = spGrad;
  spCtx.fillRect(0, 0, 64, 64);
  const sparkMap = new THREE.CanvasTexture(spCanvas);

  // 7. Water Ripple Texture
  const wCanvas = document.createElement('canvas');
  wCanvas.width = 256;
  wCanvas.height = 256;
  const wctx = wCanvas.getContext('2d')!;
  wctx.fillStyle = '#0284c7';
  wctx.fillRect(0, 0, 256, 256);
  wctx.strokeStyle = 'rgba(224, 242, 254, 0.25)';
  wctx.lineWidth = 2;
  for (let i = 0; i < 256; i += 32) {
    wctx.beginPath();
    wctx.moveTo(0, i);
    wctx.bezierCurveTo(85, i + 12, 170, i - 12, 256, i);
    wctx.stroke();
  }
  const waterRippleMap = new THREE.CanvasTexture(wCanvas);
  waterRippleMap.wrapS = THREE.RepeatWrapping;
  waterRippleMap.wrapT = THREE.RepeatWrapping;
  waterRippleMap.repeat.set(24, 24);
  waterRippleMap.colorSpace = THREE.SRGBColorSpace;

  return { roadMap, barrierMap, grassMap, finishMap, shadowMap, sparkMap, waterRippleMap };
}
