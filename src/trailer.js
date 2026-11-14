// DEAD AIR — in-engine trailer.
// Activated by ?trailer (see main.js). Drives the real game systems through a
// scripted ~60s cinematic: camera moves, dial sweeps, mic hunt, tape playback,
// escalation, door finale — while recording canvas + master audio via
// MediaRecorder and POSTing the WebM back to the dev server.
//
//   ?trailer          run the full trailer and capture it
//   ?trailer&shot=X   set up a single scene preset and hold it (for screenshots)

import { audio } from './audio/engine.js';
import * as sfx from './audio/sfx.js';
import { playLine, whisper, cutSpeech } from './audio/voice.js';
import { SYS } from './game/script.js';
import { SOURCES } from './config.js';

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

let da = null;               // window.__da
const anims = new Set();     // live tween handles {t, dur, from, to, fn, res}
const emitters = [];         // spawned mic emitters / loop handles to clean up

// ---------- frame-driven tween ----------
function animate(dur, fn) {
  return new Promise((res) => {
    const a = { t: 0, dur, fn, res };
    anims.add(a);
  });
}
const ease = (p) => p * p * (3 - 2 * p);
let _lastT = performance.now();
requestAnimationFrame(function pump() {
  requestAnimationFrame(pump);
  const t = performance.now();
  const dt = Math.min(0.1, (t - _lastT) / 1000);
  _lastT = t;
  for (const a of anims) {
    a.t += dt;
    const p = Math.min(1, a.t / a.dur);
    a.fn(ease(p), p);
    if (p >= 1) { anims.delete(a); a.res(); }
  }
});

// ---------- look control ----------
const look = { yaw: 0, pitch: 0 };
function applyLook() { da.setLook(look.yaw, look.pitch); }
function lookTo(yaw, pitch, dur = 1.5) {
  const y0 = look.yaw, p0 = look.pitch;
  return animate(dur, (e) => {
    look.yaw = y0 + (yaw - y0) * e;
    look.pitch = p0 + (pitch - p0) * e;
    applyLook();
  });
}

// camera presets (yawOff / pitchOff — see SOURCES bearings)
const SHOTS = {
  desk:     { yaw: 0.05,  pitch: 0.00 },
  tuner:    { yaw: 0.08,  pitch: 0.02 },
  radio:    { yaw: 0.30,  pitch: 0.00 },
  recorder: { yaw: -0.15, pitch: 0.04 },
  mic:      { yaw: -0.32, pitch: 0.04 },
  vent:     { yaw: 0.78,  pitch: 0.28 },
  trash:    { yaw: 0.62,  pitch: -0.18 },
  door:     { yaw: 0.40,  pitch: 0.02 },
  window:   { yaw: -0.23, pitch: 0.06 },
  behind:   { yaw: 3.05,  pitch: 0.05 },
};

function jumpTo(shot) { look.yaw = shot.yaw; look.pitch = shot.pitch; applyLook(); }

// ---------- trailer audio (narration + sfx, separate from the speech queue) ----------
let tBus = null;
const _bufs = new Map();

async function tLoad(id) {
  if (_bufs.has(id)) return _bufs.get(id);
  const p = (async () => {
    try {
      const res = await fetch(`trailer/${id}.mp3`);
      if (!res.ok) return null;
      return await audio.ctx.decodeAudioData(await res.arrayBuffer());
    } catch { return null; }
  })();
  _bufs.set(id, p);
  return p;
}

async function tPlay(id, { gain = 1, when = 0, loop = false } = {}) {
  const buf = await tLoad(id);
  if (!buf) return null;
  const src = audio.ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  const g = audio.ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(gain, audio.ctx.currentTime + when, 0.4);
  src.connect(g).connect(tBus);
  src.start(audio.ctx.currentTime + when);
  return { src, g, dur: buf.duration };
}

// dip the game's buses so the announcer sits on top
function duck(on) {
  const t = audio.ctx.currentTime;
  audio.radioBus.gain.setTargetAtTime(on ? 0.4 : 1, t, 0.3);
  audio.roomBus.gain.setTargetAtTime(on ? 0.55 : 1, t, 0.3);
}

async function vo(id, opts = {}) {           // narration helper
  duck(true);
  const h = await tPlay(id, { gain: 1.15, ...opts });
  if (h) await sleep(h.dur + 0.25);
  duck(false);
  return h;
}

