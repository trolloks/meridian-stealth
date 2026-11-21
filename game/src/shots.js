// The frames behind ?shot=. Each one is the real game: the same level data, models,
// cones and HUD, posed at a chosen moment and then held still for the screenshot.
// No frame is drawn or composited outside the game's own renderer.

const SHOTS = {
  cover: {
    level: 2,
    center: [13.0, 9.4],
    zoom: 1.28,
    taken: [],
    unlocked: false,
    exposure: 0.52,
    tier: 'watch',
    alarm: false,
    player: { x: 13.1, z: 12.8, facing: -Math.PI / 2, crouch: true, walk: 0.55 },
    guards: [
      { x: 8.6, z: 3.2, facing: 0.05, state: 'patrol', awareness: 0 },
      { x: 17.4, z: 13.4, facing: Math.PI, state: 'patrol', awareness: 0 },
      { x: 3.0, z: 8.1, facing: 0.1, state: 'patrol', awareness: 0 },
      { x: 22.8, z: 8.1, facing: Math.PI, state: 'patrol', awareness: 0.1 },
      { x: 11.2, z: 6.55, facing: 1.05, state: 'patrol', awareness: 0.2 },
    ],
    cameras: [
      { facing: 0.95, awareness: 0.15 },
      { facing: 3.55, awareness: 0.1 },
    ],
  },
  gallery: {
    level: 1,
    center: [7.8, 9.0],
    zoom: 1.32,
    taken: [0],
    unlocked: false,
    exposure: 0.44,
    tier: 'watch',
    alarm: false,
    player: { x: 7.2, z: 9.05, facing: -Math.PI / 2, crouch: true, walk: 0.5 },
    guards: [
      { x: 6.4, z: 7.2, facing: 1.32, state: 'suspect', awareness: 0.62 },
      { x: 12.9, z: 9.7, facing: Math.PI - 0.15, state: 'patrol', awareness: 0.08 },
      { x: 18.7, z: 6.2, facing: 2.35, state: 'patrol', awareness: 0 },
      { x: 22.4, z: 12.3, facing: -2.15, state: 'patrol', awareness: 0 },
    ],
    cameras: [{ facing: 1.75, awareness: 0.2 }],
  },
  atrium: {
    level: 0,
    center: [12.7, 8.2],
    zoom: 1.22,
    taken: [0],
    unlocked: false,
    exposure: 0.26,
    tier: 'clear',
    alarm: false,
    player: { x: 13.8, z: 9.6, facing: 0.2, crouch: true, walk: 0.3 },
    guards: [
      { x: 10.5, z: 4.7, facing: 0.1, state: 'patrol', awareness: 0 },
      { x: 18.8, z: 10.6, facing: -2.3, state: 'patrol', awareness: 0.12 },
      { x: 5.5, z: 10.1, facing: 0.35, state: 'patrol', awareness: 0 },
    ],
    cameras: [],
  },
  vault: {
    level: 2,
    center: [13.0, 9.4],
    zoom: 1.28,
    taken: [],
    unlocked: false,
    exposure: 0.52,
    tier: 'watch',
    alarm: false,
    player: { x: 13.1, z: 12.55, facing: -Math.PI / 2, crouch: true, walk: 0.55 },
    guards: [
      { x: 8.6, z: 3.2, facing: 0.05, state: 'patrol', awareness: 0 },
      { x: 17.4, z: 13.4, facing: Math.PI, state: 'patrol', awareness: 0 },
      { x: 3.0, z: 8.1, facing: 0.1, state: 'patrol', awareness: 0 },
      { x: 22.8, z: 8.1, facing: Math.PI, state: 'patrol', awareness: 0.1 },
      { x: 11.2, z: 6.55, facing: 1.05, state: 'patrol', awareness: 0.2 },
    ],
    cameras: [
      { facing: 0.95, awareness: 0.15 },
      { facing: 3.55, awareness: 0.1 },
    ],
  },
  alert: {
    level: 2,
    center: [13.2, 9.7],
    zoom: 1.3,
    taken: [1],
    unlocked: false,
    exposure: 0.9,
    tier: 'spot',
    alarm: true,
    player: { x: 13.9, z: 10.35, facing: -2.4, crouch: true, walk: 0.2 },
    guards: [
      { x: 17.0, z: 4.6, facing: 2.4, state: 'alarm', awareness: 1 },
      { x: 16.2, z: 13.0, facing: -2.15, state: 'alarm', awareness: 1 },
      { x: 10.1, z: 11.5, facing: 0.05, state: 'alarm', awareness: 1 },
      { x: 22.8, z: 11.0, facing: -1.2, state: 'patrol', awareness: 0.2 },
      { x: 15.7, z: 7.0, facing: 2.1, state: 'alarm', awareness: 1 },
    ],
    cameras: [
      { facing: 0.7, awareness: 0.65 },
      { facing: 3.6, awareness: 0.55 },
    ],
  },
};

