// Shared constants + tiny event bus.

export const PALETTE = {
  concrete: 0x4a4a42,
  concreteDark: 0x35352f,
  floor: 0x2e2d28,
  desk: 0x3d3226,
  metal: 0x3a3d40,
  metalDark: 0x25282b,
  rust: 0x5c3a28,
  green: 0x39503a,
  beige: 0x7a6f56,
  red: 0x7e2f24,
  crtGreen: 0x1a3a1a,
  black: 0x0c0d0c,
};

export const TUNER = {
  MIN: 30.0,
  MAX: 120.0,
  START: 61.0,
  // lock bandwidth: within this => audible, tighter => clear
  LOCK_RANGE: 2.6,
  CLEAR_RANGE: 0.55,
};

// Named broadcast signals on the band.
export const SIGNALS = {
  control: { freq: 87.4, kind: 'voiceA', label: 'STATION CONTROL' },
  stranger: { freq: 87.4, kind: 'voiceB', label: 'UNKNOWN' }, // shares band early on
  mech:     { freq: 41.2, kind: 'mech',  label: 'MECHANICAL' },
  scratch:  { freq: 104.7, kind: 'scratch', label: 'INTERFERENCE' },
  whisper:  { freq: 96.9, kind: 'whisper', label: '???' },
};

// ATTENTION thresholds (0-100). The thing in the facility hears you.
export const ATTENTION = {
  TUNE_OPEN: 2,
  SCAN: 5,          // per large dial sweep
  LOCK: 3,          // locking onto a signal
  RECORD: 8,
  PLAYBACK: 10,
  TRANSMIT: 12,
  DECAY_PER_SEC: 0.55,
  MAX: 100,
  L1: 22,   // distant metal + interference
  L2: 45,   // footsteps outside + breathing
  L3: 68,   // knocking, something at the window, light stress
  L4: 88,   // it imitates the voices; door; finale
};

// Mic azimuth ranges (deg). 0 = facing desk/door wall... we define:
// mic world yaw 0 points at the DOOR wall (+z toward player faces -z to desk).
// Sound source bearings relative to the player's seat (deg, 0 = straight ahead at desk).
export const SOURCES = {
  vent:   { bearing: -55, label: 'VENT',          world: [-2.35, 2.1, -1.2] },
  pipes:  { bearing: 62,  label: 'PIPES',         world: [2.42, 1.6, -0.6] },
  door:   { bearing: -8,  label: 'DOOR',          world: [-0.8, 1.2, -2.9] },
  window: { bearing: 28,  label: 'WINDOW',        world: [1.35, 1.7, -2.9] },
  behind: { bearing: 178, label: 'BEHIND YOU',    world: [0.2, 1.35, 2.9] },
};

// Simple pub/sub so modules stay decoupled.
export const bus = {
  _m: new Map(),
  on(ev, fn) { (this._m.get(ev) ?? this._m.set(ev, []).get(ev)).push(fn); },
  emit(ev, ...a) { (this._m.get(ev) || []).forEach((f) => f(...a)); },
};
