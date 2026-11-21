// Small, allocation-light 2D helpers for the floor plane (x = east, z = south).
// Vision, cover and collision all live in this plane, which keeps the rules readable
// in the same units the level data uses.

export const clamp = (value, low, high) => (value < low ? low : value > high ? high : value);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, value) => (b === a ? 0 : (value - a) / (b - a));

export function wrapAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export function angleDelta(from, to) {
  return wrapAngle(to - from);
}

export function turnToward(from, to, maxStep) {
  const delta = angleDelta(from, to);
  if (Math.abs(delta) <= maxStep) return to;
  return wrapAngle(from + Math.sign(delta) * maxStep);
}

export function distance(ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  return Math.hypot(dx, dz);
}

export function distanceSq(ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  return dx * dx + dz * dz;
}

export function segmentHitsCircle(ax, az, bx, bz, cx, cz, radius) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq === 0) return distanceSq(ax, az, cx, cz) <= radius * radius;
  let t = ((cx - ax) * dx + (cz - az) * dz) / lengthSq;
  t = clamp(t, 0, 1);
  const px = ax + dx * t;
  const pz = az + dz * t;
  return distanceSq(px, pz, cx, cz) <= radius * radius;
}

// Segment against an axis-aligned box (centre x/z, full width/depth). Returns the
// entry parameter in [0,1], or Infinity when the segment misses the box.
export function segmentBoxEntry(ax, az, bx, bz, box) {
  const minX = box.x - box.w / 2;
  const maxX = box.x + box.w / 2;
  const minZ = box.z - box.d / 2;
  const maxZ = box.z + box.d / 2;
  const dx = bx - ax;
  const dz = bz - az;
  let enter = 0;
  let exit = 1;

  if (Math.abs(dx) < 1e-9) {
    if (ax < minX || ax > maxX) return Infinity;
  } else {
    let t1 = (minX - ax) / dx;
    let t2 = (maxX - ax) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    enter = Math.max(enter, t1);
    exit = Math.min(exit, t2);
    if (enter > exit) return Infinity;
  }

  if (Math.abs(dz) < 1e-9) {
    if (az < minZ || az > maxZ) return Infinity;
  } else {
    let t1 = (minZ - az) / dz;
    let t2 = (maxZ - az) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    enter = Math.max(enter, t1);
    exit = Math.min(exit, t2);
    if (enter > exit) return Infinity;
  }

  return enter;
}

export function pointInBox(x, z, box) {
  return Math.abs(x - box.x) <= box.w / 2 && Math.abs(z - box.z) <= box.d / 2;
}

// Push a circle out of a solid box along the shallower axis, so movement slides
// along walls instead of snagging on them.
export function pushCircleOut(x, z, radius, box) {
  const halfW = box.w / 2;
  const halfD = box.d / 2;
  const dx = x - box.x;
  const dz = z - box.z;
  const overlapX = halfW + radius - Math.abs(dx);
  const overlapZ = halfD + radius - Math.abs(dz);
  if (overlapX <= 0 || overlapZ <= 0) return null;
  if (overlapX < overlapZ) {
    return { x: box.x + Math.sign(dx || 1) * (halfW + radius), z };
  }
  return { x, z: box.z + Math.sign(dz || 1) * (halfD + radius) };
}

export function approach(value, target, step) {
  if (value < target) return Math.min(value + step, target);
  if (value > target) return Math.max(value - step, target);
  return value;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
