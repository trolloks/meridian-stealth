// Guards and security cameras: patrol, hearing, a cone that is stopped by cover,
// suspicion that grows into an alarm, a search where the thief was last seen, and
// then a walk back to the round. Cameras sweep instead of walking.

import * as THREE from '../vendor/three.module.min.js';
import { makeCameraModel, makeGuardModel } from './models.js';
import { GUARD, DETECTION } from './config.js';
import { angleDelta, clamp, distance, turnToward } from './math2d.js';
import { visionPolygon } from './vision.js';import { iconTexture } from './materials.js';

const CONE_RAYS = 45;
const queryTexture = iconTexture('?', '#ffb24d');
const alarmTexture = iconTexture('!', '#ff4d5e');

function makeCone(range, color, opacity, y = 0.03) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((CONE_RAYS + 1) * 3), 3));
  const indices = [];
  for (let index = 1; index < CONE_RAYS; index += 1) indices.push(0, index, index + 1);
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = y;
  mesh.renderOrder = 2;

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((CONE_RAYS + 2) * 3), 3));
  const edgeMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
  const edge = new THREE.Line(edgeGeometry, edgeMaterial);
  edge.position.y = y + 0.005;
  edge.renderOrder = 3;
  return { mesh, edge, range };
}

function writeCone(cone, points, blockers, reach) {
  const positions = cone.mesh.geometry.getAttribute('position');
  const edgePositions = cone.edge.geometry.getAttribute('position');
  const count = points.length;
  for (let index = 0; index < count && index < CONE_RAYS + 1; index += 1) {
    positions.setXYZ(index, points[index][0], 0, points[index][1]);
    edgePositions.setXYZ(index, points[index][0], 0.004, points[index][1]);
  }
  edgePositions.setXYZ(count, points[0][0], 0.004, points[0][1]);
  positions.needsUpdate = true;
  edgePositions.needsUpdate = true;
  cone.mesh.geometry.computeBoundingSphere();
  cone.edge.geometry.computeBoundingSphere();
  cone.mesh.visible = reach > 0;
  cone.edge.visible = reach > 0;
}

