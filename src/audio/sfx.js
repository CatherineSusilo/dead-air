import { audio } from './engine.js';

// All environmental / scare SFX, synthesized.

function ctx() { return audio.ctx; }

// ---- one-shots -----------------------------------------------------------

export function footstep(bearing = 0, distance = 1.5, delay = 0) {
  const c = ctx(), t = c.currentTime + delay;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170; f.Q.value = 1.2;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(0.7, t + 0.012);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  const { input, output } = audio.panner(bearing, distance);
  nz.connect(f).connect(e).connect(input);
  output.connect(audio.roomBus);
  nz.start(t); nz.stop(t + 0.2);
}

// scheduled series of footsteps that walk past a bearing range
export function footstepWalk(from, to, distance = 1.5, steps = 7, stepDur = 0.62) {
  for (let i = 0; i < steps; i++) {
    const b = from + ((to - from) * i) / (steps - 1);
    footstep(b, distance, i * stepDur);
  }
  return steps * stepDur;
}

export function metalClang(bearing = 0, distance = 2.5, delay = 0, gain = 0.5) {
  const c = ctx(), t = c.currentTime + delay;
  const o = c.createOscillator(); o.type = 'square';
  o.frequency.setValueAtTime(180 + Math.random() * 60, t);
  const rm = c.createOscillator(); rm.frequency.value = 47 + Math.random() * 20;
  const rg = c.createGain(); rg.gain.value = 0.6;
  rm.connect(rg);
  const nz = audio.noiseSource(false);
  const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 3200; nf.Q.value = 1.5;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  const carrier = c.createGain(); carrier.gain.value = 0.5;
  rg.connect(carrier.gain);
  o.connect(carrier);
  nz.connect(nf).connect(carrier);
  const { input, output } = audio.panner(bearing, distance);
  carrier.connect(e).connect(input);
  output.connect(audio.roomBus);
  output.connect(audio.reverb);
  o.start(t); o.stop(t + 1.15); rm.start(t); rm.stop(t + 1.15);
  nz.start(t); nz.stop(t + 1.15);
}

export function knock(bearing = 0, distance = 1.2, delay = 0, count = 3) {
  const c = ctx();
  for (let i = 0; i < count; i++) {
    const t = c.currentTime + delay + i * 0.42;
    const nz = audio.noiseSource(false);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 120; f.Q.value = 2;
    const e = c.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
    e.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    const { input, output } = audio.panner(bearing, distance);
    nz.connect(f).connect(e).connect(input);
    output.connect(audio.roomBus);
    output.connect(audio.reverb);
    nz.start(t); nz.stop(t + 0.25);
  }
}

export function metalScratch(bearing = 0, distance = 2, delay = 0, dur = 1.6) {
  const c = ctx(), t = c.currentTime + delay;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 18;
  f.frequency.setValueAtTime(900, t);
  f.frequency.linearRampToValueAtTime(3400, t + dur * 0.6);
  f.frequency.linearRampToValueAtTime(1400, t + dur);
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.linearRampToValueAtTime(0.16, t + dur * 0.3);
  e.gain.linearRampToValueAtTime(0.0001, t + dur);
  const { input, output } = audio.panner(bearing, distance);
  nz.connect(f).connect(e).connect(input);
  output.connect(audio.roomBus);
  nz.start(t); nz.stop(t + dur + 0.05);
}

export function doorCreak(bearing = -8, delay = 0) {
  const c = ctx(), t = c.currentTime + delay;
  const o = c.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(90, t);
  o.frequency.linearRampToValueAtTime(140, t + 0.9);
  o.frequency.linearRampToValueAtTime(60, t + 1.9);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 6;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.linearRampToValueAtTime(0.22, t + 0.5);
  e.gain.linearRampToValueAtTime(0.0001, t + 2.0);
  const { input, output } = audio.panner(bearing, 0.8);
  o.connect(f).connect(e).connect(input);
  output.connect(audio.roomBus);
  output.connect(audio.reverb);
  o.start(t); o.stop(t + 2.1);
}

export function slam(bearing = -8, delay = 0) {
  const c = ctx(), t = c.currentTime + delay;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 90;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(1.4, t + 0.01);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  const { input, output } = audio.panner(bearing, 0.5);
  nz.connect(f).connect(e).connect(input);
  output.connect(audio.roomBus);
  output.connect(audio.reverb);
  nz.start(t); nz.stop(t + 1);
}

// ---- loops ---------------------------------------------------------------