// ---------- DOM overlays ----------
function buildOverlays() {
  const style = document.createElement('style');
  style.textContent = `
    .tl-bar { position: fixed; left: 0; right: 0; height: 10vh; background: #000;
      z-index: 80; transition: transform 1.4s cubic-bezier(.6,0,.3,1); }
    #tl-top { top: 0; transform: translateY(-100%); }
    #tl-bot { bottom: 0; transform: translateY(100%); }
    .tl-bars-on #tl-top, .tl-bars-on #tl-bot { transform: translateY(0); }
    #tl-cap { position: fixed; left: 0; right: 0; bottom: 3.4vh; z-index: 81;
      text-align: center; font-family: 'Courier New', monospace;
      font-size: clamp(15px, 1.9vw, 26px); letter-spacing: 0.55em; color: #9fd48a;
      text-shadow: 0 0 14px rgba(159,212,138,.5), 2px 0 0 rgba(168,60,46,.3), -2px 0 0 rgba(60,120,168,.3);
      opacity: 0; transition: opacity .7s ease, letter-spacing 3s ease; padding-left: .55em; }
    #tl-cap.show { opacity: 1; letter-spacing: 0.7em; }
    #tl-fade { position: fixed; inset: 0; background: #000; z-index: 78;
      opacity: 1; transition: opacity .8s ease; }
    #tl-card { position: fixed; inset: 0; background: #020302; z-index: 90;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 20px; font-family: 'Courier New', monospace; opacity: 0;
      transition: opacity 1.1s ease; pointer-events: none; }
    #tl-card h1 { font-size: clamp(52px, 8vw, 110px); font-weight: 400;
      letter-spacing: .42em; padding-left: .42em; color: #9fd48a;
      text-shadow: 0 0 22px rgba(159,212,138,.55), 4px 0 0 rgba(168,60,46,.4), -4px 0 0 rgba(60,120,168,.4);
      animation: tlj .1s steps(2) 3; }
    #tl-card .tag { font-size: clamp(11px, 1.3vw, 17px); letter-spacing: .5em;
      padding-left: .5em; color: #6f8a63; }
    #tl-card .sub { margin-top: 26px; font-size: clamp(9px, 1vw, 12px);
      letter-spacing: .4em; padding-left: .4em; color: #4a6b42; }
    @keyframes tlj { 50% { transform: translate(2px, -1px); } }
  `;
  document.head.appendChild(style);
  for (const [id, html] of [
    ['tl-top', ''], ['tl-bot', ''], ['tl-cap', ''], ['tl-fade', ''],
    ['tl-card', `<h1>DEAD AIR</h1>
      <div class="tag">THE MORE YOU LISTEN, THE CLOSER IT GETS</div>
      <div class="sub">A SHORTWAVE HORROR GAME — HEADPHONES REQUIRED</div>`],
  ]) {
    const d = document.createElement('div');
    d.id = id;
    if (id === 'tl-top' || id === 'tl-bot') d.className = 'tl-bar';
    d.innerHTML = html;
    document.body.appendChild(d);
  }
}
const el = (id) => document.getElementById(id);
function barsOn() { document.body.classList.add('tl-bars-on'); }
async function caption(text, hold = 3.2) {
  const c = el('tl-cap');
  if (text) c.textContent = text;
  c.classList.add('show');
  await sleep(hold);
  c.classList.remove('show');
  await sleep(0.5);
}
async function fade(toBlack, dur = 0.8) {
  el('tl-fade').style.transition = `opacity ${dur}s ease`;
  el('tl-fade').style.opacity = toBlack ? '1' : '0';
  await sleep(dur);
}

// ---------- emitters / loops ----------
function startVent() {
  const em = da.mic.spawnEmitter('vent', SOURCES.vent.world, { roomLevel: 0.12, micLevel: 1.3 });
  const iv = setInterval(() => sfx.emitClank(em.input, 0.55), 850);
  emitters.push({ id: 'vent', iv });
}
function stopEmitter(id) {
  const e = emitters.find((x) => x.id === id);
  if (!e) return;
  clearInterval(e.iv);
  da.mic.removeEmitter(id);
}
function startBreather(id, world, level = 1.4, every = 2.4, gain = 0.5) {
  const em = da.mic.spawnEmitter(id, world, { roomLevel: 0.3, micLevel: level });
  const iv = setInterval(() => sfx.emitBreathPulse(em.input, gain), every * 1000);
  emitters.push({ id, iv });
}
function glitch(v) { da.director._glitchPulse(v); }
const shake = (v) => { da.director.shake = v; };
const say = (id) => da.director._say(id);   // radio line + CRT transcript
const crt = (cls, text) => da.hud.print(cls, `> ${text}`);

