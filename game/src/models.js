// The visible objects: gallery walls and covers, the guard and thief figures,
// display relics, the exit gate, lamps and security cameras. Each builder returns
// a group plus the few handles the rules animate (legs, lens, glowing panel).

import * as THREE from '../vendor/three.module.min.js';
import { glowTexture } from './materials.js';

function exitSignTexture() {
  const surface = document.createElement('canvas');
  surface.width = 512;
  surface.height = 128;
  const context = surface.getContext('2d');
  context.clearRect(0, 0, 512, 128);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 6;
  context.strokeRect(8, 8, 496, 112);
  context.fillStyle = '#ffffff';
  context.font = 'bold 78px "Chakra Petch", system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.letterSpacing = '18px';
  context.fillText('EXIT', 262, 70);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const cylinder = (radiusTop, radiusBottom, height, material, segments = 16) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

export function makeWall(def, materials) {
  const group = new THREE.Group();
  const body = box(def.w, def.h, def.d, materials.stone, 0, def.h / 2, 0);
  group.add(body);
  const trim = box(def.w + 0.06, 0.12, def.d + 0.06, materials.brass, 0, 0.14, 0);
  group.add(trim);
  const top = box(def.w + 0.05, 0.08, def.d + 0.05, materials.darkMetal, 0, def.h - 0.04, 0);
  group.add(top);
  const edge = box(def.w + 0.02, 0.035, def.d + 0.02, materials.edge, 0, def.h - 0.1, 0);
  group.add(edge);
  if (def.w > def.d) {
    const panels = Math.max(1, Math.round(def.w / 3.4));
    for (let index = 0; index < panels; index += 1) {
      const panel = box(0.03, def.h - 0.5, def.d + 0.04, materials.darkMetal, -def.w / 2 + (index + 0.5) * (def.w / panels), def.h / 2 + 0.1, 0);
      group.add(panel);
    }
  }
  group.position.set(def.x, 0, def.z);
  return group;
}

function crate(def, materials) {
  const group = new THREE.Group();
  group.add(box(def.w, def.h, def.d, materials.wood, 0, def.h / 2, 0));
  const frame = 0.09;
  const edges = [
    [def.w, frame, frame, 0, frame / 2, def.d / 2 - frame / 2],
    [def.w, frame, frame, 0, def.h - frame / 2, def.d / 2 - frame / 2],
    [def.w, frame, frame, 0, frame / 2, -def.d / 2 + frame / 2],
    [def.w, frame, frame, 0, def.h - frame / 2, -def.d / 2 + frame / 2],
    [frame, def.h, frame, def.w / 2 - frame / 2, def.h / 2, def.d / 2 - frame / 2],
    [frame, def.h, frame, -def.w / 2 + frame / 2, def.h / 2, def.d / 2 - frame / 2],
    [frame, def.h, frame, def.w / 2 - frame / 2, def.h / 2, -def.d / 2 + frame / 2],
    [frame, def.h, frame, -def.w / 2 + frame / 2, def.h / 2, -def.d / 2 + frame / 2],
  ];
  for (const [w, h, d, x, y, z] of edges) group.add(box(w, h, d, materials.brass, x, y, z));
  for (const side of [-1, 1]) {
    const slat = box(def.w * 0.94, 0.08, 0.05, materials.darkMetal, 0, def.h * 0.64, side * (def.d / 2 + 0.01));
    slat.rotation.z = 0.55 * side;
    group.add(slat);
  }
  return group;
}

function planter(def, materials) {
  const group = new THREE.Group();
  const pot = box(def.w, def.h * 0.55, def.d, materials.stone, 0, def.h * 0.275, 0);
  group.add(pot);
  group.add(box(def.w * 0.9, 0.06, def.d * 0.9, materials.foliage, 0, def.h * 0.55 + 0.03, 0));
  group.add(box(def.w + 0.02, 0.025, def.d + 0.02, materials.edgeWarm, 0, def.h * 0.55 + 0.02, 0));
  const leaf = new THREE.MeshStandardMaterial({ color: '#2a6b4c', roughness: 0.9, metalness: 0 });
  for (let index = 0; index < 7; index += 1) {
    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19 + Math.random() * 0.16, 0), index % 2 === 0 ? materials.foliage : leaf);
    sphere.position.set((Math.random() - 0.5) * def.w * 0.7, def.h * 0.55 + 0.28 + Math.random() * 0.36, (Math.random() - 0.5) * def.d * 0.7);
    sphere.castShadow = true;
    group.add(sphere);
  }
  return group;
}

