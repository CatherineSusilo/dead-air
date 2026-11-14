import { audio } from '../audio/engine.js';
import { bus } from '../config.js';

// Directional microphone. Rotates ±180°; emitters placed in the world feed
// the mic monitor only when the mic is aimed at them (they remain faintly
// audible in the room always).

const PLAYER = { x: 0.1, y: 1.3, z: 1.55 };
const AIM_WIDTH = 38; // degrees at which signal drops to zero

export class DirectionalMic {
  constructor(refs, hud) {
    this.refs = refs;
    this.hud = hud;
    this.azimuth = 0;      // 0 = facing the desk/door wall (-z)
    this.emitters = new Map();
    this.peak = 0;
  }

  bearingOf(world) {
    const dx = world[0] - PLAYER.x;
    const dz = world[2] - PLAYER.z;
    return (Math.atan2(dx, -dz) * 180) / Math.PI;
  }

  aimFactor(bearing) {
    let d = Math.abs(this.azimuth - bearing) % 360;
    if (d > 180) d = 360 - d;
    const f = Math.max(0, 1 - d / AIM_WIDTH);
    return f * f;
  }

  rotate(dir, dt) {
    this.azimuth += dir * 60 * dt;
    if (this.azimuth > 180) this.azimuth -= 360;
    if (this.azimuth < -180) this.azimuth += 360;
    // barrel points +z locally; azimuth 0 must face the door wall (-z)
    this.refs.micPivot.rotation.y = (this.azimuth * Math.PI) / 180 + Math.PI;
    this._moving = true;
  }

  // Create an emitter: a GainNode the caller pumps audio into.
  // input -> roomSend (faint) + micSend (aim-scaled)
  spawnEmitter(id, world, { roomLevel = 0.12, micLevel = 1.0 } = {}) {
    const c = audio.ctx;
    const input = c.createGain();
    const roomSend = c.createGain(); roomSend.gain.value = roomLevel;
    const micSend = c.createGain(); micSend.gain.value = 0;
    input.connect(roomSend).connect(audio.roomBus);
    input.connect(micSend).connect(audio.micBus);
    const em = { id, world, input, roomSend, micSend, micLevel, aim: 0 };
    this.emitters.set(id, em);
    return em;
  }

  removeEmitter(id) {
    const em = this.emitters.get(id);
    if (!em) return;
    try { em.input.disconnect(); } catch {}
    this.emitters.delete(id);
  }

  // strongest aimed emitter, for gameplay checks
  strongest() {
    let best = { aim: 0, id: null };
    for (const em of this.emitters.values()) {
      if (em.aim > best.aim) best = { aim: em.aim, id: em.id };
    }
    return best;
  }

  update() {
    if (this.azimuth > 180) this.azimuth -= 360;
    if (this.azimuth < -180) this.azimuth += 360;
    this.refs.micPivot.rotation.y = (this.azimuth * Math.PI) / 180 + Math.PI;
    let peak = 0;
    for (const em of this.emitters.values()) {
      const aim = this.aimFactor(this.bearingOf(em.world));
      em.aim = aim;
      peak = Math.max(peak, aim);
      em.micSend.gain.setTargetAtTime(aim * em.micLevel, audio.ctx.currentTime, 0.05);
    }
    this.peak = peak;
    const deg = ((Math.round(this.azimuth) % 360) + 360) % 360;
    this.hud.setMic(deg, peak);
  }
}