export function breathLoop(bearing = 100) {
  const c = ctx();
  const nz = audio.noiseSource(true);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8;
  const g = c.createGain(); g.gain.value = 0;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.42;
  const depth = c.createGain(); depth.gain.value = 0.16;
  const base = c.createGain(); base.gain.value = 0.001;
  lfo.connect(depth);
  const env = c.createGain(); env.gain.value = 0.16;
  depth.connect(env.gain);
  const { input, output } = audio.panner(bearing, 0.7);
  nz.connect(f).connect(env).connect(g).connect(input);
  output.connect(audio.roomBus);
  nz.start(); lfo.start();
  return {
    setLevel(v) { g.gain.linearRampToValueAtTime(v, c.currentTime + 0.4); },
    setBearing(b) { input.pan.linearRampToValueAtTime(Math.sin(b * Math.PI / 180), c.currentTime + 0.5); },
    stop() { g.gain.linearRampToValueAtTime(0, c.currentTime + 1.2); setTimeout(() => { try { nz.stop(); lfo.stop(); } catch {} }, 1500); },
  };
}

// continuous facility ambience — hum, rumble, distant fans
export function startAmbience() {
  const c = ctx();
  const out = c.createGain(); out.gain.value = 0;
  out.connect(audio.roomBus);

  const hum = c.createOscillator(); hum.type = 'sine'; hum.frequency.value = 59.8;
  const humG = c.createGain(); humG.gain.value = 0.035;
  hum.connect(humG).connect(out);

  const rum = audio.noiseSource(true);
  const rf = c.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 90;
  const rg = c.createGain(); rg.gain.value = 0.16;
  rum.connect(rf).connect(rg).connect(out);

  const fan = audio.noiseSource(true);
  const ff = c.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = 380; ff.Q.value = 0.7;
  const fg = c.createGain(); fg.gain.value = 0.018;
  const flfo = c.createOscillator(); flfo.frequency.value = 0.13;
  const fd = c.createGain(); fd.gain.value = 0.008;
  flfo.connect(fd).connect(fg.gain);
  fan.connect(ff).connect(fg).connect(out);

  hum.start(); rum.start(); fan.start(); flfo.start();
  out.gain.linearRampToValueAtTime(1, c.currentTime + 3);
  return {
    node: out,
    setLevel(v, t = 1) { out.gain.linearRampToValueAtTime(v, c.currentTime + t); },
  };
}

// tape hiss used while recording / playing back
export function tapeHiss() {
  const c = ctx();
  const nz = audio.noiseSource(true);
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
  const g = c.createGain(); g.gain.value = 0.02;
  nz.connect(f).connect(g).connect(audio.radioBus);
  nz.start();
  return { stop() { g.gain.linearRampToValueAtTime(0, c.currentTime + 0.1); setTimeout(() => { try { nz.stop(); } catch {} }, 200); } };
}

// ---- dry emitters (pump into a GainNode, e.g. a mic emitter) --------------

export function emitThump(dest, gain = 0.8, freq = 150) {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  nz.connect(f).connect(e).connect(dest);
  nz.start(t); nz.stop(t + 0.25);
}

export function emitClank(dest, gain = 0.5) {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.value = 700 + Math.random() * 900; f.Q.value = 9;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  nz.connect(f).connect(e).connect(dest);
  nz.start(t); nz.stop(t + 0.55);
}

export function emitBreathPulse(dest, gain = 0.3) {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
  f.frequency.setValueAtTime(400, t);
  f.frequency.linearRampToValueAtTime(750, t + 0.8);
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.linearRampToValueAtTime(gain, t + 0.35);
  e.gain.linearRampToValueAtTime(0.0001, t + 1.1);
  nz.connect(f).connect(e).connect(dest);
  nz.start(t); nz.stop(t + 1.15);
}

export function emitScratchPulse(dest, gain = 0.25) {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 15;
  f.frequency.setValueAtTime(1200, t);
  f.frequency.linearRampToValueAtTime(3000 + Math.random() * 1500, t + 0.7);
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.linearRampToValueAtTime(gain, t + 0.25);
  e.gain.linearRampToValueAtTime(0.0001, t + 0.8);
  nz.connect(f).connect(e).connect(dest);
  nz.start(t); nz.stop(t + 0.85);
}

// transmit key beep — the player pressing the talk key
export function transmitBeep() {
  const c = ctx(), t = c.currentTime;
  const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 880;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  g.gain.setValueAtTime(0.0001, t + 0.18);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.19);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(audio.radioBus);
  o.start(t); o.stop(t + 0.35);
}

// radio tuning swoop texture while scanning the band
export function scanSweep() {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4;
  f.frequency.setValueAtTime(600 + Math.random() * 800, t);
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  nz.connect(f).connect(e).connect(audio.radioBus);
  nz.start(t); nz.stop(t + 0.35);
}