// ---------- capture ----------
function startCapture() {
  const canvas = document.querySelector('canvas');
  const vs = canvas.captureStream(30);
  const dest = audio.ctx.createMediaStreamDestination();
  audio.comp.connect(dest);                  // post-compressor master mix
  const stream = new MediaStream([...vs.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    .find((m) => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 14e6 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(250);
  return {
    stop: () => new Promise((res) => {
      rec.onstop = () => res(new Blob(chunks, { type: 'video/webm' }));
      rec.stop();
    }),
  };
}

// ======================================================================
//  THE TIMELINE — ~62s. Absolute beats against T0.
// ======================================================================
async function timeline() {
  const T0 = performance.now();
  const now = () => (performance.now() - T0) / 1000;
  const at = async (t) => { const d = t - now(); if (d > 0) await sleep(d); };

  const rec = startCapture();

  // -- 0s COLD OPEN: black, letterbox, boot terminal, slow push on the desk --
  da.forceConsole = true;                                     // handheld stays up through the gear beats
  barsOn();
  const drone = await tPlay('s_drone', { gain: 0.5, loop: true });
  look.yaw = 0.3; look.pitch = 0.02; applyLook();
  fade(false, 2.2);
  lookTo(SHOTS.desk.yaw, SHOTS.desk.pitch, 7);
  crt('sys', SYS.boot[0]);
  await at(1.2); crt('sys', SYS.boot[1]);
  await at(1.9); crt('sys', SYS.boot[2]);
  await at(2.4); vo('n_open');                                  // "Night shift. Meridian Relay…" (8.6s)
  await at(11.6); say('a_greeting');                            // station control on the wire (7.4s)

  // -- 12s BEAT 1: TUNE — dial sweeps the band until control resolves --
  await at(12.0);
  caption('TUNE THE DEAD BAND', 5.2);
  crt('sys', 'CALIBRATION REQUIRED — TUNE RECEIVER TO 87.4 MHZ');
  await animate(2.4, (e) => da.tuner.setFreq(61 + (104.7 - 61) * e));  // sweeps past the whisper band
  await at(15.6);
  await animate(2.6, (e) => da.tuner.setFreq(104.7 - (104.7 - 87.4) * e)); // …and lands on control
  crt('sys', 'BAND CHECK CONFIRMED — LOG ALL ANOMALOUS TRAFFIC');
  await at(18.8); vo('n_band');

  // -- 20s BEAT 2: LOCATE — swing left, aim the mic at the vent resonance --
  await at(20.2);
  caption('HUNT THE NOISE', 4.2);
  crt('sys', 'ANOMALOUS MECHANICAL RESONANCE DETECTED — SUB-LEVEL 1');
  lookTo(SHOTS.vent.yaw, SHOTS.vent.pitch, 1.8);
  startVent();
  da.pokeUse();
  await at(21.4);
  vo('n_chase');
  await animate(3.0, (e) => { da.mic.azimuth = -55 * e; });     // clank grows as aim lands
  da.pokeUse();
  await at(25.6);
  stopEmitter('vent');
  lookTo(SHOTS.recorder.yaw, SHOTS.recorder.pitch, 1.6);

  // -- 27s BEAT 3: RECORD — tape captures a layer you couldn't hear live --
  await at(26.6);
  caption('RECORD WHAT SHOULD NOT EXIST', 4.8);
  vo('n_record');
  da.recorder.captureContext({ text: 'do not let it count your sounds', timbre: 'X', signal: 'unknown' });
  da.recorder.toggleRecord();                                   // REC led + reels + hiss
  da.pokeUse();
  await at(30.8);
  da.recorder.stopRecord();
  await at(31.4);
  da.recorder.playLast();                                       // murmur + hidden whisper layer
  lookTo(SHOTS.trash.yaw, SHOTS.trash.pitch, 1.8);
  await at(33.0);
  da.director._spawnTrash();                                    // hiss findable in the can
  await at(34.6);
  da.recorder.stopPlayback();
  da.director.pickupTape();                                     // "DO NOT PLAY" cassette recovered
  lookTo(SHOTS.desk.yaw, SHOTS.desk.pitch, 1.4);
  await at(36.0);
  da.recorder.playLast();                                       // her tape plays on the deck (17s)

  // -- 40s BEAT 4: IT HEARS YOU — noise begets noise --
  await at(40.5);
  caption('EVERY SOUND YOU MAKE, IT HEARS', 4.8);
  sfx.transmitBeep();
  vo('n_hears');
  sfx.knock(SOURCES.door.bearing, 1.2, 0.8, 3);
  crt('sys', 'ADVISORY: ACOUSTIC ACTIVITY DETECTED ON YOUR LEVEL');
  await at(42.2);
  da.recorder.stopPlayback();                                   // her tape is cut short
  sfx.footstepWalk(-70, 60, 2.0, 8, 0.65);
  startBreather('door', SOURCES.door.world);
  crt('sys', 'MOVEMENT DETECTED — CORRIDOR B');
  glitch(0.15);
  await at(44.2);
  say('b_outside');                                             // "It's outside your door now…" (7.3s)
  lookTo(SHOTS.door.yaw, SHOTS.door.pitch, 2.2);
  await at(45.4);
  sfx.knock(SOURCES.door.bearing, 1.0, 0, 4);
  glitch(0.25);
  await at(47.0);
  lookTo(SHOTS.window.yaw, SHOTS.window.pitch, 1.0);
  da.director._figureAtWindow(4.5);                             // something in the window
  glitch(0.45);
  shake(0.35);
  crt('sys', 'WARNING: PERIMETER SENSOR TRIP — DOOR 7');
  await at(48.4);
  vo('n_voices');                                               // ducks under her line
  await at(49.6);
  tPlay('s_riser', { gain: 0.8 });                              // 7s, peaks ~56.6

  // -- 50s FINALE: the lights die, control's voice goes wrong, the door asks --
  await at(50.4);
  da.forceConsole = false;
  da.lighting.kill();
  for (let i = 0; i < 3; i++) { sfx.emitThump(audio.roomBus, 0.5, 70 + i * 12); await sleep(0.85); }
  await at(53.0);
  da.lighting.redAlert(true);
  da.lighting.revive(0.08);
  lookTo(SHOTS.door.yaw, SHOTS.door.pitch, 1.4);
  say('a_mimic');                                               // "…Open the door, technician." (~6s)
  await at(54.6);
  tPlay('n_door', { gain: 1.05 });                              // announcer under the mimic
  da.director.doorArmed = true;                                 // the wheel turns

  // -- 56.5s CUT: door opens mid-sentence, the thing whispers, smash to title --
  await at(56.6);
  cutSpeech();                                                  // kills the mimic mid-word
  da.director._flags.doorAnim = true;                           // panel slides
  const f = da.refs.figure;
  f.position.set(-1.5, 0, -2.55); f.rotation.y = 0; f.visible = true;
  sfx.noiseScream();
  tPlay('s_boom', { gain: 1.0 });
  da.hud.scareFlash(1.4);
  glitch(1); shake(1);
  await at(57.4);
  playLine('x_door', { timbre: 'X', gain: 0.75 });              // "thank you for listening" (~2s)
  await fade(true, 0.5);
  el('tl-card').style.opacity = '1';
  tPlay('s_outro', { gain: 0.9 });
  vo('n_tag', { gain: 1.25 });                                  // whispered tag (4.6s)
  cutSpeech();
  drone?.src.stop();
  await at(64.0);
  const blob = await rec.stop();
  await fetch('/api/trailer-save', { method: 'POST', body: blob });
  el('tl-cap').textContent = 'CAPTURED — trailer.webm';
  el('tl-cap').classList.add('show');
}

// ======================================================================
//  SHOT PRESETS — ?trailer&shot=<name> for framing screenshots
// ======================================================================
const SCENES = {
  desk:     () => { jumpTo(SHOTS.desk); crt('sys', SYS.boot.join('  ·  ')); },
  tune:     () => { jumpTo(SHOTS.tuner); da.tuner.setFreq(87.4); da.forceConsole = true; crt('src-a', SYS.boot[2]); da.hud.setObjective('TUNE RECEIVER TO 87.4 MHZ'); },
  vent:     () => { jumpTo(SHOTS.vent); startVent(); da.mic.azimuth = -50; da.forceConsole = true; },
  recorder: () => { jumpTo(SHOTS.recorder); da.recorder.captureContext({ text: 'test', timbre: 'X', signal: 'unknown' }); da.recorder.toggleRecord(); da.forceConsole = true; },
  door:     () => { jumpTo(SHOTS.door); da.lighting.redAlert(true); da.lighting.revive(0.08); da.director._figureAtWindow(30); },
  window:   () => { jumpTo(SHOTS.window); da.director._figureAtWindow(30); da.lighting.redAlert(true); da.lighting.revive(0.1); },
  title:    () => { el('tl-fade').style.opacity = '1'; el('tl-card').style.opacity = '1'; },
};

// ---------- entry ----------
export async function runTrailer() {
  da = window.__da;
  da.startGame();
  da.director.beat = 'cinematic';            // keep the director from auto-playing
  buildOverlays();
  barsOn();

  tBus = audio.ctx.createGain();
  tBus.gain.value = 1;
  tBus.connect(audio.comp);

  const shot = new URLSearchParams(location.search).get('shot');
  if (shot && SCENES[shot]) {
    el('tl-fade').style.transition = 'none';
    el('tl-fade').style.opacity = '0';
    SCENES[shot]();
    return;
  }
  // preload trailer audio so the first VO doesn't stall the timeline
  await Promise.all(['n_open', 's_drone', 's_riser', 's_boom', 's_outro'].map(tLoad));
  el('tl-fade').style.transition = 'opacity .8s ease';
  await timeline();
}
