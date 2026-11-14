import * as THREE from 'three';
import { bus, TUNER } from './config.js';
import { audio } from './audio/engine.js';
import { radio } from './audio/radio.js';
import { startAmbience } from './audio/sfx.js';
import { buildRoom } from './scene/room.js';
import { buildLighting } from './scene/lighting.js';
import { buildDust } from './scene/dust.js';
import { makeHandheld } from './scene/handheld.js';
import { setupPostFX } from './postfx/horror.js';
import { HUD } from './ui/hud.js';
import { Tuner } from './equipment/tuner.js';
import { DirectionalMic } from './equipment/mic.js';
import { Recorder } from './equipment/recorder.js';
import { Director } from './game/director.js';

const TRAILER = new URLSearchParams(location.search).has('trailer');

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
const { refs, interactables, hotspots } = buildRoom(scene);
const lighting = buildLighting(scene);
const dust = buildDust(scene);
const postfx = setupPostFX(renderer, scene, camera);

const hud = new HUD();
scene.add(camera);
const handheld = makeHandheld(camera);
hud.attachDevice(handheld);
const tuner = new Tuner(refs, hud);
const mic = new DirectionalMic(refs, hud);
const recorder = new Recorder(refs, hud);

let director = null;
let ambience = null;
let running = false;
let over = false;

// Debug/testing handle — also the trailer's control surface (src/trailer.js).
window.__da = {
  get director() { return director; },
  tuner, mic, recorder, refs, handheld, hud, lighting, postfx, camera, radio, audio, bus,
  startGame,
  setLook(yaw, pitch) { yawOff = yaw; pitchOff = pitch; },
  pokeUse() { lastUse = clock.elapsedTime; },
  forceConsole: false,
  trailer: TRAILER,
};

// ---------- input ----------
const keys = new Set();
let dragTarget = null;

const PROMPTS = {
  tuner: '<b>TUNER</b> — drag dial or [A]/[D]',
  mic: '<b>MIC</b> — drag or [Q]/[E]',
  recorder: '<b>RECORDER</b> — [R] rec · [P] play',
  radio: '<b>RADIO</b> — [T] transmit',
  door: '<b>DOOR</b> — sealed. sub-level access only',
  doorArmed: '<b>DOOR</b> — the wheel turns. open it? [CLICK]',
  trash: '<b>TRASH CAN</b> — something is hissing in there. [F] or click to take it',
};

const ray = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
const hitList = [
  interactables.tuner, interactables.mic, interactables.recorder,
  interactables.radio, interactables.door, interactables.trash,
];
let hoverType = null;
let lastUse = -10;      // last time the player touched the equipment
const CONSOLE_TYPES = new Set(['tuner', 'radio', 'recorder', 'mic']);

function typeOf(obj) {
  let o = obj;
  while (o) { if (o.userData.type) return o.userData.type; o = o.parent; }
  return null;
}

addEventListener('keydown', (e) => {
  if (!running || over) return;
  const k = e.key.toLowerCase();
  keys.add(k);
  if ('adqerpt f'.includes(k)) lastUse = clock.elapsedTime;
  if (k === 'r') recorder.toggleRecord();
  if (k === 'p') recorder.playLast();
  if (k === ' ') { e.preventDefault(); recorder.stopPlayback(); recorder.stopRecord(); }
  if (k === 't') bus.emit('transmit');
  if (k === 'f') {
    if (hoverType === 'trash') director?.pickupTape();
    else if (hoverType === 'door' && director?.doorArmed) director?.openDoor();
  }
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
  else if (t === 'trash') director?.pickupTape();
  else if (t === 'door' && director?.doorArmed) director?.openDoor();
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
function startGame() {
  document.getElementById('start-screen').classList.add('hidden');
  audio.start();
  audio.resume();
  ambience = startAmbience();
  tuner.power(true);
  tuner._syncVisual();
  director = new Director({ hud, tuner, mic, recorder, refs, lighting, postfx, ambience, camera });
  running = true;
  if (!TRAILER) {
    renderer.domElement.requestPointerLock();
    setTimeout(() => director.start(), 1500);
  }
}
document.getElementById('begin-btn').addEventListener('click', startGame);

document.getElementById('restart-btn').addEventListener('click', () => location.reload());

bus.on('gameover', (kind) => {
  over = true;
  document.exitPointerLock?.();
  if (TRAILER) return; // trailer.js owns the outro
  const end = document.getElementById('end-screen');
  const txt = document.getElementById('end-text');
  if (kind === 'survived') {
    txt.textContent = '06:00 — SHIFT COMPLETE. YOU STOPPED LISTENING.';
  } else if (kind === 'door') {
    txt.textContent = 'SIGNAL LOST';
    end.classList.add('loss');
  } else if (kind === 'timeout') {
    txt.textContent = 'IT FOUND YOU.';
    end.classList.add('loss');
  } else {
    txt.textContent = 'IT HEARD YOU.';
  }
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

    // hover prompt + hotspot highlight + lean-in
    if (!over) {
      ray.setFromCamera(center, camera);
      const hit = ray.intersectObjects(hitList, true)[0];
      hoverType = hit && hit.distance < 4.2 ? typeOf(hit.object) : null;
      if (hoverType === 'trash' && director?._flags.gotTape) hoverType = null;
      let promptKey = hoverType;
      if (hoverType === 'door' && director?.doorArmed) promptKey = 'doorArmed';
      if (hoverType === 'trash' && director?._flags.gotTape) promptKey = null;
      hud.prompt(promptKey ? PROMPTS[promptKey] : null);

      // the console pops up to your face while you're working it
      const wantConsole =
        CONSOLE_TYPES.has(hoverType) || !!dragTarget ||
        (t - lastUse < 2.5) || director?.beat === 'tasks' ||
        window.__da?.forceConsole;
      hud.showConsole(wantConsole);

      // pulse the physical part you can grab
      for (const [type, mats] of Object.entries(hotspots)) {
        const on = type === hoverType;
        for (const m of mats) {
          const k = on ? 0.14 + Math.sin(t * 7) * 0.07 : 0;
          m.emissive.setRGB(k * 0.55, k, k * 0.5);
        }
      }

      // lean in toward whatever you're about to use
      const targetFov = dragTarget ? 46 : hoverType ? 53 : 58;
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 7);
      if (Math.abs(camera.fov - targetFov) > 0.01) camera.updateProjectionMatrix();
    } else {
      hud.prompt(null);
    }

    // CRT screens: monitor1 = tuner waveform when locked else noise
    refs.crtScreens[0].setMode(probe && probe.clarity > 0.6 ? 'sine' : 'noise');
    for (const s of refs.crtScreens) s.update();

    lighting.update(dt);
    dust.update(t);
    handheld.update(dt, t);
    postfx.setTime(t);
  }

  postfx.composer.render();
}
tick();

// Trailer mode (?trailer): hide the start screen instantly and hand control
// to the cinematic timeline, which drives the real game systems and records.
if (TRAILER) {
  const s = document.getElementById('start-screen');
  s.classList.add('hidden');
  s.style.display = 'none';
  import('./trailer.js').then((m) => m.runTrailer());
}
