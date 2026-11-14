import * as THREE from 'three';
import { ATTENTION, SOURCES, bus } from '../config.js';
import { audio } from '../audio/engine.js';
import { speak, whisper, playLine, cutSpeech } from '../audio/voice.js';
import { playFile, preloadSfx } from '../audio/files.js';
import * as sfx from '../audio/sfx.js';
import { SYS, X, TAPE, LINES } from './script.js';

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

const HIDDEN_LINES = [
  'i was here the whole time',
  'it breathes when you breathe',
  'stop recording. it hears the tape too',
  'that voice is not mine anymore',
];

// The shift is six tasks. Each one has a clock. Run out of time and the
// scratching in the walls stops being in the walls.
const TASKS = [
  { id: 'tune',   label: 'TUNE THE RADIO TO 87.4',          time: 75,
    hint: 'hold [D] or drag the dial — line the needle up with the red tick',
    line: 'a_tune', done: 'a_lock' },
  { id: 'locate', label: 'FIND THE NOISE — AIM THE MIC AT IT', time: 60,
    hint: 'rotate the mic [Q]/[E] — hold it on the loudest sound',
    line: 'a_mictask', done: 'a_micdone' },
  { id: 'record', label: 'RECORD A TAPE',                    time: 50,
    hint: 'press [R] — hold it 2 seconds — press [R] again',
    line: 'a_rectask' },
  { id: 'play',   label: 'PLAY THE TAPE BACK',               time: 35,
    hint: 'press [P] on the deck — listen to what it caught' },
  { id: 'found',  label: 'PLAY THE TAPE IN THE TRASH CAN',   time: 70,
    hint: 'aim at the trash can — [F] or click to grab it — then [P]',
    done: 'a_hoax' },
  { id: 'quiet',  label: 'STAY SILENT. DO NOT TOUCH ANYTHING.', time: 30, survive: true,
    hint: 'no keys. no dial. it is listening for you right now' },
];

// which noise counts as a violation during the silence task
const NOISY = new Set(['SCAN', 'RECORD', 'PLAYBACK', 'TRANSMIT', 'PICKUP']);

export class Director {
  constructor({ hud, tuner, mic, recorder, refs, lighting, postfx, ambience, camera }) {
    this.hud = hud;
    this.tuner = tuner;
    this.mic = mic;
    this.recorder = recorder;
    this.refs = refs;
    this.lighting = lighting;
    this.postfx = postfx;
    this.ambience = ambience;
    this.camera = camera;

    this.attention = 0;
    this.level = 0;
    this.beat = 'boot';
    this.over = false;
    this.shake = 0;
    this.doorArmed = false;

    this.taskIdx = -1;       // which of the 6 tasks we're on
    this.taskLeft = 0;       // seconds left on the current task
    this.elapsed = 0;        // total shift time — the room dies slowly

    this._timers = [];
    this._loops = [];
    this._flags = {};
    this._quietTime = 0;
    this._glitch = 0;
    this._scratch = null;    // the deadline scratch bed
    this._lunge = null;      // the entity coming for you
    this._peek = null;       // the charge scare — it bursts out then vanishes
    this._tickT = 0;         // claw-tap countdown timer
    this._danger = 0;        // current task danger, drives scare eligibility
    this._kill = null;       // the fill-screen terminal lunge
    this._loudTime = 0;      // sustained loud-radio seconds — it hears the carrier
    this._doorMove = null;   // 'open' = smashed aside, 'close' = slammed back

    bus.on('attention', (reason) => this.add(ATTENTION[reason] ?? 0, reason));
    bus.on('playback', (tape) => this._onPlayback(tape));
    bus.on('tapeRecorded', (tape) => this._onTape(tape));
    bus.on('transmit', () => this._onTransmit());
  }

