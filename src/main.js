import * as THREE from 'three';
import { bus, TUNER } from './config.js';
import { audio } from './audio/engine.js';
import { radio } from './audio/radio.js';
import { startAmbience } from './audio/sfx.js';
import { buildRoom } from './scene/room.js';
import { buildLighting } from './scene/lighting.js';
import { buildDust } from './scene/dust.js';
import { setupPostFX } from './postfx/horror.js';
import { HUD } from './ui/hud.js';
import { Tuner } from './equipment/tuner.js';
import { DirectionalMic } from './equipment/mic.js';
import { Recorder } from './equipment/recorder.js';
import { Director } from './game/director.js';

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030304);
scene.fog = new THREE.FogExp2(0x030304, 0.06);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 30);
camera.position.set(0.1, 1.32, 1.55);
camera.rotation.order = 'YXZ';
camera.lookAt(0.3, 0.95, -2.15);
const baseYaw = camera.rotation.y;
const basePitch = camera.rotation.x;
let yawOff = 0, pitchOff = 0;

// ---------- world ----------
const { refs, interactables } = buildRoom(scene);
const lighting = buildLighting(scene);
const dust = buildDust(scene);
const postfx = setupPostFX(renderer, scene, camera);

const hud = new HUD();
const tuner = new Tuner(refs, hud);
const mic = new DirectionalMic(refs, hud);
const recorder = new Recorder(refs, hud);

let director = null;
let ambience = null;
let running = false;
let over = false;

// ---------- input ----------
const keys = new Set();
let dragTarget = null;

const PROMPTS = {
  tuner: '<b>TUNER</b> — drag dial or [A]/[D]',
  mic: '<b>MIC</b> — drag or [Q]/[E]',
  recorder: '<b>RECORDER</b> — [R] rec · [P] play',
  radio: '<b>RADIO</b> — [T] transmit',
  door: '<b>DOOR</b> — sealed. sub-level access only',
};

const ray = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const hitList = [interactables.tuner, interactables.mic, interactables.recorder, interactables.radio, interactables.door];

function typeOf(obj) {
  let o = obj;
  while (o) { if (o.userData.type) return o.userData.type; o = o.parent; }
  return null;
}

addEventListener('keydown', (e) => {
  if (!running || over) return;
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === 'r') recorder.toggleRecord();
  if (k === 'p') recorder.playLast();
  if (k === ' ') { e.preventDefault(); recorder.stopPlayback(); recorder.stopRecord(); }
  if (k === 't') bus.emit('transmit');
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

renderer.domElement.addEventListener('mousedown', (e) => {
  if (!running || over) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
    return;
  }
  ray.setFromCamera(center, camera);
  const hit = ray.intersectObjects(hitList, true)[0];
  const t = hit && typeOf(hit.object);
  if (t === 'tuner' || t === 'mic') dragTarget = t;
});
addEventListener('mouseup', () => { dragTarget = null; });
addEventListener('mousemove', (e) => {
  if (!running || over || document.pointerLockElement !== renderer.domElement) return;
  if (dragTarget === 'tuner') {
    tuner.setFreq(tuner.freq + e.movementX * 0.045);
  } else if (dragTarget === 'mic') {
    mic.azimuth += e.movementX * 0.3;
  } else {
    yawOff = THREE.MathUtils.clamp(yawOff - e.movementX * 0.0016, -1.15, 1.15);
    pitchOff = THREE.MathUtils.clamp(pitchOff - e.movementY * 0.0016, -0.5, 0.42);
  }
});

// ---------- start / end ----------
document.getElementById('begin-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  audio.start();
  audio.resume();
  ambience = startAmbience();
  tuner.power(true);
  tuner._syncVisual();
  director = new Director({ hud, tuner, mic, recorder, refs, lighting, postfx, ambience });
  window.__da = { director, tuner, mic, recorder, refs }; // debug/testing handle
  running = true;
  renderer.domElement.requestPointerLock();
  setTimeout(() => director.start(), 1500);
});

document.getElementById('restart-btn').addEventListener('click', () => location.reload());

bus.on('gameover', (kind) => {
  over = true;
  document.exitPointerLock?.();
  const end = document.getElementById('end-screen');
  document.getElementById('end-text').textContent = kind === 'survived'
    ? '06:00 — SHIFT COMPLETE. YOU STOPPED LISTENING.'
    : 'IT HEARD YOU.';
  end.classList.add('show');
  requestAnimationFrame(() => end.classList.add('visible'));
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  postfx.resize(innerWidth, innerHeight);
});

// ---------- loop ----------
const clock = new THREE.Clock();
let crt2Mode = 'noise';

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (running) {
    // held keys
    if (keys.has('a') || keys.has('arrowleft')) tuner.nudge(-1, dt, keys.has('shift'));
    if (keys.has('d') || keys.has('arrowright')) tuner.nudge(1, dt, keys.has('shift'));
    if (keys.has('q')) mic.rotate(-1, dt);
    if (keys.has('e')) mic.rotate(1, dt);

    // camera look + shake + idle sway
    const sh = director ? director.shake : 0;
    camera.rotation.y = baseYaw + yawOff + Math.sin(t * 0.5) * 0.004 + (Math.random() - 0.5) * 0.05 * sh;
    camera.rotation.x = basePitch + pitchOff + Math.sin(t * 0.7) * 0.003 + (Math.random() - 0.5) * 0.04 * sh;

    const probe = radio.update(dt);
    hud.setSignal(probe ? probe.clarity : 0);
    if (probe?.changed && probe.signal) director?.onLock(probe.signal, probe.clarity);

    mic.update();
    recorder.update(dt);
    director?.update(dt, probe);

    // hover prompt
    if (!over) {
      ray.setFromCamera(center, camera);
      const hit = ray.intersectObjects(hitList, true)[0];
      const tp = hit && hit.distance < 4.2 ? typeOf(hit.object) : null;
      hud.prompt(tp ? PROMPTS[tp] : null);
    }

    // CRT screens: monitor1 = tuner waveform when locked else noise
    refs.crtScreens[0].setMode(probe && probe.clarity > 0.6 ? 'sine' : 'noise');
    for (const s of refs.crtScreens) s.update();

    lighting.update(dt);
    dust.update(t);
    postfx.setTime(t);
  }

  postfx.composer.render();
}
tick();
