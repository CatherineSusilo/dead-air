import { audio } from './engine.js';
import { SOURCES } from '../config.js';
import { playFile } from './files.js';

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

// answering-machine beep — plays before the found tape's message
export function phoneBeep() {
  const c = ctx(), t = c.currentTime;
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 990;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
  g.gain.setValueAtTime(0.11, t + 0.42);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g).connect(audio.radioBus);
  o.start(t); o.stop(t + 0.6);
}

// continuous dirty shortwave hiss — feeds a destination (e.g. trash emitter)
export function dirtyStaticInto(dest, gain = 0.4) {
  const c = ctx();
  const nz = audio.noiseSource(true);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2700; f.Q.value = 0.7;
  const g = c.createGain(); g.gain.value = gain;
  nz.connect(f).connect(g).connect(dest);
  nz.start();
  return { stop() { g.gain.linearRampToValueAtTime(0, c.currentTime + 0.2); setTimeout(() => { try { nz.stop(); } catch {} }, 400); } };
}

export function emitPop(dest, gain = 0.1) {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2800;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  nz.connect(f).connect(e).connect(dest);
  nz.start(t); nz.stop(t + 0.06);
}

// the noise attack — full-band scream when the thing gets in
export function noiseScream() {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 850; f.Q.value = 0.4;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(2.2, t + 0.02);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  const o = c.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(230, t);
  o.frequency.exponentialRampToValueAtTime(36, t + 2.4);
  const og = c.createGain(); og.gain.value = 0.55;
  nz.connect(f).connect(e).connect(audio.master);
  o.connect(og).connect(e);
  nz.start(t); nz.stop(t + 2.7);
  o.start(t); o.stop(t + 2.7);
  // the real lungs — ElevenLabs shriek + sub impact underneath
  playFile('shriek', { gain: 1.4 });
  playFile('boom', { gain: 1.5 });
}

// THE door burst — it doesn't open the door, it takes it off.
// Layered: generated door smash + shriek + boom over synth slam/sting.
export function doorBurst() {
  const b = SOURCES.door.bearing;
  playFile('door_burst', { gain: 1.6, bearing: b, distance: 0.7 });
  playFile('shriek', { gain: 1.3 });
  playFile('boom', { gain: 1.6 });
  slam(b);
  sting(1.5);
  noiseScreamSynthOnly();
}

// synth-only inner body of noiseScream (avoid doubling the file layers)
function noiseScreamSynthOnly() {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.5;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(1.8, t + 0.02);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  nz.connect(f).connect(e).connect(audio.master);
  nz.start(t); nz.stop(t + 1.9);
}

// heavy clanging inside the walls — pipes being struck, ductwork buckling
export function wallBang(bearing = 0, distance = 2, gain = 0.5) {
  const c = ctx(), t = c.currentTime;
  // low body thud
  const o = c.createOscillator(); o.frequency.setValueAtTime(60 + Math.random() * 25, t);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(gain * 1.2, t + 0.012);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  // ringing metal strike
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 7;
  f.frequency.value = 500 + Math.random() * 1400;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  const { input, output } = audio.panner(bearing, distance);
  o.connect(og).connect(input);
  nz.connect(f).connect(e).connect(input);
  output.connect(audio.roomBus);
  output.connect(audio.reverb);
  o.start(t); o.stop(t + 0.55);
  nz.start(t); nz.stop(t + 0.95);
  // sometimes it's the real recording
  if (Math.random() < 0.5) playFile('wall_clank', { gain: gain * 1.1, bearing, distance });
}

// sudden dissonant hit — makes scares "jump out"
export function sting(intensity = 1) {
  const c = ctx(), t = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9 * intensity, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  g.connect(audio.master);
  for (const fq of [311, 466, 622, 1244]) {  // tritone-ish cluster
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(fq * (0.97 + Math.random() * 0.06), t);
    o.frequency.exponentialRampToValueAtTime(fq * 0.5, t + 0.65);
    const og = c.createGain(); og.gain.value = 0.22;
    o.connect(og).connect(g);
    o.start(t); o.stop(t + 0.75);
  }
  const nz = audio.noiseSource(false);
  const nf = c.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 1200;
  nz.connect(nf).connect(g);
  nz.start(t); nz.stop(t + 0.5);
}

// continuous metal-scratching bed for the deadline — setLevel 0..1
// sounds like something dragging a nail along the other side of the wall
export function scratchLoop() {
  const c = ctx();
  const out = c.createGain(); out.gain.value = 0;
  out.connect(audio.roomBus);

  const nz = audio.noiseSource(true);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2100; f.Q.value = 6;
  const am = c.createGain(); am.gain.value = 0;
  const lfo = c.createOscillator(); lfo.type = 'sawtooth'; lfo.frequency.value = 3.1;
  const ld = c.createGain(); ld.gain.value = 0.5;
  lfo.connect(ld).connect(am.gain);
  const wander = c.createOscillator(); wander.frequency.value = 0.23;
  const wd = c.createGain(); wd.gain.value = 700;
  wander.connect(wd).connect(f.frequency);
  nz.connect(f).connect(am).connect(out);
  nz.start(); lfo.start(); wander.start();
  return {
    setLevel(v) { out.gain.linearRampToValueAtTime(v * 0.5, c.currentTime + 0.6); },
    stop() { out.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
      setTimeout(() => { try { nz.stop(); lfo.stop(); wander.stop(); } catch {} }, 700); },
  };
}