  // ---------- attention ----------
  add(n, reason) {
    if (this.over) return;
    this.attention = Math.min(ATTENTION.MAX, this.attention + n);
    this._checkLevels();

    // the silence task — every noise resets the clock
    const task = TASKS[this.taskIdx];
    if (this.beat === 'tasks' && task?.survive && NOISY.has(reason)) {
      this.taskLeft = task.time;
      if (!this._flags.quietWarn) {
        this._flags.quietWarn = true;
        this.hud.print('sys', '> IT HEARD THAT. THE CLOCK RESETS.');
        sfx.sting(0.5);
        this._after(6, () => { this._flags.quietWarn = false; });
      }
    }
  }

  _checkLevels() {
    const a = this.attention;
    const L = ATTENTION;
    const lvl = a >= L.L4 ? 4 : a >= L.L3 ? 3 : a >= L.L2 ? 2 : a >= L.L1 ? 1 : 0;
    if (lvl > this.level) {
      this.level = lvl;
      this._enterLevel(lvl);
    } else if (lvl < this.level - 1 && this.level < 4) {
      this.level = lvl; // de-escalate; one-shots can re-fire
    }
    if (this.beat === 'free' && this.level >= 4 && !this._flags.finale) {
      this._flags.finale = true;
      this._finale();
    }
  }

  _enterLevel(lvl) {
    if (this.beat === 'boot' || this.beat === 'finale') return;
    if (lvl === 1 && !this._flags.l1) {
      this._flags.l1 = true;
      this.hud.print('sys', '> ADVISORY: ACOUSTIC ACTIVITY DETECTED ON YOUR LEVEL');
      sfx.metalClang((Math.random() - 0.5) * 140, 2.5, 0, 0.3);
      this._glitchPulse(0.15);
      this._loopAt(4 + Math.random() * 4, () => {
        sfx.metalClang((Math.random() - 0.5) * 140, 2.5, 0, 0.25);
        this._glitchPulse(0.12);
      });
    }
    if (lvl === 2) {
      this._flags.l2 = true;
      this.hud.print('sys', '> ADVISORY: MOVEMENT DETECTED — CORRIDOR B');
      sfx.sting(0.5);
      this._loopAt(12, () => {
        sfx.footstepWalk(-70, 60, 2.2, 8, 0.7);
      });
      this._spawnBreather('door', SOURCES.door.world);
    }
    if (lvl === 3) {
      this._flags.l3 = true;
      sfx.sting(1);
      sfx.knock(SOURCES.door.bearing, 1.2, 0.5, 3);
      this._figureAtWindow(5);
      this.hud.print('sys', '> WARNING: PERIMETER SENSOR TRIP — DOOR 7');
      this._say('b_outside');
      this.doorArmed = true;   // it's knocking. the wheel will turn if you let it
      this._loopAt(16, () => sfx.knock(SOURCES.door.bearing, 1.2, 0, 2 + (Math.random() * 2 | 0)));
      // it tries the room once — a warning, but only once you're in free play.
      // mid-task it doesn't warn, it just comes.
      this._after(9, () => { if (!this.over && this.beat === 'free') this._peekScare(); });
    }
  }

  // ---------- helpers ----------
  async _say(id) {
    if (this.over) return;
    const L = LINES[id];
    if (!L) return;
    const signal = L.timbre === 'A' ? 'control' : L.timbre === 'B' ? 'stranger' : 'unknown';
    this.recorder.captureContext({ text: L.text, timbre: L.timbre, ttsId: id, signal });
    this.hud.print(L.cls, `> ${L.text}`);
    // control's voice rots as attention climbs — the carrier is degrading
    const corrupt = L.timbre === 'A' ? Math.min(0.9, this.attention / 110) : 0;
    const dur = await playLine(id, { timbre: L.timbre, gain: 0.95, corrupt });
    // synth fallback — also returns seconds-until-finished
    return dur || speak(L.text, { timbre: L.timbre, gain: 0.85 });
  }

  _after(t, fn) { this._timers.push({ t, fn }); }
  _loopAt(interval, fn) { this._loops.push({ t: interval * (0.5 + Math.random() * 0.5), interval, fn }); }

  _glitchPulse(v) {
    this._glitch = Math.max(this._glitch, v);
  }

