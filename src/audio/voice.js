import { audio } from './engine.js';

// Formant "voice" synthesizer. Produces unintelligible-but-speechlike radio
// voices; the on-screen CRT transcript carries the actual words.

const VOWELS = [
  [700, 1220], // a
  [520, 1900], // e
  [350, 2200], // i
  [560, 900],  // o
  [400, 1000], // u
  [600, 1600], // schwa-ish
];

const TIMBRES = {
  A: { pitch: 100, jitter: 0.03, syl: [0.09, 0.14], noise: 0.06, dist: 6,  ring: 0 },   // station control — flat, even
  B: { pitch: 128, jitter: 0.10, syl: [0.07, 0.16], noise: 0.22, dist: 14, ring: 0 },   // stranger — breathy, urgent
  X: { pitch: 62,  jitter: 0.14, syl: [0.14, 0.26], noise: 0.30, dist: 30, ring: 27 },  // the thing — wrong
};

function distortCurve(amount) {
  const n = 256, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * amount);
  }
  return c;
}

function syllableCount(text) {
  const words = text.trim().split(/\s+/);
  let n = 0;
  for (const w of words) {
    n += Math.max(1, Math.round(w.replace(/[^a-z]/gi, '').length / 3));
  }
  return Math.min(n, 90);
}

// Speak a line. Returns total scheduled duration (seconds).
export function speak(text, { timbre = 'A', dest = null, gain = 0.8, when = 0, rate = 1 } = {}) {
  const ctx = audio.ctx;
  const t = TIMBRES[timbre] || TIMBRES.A;
  const out = dest || audio.radioBus;
  const n = syllableCount(text);

  const g = ctx.createGain();
  g.gain.value = gain;

  // radio band-limit + crunch
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = timbre === 'X' ? 700 : 1400; bp.Q.value = 0.6;
  const ws = ctx.createWaveShaper();
  ws.curve = distortCurve(t.dist);
  g.connect(bp).connect(ws).connect(out);

  // optional ring-mod creepiness
  let ringGain = null;
  if (t.ring > 0) {
    ringGain = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = t.ring;
    const lg = ctx.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg).connect(ringGain.gain);
    lfo.start();
    ws.disconnect();
    ws.connect(ringGain).connect(out);
    ringGain.gain.value = 0.5;
  }

  const t0 = ctx.currentTime + when;
  let tt = t0;

  for (let i = 0; i < n; i++) {
    const dur = (t.syl[0] + Math.random() * (t.syl[1] - t.syl[0])) / rate;
    const [f1, f2] = VOWELS[(Math.random() * VOWELS.length) | 0];
    const wobble = 1 + (Math.random() - 0.5) * t.jitter * 4;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(t.pitch * wobble, tt);
    // slight pitch sag inside the syllable
    osc.frequency.exponentialRampToValueAtTime(t.pitch * wobble * 0.92, tt + dur);

    const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f1 * wobble; b1.Q.value = 7;
    const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f2 * wobble; b2.Q.value = 9;
    const g1 = ctx.createGain(); g1.gain.value = 1.0;
    const g2 = ctx.createGain(); g2.gain.value = 0.55;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, tt);
    env.gain.exponentialRampToValueAtTime(0.9, tt + dur * 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, tt + dur);

    osc.connect(b1).connect(g1).connect(env);
    osc.connect(b2).connect(g2).connect(env);

    // breath / consonant noise
    const nz = audio.noiseSource(false);
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass';
    nf.frequency.value = 2400 + Math.random() * 1800; nf.Q.value = 2;
    const ne = ctx.createGain();
    ne.gain.setValueAtTime(0.0001, tt);
    ne.gain.exponentialRampToValueAtTime(t.noise, tt + dur * 0.2);
    ne.gain.exponentialRampToValueAtTime(0.0001, tt + dur * 0.85);
    nz.connect(nf).connect(ne).connect(env);
    nz.start(tt); nz.stop(tt + dur + 0.02);

    env.connect(g);
    osc.start(tt); osc.stop(tt + dur + 0.02);

    // inter-syllable gap; word-ish pauses
    tt += dur + (Math.random() < 0.16 ? 0.12 : 0.02) / rate;
  }

  const total = tt - t0;
  // auto-stop ring lfo
  if (t.ring > 0 && ringGain) {
    setTimeout(() => { try { ringGain.disconnect(); } catch {} }, total * 1000 + 500);
  }
  return total;
}