function pillar(def, materials) {
  const group = new THREE.Group();
  const shaft = cylinder(0.34, 0.4, def.h, materials.marble, 20);
  shaft.position.y = def.h / 2;
  group.add(shaft);
  const base = box(1.02, 0.2, 1.02, materials.stone, 0, 0.1, 0);
  group.add(base);
  const cap = box(0.94, 0.16, 0.94, materials.brass, 0, def.h - 0.08, 0);
  group.add(cap);
  group.add(box(0.72, 0.08, 0.72, materials.marble, 0, def.h + 0.02, 0));
  return group;
}

function shelf(def, materials) {
  const group = new THREE.Group();
  const back = box(def.w, def.h, 0.1, materials.darkMetal, 0, def.h / 2, def.d / 2 - 0.05);
  group.add(back);
  for (const side of [-1, 1]) {
    group.add(box(0.1, def.h, def.d, materials.metal, side * (def.w / 2 - 0.05), def.h / 2, 0));
  }
  const levels = 3;
  const bookColors = ['#8f3b3b', '#3b5f8f', '#8f7a3b', '#3b8f72', '#5c3b8f', '#8f5a3b'];
  for (let level = 0; level < levels; level += 1) {
    const y = 0.42 + level * ((def.h - 0.6) / (levels - 1));
    group.add(box(def.w - 0.16, 0.07, def.d - 0.06, materials.wood, 0, y, 0));
    let x = -def.w / 2 + 0.24;
    let book = 0;
    while (x < def.w / 2 - 0.3) {
      const width = 0.12 + Math.random() * 0.14;
      const height = 0.24 + Math.random() * 0.16;
      const spine = new THREE.MeshStandardMaterial({ color: bookColors[(level + book) % bookColors.length], roughness: 0.8 });
      const mesh = box(width, height, 0.26, spine, x + width / 2, y + 0.05 + height / 2, 0);
      group.add(mesh);
      x += width + 0.035;
      book += 1;
    }
  }
  return group;
}

function displayWall(def, materials) {
  const group = new THREE.Group();
  const baseHeight = def.h * 0.52;
  group.add(box(def.w, baseHeight, def.d * 0.92, materials.wood, 0, baseHeight / 2, 0));
  group.add(box(def.w + 0.06, 0.08, def.d + 0.06, materials.brass, 0, baseHeight, 0));
  group.add(box(def.w + 0.02, 0.02, def.d * 0.78, materials.edgeWarm, 0, def.h - 0.04, 0));
  const glass = box(def.w - 0.2, def.h - baseHeight - 0.1, def.d * 0.72, materials.glass, 0, baseHeight + (def.h - baseHeight) / 2, 0);
  glass.castShadow = false;
  group.add(glass);
  const frames = Math.max(2, Math.round(def.w / 2.2));
  for (let index = 0; index <= frames; index += 1) {
    const x = -def.w / 2 + 0.08 + (index / frames) * (def.w - 0.16);
    group.add(box(0.06, def.h - baseHeight, def.d * 0.76, materials.brass, x, baseHeight + (def.h - baseHeight) / 2, 0));
  }
  for (let index = 0; index < frames; index += 1) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), materials.cyan);
    gem.position.set(-def.w / 2 + 0.6 + index * ((def.w - 1.2) / Math.max(1, frames - 1)), baseHeight + 0.28, 0);
    group.add(gem);
  }
  return group;
}