  // it BURSTS through the door at you — red eyes, deafening, lingers,
  // then gone. a warning — it only plays this way in free play.
  // outside free play, the monster doesn't warn you. it just takes you.
  _peekScare() {
    if (this.over || this._peek || this._lunge || this._kill) return;
    if (this.beat !== 'free') { this._monsterKill(); return; }
    const f = this.refs.figure;
    f.position.set(-1.5, 0, -2.55);
    f.rotation.y = 0;
    f.visible = true;
    this._peek = { t: 0 };
    this._doorMove = 'open';      // the panel gets smashed aside, then slammed back
    this._scareLoud(1.7, 1.6);
    sfx.doorBurst();
    this.hud.scareFlash(1.4);
    this._glitchPulse(0.45);   // violent, but the red eyes still read through it
    this.shake = Math.max(this.shake, 1.3);
  }

  // slam the master bus to the wall for a scare — the compressor turns
  // it into a solid wall of sound, then it backs off
  _scareLoud(mult = 1.8, hold = 1.5) {
    const g = audio.master.gain, t = audio.now();
    g.cancelScheduledValues(t);
    g.setTargetAtTime(mult, t, 0.02);
    g.setTargetAtTime(0.9, t + hold, 0.4);
  }

  // THE kill scare — it fills the entire screen, then the screen is black.
  async _monsterKill() {
    if (this.over || this._kill) return;
    this.over = true;
    cutSpeech();
    this.hud.setUrgent(false);
    this.hud.setHint('');
    const f = this.refs.figure;
    f.position.set(-1.5, 0, -2.55);
    f.rotation.y = 0;
    f.visible = true;
    this._doorMove = 'open';
    this._kill = { t: 0 };
    this._scareLoud(2.1, 3.2);        // as loud as the bus will go
    sfx.doorBurst();
    this.lighting.redAlert(true);
    this.hud.scareFlash(1.8);
    this._glitchPulse(0.8);
    this.shake = 1.6;
    await sleep(0.75);
    this.hud.blackout(true, 0.5);     // it reaches you — everything goes black
    playFile('shriek', { gain: 1.7 });
    await sleep(1.8);                 // held in the dark with it
    bus.emit('gameover', 'timeout');
  }

  _figureAtWindow(seconds) {
    const f = this.refs.figure;
    f.position.set(1.15, 0.28, -2.868);
    f.rotation.y = 0;
    f.visible = true;
    sfx.sting(0.7);
    this._glitchPulse(0.25);
    this._after(seconds, () => { if (!this._lunge) f.visible = false; });
  }

  _spawnBreather(id, world) {
    if (this.mic.emitters.has(id)) return;
    const em = this.mic.spawnEmitter(id, world, { roomLevel: 0.10, micLevel: 1.1 });
    this._loopAt(2.6, () => sfx.emitBreathPulse(em.input, 0.4));
  }

  _spawnTrash() {
    const em = this.mic.spawnEmitter('trash', SOURCES.trash.world, { roomLevel: 0.3, micLevel: 1.3 });
    this._trashStatic = sfx.dirtyStaticInto(em.input, 0.4);
    this._loopAt(0.55, () => { if (Math.random() < 0.55) sfx.emitPop(em.input, 0.09); });
  }

  // the vent breathes all shift — duct rumble + settling rattles.
  // the locate task borrows this same emitter for its clank loop.
  _spawnVent() {
    this._ventEm = this.mic.spawnEmitter('vent', SOURCES.vent.world, { roomLevel: 0.12, micLevel: 1.15 });
    this._ventBed = sfx.ventBed(this._ventEm.input, 0.15);
    this._loopAt(1.4, () => { if (Math.random() < 0.65) sfx.emitRattle(this._ventEm.input, 0.05 + Math.random() * 0.06); });
  }