function makeQuerySprite() {
  const material = new THREE.SpriteMaterial({ map: queryTexture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.55, 0.55, 0.55);
  sprite.visible = false;
  return sprite;
}

function makeAlarmSprite() {
  const material = new THREE.SpriteMaterial({ map: alarmTexture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.6, 0.6, 0.6);
  sprite.visible = false;
  return sprite;
}

export class Guard {
  constructor(level, definition, scene, materials, index) {
    this.level = level;
    this.definition = definition;
    this.kind = definition.kind ?? 'guard';
    this.points = definition.path;
    this.wait = definition.wait ?? 0.8;
    this.range = definition.range ?? GUARD.range;
    this.fov = definition.fov ?? GUARD.fov;
    this.position = { x: this.points[0][0], z: this.points[0][1] };
    this.target = 1;
    this.direction = 1;
    this.waitTimer = 0;
    this.state = 'patrol';
    this.awareness = 0;
    this.lastSeen = null;
    this.alarmTimer = 0;
    this.searchTimer = 0;
    this.investigateTimer = 0;
    this.phase = index * 1.7;
    this.stepPhase = 0;
    this.moveSpeed = 0;
    this.onAlarm = null;
    this.model = makeGuardModel(materials);
    this.group = this.model.group;
    this.group.scale.setScalar(1.12);
    this.group.position.set(this.position.x, 0, this.position.z);
    scene.add(this.group);
    this.facing = Math.atan2(this.points[1][1] - this.position.z, this.points[1][0] - this.position.x);
    this.group.rotation.y = -this.facing;
    this.cone = makeCone(this.range, '#ffb24d', 0.14);
    scene.add(this.cone.mesh, this.cone.edge);
    this.query = makeQuerySprite();
    this.query.position.set(0, 2.42, 0);
    this.group.add(this.query);
    this.alarm = makeAlarmSprite();
    this.alarm.position.set(0, 2.42, 0);
    this.group.add(this.alarm);
    this.flashlight = new THREE.SpotLight('#fff0c9', 26, 9, this.fov * 0.62, 0.55, 1.6);
    this.flashlight.position.set(0, 1.55, 0);
    this.flashlight.target.position.set(60, 0, 0);
    this.group.add(this.flashlight, this.flashlight.target);
  }

  setAlarm() {
    if (this.state !== 'alarm') {
      this.state = 'alarm';
      this.awareness = 1;
      this.alarmTimer = GUARD.alarmMemory;
      if (this.onAlarm) this.onAlarm(this);
    }
  }

  sees(player) {
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const range = distance(this.position.x, this.position.z, player.position.x, player.position.z);
    if (range > this.range) return 0;
    const bearing = Math.atan2(dz, dx);
    if (Math.abs(angleDelta(this.facing, bearing)) > this.fov / 2) return 0;
    const minHeight = player.crouching ? 1.0 : 2.0;
    if (this.level.blockedSight(this.position.x, this.position.z, player.position.x, player.position.z, minHeight)) return 0;
    let gain = this.kind === 'camera' ? GUARD.cameraGain : GUARD.visionGain;
    gain *= 1 - DETECTION.distanceFalloff * (range / this.range);
    if (player.crouching) gain *= DETECTION.crouchFactor;
    if (this.level.inShadow(player.position.x, player.position.z)) gain *= DETECTION.shadowFactor;
    return gain;
  }

  update(dt, player) {
    const seen = this.sees(player);
    if (seen > 0) {
      this.awareness = clamp(this.awareness + seen * dt, 0, 1);
      this.lastSeen = { x: player.position.x, z: player.position.z };
      if (this.awareness >= GUARD.alarmAt) this.setAlarm();
      else if (this.awareness > GUARD.suspectAt && this.state === 'patrol') this.state = 'suspect';
    } else {
      this.awareness = clamp(this.awareness - GUARD.decay * dt, 0, 1);
      if (this.state === 'suspect' && this.awareness < GUARD.suspectAt * 0.7) {
        this.state = 'patrol';
        this.waitTimer = 0;
      }
    }

    if (seen <= 0 && player.noise > 0) {
      const heard = distance(this.position.x, this.position.z, player.position.x, player.position.z);
      if (heard < 3.4) {
        this.awareness = clamp(this.awareness + 0.3 * dt, 0, 1);
        this.lastSeen = { x: player.position.x, z: player.position.z };
        if (this.state === 'patrol' && this.awareness > GUARD.suspectAt) this.state = 'suspect';
      }
    }

    const moving = this.moveSpeed > 0.05;
    this.stepPhase += this.moveSpeed * dt * 3.6;
    if (this.state === 'suspect') {
      this.faceToward(this.lastSeen, dt, 1.1);
      this.moveSpeed = 0;
    } else if (this.state === 'alarm') {
      this.alarmTimer -= dt;
      if (this.lastSeen) {
        const travelled = distance(this.position.x, this.position.z, this.lastSeen.x, this.lastSeen.z);
        if (travelled > 0.5) this.walkToward(this.lastSeen.x, this.lastSeen.z, GUARD.chaseSpeed, dt);
        else {
          this.state = 'search';
          this.searchTimer = GUARD.searchTime;
        }
      }
      if (this.alarmTimer <= 0) this.state = 'return';
    } else if (this.state === 'investigate') {
      this.investigateTimer -= dt;
      if (this.lastSeen && distance(this.position.x, this.position.z, this.lastSeen.x, this.lastSeen.z) > 0.5) {
        this.walkToward(this.lastSeen.x, this.lastSeen.z, GUARD.patrolSpeed * 1.6, dt);
      } else {
        this.state = 'search';
        this.searchTimer = GUARD.searchTime;
      }
      if (this.investigateTimer <= 0) this.state = 'return';
    } else if (this.state === 'search') {
      this.searchTimer -= dt;
      this.facing = turnToward(this.facing, this.facing + Math.sin(this.phase + this.searchTimer * 2.2) * 0.9, 2.4 * dt);
      this.moveSpeed = 0;
      if (this.searchTimer <= 0) this.state = 'return';
    } else if (this.state === 'return') {
      const point = this.points[this.nearestPoint()];
      if (distance(this.position.x, this.position.z, point[0], point[1]) < 0.3) {
        this.state = 'patrol';
        this.target = this.nearestPoint();
        this.waitTimer = 0;
      } else {
        this.walkToward(point[0], point[1], GUARD.patrolSpeed * 1.25, dt);
      }
    } else {
      this.patrol(dt);
    }

    this.group.position.set(this.position.x, moving ? Math.abs(Math.sin(this.stepPhase)) * 0.035 : 0, this.position.z);
    this.group.rotation.y = -this.facing;
    const swing = Math.sin(this.stepPhase) * (moving ? 0.55 : 0.04);
    this.model.legLeft.rotation.z = swing;
    this.model.legRight.rotation.z = -swing;
    this.model.armLeft.rotation.z = -swing * 0.7;
    this.model.armRight.rotation.z = swing * 0.7;
    this.flashlight.intensity = this.state === 'alarm' ? 38 : 26;
    this.flashlight.color.set(this.state === 'alarm' ? '#ff9a8a' : '#fff0c9');

    this.query.visible = this.awareness > GUARD.suspectAt && this.state !== 'alarm';
    this.alarm.visible = this.state === 'alarm' || this.state === 'search';
    this.paintCone();
  }

  nearestPoint() {
    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < this.points.length; index += 1) {
      const d = distance(this.position.x, this.position.z, this.points[index][0], this.points[index][1]);
      if (d < bestDistance) {
        bestDistance = d;
        best = index;
      }
    }
    return best;
  }

  patrol(dt) {
    const point = this.points[this.target];
    if (!point) return;
    if (distance(this.position.x, this.position.z, point[0], point[1]) < 0.12) {
      this.moveSpeed = 0;
      this.waitTimer += dt;
      if (this.waitTimer >= this.wait) {
        this.waitTimer = 0;
        if (this.target === this.points.length - 1) this.direction = -1;
        else if (this.target === 0) this.direction = 1;
        this.target += this.direction;
        this.target = clamp(this.target, 0, this.points.length - 1);
      }
      return;
    }
    this.walkToward(point[0], point[1], GUARD.patrolSpeed, dt);
  }

  walkToward(x, z, speed, dt) {
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-5) return;
    const step = Math.min(length, speed * dt);
    const moved = this.level.moveCircle(this.position.x, this.position.z, 0.36, (dx / length) * step, (dz / length) * step);
    this.position.x = moved.x;
    this.position.z = moved.z;
    this.moveSpeed = step / Math.max(dt, 1e-5);
    const wanted = Math.atan2(dz, dx);
    this.facing = turnToward(this.facing, wanted, GUARD.turnRate * dt);
  }

  faceToward(point, dt, rate = 1) {
    if (!point) return;
    const wanted = Math.atan2(point.z - this.position.z, point.x - this.position.x);
    this.facing = turnToward(this.facing, wanted, GUARD.turnRate * rate * dt);
  }

  paintCone() {
    const points = visionPolygon(this.position.x, this.position.z, this.facing, this.fov / 2, this.range, this.level.blockers, CONE_RAYS);
    writeCone(this.cone, points, this.level.blockers, this.range);
    const color = this.state === 'alarm' ? '#ff2d45' : this.awareness > GUARD.suspectAt ? '#ff7a1a' : '#ff9f3d';
    this.cone.mesh.material.color.set(color);
    this.cone.edge.material.color.set(color);
    this.cone.mesh.material.opacity = this.state === 'alarm' ? 0.44 : this.awareness > GUARD.suspectAt ? 0.34 : 0.26;
  }

  dispose(scene) {
    scene.remove(this.group);
    scene.remove(this.cone.mesh);
    scene.remove(this.cone.edge);
    this.cone.mesh.geometry.dispose();
    this.cone.mesh.material.dispose();
    this.cone.edge.geometry.dispose();
    this.cone.edge.material.dispose();
  }
}