function caseModel(def, materials) {
  const group = new THREE.Group();
  const plinthHeight = def.h * 0.58;
  group.add(box(def.w, plinthHeight, def.d, materials.marble, 0, plinthHeight / 2, 0));
  group.add(box(def.w + 0.05, 0.06, def.d + 0.05, materials.brass, 0, plinthHeight, 0));
  const glass = box(def.w * 0.82, def.h - plinthHeight, def.d * 0.82, materials.glass, 0, plinthHeight + (def.h - plinthHeight) / 2, 0);
  glass.castShadow = false;
  group.add(glass);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), materials.amber);
  gem.position.y = plinthHeight + 0.26;
  group.add(gem);
  return group;
}

export function makeCover(def, materials) {
  let group;
  if (def.kind === 'crate') group = crate(def, materials);
  else if (def.kind === 'planter') group = planter(def, materials);
  else if (def.kind === 'pillar') group = pillar(def, materials);
  else if (def.kind === 'shelf') group = shelf(def, materials);
  else if (def.kind === 'case') group = caseModel(def, materials);
  else group = displayWall(def, materials);
  group.position.set(def.x, 0, def.z);
  return group;
}

export function makeRelic(def, materials) {
  const group = new THREE.Group();
  const main = Boolean(def.main);
  const plinth = box(1.1, 0.95, 1.1, materials.stone, 0, 0.475, 0);
  group.add(plinth);
  group.add(box(1.24, 0.08, 1.24, materials.brass, 0, 0.99, 0));
  const inner = box(0.86, 0.02, 0.86, materials.darkMetal, 0, 1.02, 0);
  group.add(inner);
  const gemMaterial = main ? materials.cyan.clone() : materials.amber.clone();
  gemMaterial.emissiveIntensity = main ? 2.1 : 1.8;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(main ? 0.34 : 0.24, 0), gemMaterial);
  gem.position.y = main ? 1.62 : 1.52;
  gem.castShadow = true;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(main ? 0.48 : 0.36, 0.012, 8, 48),
    main ? materials.cyan : materials.amber,
  );
  halo.position.y = gem.position.y;
  halo.rotation.x = Math.PI / 2;
  const light = new THREE.PointLight(main ? '#8fffe0' : '#ffcf8a', main ? 12 : 4, main ? 8 : 4, 2);
  light.position.y = gem.position.y;
  const haloGroup = new THREE.Group();
  haloGroup.add(gem, halo, light);
  group.add(haloGroup);
  if (main) {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.95, 4.6, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#8fffe0', transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    shaft.position.y = 1.62 + 2.3;
    group.add(shaft);
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.86, 40), materials.cyan.clone());
    floorRing.material.transparent = true;
    floorRing.material.opacity = 0.2;
    floorRing.material.depthWrite = false;
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 1.03;
    group.add(floorRing);
  }
  group.position.set(def.x, 0, def.z);
  return { group, haloGroup, gem, halo, light, main, name: def.name, collected: false };
}

export function makeExit(def, materials) {
  const group = new THREE.Group();
  const padMaterial = new THREE.MeshStandardMaterial({
    color: '#ff7788',
    emissive: '#ff3048',
    emissiveIntensity: 1.2,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
  });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 40), padMaterial);
  pad.position.y = 0.03;
  pad.receiveShadow = true;
  group.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.045, 8, 52), padMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: '#ff7788',
    emissive: '#ff3048',
    emissiveIntensity: 1.1,
    roughness: 0.35,
    metalness: 0.4,
  });
  const frame = new THREE.Group();
  frame.add(box(2.5, 0.14, 0.3, materials.darkMetal, 0, 2.62, 0));
  frame.add(box(0.14, 2.6, 0.3, materials.darkMetal, -1.18, 1.3, 0));
  frame.add(box(0.14, 2.6, 0.3, materials.darkMetal, 1.18, 1.3, 0));
  const panel = box(2.2, 2.42, 0.08, panelMaterial, 0, 1.3, 0);
  frame.add(panel);
  for (const side of [-1, 1]) {
    frame.add(box(0.05, 2.3, 0.08, materials.brass, side * 0.62, 1.3, -0.06));
  }
  frame.position.set(-1.05, 0, 0);
  frame.rotation.y = Math.PI / 2;
  group.add(frame);
  const arrowMaterial = new THREE.MeshStandardMaterial({ color: '#ff7788', emissive: '#ff3048', emissiveIntensity: 2, roughness: 0.3 });
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4), arrowMaterial);
  arrow.rotation.x = Math.PI;
  arrow.position.set(-1.05, 3.2, 0);
  arrow.visible = false;
  const signMaterial = new THREE.SpriteMaterial({ map: exitSignTexture(), transparent: true, color: '#ff7788', depthWrite: false });
  const sign = new THREE.Sprite(signMaterial);
  sign.position.set(0, 3.15, 1.55);
  sign.scale.set(2.2, 0.55, 1);
  group.add(sign);
  group.position.set(def.x, 0, def.z);
  group.rotation.y = -def.angle;
  return { group, padMaterial, panelMaterial, arrowMaterial, signMaterial, pad, ring, arrow, sign };
}