  // player pulls the cassette out of the trash can
  pickupTape() {
    if (this._flags.gotTape || this.over) return;
    this._flags.gotTape = true;
    this.refs.trashTape.visible = false;
    this._trashStatic?.stop();
    this.mic.removeEmitter('trash');
    const tape = {
      id: this.recorder.tapes.length + 1,
      signal: 'stranger',
      label: 'FOUND TAPE — SUB3',
      line: TAPE.line,
      timbre: 'B',
      ttsId: 'b_tape',
      hidden: true,
      hiddenLine: TAPE.hiddenLine,
      phone: true,
      found: true,
      duration: 40,
    };
    this.recorder.tapes.push(tape);
    this.hud.addTape(tape);
    this.add(ATTENTION.PICKUP, 'PICKUP');
    this.hud.print('sys', '> CASSETTE RECOVERED. HANDWRITTEN LABEL: "DO NOT PLAY"');
    const task = TASKS[this.taskIdx];
    if (task?.id !== 'found') this.hud.setHint('press [P] on the deck to play what you found');
  }

  // ---------- the six tasks ----------
  _startTask(i) {
    this.taskIdx = i;
    const task = TASKS[i];
    this.taskLeft = task.time;
    this._flags.warned50 = false;
    this._flags.warned85 = false;
    this.hud.setObjective(`TASK ${i + 1}/6 — ${task.label}`);
    this.hud.setHint(task.hint);
    if (task.line) this._say(task.line);

    if (task.id === 'locate') {
      // clank pulses ride the same always-on vent emitter
      this._ventLoop = { em: this._ventEm, t: 0 };
      this._flags.aimedTime = 0;
    }
    if (task.id === 'record') {
      // air something odd worth taping — a murmur, no transcript
      this._after(6, () => {
        if (TASKS[this.taskIdx]?.id === 'record') {
          this.recorder.captureContext({ text: 'do not let it count your sounds', timbre: 'X', signal: 'unknown' });
          speak('do not let it count your sounds', { timbre: 'X', gain: 0.4, rate: 0.75 });
        }
      });
    }
    if (task.id === 'quiet') {
      // it starts circling. the whole room is bait.
      this._spawnBreather('behind', SOURCES.behind.world);
    }
  }

  async _completeTask() {
    const i = this.taskIdx;
    const task = TASKS[i];
    this.taskIdx = -1;
    this._scratch?.setLevel(0);
    this.hud.setUrgent(false);
    sfx.sting(0.25);
    this.hud.setHint('');
    await this.hud.print('sys', `> TASK ${i + 1}/6 COMPLETE`);
    // the voice keeps talking after the transcript prints — hold the
    // log wipe until the line is actually done playing, plus a beat
    let wait = 1.2;
    if (task.done) wait = Math.max(wait, (await this._say(task.done)) + 1.4);
    await sleep(wait);
    this.hud.clearLog();   // clean log after task completion

    const next = i + 1;
    if (next >= TASKS.length) {
      this._tasksDone();
    } else {
      this._startTask(next);
    }
  }

  _tasksDone() {
    this.beat = 'free';
    this.taskIdx = -1;
    this.hud.setObjective('ALL TASKS COMPLETE — MONITOR THE BAND');
    this.hud.setHint('every sound you make, it hears. stay quiet to survive the shift.');
    this._say('a_recdone');
    this._after(4, () => this._say('a_pest'));
    // re-fire any escalation levels crossed during the task phase
    if (this.level > 0) this._enterLevel(this.level);
  }

  // the deadline hit zero — it reached you
  async _deadlineDeath() {
    if (this.over) return;
    this.over = true;
    this.hud.setUrgent(false);
    this._scratch?.setLevel(1);
    cutSpeech();
    this._scareLoud(2.1, 3.2);
    sfx.sting(1.4);
    this.lighting.kill();
    this.lighting.redAlert(true);
    // it comes through the door at you — and doesn't stop coming
    const f = this.refs.figure;
    f.position.set(-1.5, 0, -2.55);
    f.rotation.y = 0;
    f.visible = true;
    sfx.doorCreak(SOURCES.door.bearing);
    this._kill = { t: 0 };
    this._doorMove = 'open';        // it takes the door off its track coming in
    await sleep(0.9);
    sfx.doorBurst();
    this._glitchPulse(1);
    this.hud.scareFlash(1.8);
    this.shake = 1.4;
    await sleep(0.6);
    this.hud.blackout(true, 0.5);
    await sleep(1.4);
    bus.emit('gameover', 'timeout');
  }