export const SHOT_NAMES = Object.keys(SHOTS);

export function stageShot(name, game) {
  const shot = SHOTS[name] ?? SHOTS.cover;
  game.loadLevel(shot.level);
  const { level, player, guards, cameras } = game;

  player.position.x = shot.player.x;
  player.position.z = shot.player.z;
  player.facing = shot.player.facing;
  player.crouching = Boolean(shot.player.crouch);
  player.crouchAmount = shot.player.crouch ? 0.7 : 1;
  player.speed = shot.player.walk ?? 0;
  player.stepPhase = 1.1;
  player.group.position.set(player.position.x, 0, player.position.z);
  player.group.rotation.y = -player.facing;
  player.group.scale.set(1.08, player.crouchAmount * 1.08, 1.08);
  const swing = Math.sin(player.stepPhase) * 0.5;
  player.model.legLeft.rotation.z = swing;
  player.model.legRight.rotation.z = -swing;
  player.model.armLeft.rotation.z = -swing * 0.7;
  player.model.armRight.rotation.z = swing * 0.7;

  for (const index of shot.taken) level.takeRelic(level.relics[index]);
  level.setExitUnlocked(shot.unlocked);

  shot.guards.forEach((pose, index) => {
    const guard = guards[index];
    if (!guard) return;
    guard.position.x = pose.x;
    guard.position.z = pose.z;
    guard.facing = pose.facing;
    guard.state = pose.state;
    guard.awareness = pose.awareness;
    guard.moveSpeed = pose.state === 'alarm' ? 3 : 0.8;
    guard.stepPhase = 1.4 + index;
    guard.alarmTimer = pose.state === 'alarm' ? 6 : 0;
    guard.group.position.set(pose.x, 0, pose.z);
    guard.group.rotation.y = -pose.facing;
    guard.model.legLeft.rotation.z = 0.45;
    guard.model.legRight.rotation.z = -0.45;
    guard.model.armLeft.rotation.z = -0.35;
    guard.model.armRight.rotation.z = 0.35;
    guard.query.visible = pose.awareness > 0.3 && pose.state !== 'alarm';
    guard.alarm.visible = pose.state === 'alarm';
    guard.paintCone();
  });

  shot.cameras.forEach((pose, index) => {
    const camera = cameras[index];
    if (!camera) return;
    camera.facing = pose.facing;
    camera.awareness = pose.awareness;
    camera.group.rotation.y = -pose.facing;
    camera.paint();
  });

  for (const relic of level.relics) {
    if (relic.collected) continue;
    relic.haloGroup.rotation.y = 0.5;
    relic.gem.rotation.y = 0.4;
  }

  return {
    center: shot.center,
    zoom: shot.zoom,
    exposure: shot.exposure,
    tier: shot.tier,
    alarm: shot.alarm,
    taken: shot.taken.length,
    total: level.data.relics.length,
    unlocked: shot.unlocked,
  };
}