export class SecurityCamera {
  constructor(level, definition, scene, materials, index) {
    this.level = level;
    this.definition = definition;
    this.kind = 'camera';
    this.position = { x: definition.x, z: definition.z };
    this.baseAngle = definition.angle;
    this.sweep = definition.sweep ?? 0.8;
    this.range = definition.range ?? GUARD.cameraRange;
    this.fov = definition.fov ?? GUARD.cameraFov;
    this.period = definition.period ?? 7;
    this.phase = definition.phase ?? index * 1.4;
    this.elapsed = this.phase;
    this.facing = this.baseAngle;
    this.awareness = 0;
    this.state = 'sweep';
    this.onAlarm = null;
    this.model = makeCameraModel(materials, materials);
    this.group = this.model.group;
    this.group.scale.setScalar(1.1);
    this.group.position.set(this.position.x, 2.3, this.position.z);
    scene.add(this.group);
    this.cone = makeCone(this.range, '#ff4d5e', 0.13, 0.05);
    scene.add(this.cone.mesh, this.cone.edge);
    this.total = 0;
  }

  sees(player) {
    const range = distance(this.position.x, this.position.z, player.position.x, player.position.z);
    if (range > this.range) return 0;
    const bearing = Math.atan2(player.position.z - this.position.z, player.position.x - this.position.x);
    if (Math.abs(angleDelta(this.facing, bearing)) > this.fov / 2) return 0;
    if (this.level.blockedSight(this.position.x, this.position.z, player.position.x, player.position.z, 2.0)) return 0;
    let gain = GUARD.cameraGain * (1 - 0.4 * (range / this.range));
    if (player.crouching) gain *= 0.75;
    if (this.level.inShadow(player.position.x, player.position.z)) gain *= 0.7;
    return gain;
  }