  // ---------- main flow ----------
  async start() {
    for (const line of SYS.boot) {
      await this.hud.print('sys', `> ${line}`);
      await sleep(0.5);
    }
    this._spawnTrash();
    this._spawnVent();
    this._env = sfx.facilityAmbience();   // wind, drips, pipes, the building
    this._scratch = sfx.scratchLoop();    // the deadline instrument
    preloadSfx();                          // warm the scare files before they're needed
    // clanking in the walls — sparse at first, relentless once it's close
    this._loopAt(7, () => {
      const heat = Math.min(1, this.level * 0.22 + this._danger * 0.6 + this.elapsed / 400);
      if (Math.random() < 0.25 + heat * 0.7) {
        const b = (Math.random() - 0.5) * 300;
        sfx.wallBang(b, 1.2 + Math.random() * 2.5, 0.15 + heat * 0.4);
      }
    });
    // and sometimes it just... breathes at you from inside the wall
    this._loopAt(11, () => {
      if (this.level >= 3 || this._danger > 0.7) {
        playFile('growl', { gain: 0.5 + this._danger * 0.5, bearing: Math.random() < 0.5 ? SOURCES.door.bearing : SOURCES.behind.bearing, distance: 1.2 });
      }
    });
    // it tests the room occasionally — only once you're in free play.
    // mid-task there's no warning scare, only the real one.
    this._loopAt(27, () => {
      if (!this.over && this.beat === 'free' && this.level >= 3) this._peekScare();
    });
    await sleep(1);
    await this._say('a_greeting');
    await sleep(1.2);
    this.beat = 'tasks';
    this._startTask(0);
  }

  onLock(signalId, clarity) {
    if (this.over || clarity < 0.55) return;
    this.add(ATTENTION.LOCK, 'LOCK');
    if (signalId === 'whisper' && !this._flags.whisperFound) {
      this._flags.whisperFound = true;
      this.hud.print('src-x', '> (a voice, barely under the static)');
      whisper(X.whisper3, { gain: 0.3, rate: 0.6 });
      this.add(6, 'CREEP');
    }
  }

  _onTape(tape) {
    if (this.over) return;
    const task = TASKS[this.taskIdx];
    if (this.beat === 'tasks' && task?.id === 'record' && tape.duration >= 2) {
      this._completeTask();
    }
  }

  async _onPlayback(tape) {
    if (this.over) return;
    tape.hiddenLine = tape.hiddenLine || (tape.line ? tape.line : HIDDEN_LINES[(Math.random() * HIDDEN_LINES.length) | 0]);
    tape.hidden = true;
    this._flags.playedOnce = true;
    this._after(1.5, () => this.hud.markTapeHidden(tape));
    if (tape.found) {
      this._after(6, () => {
        this.hud.print('sys', '> UNREGISTERED MEDIA DETECTED ON DECK — CONTENTS CLASSIFIED AS HOAX');
      });
    }
    const task = TASKS[this.taskIdx];
    if (this.beat !== 'tasks' || !task) return;
    if (task.id === 'play' && !tape.found) this._completeTask();
    if (task.id === 'found' && tape.found) this._completeTask();
  }

  _onTransmit() {
    if (this.over) return;
    sfx.transmitBeep();
    this.add(ATTENTION.TRANSMIT, 'TRANSMIT');
    if (this.level >= 3 && Math.random() < 0.5 && !this._flags.txReply) {
      this._flags.txReply = true;
      this._after(2.2, () => {
        sfx.knock(SOURCES.door.bearing, 1.0, 0, 3);
        this._after(6, () => { this._flags.txReply = false; });
      });
    }
  }

