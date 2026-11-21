// Boot, input, the fixed-step game loop and the screen flow (title → approach →
// heist → wing clear / caught → victory). The world is rebuilt for each wing, so a
// retry is a clean museum rather than a patched-up one.

import * as THREE from '../vendor/three.module.min.js';
import { LEVELS } from './level-data.js';
import { SCORE, STEP } from './config.js';
import { createHud } from './hud.js';
import { AudioEngine } from './audio.js';
import { ViewCamera } from './camera.js';
import { makeMaterials } from './materials.js';
import { createLevel } from './level.js';
import { Player } from './player.js';
import { Guard, SecurityCamera } from './guard.js';
import { Footprints, ShardBursts } from './effects.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const materials = makeMaterials();
const view = new ViewCamera();
const hud = createHud();
const audio = new AudioEngine();
const footprints = new Footprints(scene, 18);
const bursts = new ShardBursts(scene);
const ghost = { position: { x: -60, z: -60 }, crouching: false, noise: 0, speed: 0, facing: 0 };

let level = null;
let player = null;
let guards = [];
let cameras = [];
let levelIndex = 0;
let mode = 'title';
let levelTime = 0;
let totalTime = 0;
let levelAlarms = 0;
let totalAlarms = 0;
let alarmAt = -99;
let exposure = 0;
let accumulator = 0;
let suspectCooldown = 0;
let stepTimer = 0;
let minimapTimer = 0;
let last = performance.now();

const keys = Object.create(null);
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

function levelCenter() {
  return { x: LEVELS[levelIndex].size.w / 2, z: LEVELS[levelIndex].size.d / 2 };
}

function hidePlayer() {
  if (player) player.group.visible = false;
}

function disposeWorld() {
  if (player) player.dispose(scene);
  for (const guard of guards) guard.dispose(scene);
  for (const camera of cameras) camera.dispose(scene);
  if (level) level.dispose();
  player = null;
  guards = [];
  cameras = [];
  level = null;
}

