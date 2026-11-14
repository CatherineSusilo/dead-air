import { TUNER, bus } from '../config.js';
import { radio } from '../audio/radio.js';
import { scanSweep } from '../audio/sfx.js';

// Frequency tuner. Owns the dial value; visuals + HUD updated from it.

export class Tuner {
  constructor(refs, hud) {
    this.refs = refs;
    this.hud = hud;
    this.freq = TUNER.START;
    this.dragging = false;
    this._sweepAcc = 0;
    this._lastFreq = this.freq;
    this.powered = false;
  }

  power(on) {
    this.powered = on;
    if (on) {
      radio.start();
      bus.emit('attention', 'TUNE_OPEN');
    }
    this.hud.setBox('tuner', on);
  }

  setFreq(f) {
    this.freq = Math.min(TUNER.MAX, Math.max(TUNER.MIN, f));
    radio.setFrequency(this.freq);
    const d = Math.abs(this.freq - this._lastFreq);
    this._sweepAcc += d;
    if (this._sweepAcc > 14) {           // big sweep = noise = attention
      this._sweepAcc = 0;
      bus.emit('attention', 'SCAN');
      if (this.powered) scanSweep();
    }
    this._lastFreq = this.freq;
    this._syncVisual();
  }

  nudge(dir, dt, fine = false) {
    const speed = fine ? 2.2 : 14;
    this.setFreq(this.freq + dir * speed * dt);
  }

  _syncVisual() {
    const t = (this.freq - TUNER.MIN) / (TUNER.MAX - TUNER.MIN);
    // needle over the band scale (scale width ~0.3 centered at x=0.14)
    this.refs.needle.position.x = 0.14 + (t - 0.5) * 0.26;
    // dial rotation ~ -150..150 deg
    this.refs.dial.rotation.z = -(t * Math.PI * 1.7 - Math.PI * 0.85);
    this.hud.setFreq(this.freq);
  }

  update() {}
}