  async _finale() {
    this.beat = 'finale';
    this.hud.setObjective('STAY QUIET.');
    this.hud.setHint('or open the door. it is asking.');
    const em = this.mic.spawnEmitter('behind', SOURCES.behind.world, { roomLevel: 0.35, micLevel: 1.4 });
    this._loopAt(1.7, () => sfx.emitBreathPulse(em.input, 0.55));

    this.hud.print('sys', '> CARRIER ON 87.4 CLIMBING — SIGNAL SOURCE: INSIDE FACILITY');
    whisper(X.whisper3, { gain: 0.4, pan: 0.4, rate: 0.5 });
    await sleep(2);
    this.ambience?.setLevel(0.25, 2);
    this.lighting.kill();
    this.hud.print('sys', '> LIGHTING BUS FAILURE');
    for (let i = 0; i < 3; i++) {
      sfx.emitThump(audio.roomBus, 0.5, 70 + i * 12);
      await sleep(0.9);
    }
    await sleep(2.5);
    this.lighting.redAlert(true);
    this.lighting.revive(0.08);
    await this._say('a_mimic');
    await sleep(1.5);
    await this._say('x_mimicb');
    this.doorArmed = true;
    sfx.doorCreak(SOURCES.door.bearing);
    await sleep(2);
    this._figureAtWindow(4);
    sfx.knock(SOURCES.door.bearing, 0.8, 0, 4);
    await sleep(3.5);
    this.shake = 1;
    sfx.slam(SOURCES.door.bearing);
    this._glitchPulse(0.7);
    this.hud.scareFlash(1);
    whisper(X.whisper2, { gain: 0.5, pan: 0.9, rate: 0.5 });
    whisper(X.whisper1, { gain: 0.4, pan: -0.9, rate: 0.5, when: 1.2 });
    await sleep(3.2);
    if (!this.over) bus.emit('gameover', 'dead');
  }

  // the player did what the mimic asked — noise attack, SIGNAL LOST
  async openDoor() {
    if (this.over) return;
    this.over = true;
    this._flags.doorAnim = true;
    cutSpeech();
    sfx.doorCreak(SOURCES.door.bearing);
    await sleep(0.9);
    this.lighting.kill();
    this.lighting.redAlert(true);
    // it's in the doorway now — and it comes all the way in
    const f = this.refs.figure;
    f.position.set(-1.5, 0, -2.55);
    f.rotation.y = 0;
    f.visible = true;
    this._kill = { t: 0 };
    this._scareLoud(2.0, 3);
    sfx.noiseScream();
    this._glitchPulse(1);
    this.hud.scareFlash(1.6);
    this.shake = 1.4;
    const w = await playLine('x_door', { timbre: 'X', gain: 0.8 });
    if (!w) whisper(X.door, { gain: 0.6, rate: 0.4 });
    this.hud.print('src-x', '> SIGNAL OVERRUN — CARRIER UNRESOLVED');
    await sleep(1.2);
    this.hud.blackout(true, 0.5);
    await sleep(1.2);
    bus.emit('gameover', 'door');
  }

  _checkQuiet(dt) {
    if (this.over || this.beat !== 'free' || this.level < 2 || this._flags.finale) return;
    if (this.attention < 14) {
      this._quietTime += dt;
      if (this._quietTime > 40 && !this._flags.survived) {
        this._flags.survived = true;
        this.over = true;
        bus.emit('gameover', 'survived');
      }
    } else {
      this._quietTime = 0;
    }
  }

