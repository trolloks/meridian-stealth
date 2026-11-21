// NIGHTGLASS — tuning, palette and the fixed simulation rules.
// One logical view is 26 metres wide; the renderer scales that to any window.

export const STEP = 1 / 60;

export const VIEW = { width: 26, height: 26 * (9 / 16) };

export const PLAYER = {
  radius: 0.34,
  walkSpeed: 4.1,
  crouchSpeed: 2.0,
  standEye: 1.48,
  crouchEye: 0.82,
  interaction: 1.25,
  turnRate: 12,
};

export const GUARD = {
  eye: 1.62,
  range: 7.0,
  fov: (58 * Math.PI) / 180,
  patrolSpeed: 1.25,
  chaseSpeed: 3.05,
  turnRate: 3.4,
  visionGain: 1.45,
  hearingGain: 0.9,
  decay: 0.5,
  suspectAt: 0.3,
  alarmAt: 1,
  catchDistance: 0.85,
  alarmMemory: 7,
  searchTime: 4.5,
  cameraRange: 6.2,
  cameraFov: (40 * Math.PI) / 180,
  cameraGain: 1.8,
};

export const DETECTION = {
  crouchFactor: 0.55,
  shadowFactor: 0.6,
  distanceFalloff: 0.55,
  alertRadius: 9,
};

export const PALETTE = {
  ink: '#05090e',
  deep: '#08141b',
  floor: '#12252c',
  floorAlt: '#0d1d24',
  cyan: '#5ff2e3',
  cyanDim: '#2b8f8a',
  amber: '#ffb24d',
  amberDeep: '#ff7a1a',
  red: '#ff4d5e',
  violet: '#9a8cff',
  marble: '#d8d2c2',
  brass: '#c9a35a',
  wood: '#6b4a32',
  text: '#e8f4f2',
  muted: '#89a6a8',
  green: '#68ffb0',
};

export const FONTS = {
  ui: '"Chakra Petch", system-ui, sans-serif',
};

export const SCORE = {
  relic: 1000,
  stealthBonus: 2500,
  timeParPerLevel: 150,
};

// A level is clear when every relic is taken and the player reaches the exit pad.
export const MAX_LEVEL = 3;