// ---------- real voice lines (ElevenLabs, pre-generated into /voice) ----------

const _bufCache = new Map();

async function loadLine(id) {
  if (_bufCache.has(id)) return _bufCache.get(id);
  const p = (async () => {
    try {
      const res = await fetch(`voice/${id}.mp3`);
      if (!res.ok) return null;
      const ab = await res.arrayBuffer();
      return await audio.ctx.decodeAudioData(ab);
    } catch {
      return null;
    }
  })();
  _bufCache.set(id, p);
  return p;
}

// Play a generated voice file through the same radio crunch as the synth.
// timbre 'X' = slowed, ring-modded, extra filth. Returns seconds (0 on miss).
export async function playLine(id, { dest = null, gain = 0.9, timbre = 'A', rate = 1, when = 0 } = {}) {
  const ctx = audio.ctx;
  const buf = await loadLine(id);
  if (!buf) return 0;
  const out = dest || audio.radioBus;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const r = rate * (timbre === 'X' ? 0.82 : 1);
  src.playbackRate.value = r;

  const g = ctx.createGain(); g.gain.value = gain;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = timbre === 'X' ? 800 : 1500;
  bp.Q.value = 0.55;
  const ws = ctx.createWaveShaper();
  ws.curve = distortCurve(timbre === 'X' ? 26 : 5);

  src.connect(g).connect(bp).connect(ws);

  if (timbre === 'X') {
    // ring-mod makes the mimic sound slightly wrong
    const rg = ctx.createGain(); rg.gain.value = 0.55;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 23;
    const lg = ctx.createGain(); lg.gain.value = 0.45;
    lfo.connect(lg).connect(rg.gain);
    ws.connect(rg).connect(out);
    lfo.start(ctx.currentTime + when); lfo.stop(ctx.currentTime + when + buf.duration / r + 0.2);
  } else {
    ws.connect(out);
  }

  src.start(ctx.currentTime + when);
  return buf.duration / r;
}

// Low, close-mic whisper — no pitch, shaped noise. Returns duration.
export function whisper(text, { gain = 0.35, pan = 0, when = 0, rate = 1 } = {}) {
  const ctx = audio.ctx;
  const n = syllableCount(text);
  const g = ctx.createGain(); g.gain.value = gain;
  const p = ctx.createStereoPanner(); p.pan.value = pan;
  const out = ctx.createGain(); out.gain.value = 1;
  g.connect(p).connect(out).connect(audio.roomBus);
  // whispers live mostly in the room bus so they feel "inside" not "on the radio"
  const t0 = ctx.currentTime + when;
  let tt = t0;
  for (let i = 0; i < n; i++) {
    const dur = (0.10 + Math.random() * 0.14) / rate;
    const nz = audio.noiseSource(false);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.setValueAtTime(1600 + Math.random() * 2400, tt);
    f.frequency.exponentialRampToValueAtTime(900 + Math.random() * 1200, tt + dur);
    f.Q.value = 6;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, tt);
    e.gain.exponentialRampToValueAtTime(0.8, tt + dur * 0.4);
    e.gain.exponentialRampToValueAtTime(0.0001, tt + dur);
    nz.connect(f).connect(e).connect(g);
    nz.start(tt); nz.stop(tt + dur + 0.02);
    tt += dur + (Math.random() < 0.2 ? 0.14 : 0.03) / rate;
  }
  const total = tt - t0;
  setTimeout(() => { try { out.disconnect(); } catch {} }, total * 1000 + 500);
  return total;
}
