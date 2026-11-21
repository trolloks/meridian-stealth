// Assembles one heist from its data: floor and inlay, walls, cover, relics, exit,
// lamps and the moon. It also owns the collision and sight queries the actors use,
// so a level is the single place where geometry turns into rules.

import * as THREE from '../vendor/three.module.min.js';
import { makeCover, makeExit, makeLamp, makeRelic, makeShadow, makeWall } from './models.js';
import { artTexture } from './materials.js';
import { distanceToBox, inShadow, lineBlocked } from './vision.js';
import { clamp, pushCircleOut } from './math2d.js';

function floorFor(data, materials) {
  const material = materials.floor.clone();
  material.map = materials.floor.map.clone();
  material.map.needsUpdate = true;
  material.map.repeat.set(data.size.w / 3.6, data.size.d / 3.6);
  material.map.wrapS = THREE.RepeatWrapping;
  material.map.wrapT = THREE.RepeatWrapping;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(data.size.w, data.size.d), material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(data.size.w / 2, 0, data.size.d / 2);
  floor.receiveShadow = true;
  return floor;
}

function wallArtFor(data, materials, group) {
  const textures = [artTexture(1), artTexture(2), artTexture(3)];
  const paintingMaterial = (index) => new THREE.MeshStandardMaterial({
    map: textures[index % textures.length],
    roughness: 0.72,
    metalness: 0.02,
    emissive: '#101a1c',
    emissiveIntensity: 0.35,
  });
  const hang = (x, z, rotation, index, scale = 1) => {
    const frame = new THREE.Group();
    const backing = new THREE.Mesh(new THREE.BoxGeometry(2.6 * scale, 1.8 * scale, 0.1), materials.darkMetal);
    backing.castShadow = true;
    frame.add(backing);
    const edgeTop = new THREE.Mesh(new THREE.BoxGeometry(2.7 * scale, 0.07, 0.12), materials.brass);
    edgeTop.position.y = 0.9 * scale;
    frame.add(edgeTop);
    const edgeBottom = edgeTop.clone();
    edgeBottom.position.y = -0.9 * scale;
    frame.add(edgeBottom);
    const painting = new THREE.Mesh(new THREE.PlaneGeometry(2.25 * scale, 1.45 * scale), paintingMaterial(index));
    painting.position.z = 0.06;
    frame.add(painting);
    frame.position.set(x, 1.85, z);
    frame.rotation.y = rotation;
    group.add(frame);
  };
  const w = data.size.w;
  const north = [w * 0.17, w * 0.5, w * 0.83];
  north.forEach((x, index) => hang(x, 0.08, 0, index));
  hang(0.08, data.size.d * 0.34, Math.PI / 2, 2);
  hang(w - 0.08, data.size.d * 0.64, -Math.PI / 2, 1);
}

function inlayFor(data, materials, group) {
  const centerX = data.size.w / 2;
  const centerZ = data.size.d / 2;
  if (data.id === 'atrium') {
    for (const [radius, color, opacity] of [[2.6, materials.brass, 0.8], [2.78, materials.cyan, 0.35], [3.4, materials.brass, 0.45]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.05, 80), color.clone());
      ring.material.transparent = true;
      ring.material.opacity = opacity;
      ring.material.depthWrite = false;
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(centerX, 0.012, centerZ);
      group.add(ring);
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.55, 64), new THREE.MeshStandardMaterial({
      color: '#10232a', roughness: 0.55, metalness: 0.2, transparent: true, opacity: 0.65,
    }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(centerX, 0.011, centerZ);
    group.add(disc);
  } else if (data.id === 'gallery') {
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5.2), materials.carpet);
    runner.rotation.x = -Math.PI / 2;
    runner.position.set(centerX, 0.012, centerZ);
    runner.receiveShadow = true;
    group.add(runner);
    for (const [x, z] of [[4, 12.4], [22, 12.4]]) {
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.6), materials.carpet);
      mat.rotation.x = -Math.PI / 2;
      mat.position.set(x, 0.012, z);
      mat.receiveShadow = true;
      group.add(mat);
    }
  } else {
    const sigil = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.22, 6), materials.cyan.clone());
    sigil.material.transparent = true;
    sigil.material.opacity = 0.5;
    sigil.material.depthWrite = false;
    sigil.rotation.x = -Math.PI / 2;
    sigil.position.set(centerX, 0.013, centerZ);
    group.add(sigil);
    const inner = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.4, 6), materials.amber.clone());
    inner.material.transparent = true;
    inner.material.opacity = 0.55;
    inner.material.depthWrite = false;
    inner.rotation.x = -Math.PI / 2;
    inner.rotation.z = Math.PI / 6;
    inner.position.set(centerX, 0.013, centerZ);
    group.add(inner);
  }
}