// natural environment sounds leaking in from outside — wind through the
// intake, water dripping somewhere down the corridor, pipes settling,
// the whole facility groaning. all random one-shots on timeout chains.
export function facilityAmbience() {
  const c = ctx();
  let alive = true;
  const timers = [];

  const later = (minS, maxS, fn) => {
    const loop = () => {
      if (!alive) return;
      fn();
      timers.push(setTimeout(loop, (minS + Math.random() * (maxS - minS)) * 1000));
    };
    timers.push(setTimeout(loop, (minS + Math.random() * (maxS - minS)) * 1000));
  };

  // wind moan — continuous bandpassed noise with a slow swell
  const wind = audio.noiseSource(true);
  const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 240; wf.Q.value = 2.2;
  const wg = c.createGain(); wg.gain.value = 0.014;
  const wlfo = c.createOscillator(); wlfo.frequency.value = 0.07;
  const wld = c.createGain(); wld.gain.value = 0.010;
  wlfo.connect(wld).connect(wg.gain);
  wind.connect(wf).connect(wg).connect(audio.roomBus);
  wind.start(); wlfo.start();

  later(2.5, 7, () => {   // water drip — sine plink + reverb tail
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1900 + Math.random() * 1400, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.04, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    const { input, output } = audio.panner(-40 + Math.random() * 90, 3 + Math.random() * 3);
    o.connect(g).connect(input); output.connect(audio.roomBus); output.connect(audio.reverb);
    o.start(t); o.stop(t + 0.15);
  });

  later(4, 11, () => {    // pipe tick — tiny high click, pipes expanding
    const t = c.currentTime;
    const nz = audio.noiseSource(false);
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3400;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    const { input, output } = audio.panner(-80 + Math.random() * 160, 1.5 + Math.random() * 2);
    nz.connect(f).connect(g).connect(input); output.connect(audio.roomBus);
    nz.start(t); nz.stop(t + 0.05);
  });

  later(18, 40, () => {   // the building groans — slow low gliss
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(48 + Math.random() * 20, t);
    o.frequency.linearRampToValueAtTime(38 + Math.random() * 14, t + 2.4);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 1.1);
    g.gain.linearRampToValueAtTime(0.0001, t + 2.6);
    o.connect(f).connect(g).connect(audio.roomBus);
    g.connect(audio.reverb);
    o.start(t); o.stop(t + 2.7);
  });

  later(25, 55, () => {   // distant rumble swell — far-off machinery or worse
    const t = c.currentTime;
    const nz = audio.noiseSource(false);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 70;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 1.6);
    g.gain.linearRampToValueAtTime(0.0001, t + 3.4);
    nz.connect(f).connect(g).connect(audio.roomBus);
    nz.start(t); nz.stop(t + 3.5);
  });

  later(30, 70, () => metalClang(-100 + Math.random() * 200, 5 + Math.random() * 3, 0, 0.12)); // far clank

  return {
    stop() {
      alive = false;
      timers.forEach(clearTimeout);
      try { wind.stop(); wlfo.stop(); } catch {}
    },
  };
}

// a claw-tap on the door metal — the countdown made physical.
// distance shrinks as it gets closer; gain rises.
export function clawTap(bearing = -8, distance = 2.5, gain = 0.15) {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 10;
  f.frequency.setValueAtTime(2400 + Math.random() * 900, t);
  f.frequency.exponentialRampToValueAtTime(800, t + 0.15);
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
  // heavy thud underneath so it reads as something with mass
  const o = c.createOscillator(); o.frequency.value = 72;
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(gain * 0.9, t + 0.012);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  const { input, output } = audio.panner(bearing, distance);
  nz.connect(f).connect(e).connect(input);
  o.connect(og).connect(input);
  output.connect(audio.roomBus);
  output.connect(audio.reverb);
  nz.start(t); nz.stop(t + 0.2); o.start(t); o.stop(t + 0.24);
}

// continuous duct rumble for the vent — dead air moving through ductwork
export function ventBed(dest, gain = 0.12) {
  const c = ctx();
  const nz = audio.noiseSource(true);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 250; f.Q.value = 1.3;
  const g = c.createGain(); g.gain.value = gain;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.19;
  const ld = c.createGain(); ld.gain.value = gain * 0.5;
  lfo.connect(ld).connect(g.gain);
  nz.connect(f).connect(g).connect(dest);
  nz.start(); lfo.start();
  return {
    stop() {
      g.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
      setTimeout(() => { try { nz.stop(); lfo.stop(); } catch {} }, 500);
    },
  };
}

// dry metal rattle into an emitter — duct hardware settling
export function emitRattle(dest, gain = 0.1) {
  const c = ctx(), t = c.currentTime;
  const nz = audio.noiseSource(false);
  const f = c.createBiquadFilter(); f.type = 'bandpass';
  f.frequency.value = 1500 + Math.random() * 1100; f.Q.value = 7;
  const e = c.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  nz.connect(f).connect(e).connect(dest);
  nz.start(t); nz.stop(t + 0.26);
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