export function makeLamp(def, materials) {
  const group = new THREE.Group();
  const stem = cylinder(0.03, 0.05, 2.2, materials.brass, 8);
  stem.position.y = 1.1;
  group.add(stem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), materials.brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 2.28;
  group.add(ring);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshBasicMaterial({ color: def.color }));
  glow.position.y = 2.28;
  group.add(glow);
  const light = new THREE.PointLight(def.color, def.power, 8.5, 2);
  light.position.y = 2.2;
  group.add(light);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 5.6),
    new THREE.MeshBasicMaterial({ map: glowTexture(def.color), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.015;
  group.add(pool);
  group.position.set(def.x, 0, def.z);
  return group;
}

export function makeShadow(def) {
  const material = new THREE.MeshBasicMaterial({ color: '#02121a', transparent: true, opacity: 0.34, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(def.w, def.d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(def.x, 0.012, def.z);
  return mesh;
}

export function makeGuardModel(materials) {
  const group = new THREE.Group();
  const legLeft = new THREE.Group();
  const legRight = new THREE.Group();
  for (const [leg, side] of [[legLeft, 1], [legRight, -1]]) {
    leg.position.set(0, 0.78, side * 0.16);
    const shin = box(0.2, 0.72, 0.22, materials.uniform, 0, -0.36, 0);
    const boot = box(0.22, 0.16, 0.3, materials.darkMetal, 0.05, -0.74, 0);
    leg.add(shin, boot);
    group.add(leg);
  }
  const torso = box(0.58, 0.72, 0.4, materials.uniform, 0, 1.16, 0);
  torso.castShadow = true;
  group.add(torso);
  group.add(box(0.6, 0.1, 0.42, materials.uniformTrim, 0, 0.86, 0));
  group.add(box(0.2, 0.1, 0.06, materials.cyan, 0.3, 1.42, -0.13));
  const armLeft = new THREE.Group();
  const armRight = new THREE.Group();
  for (const [arm, side] of [[armLeft, 1], [armRight, -1]]) {
    arm.position.set(0, 1.42, side * 0.31);
    const sleeve = box(0.16, 0.58, 0.17, materials.uniform, 0, -0.27, 0);
    arm.add(sleeve);
    group.add(arm);
  }
  const neck = cylinder(0.09, 0.1, 0.12, materials.darkMetal, 10);
  neck.position.y = 1.56;
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), materials.uniform);
  head.position.y = 1.72;
  head.castShadow = true;
  group.add(head);
  const goggles = box(0.045, 0.07, 0.23, materials.trimAmber, 0.16, 1.73, 0);
  group.add(goggles);
  group.add(box(0.07, 0.055, 0.46, materials.trimAmber, 0, 1.5, 0));
  for (const [leg, side] of [[legLeft, -1], [legRight, 1]]) {
    leg.add(box(0.21, 0.06, 0.23, materials.trimAmber, 0.02, -0.6, side * 0.005));
  }
  const cap = cylinder(0.21, 0.22, 0.09, materials.darkMetal, 16);
  cap.position.y = 1.87;
  group.add(cap);
  const band = cylinder(0.215, 0.225, 0.028, materials.trimAmber, 16);
  band.position.y = 1.825;
  group.add(band);
  const peak = box(0.22, 0.035, 0.24, materials.darkMetal, 0.14, 1.84, 0);
  group.add(peak);
  const flashlight = new THREE.Group();
  const body = cylinder(0.055, 0.07, 0.3, materials.darkMetal, 12);
  body.rotation.z = Math.PI / 2;
  flashlight.add(body);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.062, 16), new THREE.MeshBasicMaterial({ color: '#fff2c4' }));
  lens.rotation.y = Math.PI / 2;
  lens.position.x = 0.16;
  flashlight.add(lens);
  flashlight.position.set(0.36, 1.24, 0.16);
  group.add(flashlight);
  const badge = box(0.06, 0.14, 0.02, materials.brass, 0.3, 1.26, -0.02);
  group.add(badge);
  return { group, legLeft, legRight, armLeft, armRight, flashlight, head };
}

