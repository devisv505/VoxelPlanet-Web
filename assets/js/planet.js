// The planet in the hero: a small, flat-shaded take on a VoxelPlanet planet, in the colours of each
// preset. Plateaus, ridged mountains, craters, a cloud layer, the rim glow, rings and moons. Drag it.
import * as THREE from 'three';

const PLANETS = {
  azure:   { note: 'Azure: blue seas of dust with white plates.', seed: 23, low: 0x2b6fd6, plate: 0xf2f4fa, cliff: 0xa9c2e8, mountain: 0x5e7fb8, peak: 0xffffff, crater: 0x1b3f9e, rim: 0x73bfff, clouds: 0xffffff, cover: 0.5, plates: 0.42, mountains: 0.2, ring: [0x6fb7f2, 0xeaf4ff, 0x3f7fd9], tilt: 14, moons: [] },
  ember:   { note: 'Ember: molten orange lowlands under raised violet crust.', seed: 11, low: 0xb5402c, plate: 0x9a62b0, cliff: 0x6e3f86, mountain: 0x5a2b3c, peak: 0xe9a66b, crater: 0xf59324, rim: 0xff8538, clouds: 0xe8cfc4, cover: 0.35, plates: 0.35, mountains: 0.16, ring: null, moons: [0xc9b8d6] },
  verdant: { note: 'Verdant: green and teal bands, ringed.', seed: 37, low: 0x3fa05a, plate: 0x1f6f6b, cliff: 0x175450, mountain: 0x4f7a5e, peak: 0xcfe6b8, crater: 0x8ed36b, rim: 0x8cffa6, clouds: 0xf2fffa, cover: 0.55, plates: 0.22, mountains: 0.24, ring: [0x6fb7f2, 0x9fe0ff, 0x4f9fe0], tilt: 24, moons: [0x2f9f8f] },
  coral:   { note: 'Coral: pink highlands, cream craters, many small moons.', seed: 41, low: 0xe889a8, plate: 0xf7c7d6, cliff: 0xc4607f, mountain: 0xa8506e, peak: 0xfff1dc, crater: 0xf7e6c4, rim: 0xff9eb8, clouds: 0xffe8f0, cover: 0.4, plates: 0.28, mountains: 0.12, craters: 14, ring: null, moons: [0xd9c2b0, 0xb8a0a8, 0xe6d0b8] },
  violet:  { note: 'Violet: purple plains veined with gold.', seed: 59, low: 0x5a34b8, plate: 0xe6b84d, cliff: 0xa87a2a, mountain: 0x3a2470, peak: 0xf2d27a, crater: 0x3a1f7a, rim: 0xd99aff, clouds: 0xe8dcff, cover: 0.3, plates: 0.3, mountains: 0.13, ring: [0xe6b84d, 0xfff0b8, 0xb8862a], tilt: 9, moons: [] },
  ash:     { note: 'Ash: charcoal crust with glowing red craters.', seed: 71, low: 0x4a4a55, plate: 0x6e6e7a, cliff: 0x33333c, mountain: 0x2e2c33, peak: 0x8c8a96, crater: 0xe8402a, rim: 0xff6640, clouds: 0x8c8894, cover: 0.6, plates: 0.5, mountains: 0.1, craters: 12, glow: true, ring: null, moons: [0x8a8a96, 0xb85a4a] },
};

