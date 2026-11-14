import { audio } from './engine.js';
import { SIGNALS, TUNER } from '../config.js';
import { speak } from './voice.js';

// Radio: a bed of static plus per-signal content that fades in as the dial
// approaches a broadcast frequency.

class Radio {
  constructor() {
    this.freq = TUNER.START;
    this.started = false;
    this.signals = {};   // kind -> {gain, update(clarity, dt)}
    this.lockedSignal = null;
    this.linePlaying = false;
  }

  start() {
    if (this.started) return;
    const c = audio.ctx;

    // static bed
    const nz = audio.noiseSource(true);
    const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2400; sf.Q.value = 0.4;
    this.staticGain = c.createGain(); this.staticGain.gain.value = 0;
    nz.connect(sf).connect(this.staticGain).connect(audio.radioBus);
    nz.start();

    // crackle pops
    this._popTimer = 0;

    this._buildLoops();
    this.started = true;
  }

  _loop(build) {
    const g = audio.ctx.createGain();
    g.gain.value = 0;
    const handle = build(g);
    g.connect(audio.radioBus);
    return { gain: g, ...handle };
  }

  _buildLoops() {
    const c = audio.ctx;

    // mech: low machine rumble + periodic clank
    this.signals.mech = this._loop((g) => {
      const rum = audio.noiseSource(true);
      const rf = c.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 110;
      const rg = c.createGain(); rg.gain.value = 0.5;
      rum.connect(rf).connect(rg).connect(g);
      rum.start();
      const tick = { t: 0 };
      return {
        update(cl, dt) {
          tick.t -= dt;
          if (tick.t <= 0 && cl > 0.35) {
            tick.t = 0.55 + Math.random() * 0.4;
            const nz = audio.noiseSource(false);
            const f = c.createBiquadFilter(); f.type = 'bandpass';
            f.frequency.value = 300 + Math.random() * 200; f.Q.value = 8;
            const e = c.createGain(); const t = c.currentTime;
            e.gain.setValueAtTime(0.0001, t);
            e.gain.exponentialRampToValueAtTime(0.5 * cl, t + 0.01);
            e.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
            nz.connect(f).connect(e).connect(g);
            nz.start(t); nz.stop(t + 0.2);
          }
        },
      };
    });

    // scratch: wandering resonant squeal
    this.signals.scratch = this._loop((g) => {
      const nz = audio.noiseSource(true);
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 16;
      f.frequency.value = 2200;
      const ng = c.createGain(); ng.gain.value = 0.4;
      nz.connect(f).connect(ng).connect(g);
      nz.start();
      let t = 0;
      return {
        update(cl, dt) {
          t += dt;
          if (Math.random() < dt * 1.5) {
            f.frequency.setTargetAtTime(600 + Math.random() * 4200, c.currentTime, 0.1);
          }
        },
      };
    });

    // whisper: breathy shaped noise + rare murmur
    this.signals.whisper = this._loop((g) => {
      const nz = audio.noiseSource(true);
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 3;
      const e = c.createGain(); e.gain.value = 0.2;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.5;
      const d = c.createGain(); d.gain.value = 0.1;
      lfo.connect(d).connect(e.gain);
      nz.connect(f).connect(e).connect(g);
      nz.start(); lfo.start();
      let t = 0;
      return {
        update(cl, dt) {
          t -= dt;
          if (t <= 0 && cl > 0.6) {
            t = 2.5 + Math.random() * 3;
            speak('it hears you', { timbre: 'X', gain: 0.10 * cl, rate: 0.7, dest: g });
          }
        },
      };
    });

    // voiceA / voiceB: carrier tone + murmur bed while "someone is on the line"
    for (const kind of ['voiceA', 'voiceB']) {
      this.signals[kind] = this._loop((g) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = kind === 'voiceA' ? 740 : 620;
        const og = c.createGain(); og.gain.value = 0.05;
        o.connect(og).connect(g); o.start();
        let murmurT = 1;
        return {
          update(cl, dt) {
            murmurT -= dt;
            if (murmurT <= 0 && cl > 0.55) {
              murmurT = 1.4 + Math.random() * 2.6;
              speak('mm', { timbre: kind === 'voiceA' ? 'A' : 'B', gain: 0.14 * cl, rate: 0.8, dest: g });
            }
          },
        };
      });
    }
  }

  setFrequency(f) {
    this.freq = f;
  }

  // returns {clarity, signal} for the strongest lock
  probe() {
    let best = { clarity: 0, signal: null };
    for (const [id, s] of Object.entries(SIGNALS)) {
      const d = Math.abs(this.freq - s.freq);
      const cl = Math.max(0, 1 - d / TUNER.LOCK_RANGE);
      if (cl > best.clarity) best = { clarity: cl, signal: id };
    }
    if (best.clarity <= 0) best.signal = null;
    return best;
  }

  update(dt) {
    if (!this.started) return;
    const c = audio.ctx;
    const { clarity, signal } = this.probe();

    // per-kind gain = max clarity among signals of that kind
    const kindClarity = {};
    for (const [id, s] of Object.entries(SIGNALS)) {
      const d = Math.abs(this.freq - s.freq);
      const cl = Math.max(0, 1 - d / TUNER.LOCK_RANGE);
      kindClarity[s.kind] = Math.max(kindClarity[s.kind] || 0, cl);
    }
    for (const [kind, h] of Object.entries(this.signals)) {
      const target = (kindClarity[kind] || 0) * 0.55;
      h.gain.gain.setTargetAtTime(target, c.currentTime, 0.08);
      h.update?.(kindClarity[kind] || 0, dt);
    }

    // static = inverse of strongest clarity, plus constant floor hiss
    const staticTarget = 0.05 + (1 - Math.min(1, clarity * 1.4)) * 0.16;
    this.staticGain.gain.setTargetAtTime(staticTarget, c.currentTime, 0.08);

    // occasional static pop while between stations
    this._popTimer -= dt;
    if (this._popTimer <= 0) {
      this._popTimer = 0.3 + Math.random() * 2;
      if (clarity < 0.5 && Math.random() < 0.7) {
        const t = c.currentTime;
        const nz = audio.noiseSource(false);
        const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
        const e = c.createGain();
        e.gain.setValueAtTime(0.0001, t);
        e.gain.exponentialRampToValueAtTime(0.08 + Math.random() * 0.12, t + 0.005);
        e.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        nz.connect(f).connect(e).connect(audio.radioBus);
        nz.start(t); nz.stop(t + 0.08);
      }
    }

    const prev = this.lockedSignal;
    this.lockedSignal = clarity > 0.55 ? signal : null;
    return { clarity, signal: this.lockedSignal, changed: prev !== this.lockedSignal };
  }
}

export const radio = new Radio();