function loadLevel(index) {
  disposeWorld();
  levelIndex = index;
  level = createLevel(scene, LEVELS[index], materials);
  player = new Player(level, scene, materials);
  guards = LEVELS[index].guards.map((definition, guardIndex) => {
    const guard = new Guard(level, definition, scene, materials, guardIndex);
    guard.onAlarm = registerGuardAlarm;
    return guard;
  });
  cameras = LEVELS[index].cameras.map((definition, cameraIndex) => {
    const camera = new SecurityCamera(level, definition, scene, materials, cameraIndex);
    camera.onAlarm = registerCameraAlarm;
    return camera;
  });
  level.setExitUnlocked(false);
  levelTime = 0;
  levelAlarms = 0;
  exposure = 0;
  stepTimer = 0;
  accumulator = 0;
  hud.setLevel(level.data, index);
  hud.setExposure(0, 'clear');
  hud.setAlarm(false);
  const center = levelCenter();
  view.focus(center.x, center.z, 1.22, window.innerWidth / window.innerHeight);
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function rankFor(seconds, alarms) {
  if (alarms === 0 && seconds < SCORE.timeParPerLevel * 1.25) return 'S';
  if (alarms <= 1 && seconds < SCORE.timeParPerLevel * 1.8) return 'A';
  if (alarms <= 3) return 'B';
  return 'C';
}

function registerAlarm() {
  if (levelTime - alarmAt > 1.2) {
    levelAlarms += 1;
    totalAlarms += 1;
    alarmAt = levelTime;
  }
}

function registerGuardAlarm(guard) {
  registerAlarm();
  audio.alarm();
  view.shake = 0.32;
  hud.toast('ALARM RAISED · BREAK LINE OF SIGHT', 2.8);
  hud.announce('Alarm raised. Break line of sight.');
  for (const other of guards) {
    if (other === guard) continue;
    if (Math.hypot(other.position.x - guard.position.x, other.position.z - guard.position.z) > 9.5) continue;
    other.lastSeen = guard.lastSeen;
    other.state = 'alarm';
    other.awareness = 1;
    other.alarmTimer = 6.5;
    other.alarm.visible = true;
    other.paintCone();
  }
}

function registerCameraAlarm(camera) {
  registerAlarm();
  audio.alarm();
  view.shake = 0.26;
  hud.toast('CAMERA TRIPPED · THE GUARDS ARE COMING', 2.8);
  const nearest = [...guards].sort((a, b) => (
    Math.hypot(a.position.x - camera.position.x, a.position.z - camera.position.z)
    - Math.hypot(b.position.x - camera.position.x, b.position.z - camera.position.z)
  ));
  for (const guard of nearest.slice(0, 2)) {
    guard.setAlarm();
    guard.lastSeen = { x: player.position.x, z: player.position.z };
  }
}

function collectRelic(relic) {
  level.takeRelic(relic);
  bursts.burst(relic.group.position.x, 1.5, relic.group.position.z, relic.main, relic.main ? 1.4 : 1);
  audio.pickup(relic.main);
  const taken = level.relics.filter((item) => item.collected).length;
  const total = level.relics.length;
  hud.setRelics(taken, total);
  if (taken >= total) {
    level.setExitUnlocked(true);
    audio.unlock();
    hud.toast('ALL PIECES TAKEN · THE EXIT SEAL IS OPEN', 3.2);
    hud.announce('All pieces taken. The exit is unlocked.');
  } else {
    hud.toast(`${relic.name.toUpperCase()} SECURED`, 2.2);
    hud.announce(`${relic.name} secured. ${total - taken} pieces left.`);
  }
}

function completeLevel() {
  const seconds = levelTime;
  totalTime += seconds;
  const taken = level.relics.filter((relic) => relic.collected).length;
  const stats = {
    time: formatTime(seconds),
    relics: taken,
    total: level.relics.length,
    alarms: levelAlarms,
    rank: rankFor(seconds, levelAlarms),
  };
  if (levelIndex < LEVELS.length - 1) {
    mode = 'clear';
    hud.setStats('clear', stats);
    hud.setScreen('clear');
    hud.announce(`Wing clear. ${stats.time}. Rank ${stats.rank}.`);
  } else {
    mode = 'victory';
    hud.setStats('victory', {
      time: formatTime(totalTime),
      relics: 9,
      total: 9,
      alarms: totalAlarms,
      rank: rankFor(totalTime, totalAlarms),
    });
    hud.setScreen('victory');
    hud.announce('The Aurora Prism is out. Heist complete.');
  }
}

function getCaught() {
  if (mode !== 'play') return;
  mode = 'caught';
  audio.caught();
  view.shake = 0.4;
  hud.setCaughtText([
    'A guard’s torch found you. The museum remembers every step.',
    'The alarm closed like a door. Try the wing from the top.',
    'You were seen in the light. The night guard was patient.',
  ][Math.floor(Math.random() * 3)]);
  hud.setScreen('caught');
  hud.announce('Caught. Try the wing again.');
}

function tryInteract() {
  if (mode !== 'play' || !level) return;
  const relic = level.relicNear(player.position.x, player.position.z, 1.45);
  if (relic) {
    collectRelic(relic);
    return;
  }
  if (level.inExit(player.position.x, player.position.z)) {
    if (level.relics.every((item) => item.collected)) completeLevel();
    else hud.toast(`THE SEAL NEEDS ALL ${level.relics.length} PIECES`, 2.4);
    return;
  }
  hud.toast('NOTHING WITHIN REACH', 1.2);
}

function playerInput() {
  return {
    up: keys.KeyW || keys.ArrowUp,
    down: keys.KeyS || keys.ArrowDown,
    left: keys.KeyA || keys.ArrowLeft,
    right: keys.KeyD || keys.ArrowRight,
    crouch: keys.ShiftLeft || keys.ShiftRight,
  };
}

function step(dt) {
  levelTime += dt;
  player.update(dt, playerInput());
  if (player.group.visible) {
    if (player.speed > 0.2) {
      stepTimer -= dt;
      if (stepTimer <= 0) {
        stepTimer = player.crouching ? 0.56 : 0.36;
        audio.footstep(player.crouching);
        footprints.emit(player.position.x, player.position.z, player.crouching);
      }
    }
  }

  for (const guard of guards) {
    guard.update(dt, player);
    guard.audioTimer = (guard.audioTimer ?? 0) - dt;
    if (guard.moveSpeed > 0.3 && guard.audioTimer <= 0) {
      guard.audioTimer = 0.46;
      const distance = Math.hypot(guard.position.x - player.position.x, guard.position.z - player.position.z);
      if (distance < 10) audio.guardStep(Math.max(0, 1 - distance / 10));
    }
    if (guard.state === 'alarm' || guard.state === 'search') {
      if (Math.hypot(guard.position.x - player.position.x, guard.position.z - player.position.z) < 0.95) {
        getCaught();
        return;
      }
    }
  }
  for (const camera of cameras) camera.update(dt, player);

  const target = Math.max(0, ...guards.map((guard) => guard.awareness), ...cameras.map((camera) => camera.awareness));
  exposure += (target - exposure) * Math.min(1, dt * 8);
  suspectCooldown = Math.max(0, suspectCooldown - dt);
  if (exposure > 0.3 && suspectCooldown <= 0) {
    audio.suspect();
    suspectCooldown = 2.4;
  }
  audio.heartbeat(dt, exposure > 0.25 ? exposure : 0);
  const alerted = guards.some((guard) => guard.state === 'alarm' || guard.state === 'search')
    || cameras.some((camera) => camera.awareness > 0.8);
  hud.setExposure(exposure, alerted ? 'spot' : exposure > 0.3 ? 'watch' : 'clear');
  hud.setAlarm(alerted);

  level.update(dt);
  footprints.update(dt);
  bursts.update(dt);

  if (level.relics.every((relic) => relic.collected) && level.inExit(player.position.x, player.position.z)) {
    completeLevel();
  }
}

function ambientStep(dt) {
  for (const guard of guards) guard.update(dt, ghost);
  for (const camera of cameras) camera.update(dt, ghost);
  level.update(dt);
  footprints.update(dt);
  bursts.update(dt);
}

function drawMinimap() {
  if (!level) return;
  const taken = level.relics.filter((relic) => relic.collected).length;
  hud.drawMinimap(level, player, guards, cameras, taken);
}

function resetToTitle() {
  mode = 'title';
  loadLevel(0);
  hidePlayer();
  player.position.x = -30;
  player.position.z = -30;
  const center = levelCenter();
  view.focus(center.x, center.z, 1.12, window.innerWidth / window.innerHeight);
  view.swaySpeed = 0.035;
  hud.setScreen('title');
}

function goToLevel(index) {
  loadLevel(index);
  mode = 'brief';
  hidePlayer();
  view.swaySpeed = 0.02;
  hud.setScreen('brief');
  hud.announce(`Approach ${index + 1}: ${LEVELS[index].name}. ${LEVELS[index].brief}`);
}

function startPlay() {
  if (mode !== 'brief' && mode !== 'caught') return;
  player.group.visible = true;
  hud.showHud();
  view.swaySpeed = 0;
  hud.setScreen(null);
  mode = 'play';
  accumulator = 0;
  hud.toast(`APPROACH ${String(levelIndex + 1).padStart(2, '0')} · ${level.data.name.toUpperCase()}`, 2.8);
  hud.announce(`Playing ${level.data.name}.`);
}

function beginRun() {
  audio.start();
  audio.ui();
  totalTime = 0;
  totalAlarms = 0;
  alarmAt = -99;
  goToLevel(0);
}

function restartWing() {
  audio.start();
  loadLevel(levelIndex);
  mode = 'play';
  player.group.visible = true;
  hud.setScreen(null);
  hud.showHud();
  accumulator = 0;
  hud.toast('THE WING RESETS · NOBODY KNOWS YOU WERE HERE', 2.4);
}

function pauseGame() {
  if (mode !== 'play') return;
  mode = 'pause';
  hud.setScreen('pause');
  hud.announce('Paused.');
}

function resumeGame() {
  if (mode !== 'pause') return;
  mode = 'play';
  hud.setScreen(null);
  accumulator = 0;
  hud.announce('Playing.');
}

function nextWing() {
  if (mode !== 'clear') return;
  audio.ui();
  goToLevel(levelIndex + 1);
}

function handleEnter() {
  if (mode === 'title') beginRun();
  else if (mode === 'brief') startPlay();
  else if (mode === 'pause') resumeGame();
  else if (mode === 'caught') restartWing();
  else if (mode === 'clear') nextWing();
  else if (mode === 'victory') beginRun();
}

function onKeyDown(event) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  keys[event.code] = true;
  audio.start();
  audio.resume();
  if (event.code === 'Enter') handleEnter();
  else if (event.code === 'Escape') {
    if (mode === 'play') pauseGame();
    else if (mode === 'pause') resumeGame();
  } else if (event.code === 'KeyE') tryInteract();
  else if (event.code === 'KeyR') {
    if (mode === 'play' || mode === 'pause' || mode === 'caught') restartWing();
  }
}