// ------------------------------------------------------------------ noise
function hash3(x, y, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function valueNoise(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
function fbm(p, freq, octaves, seed) {
  let sum = 0, amp = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(p.x * freq, p.y * freq, p.z * freq, seed + i * 101) * amp;
    norm += amp; amp *= 0.5; freq *= 2.1;
  }
  return sum / norm;
}
function mulberry(seed) {
  return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ------------------------------------------------------------------ the planet's surface
function heightAt(p, cfg, craters) {
  const s = cfg.seed;
  const hills = fbm(p, 2.2, 4, s) * 0.025;
  const plateNoise = fbm(p, 1.6, 3, s + 7);
  const plate = plateNoise > 0.32 - cfg.plates * 0.55 ? 0.035 : 0;
  // Mountain ranges: ridges along the zero line of a slow noise, broken into separate ranges.
  const range = 1 - Math.min(1, Math.abs(fbm(p, 1.1, 2, s + 19)) / (0.05 + cfg.mountains * 0.35));
  const gate = Math.max(0, fbm(p, 0.9, 2, s + 31) + 0.15);
  const ridge = Math.pow(1 - Math.abs(fbm(p, 5, 3, s + 43)), 2);
  const mountain = Math.max(0, range) * Math.min(1, gate * 3) * (0.25 + 0.75 * ridge) * 0.13;
  let crater = 0, inCrater = 0;
  for (const c of craters) {
    const d = p.distanceTo(c.dir) / c.r;
    if (d > 1.6) continue;
    crater += -c.depth * (1 - smooth(0.4, 1, d)) + c.depth * 0.5 * (1 - smooth(0, 0.35, Math.abs(d - 1.02)));
    if (d < 0.85) inCrater = 1;
  }
  return { h: hills + plate * (1 - inCrater) + mountain + crater, plate: plate > 0, mountain, inCrater };
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function buildSurface(cfg) {
  const rnd = mulberry(cfg.seed * 977);
  const craters = [];
  for (let i = 0; i < (cfg.craters || 8); i++) {
    const dir = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    const r = 0.06 + rnd() * 0.13;
    craters.push({ dir, r, depth: r * 0.28 });
  }
  const geo = new THREE.IcosahedronGeometry(1, 34);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const info = [];
  const cache = new Map();   // each corner is shared by about six triangles: work it out once
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const key = Math.round(v.x * 1e5) + ',' + Math.round(v.y * 1e5) + ',' + Math.round(v.z * 1e5);
    let s = cache.get(key);
    if (!s) { s = heightAt(v, cfg, craters); cache.set(key, s); }
    info.push(s);
    v.multiplyScalar(1 + s.h);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  // One colour per triangle: by what it stands on and how steep it is.
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), centre = new THREE.Vector3();
  const pal = { low: new THREE.Color(cfg.low), plate: new THREE.Color(cfg.plate), cliff: new THREE.Color(cfg.cliff), mountain: new THREE.Color(cfg.mountain), peak: new THREE.Color(cfg.peak), crater: new THREE.Color(cfg.crater) };
  const col = new THREE.Color();
  for (let f = 0; f < pos.count; f += 3) {
    a.fromBufferAttribute(pos, f); b.fromBufferAttribute(pos, f + 1); c.fromBufferAttribute(pos, f + 2);
    centre.copy(a).add(b).add(c).divideScalar(3);
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const slope = 1 - Math.abs(n.dot(centre.clone().normalize()));
    const s0 = info[f], s1 = info[f + 1], s2 = info[f + 2];
    const mountain = (s0.mountain + s1.mountain + s2.mountain) / 3;
    const plates = (s0.plate ? 1 : 0) + (s1.plate ? 1 : 0) + (s2.plate ? 1 : 0);
    const crater = s0.inCrater + s1.inCrater + s2.inCrater >= 2;
    if (crater) col.copy(pal.crater);
    else if (mountain > 0.075) col.copy(pal.peak);
    else if (mountain > 0.02) col.copy(pal.mountain);
    else if (slope > 0.32) col.copy(pal.cliff);
    else if (plates >= 2) col.copy(pal.plate);
    else col.copy(pal.low);
    // A little per-facet variation, as the game's facet jitter does.
    const j = 1 + (hash3(f, 7, 3, cfg.seed) - 0.5) * 0.08;
    for (let k = 0; k < 3; k++) { colors[(f + k) * 3] = col.r * j; colors[(f + k) * 3 + 1] = col.g * j; colors[(f + k) * 3 + 2] = col.b * j; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
  if (cfg.glow) { mat.emissive = new THREE.Color(0x000000); }
  const mesh = new THREE.Mesh(geo, mat);
  if (cfg.glow) {
    // Ash's craters glow: an emissive copy of just the crater floors.
    const glowGeo = geo.clone();
    const gc = glowGeo.attributes.color.array;
    const cr = new THREE.Color(cfg.crater);
    for (let i = 0; i < gc.length; i += 9) {
      const isCrater = Math.abs(gc[i] - cr.r) < 0.06 && Math.abs(gc[i + 1] - cr.g) < 0.06 && Math.abs(gc[i + 2] - cr.b) < 0.06;
      for (let k = 0; k < 9; k++) gc[i + k] = isCrater ? gc[i + k] * 0.9 : 0;
    }
    const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(1.002);
    mesh.add(glow);
  }
  return mesh;
}

// Rounded, faceted cloud patches floating over the surface.
function buildClouds(cfg) {
  const geo = new THREE.IcosahedronGeometry(1.115, 20);
  const pos = geo.attributes.position;
  const keep = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  const threshold = 0.42 - cfg.cover * 0.62;
  for (let f = 0; f < pos.count; f += 3) {
    a.fromBufferAttribute(pos, f); b.fromBufferAttribute(pos, f + 1); c.fromBufferAttribute(pos, f + 2);
    m.copy(a).add(b).add(c).normalize();
    const n = fbm(m, 2.6, 3, cfg.seed + 500);
    if (n < threshold) continue;
    for (const p of [a, b, c]) {
      const d = p.clone().normalize();
      const puff = 1 + Math.max(0, fbm(d, 2.6, 3, cfg.seed + 500) - threshold) * 0.06 + fbm(d, 9, 2, cfg.seed + 600) * 0.006;
      keep.push(d.x * 1.115 * puff, d.y * 1.115 * puff, d.z * 1.115 * puff);
    }
  }
  const cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  cloudGeo.computeVertexNormals();
  return new THREE.Mesh(cloudGeo, new THREE.MeshStandardMaterial({ color: cfg.clouds, flatShading: true, roughness: 1, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }));
}

function buildRim(cfg) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(cfg.rim) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 color; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(color * f * 1.4, f); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1.24, 64, 32), mat);
}

// Six bands, alternately solid and see-through, as the game's rings are.
function buildRing(cfg) {
  const inner = 1.42, outer = 2.02, bands = 6;
  const ring = new THREE.Group();
  for (let i = 0; i < bands; i++) {
    const r0 = inner + (outer - inner) * i / bands, r1 = inner + (outer - inner) * (i + 1) / bands - 0.006;
    const band = new THREE.Mesh(
      new THREE.RingGeometry(r0, r1, 160, 1),
      new THREE.MeshStandardMaterial({ color: cfg.ring[i % cfg.ring.length], side: THREE.DoubleSide, transparent: true, opacity: i % 2 === 0 ? 0.92 : 0.6, roughness: 1, depthWrite: false }));
    ring.add(band);
  }
  ring.rotation.x = -Math.PI / 2 + THREE.MathUtils.degToRad(cfg.tilt || 12);
  ring.rotation.y = THREE.MathUtils.degToRad((cfg.tilt || 12) * 0.4);
  return ring;
}

// ------------------------------------------------------------------ scene
const canvas = document.getElementById('planetCanvas');
const stage = document.getElementById('planetStage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  renderer = null;
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.4, 7.6);
  camera.lookAt(0, 0, 0);

  const sun = new THREE.DirectionalLight(0xfff1dd, 2.4);
  sun.position.set(-4, 2.5, 3.5);
  scene.add(sun);
  const ambient = new THREE.HemisphereLight(0x8c7ab8, 0x2a1220, 0.9);
  scene.add(ambient);

  const world = new THREE.Group();   // turned by the user
  const spin = new THREE.Group();    // turns by itself
  world.add(spin);
  world.rotation.x = 0.35;
  scene.add(world);

  let parts = null, name = 'azure', switchT = 1;
  const moons = [];

  function dispose(obj) {
    obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }

  function build(key) {
    const cfg = PLANETS[key];
    if (parts) { spin.remove(parts.surface, parts.clouds); world.remove(parts.rim); if (parts.ring) world.remove(parts.ring); [parts.surface, parts.clouds, parts.rim, parts.ring].forEach((o) => o && dispose(o)); }
    moons.splice(0).forEach((m) => { world.remove(m.mesh); dispose(m.mesh); });
    const surface = buildSurface(cfg);
    const clouds = buildClouds(cfg);
    const rim = buildRim(cfg);
    const ring = cfg.ring ? buildRing(cfg) : null;
    spin.add(surface, clouds);
    world.add(rim);
    if (ring) world.add(ring);
    cfg.moons.forEach((color, i) => {
      const geo = new THREE.IcosahedronGeometry(0.09 + (i % 2) * 0.03, 1);
      const p = geo.attributes.position;
      const v = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); v.multiplyScalar(1 + (hash3(k, i, 9, cfg.seed) - 0.5) * 0.25); p.setXYZ(k, v.x, v.y, v.z); }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 }));
      world.add(mesh);
      moons.push({ mesh, r: 2.0 + i * 0.32, speed: 0.22 - i * 0.04, phase: i * 2.1, tilt: 0.3 + i * 0.25 });
    });
    parts = { surface, clouds, rim, ring };
    name = key;
    document.getElementById('planetNote').textContent = cfg.note;
  }

  // ------------------------------------------------------------------ sizing and interaction
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let dragging = false, lastX = 0, lastY = 0, velX = 0, velY = 0, idle = 0;
  const hint = document.querySelector('.planet-hint');
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); if (hint) hint.style.opacity = 0; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    velY = (e.clientX - lastX) * 0.008;
    velX = (e.clientY - lastY) * 0.008;
    lastX = e.clientX; lastY = e.clientY;
    spin.rotation.y += velY;
    world.rotation.x = THREE.MathUtils.clamp(world.rotation.x + velX, -1.1, 1.1);
    idle = 0;
  });
  const release = () => { dragging = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  document.querySelectorAll('.planet-pick [data-planet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.planet-pick [data-planet]').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      if (btn.dataset.planet === name) return;
      switchT = 0;
      build(btn.dataset.planet);
    });
  });

  function applyTheme() {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    ambient.intensity = light ? 1.3 : 0.9;
  }
  document.addEventListener('vp-theme', applyTheme);
  applyTheme();

  // ------------------------------------------------------------------ loop
  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(stage);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  build(name);

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    idle += dt;
    if (!dragging) {
      spin.rotation.y += velY;
      world.rotation.x = THREE.MathUtils.clamp(world.rotation.x + velX, -1.1, 1.1);
      velY *= 0.94; velX *= 0.9;
      if (!reduced && idle > 0.8) spin.rotation.y += dt * 0.12;
    }
    if (parts) parts.clouds.rotation.y += dt * 0.03;
    const t = clock.elapsedTime;
    moons.forEach((m) => {
      const a = m.phase + t * m.speed;
      m.mesh.position.set(Math.cos(a) * m.r, Math.sin(a) * m.r * m.tilt, Math.sin(a) * m.r);
      m.mesh.rotation.y += dt * 0.4;
    });
    if (switchT < 1) {
      switchT = Math.min(1, switchT + dt * 2.2);
      const s = 0.85 + 0.15 * (1 - Math.pow(1 - switchT, 3));
      world.scale.setScalar(s);
    }
    renderer.render(scene, camera);
    window.vpPlanetReady = true;
  }
  frame();
}