export function makePlayerModel(materials) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 6, 12), materials.suit);
  body.position.y = 1.02;
  body.castShadow = true;
  group.add(body);
  const chest = box(0.34, 0.34, 0.34, materials.suit, 0.03, 1.15, 0);
  group.add(chest);
  const strap = box(0.05, 0.62, 0.36, materials.trimCyan, 0.02, 1.05, 0);
  strap.rotation.z = 0.6;
  group.add(strap);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 18, 14), materials.suit);
  head.position.set(0.03, 1.62, 0);
  head.castShadow = true;
  group.add(head);
  const visor = box(0.06, 0.075, 0.23, materials.trimCyan, 0.16, 1.62, 0);
  group.add(visor);
  const scarf = box(0.3, 0.06, 0.2, materials.trimCyan, -0.26, 1.38, 0);
  scarf.rotation.z = -0.25;
  group.add(scarf);
  const pack = box(0.2, 0.4, 0.32, materials.darkMetal, -0.24, 1.18, 0);
  group.add(pack);
  const legLeft = new THREE.Group();
  const legRight = new THREE.Group();
  for (const [leg, side] of [[legLeft, 1], [legRight, -1]]) {
    leg.position.set(0, 0.72, side * 0.13);
    leg.add(box(0.16, 0.66, 0.18, materials.suit, 0, -0.33, 0));
    leg.add(box(0.19, 0.11, 0.26, materials.trimCyan, 0.03, -0.66, 0));
    leg.add(box(0.18, 0.035, 0.2, materials.trimCyan, 0.01, -0.48, 0));
    group.add(leg);
  }
  const armLeft = new THREE.Group();
  const armRight = new THREE.Group();
  for (const [arm, side] of [[armLeft, 1], [armRight, -1]]) {
    arm.position.set(0.02, 1.34, side * 0.29);
    arm.add(box(0.13, 0.48, 0.14, materials.suit, 0, -0.23, 0));
    arm.add(box(0.135, 0.035, 0.148, materials.trimCyan, 0, -0.44, 0));
    group.add(arm);
  }
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.48, 32),
    new THREE.MeshBasicMaterial({ color: '#5ff2e3', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.025;
  group.add(marker);
  return { group, legLeft, legRight, armLeft, armRight, head, visor, marker };
}

export function makeCameraModel(materials) {
  const group = new THREE.Group();
  const mount = box(0.3, 0.5, 0.16, materials.darkMetal, 0, 0, 0);
  group.add(mount);
  const arm = box(0.5, 0.1, 0.1, materials.metal, 0.22, 0.18, 0);
  group.add(arm);
  const housing = new THREE.Group();
  housing.position.set(0.5, 0.22, 0);
  const shell = box(0.42, 0.24, 0.24, materials.metal, 0, 0, 0);
  housing.add(shell);
  const lens = cylinder(0.075, 0.075, 0.1, materials.darkMetal, 12);
  lens.rotation.z = Math.PI / 2;
  lens.position.x = 0.24;
  housing.add(lens);
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), new THREE.MeshBasicMaterial({ color: '#ff4d5e' }));
  eye.rotation.y = Math.PI / 2;
  eye.position.x = 0.295;
  housing.add(eye);
  group.add(housing);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff4d5e' }));
  led.position.set(0.18, 0.38, 0);
  group.add(led);
  return { group, housing, eye };
}
