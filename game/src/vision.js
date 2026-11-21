// Vision geometry: a guard's cone is a fan of rays stopped by walls and cover,
// rebuilt on the floor every frame. The same boxes answer "can this guard see the
// thief" and "is this exit line hidden", so what the light shows is what the rules use.

import { segmentBoxEntry, clamp } from './math2d.js';

export function lineBlocked(ax, az, bx, bz, blockers, minHeight) {
  for (let index = 0; index < blockers.length; index += 1) {
    const blocker = blockers[index];
    if (blocker.h < minHeight) continue;
    if (segmentBoxEntry(ax, az, bx, bz, blocker) < 1) return true;
  }
  return false;
}

export function firstHit(ax, az, dx, dz, range, blockers) {
  let nearest = range;
  const bx = ax + dx * range;
  const bz = az + dz * range;
  for (let index = 0; index < blockers.length; index += 1) {
    const entry = segmentBoxEntry(ax, az, bx, bz, blockers[index]);
    if (entry < 1 && entry < nearest / range) nearest = entry * range;
  }
  return nearest;
}

/**
 * Ray-fan polygon for a cone on the floor. Returns an array of [x, z] points:
 * the apex first, then the arc in order. `rays` is odd so the centre ray is exact.
 */
export function visionPolygon(ax, az, angle, halfAngle, range, blockers, rays = 47) {
  const points = [[ax, az]];
  for (let index = 0; index < rays; index += 1) {
    const t = rays === 1 ? 0.5 : index / (rays - 1);
    const direction = angle - halfAngle + t * halfAngle * 2;
    const dx = Math.cos(direction);
    const dz = Math.sin(direction);
    const hit = firstHit(ax, az, dx, dz, range, blockers);
    points.push([ax + dx * Math.max(0.05, hit - 0.04), az + dz * Math.max(0.05, hit - 0.04)]);
  }
  return points;
}

export function coneGeometryFrom(points) {
  const count = points.length;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = points[index][0];
    positions[index * 3 + 1] = 0;
    positions[index * 3 + 2] = points[index][1];
  }
  const indices = [];
  for (let index = 1; index < count - 1; index += 1) {
    indices.push(0, index, index + 1);
  }
  return { positions, indices };
}

export function edgeGeometryFrom(points) {
  const positions = new Float32Array(points.length * 3);
  for (let index = 0; index < points.length; index += 1) {
    positions[index * 3] = points[index][0];
    positions[index * 3 + 1] = 0.01;
    positions[index * 3 + 2] = points[index][1];
  }
  return positions;
}

export function inShadow(zones, x, z) {
  for (let index = 0; index < zones.length; index += 1) {
    const zone = zones[index];
    if (Math.abs(x - zone.x) <= zone.w / 2 && Math.abs(z - zone.z) <= zone.d / 2) return true;
  }
  return false;
}

export function distanceToBox(x, z, box) {
  const dx = Math.max(Math.abs(x - box.x) - box.w / 2, 0);
  const dz = Math.max(Math.abs(z - box.z) - box.d / 2, 0);
  return Math.hypot(dx, dz);
}

export function fanCoverage(angle, facing, halfAngle) {
  const delta = Math.abs(((facing - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  return clamp(1 - delta / halfAngle, 0, 1);
}