function dustFor(data) {
  const count = 260;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = Math.random() * data.size.w;
    positions[index * 3 + 1] = 0.3 + Math.random() * 3.2;
    positions[index * 3 + 2] = Math.random() * data.size.d;
    speeds[index] = 0.02 + Math.random() * 0.08;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: '#bfe8e4',
    size: 0.035,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.userData.speeds = speeds;
  return points;
}

export function createLevel(scene, data, materials) {
  const group = new THREE.Group();
  const solids = [];
  const blockers = [];

  scene.background = new THREE.Color(data.sky.bottom);
  scene.fog = new THREE.Fog(data.sky.fog, 34, 86);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 70),
    new THREE.MeshStandardMaterial({ color: '#041016', roughness: 0.96, metalness: 0.02 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(data.size.w / 2, -0.06, data.size.d / 2);
  ground.receiveShadow = true;
  group.add(ground);

  group.add(floorFor(data, materials));
  inlayFor(data, materials, group);
  wallArtFor(data, materials, group);

  for (const wall of data.walls) {
    group.add(makeWall(wall, materials));
    solids.push({ ...wall, type: 'wall' });
    blockers.push(wall);
  }
  for (const cover of data.covers) {
    group.add(makeCover(cover, materials));
    solids.push({ ...cover, type: 'cover' });
    blockers.push(cover);
  }
  for (const shadow of data.shadows) group.add(makeShadow(shadow));
  for (const lamp of data.lamps) group.add(makeLamp(lamp, materials));

  const relics = data.relics.map((definition) => {
    const relic = makeRelic(definition, materials);
    group.add(relic.group);
    const plinth = { x: definition.x, z: definition.z, w: 1.1, d: 1.1, h: 1.0 };
    solids.push({ ...plinth, type: 'plinth' });
    blockers.push(plinth);
    return relic;
  });

  const exit = makeExit(data.exit, materials);
  group.add(exit.group);

  const dust = dustFor(data);
  group.add(dust);

  const ambient = new THREE.AmbientLight(data.ambient.color, data.ambient.intensity * 2.3);
  scene.add(ambient);
  const hemisphere = new THREE.HemisphereLight(data.sky.top, '#041016', 1.35);
  scene.add(hemisphere);
  const fill = new THREE.DirectionalLight('#a9d7e2', 1.3);
  fill.position.set(data.size.w / 2 - 4, 11, data.size.d + 18);
  fill.target.position.set(data.size.w / 2, 0, data.size.d / 2);
  scene.add(fill);
  scene.add(fill.target);
  const moon = new THREE.DirectionalLight(data.moon.color, data.moon.intensity * 1.55);
  moon.position.set(data.size.w / 2 + data.moon.x, data.moon.y, data.size.d / 2 + data.moon.z);
  moon.target.position.set(data.size.w / 2, 0, data.size.d / 2);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -data.size.w / 2 - 3;
  moon.shadow.camera.right = data.size.w / 2 + 3;
  moon.shadow.camera.top = data.size.d / 2 + 3;
  moon.shadow.camera.bottom = -data.size.d / 2 - 3;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 60;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.02;
  scene.add(moon);
  scene.add(moon.target);

  scene.add(group);

  let clock = 0;
  const scratch = { x: 0, z: 0 };
  const level = {
    data,
    group,
    solids,
    blockers,
    relics,
    exit,
    dust,
    lights: [ambient, hemisphere, fill, moon],
    bounds: { minX: 0.45, maxX: data.size.w - 0.45, minZ: 0.45, maxZ: data.size.d - 0.45 },

    update(dt) {
      clock += dt;
      relics.forEach((relic, index) => {
        if (relic.collected) return;
        relic.haloGroup.rotation.y += dt * (relic.main ? 1.4 : 0.8);
        relic.gem.rotation.y += dt * 1.1;
        relic.gem.position.y += Math.sin(clock * 2 + index) * dt * 0.05;
        relic.halo.rotation.z += dt * 0.6;
      });
      const attribute = dust.geometry.getAttribute('position');
      const speeds = dust.userData.speeds;
      for (let index = 0; index < attribute.count; index += 1) {
        let y = attribute.getY(index) + speeds[index] * dt;
        if (y > 3.8) y = 0.2;
        attribute.setY(index, y);
        attribute.setX(index, attribute.getX(index) + Math.sin(clock * 0.3 + index) * dt * 0.02);
      }
      attribute.needsUpdate = true;
      exit.arrow.position.y = 3.2 + Math.sin(clock * 2.2) * 0.08;
      exit.ring.scale.setScalar(1 + Math.sin(clock * 2.6) * 0.03);
    },

    setExitUnlocked(unlocked) {
      const color = unlocked ? '#68ffb0' : '#ff7788';
      const emissive = unlocked ? '#22e07c' : '#ff3048';
      exit.padMaterial.color.set(color);
      exit.padMaterial.emissive.set(emissive);
      exit.panelMaterial.color.set(color);
      exit.panelMaterial.emissive.set(emissive);
      exit.arrowMaterial.color.set(color);
      exit.arrowMaterial.emissive.set(emissive);
      exit.signMaterial.color.set(color);
    },

    // Move a circle with sliding, clamping it inside the gallery.
    moveCircle(x, z, radius, dx, dz) {
      let nx = clamp(x + dx, level.bounds.minX + radius, level.bounds.maxX - radius);
      let nz = clamp(z + dz, level.bounds.minZ + radius, level.bounds.maxZ - radius);
      for (let pass = 0; pass < 3; pass += 1) {
        for (let index = 0; index < solids.length; index += 1) {
          const solid = solids[index];
          if (nx > solid.x - solid.w / 2 - radius && nx < solid.x + solid.w / 2 + radius
            && nz > solid.z - solid.d / 2 - radius && nz < solid.z + solid.d / 2 + radius) {
            const pushed = pushCircleOut(nx, nz, radius, solid);
            if (pushed) {
              nx = pushed.x;
              nz = pushed.z;
            }
          }
        }
      }
      scratch.x = nx;
      scratch.z = nz;
      return scratch;
    },

    collides(x, z, radius) {
      for (let index = 0; index < solids.length; index += 1) {
        const solid = solids[index];
        if (x > solid.x - solid.w / 2 - radius && x < solid.x + solid.w / 2 + radius
          && z > solid.z - solid.d / 2 - radius && z < solid.z + solid.d / 2 + radius) return true;
      }
      return false;
    },

    blockedSight(ax, az, bx, bz, minHeight) {
      return lineBlocked(ax, az, bx, bz, blockers, minHeight);
    },

    inShadow(x, z) {
      return inShadow(data.shadows, x, z);
    },

    isConcealed(x, z, crouching) {
      if (inShadow(data.shadows, x, z)) return true;
      const minHeight = crouching ? 1.0 : 2.0;
      for (let index = 0; index < solids.length; index += 1) {
        const solid = solids[index];
        if (solid.h >= minHeight && distanceToBox(x, z, solid) < 0.7) return true;
      }
      return false;
    },

    inExit(x, z) {
      return Math.hypot(x - data.exit.x, z - data.exit.z) < 1.15;
    },

    relicNear(x, z, distance = 1.25) {
      for (const relic of relics) {
        if (relic.collected) continue;
        if (Math.hypot(x - relic.group.position.x, z - relic.group.position.z) <= distance) return relic;
      }
      return null;
    },

    takeRelic(relic) {
      relic.collected = true;
      relic.group.visible = false;
    },

    dispose() {
      scene.remove(group);
      scene.remove(ambient);
      scene.remove(hemisphere);
      scene.remove(fill);
      fill.target.removeFromParent();
      scene.remove(moon);
      moon.target.removeFromParent();
      group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
      });
      dust.geometry.dispose();
    },
  };
  return level;
}