  update(dt, probe) {
    this.elapsed += dt;

    // the entity lunge runs even after `over`
    if (this._lunge) {
      const f = this.refs.figure;
      const cp = this.camera.position;
      this._lunge.t += dt;
      const speed = this._lunge.slow ? 1.4 + this._lunge.t * 4 : 2.2 + this._lunge.t * 7;
      this._lungeTarget = this._lungeTarget || new THREE.Vector3();
      this._lungeTarget.set(cp.x, cp.y - 0.65, cp.z);
      f.position.lerp(this._lungeTarget, Math.min(1, dt * speed));
      f.lookAt(cp.x, f.position.y + 0.8, cp.z);
    }

    // the charge scare — covers most of the room in ~half a second,
    // HOLDS on your face, the world blinks black, then it's gone
    if (this._peek) {
      const f = this.refs.figure;
      const cp = this.camera.position;
      this._peek.t += dt;
      this._peekTarget = this._peekTarget || new THREE.Vector3();
      this._peekTarget.set(cp.x, cp.y - 0.62, cp.z - 0.15);
      f.position.lerp(this._peekTarget, Math.min(1, dt * (2.2 + this._peek.t * 10)));
      f.lookAt(cp.x, f.position.y + 0.8, cp.z);
      if (this._peek.t > 0.65 && !this._peek.blacked) {
        this._peek.blacked = true;
        this.hud.blackoutPulse(0.45);   // total dark while it breathes on you
      }
      if (this._peek.t > 0.95) {
        f.visible = false;
        this._peek = null;
        this._doorMove = 'close';
        this._glitchPulse(0.5);
        sfx.slam(SOURCES.door.bearing);
        sfx.sting(0.9);
        this.shake = Math.max(this.shake, 0.9);
      }
    }

    // the kill lunge — it doesn't stop short. it fills the whole screen
    // and stays there while everything goes black.
    if (this._kill) {
      const f = this.refs.figure;
      const cp = this.camera.position;
      this._kill.t += dt;
      if (!this._kill.face) {
        this._kill.face = new THREE.Vector3();
        this._kill.dir = new THREE.Vector3();
        this.camera.getWorldDirection(this._kill.dir);
        this._kill.face.copy(cp).addScaledVector(this._kill.dir, 0.42);
        this._kill.face.y = cp.y - 1.72;   // its eyes level with yours
      }
      f.position.lerp(this._kill.face, Math.min(1, dt * (3 + this._kill.t * 14)));
      f.lookAt(cp.x, f.position.y + 0.8, cp.z);
    }

    // door panel — smashed open during the scare, slid open on the kill
    if (this._doorMove === 'open') {
      const p = this.refs.dpanel;
      p.position.x = Math.min(0.62, p.position.x + dt * 7);
    } else if (this._doorMove === 'close') {
      const p = this.refs.dpanel;
      p.position.x = Math.max(0, p.position.x - dt * 5);
      if (p.position.x === 0) this._doorMove = null;
    }
    if (this._flags.doorAnim) {
      const p = this.refs.dpanel;
      if (p.position.x < 0.72) p.position.x += dt * 0.9;
    }
    if (this.over) return;

    // ----- task clock: the scratching gets louder as you run out -----
    const task = TASKS[this.taskIdx];
    if (this.beat === 'tasks' && task) {
      this.taskLeft -= dt;
      const danger = 1 - Math.max(0, this.taskLeft) / task.time;
      this._danger = danger;
      // scratching starts ~40% in for normal tasks; immediately for the
      // silence task (it circles you while you try not to breathe)
      const ramp = task.survive ? danger : Math.max(0, (danger - 0.35) / 0.65);
      this._scratch?.setLevel(ramp * ramp);
      if (this.taskLeft <= 0) {
        if (task.survive) { this._completeTask(); return; }
        this._deadlineDeath();
        return;
      }
      if (danger > 0.5 && !this._flags.warned50) {
        this._flags.warned50 = true;
        this.hud.print('sys', '> SCRATCHING IN THE WALLS — CLOSER');
      }
      if (danger > 0.82 && !this._flags.warned85) {
        this._flags.warned85 = true;
        this.hud.print('sys', '> IT IS AT THE DOOR');
        sfx.sting(0.7);
        sfx.metalScratch(SOURCES.door.bearing, 0.8, 0, 2.2);
      }

      // the countdown is audible: claw-taps on the door that accelerate
      // and close distance as the clock dies. in the silence task it
      // circles the vent behind you instead.
      const tapDanger = task.survive ? danger : Math.max(0, (danger - 0.3) / 0.7);
      this._tickT -= dt;
      if (this._tickT <= 0 && tapDanger > 0.05) {
        this._tickT = Math.max(0.22, 1.15 - tapDanger * 0.95);
        const bearing = task.survive ? SOURCES.behind.bearing : SOURCES.door.bearing;
        sfx.clawTap(bearing, Math.max(0.7, 3.2 - tapDanger * 2.5), 0.05 + tapDanger * 0.3);
      }

      // countdown in the objective line — goes red under 15s
      const s = Math.max(0, Math.ceil(this.taskLeft));
      this.hud.setObjective(`TASK ${this.taskIdx + 1}/6 — ${task.label} — ${s}s`);
      this.hud.setUrgent(!task.survive && this.taskLeft < 15);

      // per-task completion checks
      if (task.id === 'tune' && probe && probe.clarity > 0.55 &&
          (probe.signal === 'control' || probe.signal === 'stranger')) {
        this._completeTask();
      }
      if (task.id === 'locate' && this._ventLoop) {
        const { em } = this._ventLoop;
        this._ventLoop.t -= dt;
        if (this._ventLoop.t <= 0) {
          this._ventLoop.t = 0.8 + Math.random() * 0.7;
          sfx.emitClank(em.input, 0.5);
        }
        if (em.aim > 0.55) {
          this._flags.aimedTime += dt;
          if (this._flags.aimedTime > 0.7) {
            this._ventLoop = null;   // stop the clanks; the vent keeps breathing
            this._completeTask();
          }
        } else {
          this._flags.aimedTime = 0;
        }
      }
    }

    // attention decay
    this.attention = Math.max(0, this.attention - ATTENTION.DECAY_PER_SEC * dt);

    // the room gets darker the longer the shift runs — and darkest
    // when the clock is dying
    const danger = this.beat === 'tasks' && TASKS[this.taskIdx]
      ? 1 - Math.max(0, this.taskLeft) / TASKS[this.taskIdx].time : 0;
    this.lighting.setDarkness(Math.min(0.92,
      this.elapsed * 0.005 + this.level * 0.07 + danger * 0.4));
    // the fluorescents start dying harder under deadline pressure
    this.lighting.setStress(Math.min(1, this.attention / 90) * 0.85 + danger * 0.35);

    // glitch decay + ambient glitch creep — the signal rots as it nears
    this._glitch = Math.max(0, this._glitch - dt * 1.4);
    const creep = this.level * 0.015 + danger * 0.06;
    if (Math.random() < creep * dt * 3) this._glitchPulse(0.12 + creep);
    this.postfx.setGlitch(this._glitch + Math.min(0.15, this.attention / 900) + creep);
    this.shake = Math.max(0, this.shake - dt * 0.8);
    if (this.level >= 3) this.attention = Math.max(this.attention, 30);

    // timers
    for (let i = this._timers.length - 1; i >= 0; i--) {
      const tm = this._timers[i];
      tm.t -= dt;
      if (tm.t <= 0) { this._timers.splice(i, 1); tm.fn(); }
    }
    for (const lp of this._loops) {
      lp.t -= dt;
      if (lp.t <= 0) { lp.t = lp.interval * (0.7 + Math.random() * 0.6); lp.fn(); }
    }

    // ----- a loud radio calls it. sustained signal clarity drags it
    // out of the walls — keep the carrier quiet between checks. -----
    if (probe && probe.clarity > 0.6) {
      this._loudTime += dt * probe.clarity;
    } else {
      this._loudTime = Math.max(0, this._loudTime - dt * 0.9);
    }
    if (this._loudTime > 18 && !this._flags.loudWarn) {
      this._flags.loudWarn = true;
      this.hud.print('sys', '> CARRIER LEVEL EXCESSIVE — SIGNAL SOURCE LISTENING BACK');
      this.hud.setHint('the radio is too loud. pull the dial off the band.');
      sfx.metalScratch(SOURCES.door.bearing, 1.5, 0, 2.0);
      sfx.knock(SOURCES.door.bearing, 1.4, 0, 2);
      this._glitchPulse(0.3);
    }
    if (this._loudTime < 8) this._flags.loudWarn = false;
    if (this._loudTime > 32) this._monsterKill();

    this._checkQuiet(dt);
  }
}