  update(dt, player) {
    this.elapsed += dt;
    this.facing = this.baseAngle + Math.sin((this.elapsed / this.period) * Math.PI * 2 + this.phase) * this.sweep;
    this.group.rotation.y = -this.facing;
    const seen = this.sees(player);
    if (seen > 0) {
      this.awareness = clamp(this.awareness + seen * dt, 0, 1.2);
      if (this.awareness >= 1) {
        this.awareness = 0;
        if (this.onAlarm) this.onAlarm(this);
      }
    } else {
      this.awareness = clamp(this.awareness - 0.65 * dt, 0, 1);
    }
    this.paint();
  }

  paint() {
    const points = visionPolygon(this.position.x, this.position.z, this.facing, this.fov / 2, this.range, this.level.blockers, CONE_RAYS);
    writeCone(this.cone, points, this.level.blockers, this.range);
    this.cone.mesh.material.color.set(this.awareness > 0.35 ? '#ff7a1a' : '#ff4d5e');
    this.cone.edge.material.color.set(this.awareness > 0.35 ? '#ff7a1a' : '#ff4d5e');
    this.cone.mesh.material.opacity = 0.22 + this.awareness * 0.16;
  }

  dispose(scene) {
    scene.remove(this.group);
    scene.remove(this.cone.mesh);
    scene.remove(this.cone.edge);
    this.cone.mesh.geometry.dispose();
    this.cone.mesh.material.dispose();
    this.cone.edge.geometry.dispose();
    this.cone.edge.material.dispose();
  }
}