function onKeyUp(event) {
  keys[event.code] = false;
}

function bindButton(id, action) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener('click', () => {
      element.blur();
      audio.start();
      audio.resume();
      audio.ui();
      action();
    });
  }
}

bindButton('btn-begin', beginRun);
bindButton('btn-enter', startPlay);
bindButton('btn-resume', resumeGame);
bindButton('btn-restart', restartWing);
bindButton('btn-quit', resetToTitle);
bindButton('btn-retry', restartWing);
bindButton('btn-caught-quit', resetToTitle);
bindButton('btn-next', nextWing);
bindButton('btn-again', beginRun);
bindButton('btn-manual', () => document.getElementById('manual').classList.toggle('hidden'));

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', () => {
  for (const key of Object.keys(keys)) keys[key] = false;
});
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  view.resize(window.innerWidth / window.innerHeight);
});

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (mode === 'play') {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < 6) {
      step(STEP);
      accumulator -= STEP;
      steps += 1;
      if (mode !== 'play') break;
    }
    minimapTimer -= dt;
    if (minimapTimer <= 0) {
      minimapTimer = 0.12;
      drawMinimap();
    }
  } else if (mode === 'title' || mode === 'brief') {
    ambientStep(dt);
  }

  view.update(dt);
  renderer.render(scene, view.camera);
  hud.update(dt);
}

const game = {
  get level() { return level; },
  get player() { return player; },
  get guards() { return guards; },
  get cameras() { return cameras; },
  loadLevel,
  hud,
  view,
  audio,
  get mode() { return mode; },
};
window.__nightglass = game;

if (shotName) {
  const staged = stageShot(shotName, game);
  hud.setScreen(null);
  hud.setLevel(level.data, levelIndex);
  hud.setRelics(staged.taken, staged.total);
  hud.setExposure(staged.exposure, staged.tier);
  hud.setAlarm(staged.alarm);
  hud.showHud();
  view.focus(staged.center[0], staged.center[1], staged.zoom, window.innerWidth / window.innerHeight);
  view.sway = 0;
  view.swaySpeed = 0;
  view.shake = 0;
  mode = 'shot';
  drawMinimap();
  document.body.dataset.shot = shotName;
  let painted = 0;
  const paintShot = () => {
    view.place();
    renderer.render(scene, view.camera);
    painted += 1;
    if (painted < 8) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  };
  document.fonts.ready.then(() => requestAnimationFrame(paintShot));
} else {
  resetToTitle();
}

requestAnimationFrame(frame);
